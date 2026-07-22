# Security Policy

## Status

⚠️ **The Hakky Protocol contracts have not yet been audited.** They are provided
for review and development. **Do not deploy them with real funds** until a formal
third-party audit has been completed and published.

## Reporting a vulnerability

Please **do not** open a public GitHub issue for security vulnerabilities.

Instead, report privately via one of:

- GitHub's **[private vulnerability reporting](https://github.com/antihakkysack/hakky-protocol/security/advisories/new)** (Security → Report a vulnerability), or
- a direct message to the maintainers on X: **[@HakkyProtocol](https://x.com/HakkyProtocol)**.

Please include:

- a description of the issue and its impact,
- affected contract(s) and function(s),
- a proof-of-concept or reproduction steps if possible,
- any suggested remediation.

We aim to acknowledge reports within **72 hours** and to provide a remediation
timeline after triage. Responsible disclosure is appreciated; please give us a
reasonable window to fix issues before any public disclosure.

## Scope

In scope:

- Contracts under [`contracts/contracts/`](contracts/contracts/)
- The mint/redeem, attestation, proof-of-reserves, and compliance-policy logic

Out of scope:

- The static marketing site under `web/`
- Third-party dependencies (report those upstream)
- Theoretical issues without a practical exploit path

## Known trust assumptions (by design, not bugs)

- **v1 custody is federated / qualified-custodian.** Reserves and the
  reserve-oracle updater are trusted roles held by a multisig. This is
  documented and intentional for v1 — see the whitepaper's trust-model section.
- Privileged roles (`MINTER_ROLE`, `BURNER_ROLE`, `VERIFIER_ROLE`,
  `RESERVE_UPDATER_ROLE`, `ATTESTOR_ROLE`, `POLICY_ADMIN_ROLE`) are powerful by
  design and should be assigned to multisigs / accredited parties in production.
