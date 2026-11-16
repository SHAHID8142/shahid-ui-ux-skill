# skill/ — portable SUS Agent Skill bundle (ADR-002)

This directory holds the canonical Agent Skills bundle: `SKILL.md`, `references/` (9 files
plus 36 playbooks), `evals/evals.json`, and `scripts/` (empty by design). Host-specific entry
files are generated artifacts, never hand-edited (ADR-002).

Validate the bundle with `node scripts/validate-skill.mjs`; install it with
`node scripts/install/install.mjs`. Every host row in `docs/SUPPORT_MATRIX.md` is
`experimental` — see that page before claiming a host works.