# Security

## Scope

Security reports may cover the static website, launch manifest, read-only
verification scripts, dependency integrity, or impersonation of HAKKY and
AntiHakkySack.

HAKKY does not deploy a custom smart contract. The token uses the Solana token
program and Raydium LaunchLab. This repository has not received a third-party
security audit.

## Reporting

Do not publish an exploitable issue before it can be reviewed. Open a GitHub
security advisory for code or dependency issues. For an impersonation report,
include the public URL, account handle, and screenshots in a private repository
security report.

Never send seed phrases, private keys, wallet files, API tokens, or passwords.

## Official-address rule

Before launch, there is no official HAKKY mint. After launch, treat the mint on
`https://hakky.xyz` as official only when its Raydium and Solscan proof links
agree with the on-chain verifier output.
