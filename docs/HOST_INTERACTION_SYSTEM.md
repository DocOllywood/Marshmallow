# Host Interaction System

**Status:** Founder-approved product specification (documentation only)  
**Checkpoint:** Prototype C — THE HOST  
**Branch:** `cursor/reconstruct-the-best-ab`  
**Reference commit:** `f4046eb070ebe96c7bb32a48fdc7fa508aac0d50`  
**Last updated:** August 30, 2026

---

## Purpose of this document

This is the canonical UX specification for Marshmallow's emerging **Host interaction model**. It captures what we learned from Prototype C and defines reusable product language **before** any production migration.

**Audience:** founder, product designer, engineer, future content editor.

**This document does not authorize production implementation.** It describes intent, rules, and a future migration map.

---

## 1. Core product decision

Marshmallow is no longer primarily presented as:

> **A structured behavioral experiment.**

It should increasingly feel like:

> **A conversation with Marshmallow.**

### What stays under the hood

The internal Experiment architecture remains rigorous and unchanged in concept:

```
INSTINCT
  → PRESSURE
  → CONSEQUENCE / TEMPTATION
  → FLIP
  → THE LINE
```

These stages still drive semantics, trajectory, Today's Read, crowd comparison, and editorial QA. They are **internal product machinery**.

### What moves to the surface

The player experiences:

1. **Marshmallow asks.**
2. **You answer.**
3. **Marshmallow notices.**
4. **Marshmallow changes one thing.**
5. **You answer again.**
6. **Marshmallow pushes again.**
7. **Then it switches sides.**
8. **Then it asks you to Read the Room.**
9. **Then you draw the Line.**
10. **Then Marshmallow shows you what you just did.**

### The central UX principle

> **The machine stays under the hood. The personality moves to the surface.**

Structured behavioral data is preserved without making the user feel like they are filling out a psychology questionnaire.

The user should **not** need to understand:

- `pressure_type`
- canonical side
- `movementCount`
- `firstMovementStage`
- trajectory
- experiment archetype
- semantic mappings

Those remain internal. The user experiences only the **consequences** of them.

---

## 2. Marshmallow as Host

Marshmallow is a **host** — not a therapist, psychologist, moral authority, teacher, survey administrator, game-show announcer, or villain.

### Host temperament

| Is | Is not |
|----|--------|
| Curious | Judgmental |
| Mischievous | Clinical |
| Observant | Preachy |
| Slightly knowing | Moralizing |
| Playful | Condescending |
| Calm | Dramatic for drama's sake |
| Economical with words | Over-explaining |

Marshmallow **never explains the player's personality**. Marshmallow **notices behavior**.

### Voice examples (THE BEST)

**Bad (diagnostic):**

- You're more selfish than you think.
- You're hypocritical.
- You value honesty until it hurts.
- You have trust issues.

**Good (behavioral notice):**

- YOU SAID NO. / You sure?
- STILL SURE. / Okay. / One more thing.
- THAT MOVED YOU.
- Now switch sides.
- DIFFERENT FROM THIS SIDE.
- YOU WOULDN'T GIVE THE NAME. / YOU'D ASK FOR IT.

---

## 3. Host Voice Constitution

Ten rules for all Host copy — in reactions, transitions, Reads, and microcopy.

### 1. React, don't diagnose

Describe what happened. Never tell the player what kind of person they are.

### 2. Fewer words = more power

Reaction copy should usually be extremely short. One headline. One or two supporting lines. Stop.

### 3. Don't explain the mechanic

Never say: *"This circumstance caused you to change your answer."* when *"THAT MOVED YOU."* does the job.

### 4. Marshmallow remembers

Reaction copy may reference previous answers. The host must feel like it has been paying attention.

### 5. Marshmallow can challenge

Permitted challenge phrases include:

- You sure?
- Still sure?
- Okay.
- One more thing.

These are invitations, not accusations.

### 6. Marshmallow does not argue

It never tells the user their answer is wrong.

### 7. Marshmallow does not praise virtue

Avoid:

- Good choice.
- You stayed principled.
- You did the right thing.

### 8. Marshmallow does not shame

