# HAKKY launch proof

No mainnet proof exists before launch. A proof is publishable only after the
read-only verifier reports `ok: true` and the Raydium launch configuration has
been read back from the official launch page and transaction receipt.

The verifier confirms that its RPC endpoint reports the mainnet-beta genesis
hash before it reads the mint. Proof files contain public addresses and public
RPC hostnames only. They must never contain wallet secrets, authenticated RPC
URLs, or private RPC query parameters.
