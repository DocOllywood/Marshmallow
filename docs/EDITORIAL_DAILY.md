# Daily Round Editorial Rules

## Marshmallow mission

Marshmallow exists to make people notice other people.

It explores the small decisions that shape everyday human experience.

The product does not tell users how to behave. It creates dilemmas, reveals disagreement, and occasionally invites one small act of consideration outside the app.

No points. No proof. No performance.

---

## Editorial tensions

Future Dailies can explore tensions such as:

- COURTESY vs CONVENIENCE
- HONESTY vs KINDNESS
- GENEROSITY vs FAIRNESS
- ATTENTION vs INDIFFERENCE
- SELF vs STRANGER
- PRIVACY vs CONNECTION
- LOYALTY vs PRINCIPLE
- FORGIVENESS vs SELF-RESPECT
- TRUST vs PRIVACY
- LOVE vs FREEDOM

Love, family, and friendship remain valid worlds and contexts. Do not rewrite historical rounds.

---

## Human Relationships taxonomy

**Human Relationships** is the product universe. Consumer worlds are:

| World | Slug | Relational context |
|-------|------|--------------------|
| Love | `love` | Established romantic relationships |
| Dating & Sex | `dating-sex` | Attraction, early dating, sex, choosing partners |
| Friendship | `friendship` | Friend loyalty, boundaries, drifting apart |
| Family | `family` | Parents, siblings, children, obligation |
| Human Nature | `human-nature` | General human behavior without a specific relationship |

**Daily rounds** should normally be coherent within **one world** — all five questions share the same relational context.

**Tensions** (e.g. HONESTY vs. KINDNESS) are independent narrative axes that can recur across worlds. The tension is reusable; the world determines who the dilemma is about:

- **Love** — "Do you tell your partner…"
- **Friendship** — "Do you tell your best friend…"
- **Family** — "Do you tell your sibling…"

The Daily is a **shared experience**: one UTC day, one world, one set of questions, one reveal — the same for every Marshmallow player. Onboarding world picks shape discovery and Quick; they do not select today's Daily.

---

Each Daily explores **one human tension** (e.g. HONESTY vs. KINDNESS). The **topic/world** (Love, Friendship, etc.) is context only.

## Five-question structure

A five-question Daily should progressively explore one tension:

| Position | Role | Purpose |
|----------|------|---------|
| Q1 | Instinct | Simple initial moral/social judgment |
| Q2 | Consequence | Introduce a cost or consequence |
| Q3 | Ambiguity | Make the conflict less obvious |
| Q4 | The Switch | User commits, then one meaningful fact changes |
| Q5 | The Line | User identifies the threshold/boundary |

This is an editorial principle, not a database constraint.

## Tension-side metadata

Choices may carry `metadata.tension_side`: `left`, `right`, or `neutral`. This is set editorially — never inferred algorithmically. Used for Today's Read narrative only.

## Crowd language

Crowd results represent **Marshmallow players**, not humanity generally. Prefer: "64% of today's Marshmallow players chose Yes."

## Question quality

A Marshmallow question should not merely be easy to answer. The stronger editorial test is:

**After answering this, would I genuinely want to know how other Marshmallow players answered?**

Weak: "Is honesty important in relationships?"

Strong: "Would you want to know about a one-time betrayal from ten years ago if it never happened again?"

Every Daily question should create enough unresolved social curiosity that withholding the crowd result matters. Editorial principle only — not a database rule.

---

## Core product language

**Marshmallow**

**See where your beliefs bend.**

Every day, one human dilemma gets harder.

Make your instinctive call.  
Watch the circumstances change.  
Find your line.  
Then discover where everyone else moved.

**Mission**

Marshmallow challenges certainty.

It does not tell people what to believe.

It gives users a safe hypothetical space to notice:

- when they hold
- when they move
- what changes their judgment
- how differently other people see the same dilemma

---

## EXPERIMENT DAILY CONSTITUTION

Experiment Dailies (`daily_rounds.metadata.experiment.version = 1`) follow a different editorial contract than legacy five-question Dailies. Every experiment must obey:

### 1. ONE CENTRAL DILEMMA

The five stages are transformations of the **same situation**.

Not five questions on the same topic.

Each stage changes one meaningful variable in one continuous scenario. The player should feel they are still inside the same story.

### 2. TWO DEFENSIBLE VALUES

The experiment must place two reasonable principles in conflict.

**Never:**

- good vs evil
- kind vs cruel
- smart vs stupid
- healthy vs toxic

**Strong examples:**

- LOYALTY vs JUSTICE
- HONESTY vs KINDNESS
- PRIVACY vs PROTECTION
- MERCY vs ACCOUNTABILITY
- AUTHENTICITY vs BELONGING
- LOVE vs FREEDOM
- AMBITION vs CONTENTMENT
- FAIRNESS vs GENEROSITY
- COURTESY vs CONVENIENCE
- SELF-RESPECT vs FORGIVENESS