Avoid:

- Really?
- Wow.
- That's cold.
- Yikes.

### 9. The Host creates anticipation

Reaction copy should frequently point toward what happens next:

- One more thing.
- Now switch sides.
- Okay. Try it from here.

Combine reaction + next tease on one screen when possible (Prototype C learning).

### 10. Silence is part of the voice

Not every action requires a reaction. The Host becomes more powerful if it does not comment after every trivial interaction. Use the **Reaction Priority Model** (Section 7) to skip noise.

---

## 4. Public vs internal language

### Internal only (never player-facing in Host mode)

| Term | Role |
|------|------|
| INSTINCT | Stage 1 — first call |
| PRESSURE | Stage 2 — loyalty / social pressure |
| CONSEQUENCE / TEMPTATION | Stage 3 — cost or temptation enters |
| FLIP | Stage 4 — perspective reversal |
| `pressure_type` | Editorial metadata (e.g. LOYALTY) |
| canonical side | LEFT / RIGHT behavioral dimension |
| movement / trajectory | Internal path analysis |
| `cost_type`, `cost_level` | Price archetype metadata |
| experiment archetype | e.g. standard, price |

These power engineering, editorial QA, Today's Read matrices, and crowd comparison. They must remain in content definitions and domain logic.

### Public / branded mechanics

| Term | Status |
|------|--------|
| **READ THE ROOM** | Signature Marshmallow mechanic — keep branded |
| **THE LINE** | Signature Marshmallow mechanic — keep branded |
| **TODAY'S READ** | Signature Marshmallow mechanic — keep branded |

### Candidate: "You sure?"

**"You sure?"** is Host dialogue, not a formal named mechanic.

Do **not** productize it as a fourth branded stage (e.g. no "YOU SURE? MODE" in UI chrome). It works because it sounds like Marshmallow talking. Labeling it would make the experience feel like a survey module again.

Use it as copy within the Host voice, not as navigation or stage taxonomy.

---

## 5. Canonical player flow

### Preferred rhythm (model, not rigid law)

```
QUESTION 1
  → answer
  → HOST REACTION

QUESTION 2          (one fact changes)
  → answer
  → HOST REACTION

QUESTION 3          (one fact changes)
  → answer
  → HOST REACTION + transition tease
      "Now switch sides."

QUESTION 4          (perspective reversal)
  → answer
  → HOST REACTION
      e.g. "DIFFERENT FROM THIS SIDE."

READ THE ROOM
  → prediction
  → LOCK IT

THE LINE
  → boundary choice

TODAY'S READ
  → behavioral observation + YOUR LINE

ANOTHER MARSHMALLOW   (continuous)
  or sealed → reveal path (Daily)
```

### When to skip a reaction screen

| Situation | Guidance |
|-----------|----------|
| First call at Q1 | Usually show — establishes Host presence ("YOU SAID YES. You sure?") |
| Hold with no narrative surprise | May skip if copy adds nothing new |
| Neutral Line choice | No interstitial needed before Read |
| Repeated trivial holds | Skip after first hold confirmation |
| Transition-only beats | **Never** use a full screen for transition alone — merge into prior reaction (C learning) |
| Post-Line | Go directly to Today's Read — Line choice is the acknowledgment |

**Rule of thumb:** If the reaction does not add a new observation or tease the next beat, skip it.

---

## 6. Reaction taxonomy

Internal reaction types (preserve in domain — do not remove):

| Internal type | Meaning |
|---------------|---------|
| `first_call` | Q1 — establishing starting side |
| `held` | Same canonical side as prior stage |
| `moved` | Changed canonical side |
| `moved_back` | Returned to original side |
| `flip_held` | Same call after perspective reversal |
| `flip_moved` | Different call after perspective reversal |

These live in `resolveExperimentStageReactionType()` and power generic production copy today.

### Host-language layer (candidate families)

The future system translates behavioral state → contextual Host copy.

