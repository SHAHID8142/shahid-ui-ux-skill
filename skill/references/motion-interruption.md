# Motion: interruption, focus and duplication

Every launch playbook carries a motion decision per transition (the playbook
contract refuses a transition without one, and refuses `motion: none` without a
reason). This file covers the three things a per-transition record cannot say on
its own: **what happens when a transition is interrupted**, **where focus goes
while something is moving**, and **how a repeated press avoids doing the work
twice**.

## The duration band

Motion durations come from three categories, and nothing outside the band ships:

| Category | Range used | For |
| --- | --- | --- |
| fast | 60–120 ms | background, border, underline, press feedback |
| base | 160–200 ms | dialogs, toasts, content swap |
| slow | 240 ms and up | *not used by any launch playbook* — avoid; if you need it, state why in the transition's motion string |

A duration outside 60–240 ms fails `node scripts/check-motion.mjs`. The band
exists because motion longer than a quarter second is read as waiting, and motion
shorter than 60 ms is not perceived as motion at all — it is a flicker that costs
a frame for no information.

## Interruption: three legal answers

Every transition declares one, because "what happens mid-flight" is the difference
between a control that feels broken and one that feels fast:

- **`cancel-restart`** — the new intent wins; the in-flight animation stops and
  the new one begins. Use when the destination state is the same *kind* of state
  (hover out, hover back in).
- **`complete-then-apply`** — finish the current transition, then apply the queued
  state. Use for anything with a committed outcome (save, payment, navigation):
  reversing a commercial transition mid-flight leaves the UI claiming a state the
  server never reached.
- **`ignore`** — the second signal is dropped while the first is in flight. Use
  only when the transition is instantaneous or unskippable (a document load).

The rule behind choosing: **a transition that reports a server outcome may never
be `cancel-restart`.** If the user can reverse it, the UI can show "saved" for
something that was not saved.

## Rapid toggle

`coalesce` (the default in every launch playbook), `queue` or `allow`. Repeated
keystrokes in a filter, repeated quantity edits and repeated toggles coerce — the
cost of queueing is latency the user reads as lag, and the cost of `allow` is a
state storm. `allow` is reserved for instantaneous, unguarded transitions.

## No click duplication

Three separate mechanisms, all required for any control that changes server state:

1. **the control disables on press** — necessary, not sufficient, because a second
   `click` event can queue before the disable paints;
2. **the handler refuses a second in-flight request** for the same operation — this
   is the actual guard;
3. **the request carries an idempotency key**; a retry reuses the same key.

A spinner is feedback, never a guard. There is a test asserting these phrases
survive in the checkout playbook, because the checklist is exactly the kind of
thing that gets trimmed during refactoring.

## Focus preserved across animated change

- **Never move focus to follow an animation.** Focus moves because the *user's
  intent* moved (open a dialog, close it, submit), not because something slid.
- **A dialog records its trigger** and returns focus there on close — including
  when the close happened during an exit animation. If the trigger is gone (the
  row was deleted), focus goes to the next meaningful element in document order
  and the change is announced.
- **Reduced motion must not change the focus path.** It removes travel, scale and
  stagger; it keeps the same element focused before, during and after.
- **An animation that would hide the focused control is a defect**, not a styling
  choice: the reduced-motion variant and the default variant must both leave the
  focused element visible.

## Reduced motion preserves information and operation

`prefers-reduced-motion` is not "turn off the feature". The playbook contract
requires each transition to state its reduced-motion equivalent, and the check
refuses evasive answers (`disabled`, `none`) — because those delete the information
the motion was carrying. Legitimate answers look like: "appears instantly at full
size with focus already inside", "the previous rows stay visible and the toolbar
states that results are loading", "label swaps instantly; no spinner that hides the
label".

## Honest limits

- Durations in the band are a convention derived from practice, not a measured
  perceptual threshold; SUS does not claim otherwise.
- The checker validates declared motion, not rendered motion. Proving the built
  page obeys its plan is the browser-level work in T0906; until then this is a
  contract, not a measurement.
- Slow motion (>240 ms) is excluded from the launch set by policy, not by
  inability: a project that needs it must justify it in the transition record.
