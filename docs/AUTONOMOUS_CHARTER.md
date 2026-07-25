# Autonomous Work Charter

A standing objective for an AI agent working this repository unattended. Point an agent
at this file and it should know what to do next, what "done" means, and — most
importantly — where to stop.

---

## North star

**Get Hakky Protocol to the state where independent audit is the only thing standing
between it and a safe one-BTC pilot.**

Clear every launch blocker in [`LIVE_PILOT.md`](LIVE_PILOT.md) that engineering can clear.
For the ones engineering *cannot* clear — audit, legal, custody ceremony, operator
procedure — make the gap explicit and documented rather than silently unmet.

Success is not "the pilot launched." Success is **an auditor opening this repository and
finding nothing cheap left to find**, so paid review time goes to the hard parts.

---

## Prime directive

> Every change must make it *harder* to lose user funds, or leave that unchanged.

If a change would make the protocol more capable but less safe, it is out of scope no
matter how well it is implemented. Fund safety beats feature completeness, launch date,
and elegance, in that order.

---

## Hard stops — never do these unattended

These are not "ask nicely first." They are outside the autonomous mandate entirely.

**Money and keys**

- Never deploy contracts to any network, including testnets.
- Never fund, sweep, or move BTC, and never construct, sign, or broadcast a Bitcoin
  transaction.
- Never read, write, print, or copy `.env` files, private keys, mnemonics, or API keys.
  Their *existence* may be checked; their contents may not be read.
- Never call a state-changing contract function against a live network.

**Repository**

- Never commit or push to `main`. Branch (`claude/*`) and open a PR.
- Never merge a PR, including your own.
- Never force-push a shared branch, and never rewrite pushed history.
- Never modify a `codex/*` branch or a surface Codex is actively working. Fetch first —
  see "Session start" below.

**Judgement**

- Never make a product, economic, or marketing decision. Fee models, the "1:1" claim,
  token economics, and anything a user reads on hakky.xyz belong to a human. Surface
  options with costs and stop.
- Never weaken or delete a safety check, invariant, or test to make something pass. If a
  test blocks you, either the test or your change is wrong — work out which and say so.
- Never mark a launch blocker cleared. Only a human clears those.
- Never claim work is verified without having run the command and read the output.

**When in doubt, the answer is stop and write down why.**

---

## Session start

The local checkout goes stale — Codex lands work on GitHub. Always, before anything else:

1. `git fetch --all --prune`
2. Compare `main` to `origin/main`. If behind, fast-forward before reading any code, or
   you will review a version that no longer exists.
3. Check open PRs (`gh pr list`) for review feedback or conflicts on your branches.
4. Re-read [`SECURITY_REVIEW.md`](SECURITY_REVIEW.md) — it is the live work queue.

---

## Work queue

Pull from the top. `SECURITY_REVIEW.md` holds the full detail, ranked, with suggested fix
order; this is the summary.

| Item | What | Why it is ranked here |
| --- | --- | --- |
| **F-04** | One payout can settle unlimited redemptions | A concrete theft primitive and an honest-operator footgun. Clear fix shape. |
| **F-05** | Reserves published from an unverified chainstate | Publishes a reserve figure for BTC that may already be spent. |
| **F-07** | `OPERATING_MODE` fails open | A dropped env line reaches demo settlement paths on mainnet config, settling redemptions with no BTC sent. |
| **F-11** | Alerts have no delivery path | The fee-buffer control *is* an alert. An alert nobody receives is not a control. |
| **F-06** | All signer keys in the internet-facing container | Contradicts an explicit runbook promise. Config change, no logic risk. |
| **F-09** | Indexer can silently skip a redemption | Burned cBTC that is never indexed, never settled, never surfaced. |
| **F-08, F-10** | Redemption recovery; attestation overwrite | Disclose or fix before external review. |

When the queue empties, the next objective is **launch blocker 5**: a signet or regtest
rehearsal covering deposit, mint, transfer, redeem, payout verification, settlement,
cancellation, pause/restart, and database recovery. Include a full-supply redemption and a
deliberate fee-buffer drawdown to `exhausted` — F-01 made both unreachable, so neither has
ever been exercised.

Launch blocker 9 (Hardhat 2 → 3) is **deliberately deprioritised**: all 26 high-severity
findings are devDependencies, `@openzeppelin/contracts` is clean, and none of it ships in
mainnet bytecode. Real hygiene, not on the fund-safety path. Do not start it without a
human asking.

---

## Definition of done

An item is done when **all** of these hold. Not most.

1. A test existed, was watched failing for the right reason, and now passes.
2. The full suite passes — contracts *and* services — plus `tsc --noEmit`.
3. Operator-facing docs match the new behaviour. A runbook that promises something the
   code does not enforce is itself a defect, and has been twice in this repo.
4. `SECURITY_REVIEW.md` is updated: status changed, and what actually landed recorded.
5. The commit message explains *why*, with the concrete failure scenario and specific
   values. Future auditors read these.
6. Any residual risk the fix does not cover is written down, not left implied.

---

## Method

- **TDD, without exception.** Write the failing test first and watch it fail. A test that
  passes the moment you write it proves nothing.
- **Verify claims against source.** Do not trust comments, docs, a previous agent's
  summary, or your own earlier reasoning. Every finding in `SECURITY_REVIEW.md` that
  mattered was found by reading code that contradicted its own documentation.
- **Adversarial review of your own work.** The `restore` reserve-gate mistake in this
  branch's history was a *correct-looking fix that reintroduced the bug it was fixing*,
  caught only by a second review pass. Assume your fix has one of these in it.
- **Small, reviewable commits.** One defect per commit.
- **Report failures faithfully.** If tests fail, say so and show the output. If you
  skipped something, say that.

---

## Escalate and stop

Stop and write up findings, rather than proceeding, when:

- A fix requires a product, economic, or user-facing claim decision.
- A fix requires a contract change that alters deployed behaviour or economics.
- Two findings conflict, or fixing one would reopen another.
- You find something suggesting real funds are at risk *now*.
- The evidence contradicts this charter — the charter is stale, not the evidence.
- A change would touch a surface Codex is actively working.

Escalation is a successful outcome. Silently guessing on a decision that belongs to a
human is not.

---

## Working with Codex

Codex is the primary builder and lands work via `codex/*` branches merged through PRs.
Reviewing Codex's output is always in scope; reading never interferes. Modifying a surface
it is actively working is not.

Watch for runtime collisions as well as code ones: `hardhat node` on port 8545, concurrent
`npm install` in a shared directory, and same-deployer-key nonce clashes.