| Family | Generic Host example | Notes |
|--------|---------------------|-------|
| **FIRST CALL** | YOU SAID YES. / You sure? | Q1 only |
| **HELD** | STILL SURE. / Okay. | Same side |
| **HELD UNDER STRONGER TEMPTATION** | STILL NO. / Interesting. | Withheld despite escalation |
| **MOVED** | THAT MOVED YOU. | Side changed |
| **FLIP HELD** | SAME CALL. / Other side too. | Perspective changed, behavior didn't |
| **FLIP MOVED** | DIFFERENT FROM THIS SIDE. | Inverse pattern — high drama |
| **RETURNED** | BACK WHERE YOU STARTED. | moved_back |
| **BOUNDARY APPEARED** | THERE IT IS. | Disclosure after prior withhold |

**Important:** These are **families**, not universal literal strings.

### Authored vs generic

| Priority | Example |
|----------|---------|
| Generic | THAT MOVED YOU. |
| **Better authored (THE BEST Q3)** | THE TRUTH WAS EASY. / THE NAME WASN'T. |

Experiment-specific authored reactions should **win** when available. Generic families are fallback.

---

## 7. Reaction priority model

Proposed hierarchy (spec only — not implemented):

```
1. Experiment-specific authored reaction
2. Archetype-specific reaction        (e.g. Price: "THE PRICE MOVED YOU.")
3. Contextual semantic reaction       (e.g. Q3 withhold after Q2 disclose)
4. Generic trajectory reaction        (HELD / MOVED / FLIP_*)
5. No reaction                        (skip screen)
```

This prevents every Marshmallow from sounding identical while keeping engineering predictable.

### Implementation note (future)

Authoring could live in:

- Content definitions per experiment (preferred for flagship content)
- Archetype defaults in domain (Price, standard)
- Generic builder in `experiment-stage-reaction.ts` (fallback)

Prototype C demonstrates authored reactions in `the-best-host-rehearsal-fixture.ts`. Production would generalize this pattern.

---

## 8. The Flip

The Flip remains structurally essential but should usually **not** be labeled "FLIP" publicly.

### Preferred Host transition

> **Now switch sides.**

The power comes from **perspective reversal itself**, not from a stage counter or academic label.

### Why this beats "04 / 05 — FLIP"

| Stage label presentation | Host presentation |
|--------------------------|-------------------|
| Feels like a test | Feels like a conversation turn |
| User tracks progress mechanically | User feels the scenario shift |
| Invites meta-thinking | Keeps user in the dilemma |

### When a visible branded transition might someday help

- Onboarding / first-time player education (one-time)
- Design-system or founder QA views
- Archetypes where "switch" is not literal (document exception per experiment)

Default for player-facing Host mode: **no stage label, no FLIP badge**.

---

## 9. Read the Room

### Definition

**Read the Room** is a signature Marshmallow mechanic.

After several questions about **yourself**, Marshmallow asks:

> **How well do you understand everyone else?**

This creates a second psychological layer:

| Layer | Question |
|-------|----------|
| Self-knowledge | What would I do? |
| Social prediction | What would *people* do? |

### Canonical presentation hierarchy

```
READ THE ROOM

[brief contextual sentence if needed]
  e.g. "You'd ask." / "You wouldn't ask."

How many people would?

[LARGE PREDICTION %]

[SINGLE CLEAN SLIDER]

LOCK IT
```

### Presentation rules

- Avoid dashboard clutter
- Avoid redundant charts **before** results exist
- Avoid unnecessary instructions — the user already understands the scenario
- Do **not** change scoring / allocation architecture (`applyAllocation`, seal validation)

### Crowd results (future reveal)

During a **real Daily reveal**, crowd data should appear in a separate beat — not mixed into the prediction screen.

| Phase | Experience |
|-------|------------|
| Prediction (play) | Minimal — slider + LOCK IT |
| Reveal (later) | Crowd %, trajectory comparison, "The crowd" vs "Your path" |

Continuous play may show crowd results differently or defer them; Daily synchronization is intentional.

Prototype C stores prediction locally only — no fake crowd.

---

## 10. The Line

### Definition

**The Line** is a signature Marshmallow mechanic. It is **not** simply "Question 5."

It asks where the player's answer **finally changes** — a boundary question.

