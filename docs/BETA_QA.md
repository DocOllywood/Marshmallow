# Beta QA checklist (pre–50 user freeze)

Run on **production** after deploy. Viewports: **375px** and **430px** width.

## New user

- [ ] Signup completes; profile row exists
- [ ] Onboarding worlds are only: **Love, Friendship, Dating & Sex, Family, Human Nature**
- [ ] No Reality TV / Celebrity / old worlds in onboarding

## Home

- [ ] Today's **Daily** section renders (legacy round OK without tension)
- [ ] Daily with **tension_id** shows **Today's tension** block
- [ ] **Quick** hero still works
- [ ] CrowdSense chip loads

## Daily play

- [ ] Tension header on play screen (when assigned)
- [ ] **Question X of 5** progress
- [ ] Standard Pick → Predict → Lock on Q1–Q3
- [ ] **The Switch** on Q4 (stay / switch, then predict)
- [ ] **The Line** on Q5 (instant seal, no predict)
- [ ] Leave mid-round → **Continue the Daily** resumes correctly
- [ ] After 5 locked: **Today's Read** narrative (not raw counts)
- [ ] **Tomorrow** tease when next round has tension (no question spoilers)

## Reveal

- [ ] Explicit **Reveal the Daily** gate
- [ ] Copy says **Marshmallow players** (not "people" / "everyone")
- [ ] **The Gap** on scored questions (predicted % vs player % for your choice)
- [ ] **No Gap** on Line question
- [ ] **Accuracy** matches pre–Part 13 behavior
- [ ] **CrowdSense** delta still shown on round summary
- [ ] Legacy single-marshmallow reveal still works

## Mobile

- [ ] 375px: tension, questions, predict sliders, Today's Read readable
- [ ] 430px: same checks

## Security

- [ ] No crowd results before legitimate reveal
- [ ] User A cannot read User B's entries/predictions
- [ ] Ordinary user cannot INSERT/UPDATE `human_tensions` or `daily_rounds`

## Part 13 full round (internal)

See [PART13_TEST_ROUND.md](./PART13_TEST_ROUND.md) for **HONESTY vs. KINDNESS** direct-URL playthrough.