Both sides must remain defensible throughout. If one side is obviously correct, rewrite.

### 3. VALUES MUST BECOME EXPENSIVE

A principle is not interesting while it costs nothing.

Each experiment asks:

**What would have to change for you to change your mind?**

**Pressure types** (keep taxonomy small — do not invent casually):

| Type | Use |
|------|-----|
| `REMORSE` | Mitigating intent or regret enters |
| `PERSONAL_COST` | The user would pay a personal price |
| `HARM_TO_OTHERS` | Collateral or third-party cost |
| `LOYALTY` | Obligation to someone close intensifies |
| `SELF_INTEREST` | Self-protection enters |
| `SOCIAL_PRESSURE` | Reputation, group, or visibility |
| `MONEY` | Financial stakes |
| `CERTAINTY` | New information changes odds |
| `TIME` | Duration or deadline matters |
| `PERSPECTIVE` | Flip — user becomes the affected party |

Set `pressure_type` on marshmallow metadata where applicable. Q4 Flip always uses `PERSPECTIVE`.

### 4. ONE VARIABLE PER STAGE

| Stage | Role |
|-------|------|
| **INSTINCT** | Baseline call — no mitigating facts yet |
| **PRESSURE** | One mitigating or aggravating fact |
| **CONSEQUENCE** | Material human cost |
| **FLIP** | Perspective reversal |
| **LINE** | Boundary threshold |

Do not change three facts simultaneously just to make the question darker.

### 5. DARK DOES NOT MEAN SHOCKING

Do not rely on:

- gore
- sexual violence
- death threats
- abuse bait
- graphic trauma
- illegal instructions
- extreme taboo merely for engagement

Darkness should come from **reasonable values becoming incompatible**.

### 6. THE FLIP MATTERS

Flip should genuinely test whether the user's principle changes when they become the affected party.

Avoid cosmetic perspective changes. The reversal must alter what is at stake for *them*.

No legacy Switch prompt on experiment Dailies. The Q4 pick **is** the flipped-position answer. Prediction (Read the Room) comes **after** the flip pick, on Q4 only.

### 7. THE LINE MUST BE A REAL BOUNDARY

The Line cannot merely be another five-option opinion poll.

Choices must progress through increasing or decreasing tolerance — a real threshold question:

*When would this become unacceptable?* or *Where would you draw the line?*

Use `tension_side` on Line choices where editorially meaningful (`left`, `right`, `neutral`).

### 8. NEVER DIAGNOSE

Today's Read describes:

- where the user began
- where they moved
- what condition moved them
- where they ended
- where they drew the Line

**Never infer:** personality, mental health, morality, character, clinical traits.

No labels like loyal, selfish, hypocritical, brave, cowardly, fair, unfair.

### 9. CONTRADICTION IS INFORMATION

Never frame movement as failure, inconsistency, or hypocrisy.

Changing one's mind is the object of the experiment. Movement feedback is neutral: **YOU HELD.** / **YOU MOVED.**

### 10. CROWD ≠ CORRECT

Never imply the majority answer is morally correct.

Marshmallow players are a comparison group, not moral authority. Prefer "Marshmallow players" or "the crowd" — never "people generally" or "humans."

### 11. PREDICTION IS SECONDARY

The user is primarily exploring their own judgment.

**Read the Room** is the social-intelligence coda — Q4 only on experiment Dailies.

Do not return to putting prediction after every stage in experiment Dailies. Q1–Q3 and Q5 are pick-only.

### 12. THE QUESTION QUALITY TEST

Before publishing an experiment, ask:

- Would I hesitate?
- Could two thoughtful people reasonably disagree?
- Does each new fact genuinely change the moral calculus?
- Would I be curious where other players moved?
- Would the reveal still interest me hours later?

If not, rewrite it.

---

## Experiment stage metadata (reference)

Round:

```json
{ "experiment": { "version": 1 } }
```

Marshmallow (explicit recommended):

```json
{
  "experiment": {
    "stage": "instinct | pressure | consequence | flip | line",
    "pressure_type": "REMORSE",
    "requires_prediction": false
  }
}
```

Binary choice metadata:

```json
{ "tension_side": "left | right | neutral" }
```

Canonical sides follow `human_tensions.left_label` (left) and `human_tensions.right_label` (right). Never hardcode semantic labels inconsistently with the seeded tension row.

---

## Reference experiment (draft QA)

**LOYALTY vs. JUSTICE** · *How much does loyalty excuse?*

- Round: `40000000-0000-4000-8000-000000000006` (draft, not public Home)
- Q1: `31000000-0000-4000-8000-000000000020`
- Direct QA: `/m/31000000-0000-4000-8000-000000000020`

Do not promote to today's public Daily without explicit editorial approval.
