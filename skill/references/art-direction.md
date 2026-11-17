# Art direction and imagery (T0408)

Imagery is a direction decision, not a production step. Three failures ship over
and over because nobody wrote them down before the build:

1. **the hero with no known licence** — discovered by legal, months later, with the
   asset already in a campaign;
2. **the crop that eats the subject** — the photograph's face or product sits
   outside the mobile frame because nobody chose a focal point;
3. **the 1.4 MB JPEG** — every image was "within budget" on its own, and the sum
   was never checked.

So the imagery plan is a **required field of the direction record**
(`sus.direction-derivation`), and `pnpm directions` refuses a record whose plan
cannot be checked. Stable codes are listed at the end.

## 1. Asset strategy

Exactly one strategy per surface. It is a statement about what carries the page,
not a list of files:

| Strategy | Right when | Wrong when |
| --- | --- | --- |
| `photography-led` | the product's world is a real physical situation, and one honest photograph outweighs three illustrations | the photograph is a stock "team meeting" standing in for a product |
| `illustration-led` | the concept is abstract and drawing it is clearer than photographing it | the illustration is a decorative blob or a "hero spot art" |
| `product-ui` | the interface itself is the proof — screenshots, real data shapes | the screenshot is a mocked dashboard nobody uses |
| `type-only` | the message is short and verbal, and the page is faster and calmer without images | it is an excuse to avoid deciding anything |
| `mixed` | genuinely different jobs per section | every section gets a different medium for variety |

`type-only` with assets is a contradiction and fails (`type-only-with-assets`).
Every other strategy needs at least one asset, or it is a wish
(`strategy-without-assets`).

## 2. Licensing record (mandatory, per asset)

A boolean "licensed: true" is not a record. Per asset:

- **`name`** — the licence as it is actually called ("Commission, full commercial
  rights", "Unsplash licence pre-2021", "CC BY 4.0").
- **`permitsCommercial: true`** — a literal in the schema. An asset whose rights
  forbid commercial use cannot be described honestly in this record, so the record
  refuses it rather than annotating it.
- **`proofRef`** — where the proof lives: a contract page, a receipt id, a licence
  key. A licence nobody can produce on request is a rumour.
- **`requiresAttribution` + `attributionText`** — if attribution is required, the
  text that will appear is part of the record (`attribution-text-missing`).
- **`expiresAt` + `renewalOwner`** — an expiring licence needs a person
  (`expiry-without-owner`), or it lapses silently on a Sunday.
- **`provider`** — required for `stock` and `generated` assets
  (`provider-unrecorded`): the agency, the generator and its terms. Generated
  assets carry their own unresolved questions about training data and
  resemblance; recording the provider is the minimum that keeps the question
  open, not a claim that it is settled.

## 3. Focal points

Normalised to the frame: `{ x, y }`, `0..1` from the top-left. One focal point per
asset, used by every crop.

- The centre point (`0.5, 0.5`) on a **hero** fails (`focal-point-unchosen`): the
  centre is what you get when nobody looked, and it is exactly where crops are
  least forgiving.
- Crops are derived from the focal point, never from `object-position: center`.
  The mobile crop keeps the focal point inside 10 % of the frame edge.
- For `css-only` assets the focal point still matters: it anchors where the
  gradient's brightest stop sits.

## 4. Weight budgets

Two numbers per plan: a **per-asset allowance** and a **surface ceiling**. The sum
of allowances may not exceed the ceiling (`weight-budget-exceeded`), and no single
asset may exceed the ceiling (`asset-exceeds-total-budget`). Checking each asset
alone is the mistake this rule exists to prevent.

Working defaults, not measurements — they are this project's conventions, and
nothing here was derived from a benchmark:

| Asset | Allowance | Note |
| --- | --- | --- |
| hero photograph | 150–250 KB | AVIF first, WebP fallback; the LCP element |
| section photograph | 80–150 KB | below the fold, lazy |
| illustration (SVG) | 20–60 KB | hand-authored geometry, no embedded rasters |
| texture (CSS) | 0 bytes | gradients and masks cost nothing to transfer |
| icon | inline SVG, a few hundred bytes | one stroke weight, one set |

Zero is only valid for `css-only` (`zero-budget-without-css`): anything the
browser downloads weighing nothing means the field was never filled in.

## 5. Fallback is part of the plan

`fallback` says what renders when an asset fails, is blocked, or never arrives —
in words specific enough to build (for example *"the hero becomes the week-row
component, 0 bytes"*). "A placeholder" is not a fallback; it is another asset
nobody licensed.

## 6. Where this is enforced

`pnpm directions` (part of `pnpm verify`) runs `checkDerivation` over every record
in `evals/directions/`. Codes:

`type-only-with-assets`, `strategy-without-assets`, `provider-unrecorded`,
`attribution-text-missing`, `expiry-without-owner`, `zero-budget-without-css`,
`asset-exceeds-total-budget`, `weight-budget-exceeded`, `focal-point-unchosen`,
`duplicate-asset-id`, plus the schema-level failures for a missing licence field or
a `permitsCommercial` that is not `true`.

## 7. What this module does not decide

- **Whether the direction is good.** This checks that the plan is complete and
  honest; taste is `direction.md`'s job.
- **Real numbers for real networks.** The budgets are conventions. A project with
  measured LCP data from its own field telemetry should replace them with its own —
  and say so in the record.
- **Model licences for generated assets.** Recording the provider keeps the
  question visible; it does not answer it.
