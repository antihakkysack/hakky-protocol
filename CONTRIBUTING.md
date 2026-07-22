# Contributing to Hakky Protocol

Thanks for your interest in keeping crypto clean. Contributions are welcome.

## Ground rules

- **Read [`docs/SPEC.md`](docs/SPEC.md) first.** It is the single source of truth
  for naming, mechanism, and parameters. Contracts, site, and docs must all stay
  consistent with it.
- **Hakky is not a mixer.** We do not accept contributions that add mixing,
  tumbling, anonymization, or any feature designed to obscure fund provenance.
  Hakky screens *for* cleanliness and stays transparent.
- Be honest in copy and docs — no invented figures, partners, tickers, or
  price/return promises.

## Development

```bash
cd contracts
npm install
npm run build     # compile
npm test          # must stay green (currently 15/15)
```

- Solidity `0.8.24`, OpenZeppelin v5, Hardhat.
- Add tests for any new behavior; keep the suite passing.
- Match the existing NatSpec and code style. Custom errors over revert strings.

## Pull requests

1. Fork and branch from `main` (`feat/…`, `fix/…`, `docs/…`).
2. Keep PRs focused and describe the change and its rationale.
3. Ensure `npm test` passes and the site still renders without console errors.
4. For anything security-sensitive, see [SECURITY.md](SECURITY.md) — do **not**
   file a public issue for vulnerabilities.

## Reporting issues

Use GitHub Issues for bugs and feature ideas. For security vulnerabilities, use
private reporting per [SECURITY.md](SECURITY.md).