### Line question forms (experiment-dependent)

| Form | Example experiment |
|------|---------------------|
| How far would you actually go? | Price / Money |
| How much would it take? | Temptation |
| How much would you want to know? | THE BEST (truth threshold) |
| Where does your answer finally change? | Generic |

### Line dimensions (internal)

The Line may encode:

- money threshold
- truth threshold
- risk threshold
- social threshold
- relationship threshold
- status threshold
- revenge threshold
- privacy threshold
- temptation threshold

One underlying dimension per experiment. Choices form an **escalating continuum**.

### Line-writing rules

1. **Ordered progression** — choices must have editorial order
2. **One underlying dimension** — not a grab bag
3. **Psychologically meaningful increments** — each step should feel distinct
4. **No fake precision** unless the experiment warrants it (e.g. dollar amounts)
5. **Extremes both plausible** — neither end should feel like a joke answer
6. **Middle is not automatically "good"** — avoid virtue ladder
7. **Avoid obvious virtue ladder** — no "clearly correct" middle option
8. **Concise mobile choices** — short labels, tappable targets

### THE BEST example

```
HOW MUCH TRUTH WOULD YOU ACTUALLY WANT?

I DON'T WANT TO KNOW          ← withhold extreme
JUST TELL ME I'M NOT          ← partial withhold
TELL ME IF IT WAS AN EX       ← neutral
TELL ME WHO IT WAS            ← disclose
TELL ME WHY THEY WERE BETTER  ← disclose extreme
```

### Presentation

The Line should feel like the player **locating their own boundary**.

- Strong visual hierarchy
- **THE LINE** label visible (branded)
- Question + choices dominate
- Minimal mascot
- No extra explanatory copy

---

## 11. Today's Read

### Definition

**Today's Read** is the emotional payoff.

It answers:

> **What did Marshmallow notice?**

Not:

> **What personality type are you?**

### Preferred construction

Two behavioral observations:

```
BEHAVIOR A.
BEHAVIOR B.
```

### THE BEST examples

| Pattern | Headline | Body |
|---------|----------|------|
| Inverse Q3/Q4 | YOU WOULDN'T GIVE THE NAME. | YOU'D ASK FOR IT. |
| Held withhold | YOU KEPT THE EASIER ANSWER. | EVEN WHEN THEY ASKED FOR THE TRUTH. |
| Q2 move | "DON'T LIE TO ME" MOVED YOU. | — |
| Q3 semantic | THE TRUTH WAS EASY. | THE NAME WASN'T. |

### Other experiment patterns

- YOU SAID NO. / UNTIL NOBODY WOULD KNOW.
- THE MONEY DIDN'T MOVE YOU. / THE PROMOTION DID.
- YOU KEPT SAYING NO. / UNTIL THERE WAS SOMETHING IN IT FOR YOU.
- YOU HELD. / EVEN FROM THE OTHER SIDE.

### Read rules

| Rule | Detail |
|------|--------|
| Behavioral | Describe choices, not character |
| Specific | Earned by actual trajectory |
| Short | Headline + 0–2 body lines |
| Slightly uncomfortable | Honest, not cruel |
| Screenshot-worthy | Punchy, uppercase display typography |
| Non-diagnostic | Never use: liar, hypocrite, selfish, toxic, bad partner |
| Deterministic | Authored matrices preferred over AI for launch |

### YOUR LINE

Today's Read should include **YOUR LINE** — the selected Line choice — as part of the psychological payoff:

```
TODAY'S READ
[headline]
[body]

YOUR LINE
[selected Line label]
```

---

## 12. Ending / continuous play

### Emerging continuous-play ending

```
TODAY'S READ
YOUR LINE
ANOTHER MARSHMALLOW     ← primary CTA

Home                    ← quiet secondary (optional)
```

The primary emotional endpoint should **not** automatically be:

- Outside the Experiment
- A virtue assignment
- A wait screen
- A generic reflection exercise

Those may belong elsewhere in the product. For **continuous play**, the strongest action after a good Read may simply be **another Marshmallow**.

Prototype C validates this ending. Do not invent fake "next experiment" content — reset or route to real catalog when production-ready.

