# Licence and distribution decision packet (owner decision D06/B003)

**Status: undecided. This page does not choose.** It exists because the repository is public while the
product is proprietary-by-declaration, and those two facts are not a decision.

## What is true today (measured 2026-11-17)

| Fact | Where |
| --- | --- |
| Repository is **public** | owner decision D34 |
| **No `LICENSE` file** at the root | `ls LICENSE*` → nothing |
| `skill/SKILL.md` declares `license: Proprietary — all rights reserved` | `skill/SKILL.md` front matter |
| No package is published; root `package.json` has no `bin` | `package.json` |
| No GitHub release exists | `gh release list` |
| Product publication is explicitly **not** authorised | owner decision D28/D30/D34; T1005 `pending` |
| Upstream guide **text** was never copied into the repository | D06/D08; `docs/RESEARCH_SYNTHESIS*` licence note |

Public visibility currently grants readers the GitHub terms only: they may view and fork, and they have
no licence to reuse, modify or redistribute. That is a legal state, not a usable product state.

## The three options, with consequences

| | A. Permissive open source (e.g. MIT, Apache-2.0) | B. Source-available / proprietary grant | C. Private commercial packaging |
| --- | --- | --- | --- |
| **What users get** | reuse, modify, redistribute with attribution | read and evaluate; a written permission grant defines use | nothing without a contract |
| **Installability** | an npm package or a git dependency is natural | install allowed only as the grant says; a hosted/managed path is typical | distributed per customer |
| **Contributions** | inbound = outbound; a DCO/CLA is optional | contributions need an explicit assignment or CLA | internal only |
| **Third-party notices** | must carry dependencies' notices and any upstream attribution | same obligations, narrower audience | same, plus contract terms |
| **Modern Web Guidance / research material** | must stay uncopied unless its licence allows inclusion; cite, do not paste | same | same |
| **Trademark** | name/brand needs its own statement | same | same |
| **Change of mind later** | hard: permissive rights are irrevocable for released versions | easier: tighten a future grant | n/a |
| **Owner effort now** | pick text, add `LICENSE`, add notices, state it in `README`/`SKILL.md` | draft a grant, add `LICENSE`-equivalent, state scope | contract, packaging, support |

Both A and B require the same immediate work: **a `LICENSE` (or grant) file, a notices file, and one
sentence in `README.md` and `skill/SKILL.md`** that agrees with each other. Today the three would
disagree the moment a licence file existed, because `SKILL.md` says proprietary.

## What an agent will not do

- Not create a `LICENSE` file, not change the `license:` field, not publish a package, not open a
  release. All of those are this decision's output, and misdeclaring a licence is not a reversible
  code change.

## What the owner needs to answer (one line each)

1. **Which option** — A, B or C?
2. If A: which licence text (MIT and Apache-2.0 differ on patent grants), and is attribution required?
3. If B: what is granted in writing (read-only evaluation, internal use, commercial use), and is
   redistribution forbidden?
4. If C: who receives it, and does the public repository stay public as a reference?
5. Does the **skill text** follow the same licence as the code, or a different one?
6. Is the SUS name/brand covered by the grant, or reserved?

Answering 1 and 5 unblocks everything else; the rest can follow before T1005.

## Dependencies to check before any choice

`pnpm licenses list` is the mechanical input: the dependency tree's licences constrain option A (some
licences are incompatible with some permissive licences) and must be reproduced in notices for every
option. That listing is generated at release time, not hard-coded here, because the lockfile changes.