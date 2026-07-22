# HAKKY launch proof

No mainnet proof exists before launch. A proof is publishable only after the
read-only verifier reports `ok: true` and the Raydium launch configuration has
been read back from the official launch page and transaction receipt.

The verifier confirms that its RPC endpoint reports the mainnet-beta genesis
hash before it reads the mint. Proof files contain public addresses and public
RPC hostnames only. They must never contain wallet secrets, authenticated RPC
URLs, or private RPC query parameters.

Before publication, cross-check the proof file's exact `creator` address
against the independently approved creator address in the Raydium LaunchLab
configuration or session receipt. The verifier records the wallet whose token
accounts it summed; it cannot discover or approve the intended creator wallet
on its own.

`mainnet-mint.json` and `mainnet-launchlab.json` use strict schema version `1`.
The canonical mint file is written once only after every evaluated check passes;
a failed verification may print sanitized public evidence but must not occupy
the canonical path. Creator balances include initialized and frozen classic
token accounts only after each account's decoded mint and owner match the exact
requested identities. Uninitialized, invalid-state, wrong-program, wrong-mint,
or wrong-owner accounts fail verification.

The LaunchLab artifact includes the exact metadata image, website, X link, and
canonical Solscan transaction URL in addition to the fields in `docs/LAUNCH.md`.
For a live website, both artifacts must exist with `ok: true`, match the web
record exactly, and satisfy mint-check time <= LaunchLab-check time <= final
web-verification time. Prelaunch keeps `token.mint` and `proof` null and does not
require either canonical file.

Do not copy proof fields into the web record manually. Once both artifacts are
valid, use
`npm run build:live-record -- --verified-at <exact-ISO-8601-UTC-timestamp>` so
the supported live schema is generated and cross-checked before
`web/data/launch.json` is written.
