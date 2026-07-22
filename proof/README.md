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
