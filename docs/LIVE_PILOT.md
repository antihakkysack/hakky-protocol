# One-BTC Live Pilot Runbook

This document describes the controls required to operate Hakky Protocol with a
maximum liability of one BTC. It does not authorize a launch. The contracts are
unaudited, no production deployment is included, and the repository never
creates or broadcasts a Bitcoin payout.

## Hard safety boundary

The pilot contracts enforce:

- `totalSupply + pendingRedemptionSats <= 100,000,000 sats`;
- `totalSupply + pendingRedemptionSats <= reserveSats`;
- minting only from a unique Bitcoin outpoint (`txid:vout`);
- minting only while the reserve publication is at most 12 hours old;
- no zero settlement reference;
- a pause on new deposits and redemption requests;
- settlement and cancellation remain available while paused.

Cancellation returns burned cBTC through `CleanBTC.restore`, which deliberately requires
neither a fresh reserve publication nor sufficient published reserves. New issuance
still requires both. Cancellation is liability-neutral — pending liabilities fall by the
same amount that supply rises, so `totalSupply + pendingRedemptionSats` is unchanged —
and the states that would trip those gates are exactly the states in which a redemption
most needs returning: a stale, failed, or revoked reserve updater, or a published
reserve that has fallen below supply. Refusing to restore in those states does not
improve solvency; it only destroys the user's claim. The one-BTC ceiling still applies
and cannot bind a genuine cancellation.

The one-BTC cap is immutable. Raising it requires a new contract deployment,
fresh review, and a new launch decision.

## Launch blockers

Do not place real BTC into custody until all of these are complete:

1. Independent smart-contract and service security reviews are closed.
2. Legal counsel approves the custody, screening, issuance, and redemption
   model in every operating jurisdiction.
3. The custody wallet, backup, recovery, signing, and incident procedures are
   tested by two independent operators.
4. Administrative control is a multisig; operational roles use separate
   signers held in a KMS, HSM, or equivalent protected system.
5. A signet or regtest rehearsal covers deposit, mint, transfer, redeem,
   Bitcoin payout, EVM settlement, cancellation, pause, restart, and database
   recovery.
6. PostgreSQL backups and restore are tested. The redemption cursor and jobs
   must survive a complete service restart.
7. Monitoring alerts on stale reserves, insolvency, Bitcoin/EVM RPC failure,
   pending redemptions, service failure, and unexpected role changes.
8. The exact production deployment manifest, bytecode, roles, addresses, and
   deployment block are independently checked.
9. The Hardhat 2 development toolchain is migrated to Hardhat 3 (or its
   transitive high-severity audit findings are otherwise resolved). Production
   Solidity dependencies currently audit clean; the development toolchain does
   not.

## Fee buffer

A payout must pay the recipient *exactly* the requested satoshis, so the Bitcoin miner
fee is funded from custody rather than deducted from the user. Custody therefore falls by
`amount + fee` on every redemption while `pendingRedemptionSats` falls by `amount` alone.

Custody must hold an operator-funded buffer above user liabilities to absorb those fees.
Without it, reserves drop below liabilities by the fee on the first redemption and stay
there — which permanently blocks minting, because `processDeposit` requires
`newLiabilities <= reserves` and a new deposit raises both sides equally. It would also
trip this runbook's first stop condition during entirely normal operation, and a
full-supply redemption would be unpayable outright, since an output equal to the whole
custody balance implies a zero fee and will not relay.

Set `BITCOIN_FEE_BUFFER_SATS` to the buffer you intend to maintain. A live process
refuses to start unless it is greater than zero. Fund custody with the pilot BTC **plus**
that buffer, and treat the buffer as operator capital, not user backing.

The buffer does not raise the liability ceiling: the one-BTC cap binds on
`totalSupply + pendingRedemptionSats`, never on the custody balance. The published
reserve figure remains the truthful confirmed custody balance, so the protocol reports
as over-collateralised rather than over-reported.

The reserve keeper escalates as the buffer drains, before backing is ever at risk:

| State | Meaning | Action |
| --- | --- | --- |
| `healthy` | Headroom covers the full configured buffer. | None. |
| `depleted` | Fees have eaten into the buffer. Still fully backed. | Top up custody. |
| `exhausted` | No headroom left. Still fully backed, but the next payout fee is unfunded. | Top up before settling anything further. |
| `insolvent` | Custody is below liabilities. | Stop condition — pause immediately. |

Top up custody with the operator's own BTC. A top-up is not a deposit and must never be
submitted to `/deposit`.

