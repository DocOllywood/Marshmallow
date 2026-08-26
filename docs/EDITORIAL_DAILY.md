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