### What to remove from Host continuous ending

Prototype A/B exposed legacy leakage via `ExperimentTodaysReadCard`:

- Outside the Experiment
- "Your calls are locked."
- "The crowd is still deciding."
- "Come back for the reveal."

**None of these belong** in the Host continuous ending.

---

## 13. Daily vs continuous

The Host model applies to **both** play modes. The **presentation** is shared; the **post-Read lifecycle** differs.

### Continuous

```
Question → escalation → Flip → Read the Room → Line → Today's Read → Another Marshmallow
```

- No artificial wait
- No "come back for reveal" on the ending screen
- `keepPlayingHref` / catalog routing when available

### Daily

```
Question → escalation → Flip → Read the Room → Line → sealed
  → synchronized reveal (later)
  → Today's Read + crowd result
  → tomorrow tease
```

- Daily synchronization remains a product mechanic
- Host presentation does **not** remove legitimate waiting when intentional
- Wait/reveal copy belongs on **Daily-specific** surfaces, not forced into continuous Host ending

| Concern | Continuous (Host) | Daily |
|---------|-------------------|-------|
| Ending CTA | ANOTHER MARSHMALLOW | HOME + tomorrow tease |
| Wait copy | None on ending | Appropriate on sealed/reveal |
| Crowd results | Deferred or separate | Part of reveal event |
| Outside the Experiment | Not on Host ending | May remain on Daily home/reveal context |

---

## 14. Visual language

### Base tokens (Prototype C learning)

| Token | Use |
|-------|-----|
| Cream canvas | Background |
| Charcoal ink | Primary text |
| Sage / money green | Host CTAs, Read the Room accent, Line accent |
| Soft sage borders | Line choice emphasis |
| Serif display typography | Scenario questions |
| Existing mascot | Host reactions |

**Purple is not globally deleted.** Prototype C suggests **sage/green is the leading candidate** for canonical Experiment/Host actions. Legacy purple may remain elsewhere until a deliberate global token migration.

### Screen hierarchy

| Screen | What dominates |
|--------|----------------|
| **Question** | Scenario text. Mascot small or absent. |
| **Reaction** | Mascot + very short Host response. |
| **Read the Room** | Prediction % + slider. |
| **The Line** | Boundary question + choices. |
| **Today's Read** | Observation text. Mascot restrained. |

### Avoid looking like

- A dashboard
- A survey / Typeform
- A fintech app
- A therapy app

---

## 15. Mascot role

Marshmallow is a **character**, not decorative clip art on every screen.

| Phase | Mascot presence |
|-------|-----------------|
| Question | Small / optional — scenario is protagonist |
| Reaction | **Large** — Marshmallow is speaking |
| Read the Room | Small companion / observer |
| The Line | Minimal — question and choices dominate |
| Today's Read | Optional / restrained — words are the payoff |

### Mascot states (existing assets only)

Use existing states: `fluffy`, `thinking`, `sealed`, etc. No new animation architecture for Host launch.

---

## 16. Pacing budget

A Marshmallow should feel **fast** even with multiple psychological beats.

### Principles

1. **One meaningful decision per screen**
2. **One new fact at a time** — each question changes exactly one thing
3. **Reaction screens extremely short** — headline + 1–2 lines + CTA
4. **No consecutive transition-only screens** — merge reaction + tease (C Q3 learning)
5. **No redundant confirmations** — don't ask user to confirm what they just did
6. **Don't explain what the user already understands**
7. **Combine reaction + next tease where possible**
8. **Minimize scrolling** on common iPhone viewport (~390×844)
9. **Preserve comfortable touch targets** (min ~44pt)

### Target tap budget (standard 5-stage experiment, Host mode)

| Beat | Taps | Notes |
|------|------|-------|
| Q1 answer | 1 | |
| Q1 reaction | 1 | CONTINUE |
| Q2 answer | 1 | |
| Q2 reaction | 1 | CONTINUE |
| Q3 answer | 1 | |
| Q3 reaction + switch tease | 1 | CONTINUE (combined — not 2 screens) |
| Q4 answer | 1 | |
| Q4 reaction → Read the Room | 1 | Direct CTA, not CONTINUE then setup |
| Prediction + LOCK IT | 2 | Slider optional drag + seal |
| Line choice | 1 | Goes to Today's Read |
| Today's Read ending | 1 | ANOTHER MARSHMALLOW or HOME |

