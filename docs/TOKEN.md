# HAKKY token policy

Every value below is planned and unverified while HAKKY remains prelaunch.

| Field | Required value |
| --- | --- |
| Network | Solana mainnet-beta |
| Token program | Classic SPL Token |
| Name | Hakky Protocol |
| Symbol | HAKKY |
| Display supply | 10,000,000 HAKKY |
| Decimals | 6 |
| Base-unit supply | 10,000,000,000,000 |
| Curve allocation | 8,000,000 HAKKY |
| Initial permanent-pool seed | 2,000,000 HAKKY |
| Team/creator allocation | 0 HAKKY |
| Presale and vesting | None |
| Curve fee | 0% |
| Pool-retained fee | 0.25%, rounded upward by at most one input base unit |
| Creator/protocol fee destination | None |
| Creator-funded mainnet debit cap | 1.00 SOL |
| Mint authority after initialization | `null` |
| Freeze authority after initialization | `null` |
| Program upgrade authority before market initialization | Finalized `null` |
| Transfer fee, tax, hook, blacklist, or permanent delegate | None |
| Metadata mutability after initialization | Disabled |

The custom market must initialize the fixed supply and allocations atomically.
Public market initialization must not proceed unless the deployed program is
the reproducibly reviewed binary and its upgrade authority has been finalized
to `null`.

Permanent initial liquidity removes a privileged withdrawal path for the
initial seed. Pool reserves still change through valid permissionless swaps.

No official program or mint is published during prelaunch. These rules become
verified facts only after finalized on-chain readback and canonical evidence.

HAKKY is a high-risk meme coin with no promised utility or returns.
