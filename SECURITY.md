# Security

## Scope

Security reports may cover the static website, launch manifest, read-only
verification scripts, dependency integrity, or impersonation of HAKKY and
HakkyAgent.

HAKKY does not deploy a custom smart contract. The token uses the Solana token
program and Raydium LaunchLab. This repository has not received a third-party
security audit.

## Reporting

Do not publish an exploitable issue before it can be reviewed. Open a GitHub
security advisory for code or dependency issues. For an impersonation report,
include the public URL, account handle, and screenshots in a private repository
security report.

Never send seed phrases, private keys, wallet files, API tokens, or passwords.

## Action-time approval boundaries

Evidence is never approval. Legal acceptance, wallet connection, each metadata
upload, any metadata-payment debit, the initial creation signature, the exact
maximum creation debit, every recovery signature and spend, every graduation
signature and spend, a push, pull-request creation or update, a merge and its
automatic Pages deployment, a GitHub metadata or custom-domain save, and each X
profile save, post, or pin are separate external effects requiring action-time
approval.

One creation approval may cover both the signature and maximum debit only when
it expressly names the exact transaction hash and exact maximum lamports. One
pre-merge approval may cover both merge and automatic Pages deployment only
when it separately names both effects for the exact commit. No approval carries
forward to a changed transaction, SHA, cost, account, destination, or later
operation.

The ignored mainnet session receipt stores only public evidence. It cannot
approve, sign, send, retry, or authorize recovery. A wallet or RPC display
failure after submission remains pending until finalized readback proves the
outcome.

## Official-address rule

Before launch, there is no official HAKKY mint. After launch, treat the mint on
`https://hakky.xyz` as official only when its Raydium and Solscan proof links
agree with the on-chain verifier output.