**Target total:** ~12–14 taps for a full play (excluding slider drags).

Prototype B required ~16+ due to extra switch screen and CONTINUE chains. Prototype C reduced this.

---

## 17. Content × Host relationship

> **Good Host UX cannot rescue weak content.**

The content still needs **Forbidden Temptation** qualities:

- Temptation
- Rationalization
- Social argument
- Self-insertion
- Movement potential
- Strong Flip
- Strong Line
- Screenshot-worthy Read

**Host UX amplifies tension. It does not manufacture tension from a boring premise.**

Likewise, great content can be weakened by too much UI ceremony (stage labels, double transitions, wait copy on wrong surfaces).

The **editorial engine** and **Host interaction model** must work together. See `docs/EDITORIAL_DAILY.md` for content rules.

---

## 18. Production migration audit

**Audit date:** August 30, 2026. **No code was changed** for this section.

### 18.1 Components reusable unchanged

| Component | Path | Notes |
|-----------|------|-------|
| `ChoiceButton` | `src/components/ChoiceButton.tsx` | Generic — no stage coupling |
| `MarshmallowMascot` | `src/components/MarshmallowMascot.tsx` | Generic |
| `MarshmallowLogo` | `src/components/MarshmallowLogo.tsx` | Generic |
| `ExperimentCostDisplay` | `src/components/experiment/ExperimentCostDisplay.tsx` | Price archetype display |
| `MoneyPrimaryButton` | `src/components/MoneyPrimaryButton.tsx` | Sage CTA candidate |
| Domain: trajectory, Today's Read builders | `src/domain/daily/trajectory.ts`, `todays-read.ts`, `experiment-read.ts` | Logic stays — presentation changes |

### 18.2 Candidates for reuse or Host-mode adaptation

| Component | Path | Notes |
|-----------|------|-------|
| `ExperimentStageReactionInterstitial` | `src/components/experiment/ExperimentStageReactionInterstitial.tsx` | See guidance below |

**`ExperimentStageReactionInterstitial` — candidate, not confirmed reuse unchanged:**

Prototype C validated the **reaction-interstitial concept** (mascot + short Host copy + continue). The existing production component, however, may carry presentation assumptions from the older structured Experiment UX (stage accent depth, price-era chrome, `seal-moment` styling, three-field reaction shape including `nextTease`).

During Host migration:

- The underlying **reaction / interstitial beat** is reusable in principle.
- The **existing component implementation must be inspected** before assuming drop-in compatibility.
- Host mode may need **reduced chrome** and a **different visual hierarchy** (mascot + headline dominate; less ceremony).
- **Do not duplicate** a parallel interstitial component prematurely.
- **Decide reuse vs adaptation during implementation** — either extend this component with a Host variant/props, or adapt its layout after audit.

### 18.3 Components that could accept Host presentation mode

| Component | Path | Proposed prop / change |
|-----------|------|------------------------|
| `ExperimentStageHeader` | `src/components/experiment/ExperimentStageHeader.tsx` | `showStageLabel={false}` or `variant="host"` |
| `OutsideTheExperiment` | `src/components/experiment/OutsideTheExperiment.tsx` | `hidden` or surface-gated |
| `ExperimentTodaysReadCard` | `src/components/experiment/ExperimentTodaysReadCard.tsx` | `showOutside`, `showWaitCopy`, `ctaMode: "host" \| "daily" \| "continuous"` |
| `BinaryPredictor` | `src/components/play/Predictors.tsx` | Prompt slots / `variant="host"` — decouple embedded copy |

### 18.4 Components likely needing refactoring