## Custody boundary

Use a dedicated Bitcoin Core wallet and one configured custody address. The
reserve service counts only safe, confirmed UTXOs paying that address. It does
not count an arbitrary whole-wallet balance.

Restrict the Bitcoin RPC endpoint to the service network, use strong unique RPC
credentials, and never expose it to the public internet. The service needs
read access to wallet RPCs. Payout construction and signing stay in the
external custody process.

For every payout:

1. Read the indexed redemption id, exact address, and satoshi amount.
2. Verify the request against the on-chain `ReserveVault.redemptions` value.
3. Build, independently review, sign, and broadcast the Bitcoin transaction.
4. Ensure wallet coin selection sends change back to the configured custody
   address. Change elsewhere is intentionally excluded from reported reserves.
5. Wait for `BITCOIN_PAYOUT_MIN_CONFIRMATIONS`.
6. Submit the payout txid to `POST /redemptions/:id/settle`.
7. Confirm that Bitcoin Core reports an exact outbound `send` and exact output,
   then verify the resulting `RedeemSettled` event.

Never settle first and promise to pay later.

## Mainnet configuration

Start from `services/.env.example`. A live process refuses to start unless its
configuration satisfies the fail-closed checks.

Required profile:

```dotenv
OPERATING_MODE=live
CHAIN_ID=1
DEPOSIT_VERIFICATION_MODE=bitcoin-core
BITCOIN_NETWORK=main
BITCOIN_MIN_CONFIRMATIONS=6
SCREENING_PROVIDER=manual-evidence
REDEMPTION_MODE=manual-verified
EVM_EVENT_CONFIRMATIONS=12
BITCOIN_PAYOUT_MIN_CONFIRMATIONS=6
RESERVE_MAX_STALENESS_SECONDS=43200
BITCOIN_FEE_BUFFER_SATS=<positive-operator-funded-fee-buffer>
WRITE_API_KEY=<at-least-32-random-characters>
```

Set `REDEMPTION_START_BLOCK` to the exact `ReserveVault` deployment block.
Configure `BITCOIN_RPC_*`, `BITCOIN_CUSTODY_ADDRESS`, all `ADDR_*` values, and a
different role-specific private key for each write service. The API process
does not receive a signer.

The example screening provider is a manual evidence adapter, not an automated
chain-analysis integration. Every verdict must contain an explicit score,
sanctions result, and HTTPS or IPFS evidence reference. This manual control must
be replaced or formally accepted before launch.

## Deployment control

`contracts/scripts/deploy.js` requires explicit mainnet role addresses and an
exact confirmation phrase. It deploys with a temporary deployer, grants the
operational roles, transfers administration, renounces deployer
administration, and writes a non-overwriting deployment manifest.

Before invoking it:

- fund the ephemeral deployer only for the expected deployment cost;
- independently verify every role address;
- confirm the final admin is not the deployer;
- archive the environment-independent inputs and expected bytecode hash;
- have a second operator observe the deployment and role handoff.

After deployment, compare the manifest with on-chain state before configuring
any service. Do not reuse the committed legacy Sepolia addresses.

## Pilot sequence

1. Start the read API, PostgreSQL, attestation worker, reserve worker, and
   orchestrator with dedicated service roles.
2. Confirm `/health` succeeds and `/proof-of-reserves` shows zero supply,
   zero pending redemptions, a fresh reserve report, and the one-BTC cap.
3. Exercise emergency pause and unpause with no funds present.
4. Fund custody with no more than one BTC of pilot backing, plus the configured
   `BITCOIN_FEE_BUFFER_SATS` of operator capital for payout fees, and wait for six
   confirmations.
5. Confirm the reserve update on-chain and independently reconcile its UTXOs.
6. Screen one recipient with retained evidence.
7. Submit only the verified custody outpoint to `/deposit`.
8. Confirm supply, pending liability, reserve age, and remaining capacity.
9. Keep aggregate liabilities at or below one BTC for the entire pilot.

## Stop conditions

Pause new deposits and redemption requests immediately for any of:

- reserve liabilities exceed confirmed custody reserves;
- reserve publication approaches 12 hours old;
- a signer, admin, API key, or RPC credential may be compromised;
- an outpoint, payout, attestation, or role assignment cannot be reconciled;
- Bitcoin Core, EVM RPC, PostgreSQL, or monitoring state is inconsistent;
- a sanctions or legal hold requires operator action.

Pausing does not resolve existing liabilities. Continue reconciling pending
redemptions and use settlement or cancellation only after independent review.
