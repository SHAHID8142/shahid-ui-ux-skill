# Maintenance, review cadence and security reporting (T1004, DA-48)

A build that ships without a named owner, a review date and a way to report a
vulnerability is not finished — it is abandoned on arrival. This page defines the four
things DA-48 requires.

## 1. Maintenance owner

| Role | Who | Responsibility |
| --- | --- | --- |
| Product owner / release authority | **SHAHID8142** (repository owner) | publication, licensing, scope, final acceptance, any decision that changes the product's promises |
| Implementation maintainer | the acting build agent (recorded per checkpoint in `.sus-dev/STATE.md`) | keeping `pnpm verify` green, updating receipts, triaging issues |
| Independent audit | commissioned separately by the owner | verifies the completed build against this repository's own gates |

Authority order is unchanged by this page: current owner instruction > dated owner
decision (`docs/OWNER_DECISIONS_LOG.md`) > effective requirements > baseline PRD > ADRs >
task records > historical reports.

## 2. Review calendar

| Cadence | What happens | Evidence |
| --- | --- | --- |
| Every commit | full release suite (`pnpm verify`) through the pre-push gate | push refused on failure, gate output in the terminal |
| Every checkpoint | `pnpm regression` — verify + demo loop + dogfood, report names the revision | `evals/reports/regression-latest.md` |
| Monthly | dependency audit and licence re-check (`pnpm audit`, `docs/TOOLING_CANDIDATES.md` licences) | recorded in `.sus-dev/SESSION_LOG.md` |
| Quarterly | support matrix regenerated from fresh smoke tests; stale rows downgrade to `experimental` by hash, never by date | `docs/SUPPORT_MATRIX.md`, `docs/compatibility.json` |
| Quarterly | playbook review against the current specification versions (WCAG, WAI-ARIA APG, HTML Living Standard) | playbook `references` carry a date and a grade |
| Per release | benchmark protocol re-run; claim gate is the release switch for comparative language | `evals/benchmarks/results/status.json` |
| On any security report | triage within 5 working days, fix or documented decision | private advisory, then `docs/THREAT_MODEL.md` update |

The calendar is a commitment, not a reminder system. If a quarterly review is missed, the
support matrix is the artefact that shows it: rows that are not re-verified age into
`stale` and then `untested`, because freshness is a hash comparison against the current
artefact rather than a date written by hand.

## 3. Supported upgrade period

- **Supported:** the current minor line and the immediately previous minor line.
- **Security fixes:** backported to the current minor line for 90 days after the next
  minor ships; anything older is documented as unsupported rather than silently patched.
- **Breaking changes** to the skill contracts (`sus.playbook`, `sus.direction-derivation`,
  `sus.state-machine`) require a schema version bump and a migration note in
  `docs/MIGRATIONS.md`. A contract change without a version bump fails G12 (contract
  drift).
- **Host support tiers** (`supported` / `experimental` / `untested`) are generated from
  artefact hashes plus smoke receipts. A tier is never upgraded by editing a table.

## 4. Security reporting

- **Where:** open a private security advisory on the repository
  (`Security → Advisories → Report a vulnerability`). Do **not** open a public issue for a
  vulnerability.
- **What to include:** affected version or commit, the smallest reproduction, and the
  impact you believe it has.
- **What to expect:** acknowledgement within 5 working days; a triage verdict (fix,
  document, or not-a-vulnerability with reasoning) within 10; credit in the advisory
  unless you ask otherwise.
- **Never waivable:** G13 (critical security/privacy) cannot be relaxed by any decision
  entry. Any finding in that class blocks a release until fixed or explicitly scoped out
  by the owner with a written rationale.
- **Local-only binding:** the Live Studio bridge binds to localhost, requires a
  capability grant per action, sanitises page content and refuses ambiguous mappings. A
  bypass of those properties is a G13 finding.
- **Data handling:** screenshots, DOM captures and video recordings can contain personal
  data. Evidence bundles stay private until consent, licensing and PII/secret checks
  happen (T0906); publication of any bundle is an owner decision.

## 5. What maintenance does not promise

- No SLA beyond the triage windows above.
- No support for hosts without skill-file loading; the CLI fallback is documented, and
  that is the extent of it.
- No guarantee that a future specification version will not change a rule. When it does,
  the playbook reference date is how a reader can tell whether the rule was written
  against the current text.