| Component | Path | Blocker |
|-----------|------|---------|
| **`ExperimentPlayExperience`** | `src/components/experiment/ExperimentPlayExperience.tsx` | Monolith: stage headers on every screen, reaction builder wired to generic HOLD/MOVE, flip two-phase flow, server sealing, inline microcopy |
| **`buildExperimentStageReaction`** | `src/domain/daily/experiment-stage-reaction.ts` | Generic taxonomy ≠ Host conversational beats |
| **`BinaryPredictor`** | `src/components/play/Predictors.tsx` | Copy + mascot + "You picked X" framing embedded |
| **`ExperimentTodaysReadCard`** | `src/components/experiment/ExperimentTodaysReadCard.tsx` | Bundles read + Outside + wait + dare + CTAs |
| **`PlayExperience`** | `src/components/play/PlayExperience.tsx` | No presentation mode router |

### 18.5 Where generic HOLD/MOVE copy lives

| Location | Role |
|----------|------|
| `src/domain/daily/experiment-stage-reaction.ts` | `buildExperimentStageReaction`, `resolveExperimentStageReactionType`, `NEXT_STAGE_TEASE` |
| `src/domain/daily/experiment-read.ts` | End-of-day trajectory headlines |
| `src/domain/daily/experiment-play.ts` | Reveal path: "← YOU MOVED" annotations |
| `ExperimentPlayExperience.tsx` | Inline stage microcopy |

Host-authored copy today lives only in dev fixtures:

- `src/domain/dev/the-best-host-rehearsal-fixture.ts`
- `src/domain/dev/the-best-you-sure-rehearsal-fixture.ts`

### 18.6 Where stage labels are rendered

| Location | Function |
|----------|----------|
| `ExperimentStageHeader.tsx` | Primary in-play renderer |
| `src/domain/daily/experiment.ts` | `experimentStageLabel()` |
| `src/domain/daily/experiment-play.ts` | `experimentStageHeaderLabel()` |
| `src/domain/daily/price.ts` | `priceStagePresentationLabel()` |
| `ExperimentRevealShow.tsx` | Reveal path labels |

Host mode: hide header or pass `showStageLabel={false}`.

### 18.7 BinaryPredictor coupling

| Layer | Location |
|-------|----------|
| Logic | `src/domain/play/allocations.ts` — `applyAllocation`, `evenSplit` |
| State / seal | `ExperimentPlayExperience` — percents, validation, server seal |
| Presentation | `Predictors.tsx` — hardcoded copy, mascot lean, duplicate bar |

Prototype C reimplemented slider in `TheBestHostRehearsal.tsx` → `HostReadTheRoomStage` to avoid production copy.

**Future:** Extract `BinaryPredictorShell` (slider + large %) with injectable prompts.

### 18.8 Today's Read coupling to Outside / wait

`ExperimentTodaysReadCard.tsx` always renders:

1. Read content (from domain props)
2. `<OutsideTheExperiment />`
3. Hardcoded wait copy ("Your calls are locked.", "The crowd is still deciding.", "Come back for the reveal.")
4. Optional Dare / Blind Mirror
5. HOME / KEEP PLAYING CTAs

Prototype C uses custom `HostTodaysReadEnding` — intentionally bypasses this card.

**Future:** Split into composable sections.

### 18.9 Continuous vs Daily branching

| Mode | Entry | Ending |
|------|-------|--------|
| **Daily** | `ExperimentDailyHomeSection` → `/m/{id}` | Today's Read → HOME, reveal later |
| **Continuous** | `ContinuousExperimentHomeSection` → `/m/{id}` | Today's Read → KEEP PLAYING via `continuousNextHref` |

Both use the same `ExperimentPlayExperience` when `isExperimentDaily`. Branching is in:

- `src/server/dal/play.ts` — `entrySurface`, `continuousNextHref`
- `src/components/home/HomeFeed.tsx` — section visibility
- `src/domain/play/continuous.ts` — catalog eligibility

Host mode must respect this split: continuous gets **ANOTHER MARSHMALLOW**; Daily keeps sealed/reveal lifecycle.

### 18.10 Incremental migration sequence (proposed)

