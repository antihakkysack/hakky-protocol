# HAKKY launch and verification policy

## Approved Raydium LaunchLab configuration

- full-configuration mode with SOL as the quote asset;
- 80% of supply in the public bonding curve;
- 20% reserved by LaunchLab for post-graduation liquidity;
- 0% creator, team, treasury, marketing, or vesting allocation;
- 24 SOL minimum community-funded graduation target;
- no creator first-buy;
- creator-fee rights disabled;
- post-graduation LP burned;
- total creator-funded creation and transaction cost no more than 1.00 SOL.

All supply may pass through the launch wallet during setup. Before public
trading, all 1,000,000 HAKKY must be in the approved launch mechanism and the
creator wallet balance must be zero.

## Publication state

`prelaunch` means no official mint is shown and no address from replies or DMs
should be trusted. `live` is allowed only after the mainnet mint, launch
transaction, fixed supply, authorities, creator balance, allocation, fees, and
LP policy have independent readback evidence.

## Stop before signing

Stop if cost exceeds 1.00 SOL; any fixed token or allocation value differs;
creator fees cannot be disabled; LP cannot be burned; mint authority would
remain active; freeze authority or an unexpected token extension exists; the
wallet, metadata, links, preview, or live interface is ambiguous.

If a transaction fails, do not announce a launch or create another token
automatically. Save the signature and state, diagnose the existing mint, and
obtain explicit approval for any recovery transaction and cost.

## Mainnet proof record

The proof must record the network and RPC identity, classic token program, mint,
transaction signatures, supply, decimals, mint authority, freeze authority,
creator HAKKY balance, finalized metadata and immutable state, LaunchLab launch
address, curve and liquidity allocation, creator-fee state, graduation target,
quote asset, LP disposal, and official Raydium and Solscan URLs.

The canonical mint and LaunchLab artifacts both use strict schema version `1`
and require `ok: true`. Live publication is fail-closed: the site checker reads
both files, rejects unknown fields, and cross-checks the exact mint, creator,
launch address and signature, supply, decimals, authorities, zero creator
balance, metadata URI/image/links/immutability, 80/20/0 allocation, disabled
creator fees, burned LP, 24 SOL target, SOL quote, and creator spend no greater
than 1.00 SOL.

The mint proof timestamp must not be later than the LaunchLab proof timestamp.
The web record stores both exact artifact timestamps and a final promotion
timestamp ordered after them. Canonical destinations are the Solscan token
route, Solscan transaction route, and Raydium LaunchLab token route; credentials,
non-default ports, fragments, alternate routes, and extra query parameters are
rejected.