1. **Split `ExperimentTodaysReadCard`** — composable footer (wait / Outside / CTAs)
2. **Decouple `BinaryPredictor`** — shell + prompt props
3. **Add Host copy layer** — authored reactions alongside `buildExperimentStageReaction`
4. **Add `presentation: "standard" | "host"` to `ExperimentPlayExperience`** — hide headers, swap reaction builder, merge transitions
5. **Wire continuous ending** — `ctaMode="host"` → ANOTHER MARSHMALLOW / keep playing
6. **Pilot on one continuous experiment** — not global flag day
7. **Daily Host presentation** — later phase; preserve reveal synchronization

### 18.11 Highest-risk regressions

| Risk | Mitigation |
|------|------------|
| Sealing / server action flow broken | Host mode is presentation-only first — don't touch seal chain |
| Daily reveal timing | Keep wait copy on Daily surfaces only |
| Price archetype microcopy | Archetype-specific Host reactions needed |
| Trajectory / Today's Read wrong | Domain logic unchanged — test matrices per experiment |
| Analytics event gaps | Map Host screens to existing events before launch |
| A/B founder prototypes broken | A/B/C remain dev-only — separate from production flag |

---

## 19. Reference: THE BEST as Host exemplar

Prototype C (`/dev/the-best-host`) is the living reference for this spec.

| Beat | Host copy (authored) |
|------|---------------------|
| Q1 YES | YOU SAID YES. / You sure? |
| Q2 hold | STILL SURE. / Okay. / One more thing. |
| Q2 move | THAT MOVED YOU. / Okay. / One more thing. |
| Q3 withhold | STILL NO. / Okay. / Now switch sides. |
| Q3 disclose→withhold | THE TRUTH WAS EASY. / THE NAME WASN'T. / Now switch sides. |
| Q3 withhold→disclose | THERE IT IS. / Now switch sides. |
| Q4 inverse | DIFFERENT FROM THIS SIDE. → **READ THE ROOM** |
| Read the Room | You'd ask. / How many people would? |
| Line | HOW MUCH TRUTH WOULD YOU ACTUALLY WANT? |
| Read | YOU WOULDN'T GIVE THE NAME. / YOU'D ASK FOR IT. |
| Ending | ANOTHER MARSHMALLOW |

Dev implementation (do not migrate blindly):

- `src/components/dev/TheBestHostRehearsal.tsx`
- `src/domain/dev/the-best-host-rehearsal-fixture.ts`
- Shared content: `src/domain/content/the-best-experiment.ts`

---

## 20. Risks and open questions

### Risks

| Risk | Description |
|------|-------------|
| **Over-unification** | Forcing all experiments through one generic Host voice |
| **Under-authoring** | Generic "THAT MOVED YOU." everywhere — bland Host |
| **Premature production migration** | Changing `ExperimentPlayExperience` before card/predictor split |
| **Daily regression** | Accidentally removing wait/reveal from Daily when fixing continuous |
| **Content pipeline gap** | Editors lack tools to author Host reactions per experiment |
| **Token schism** | Purple vs sage coexistence confusing designers |

### Open questions

1. **When does Daily adopt Host presentation?** Same time as continuous, or phased?
2. **Reveal screen Host treatment?** Stage labels may remain useful for crowd comparison — exception?
3. **Price archetype Host voice?** Does "THE PRICE MOVED YOU." fit Host constitution or need rewrite?
4. **Authored reaction storage?** Content JSON vs code vs CMS?
5. **"You sure?" at Q1 always?** Or skip when experiment tone is heavier?
6. **ANOTHER MARSHMALLOW vs KEEP PLAYING?** Brand language for continuous CTA?
7. **Outside the Experiment fate?** Daily home only? Removed entirely from play ending?
8. **Global sage migration?** Prototype C only, or product-wide token update later?

---

## 21. Related documents

| Document | Relationship |
|----------|--------------|
| `docs/EDITORIAL_DAILY.md` | Content rules — tensions, five-question structure, Forbidden Temptation |
| `docs/BETA_CONTENT.md` | Beta content guidelines |
| Prototype C code | Living reference — dev only, not production |

---

## 22. Document changelog

| Date | Change |
|------|--------|
| 2026-08-30 | Initial canonical spec from Prototype C founder approval |
