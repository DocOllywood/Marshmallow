/** Editorial contract for launch Money Era daily — partner dream job (draft QA). */

export const LAUNCH_MONEY_DAILY_ROUND_ID = "40000000-0000-4000-8000-000000000009";
export const LAUNCH_MONEY_DAILY_ROUND_DATE = "2026-10-27";
export const LAUNCH_MONEY_DAILY_PRINCIPLE_ID = "60000000-0000-4000-8000-000000000003";
export const LAUNCH_MONEY_DAILY_PRINCIPLE_SLUG = "partnership-vs-independence";
export const LAUNCH_MONEY_DAILY_TENSION_ID = "50000000-0000-4000-8000-000000000007";
export const LAUNCH_MONEY_DAILY_TENSION_SLUG = "belonging-independence";
export const LAUNCH_MONEY_DAILY_PRICE_REFERENCE_SIDE = "left" as const;

export const LAUNCH_MONEY_DAILY_MARSHMALLOWS = [
  "31000000-0000-4000-8000-000000000050",
  "31000000-0000-4000-8000-000000000051",
  "31000000-0000-4000-8000-000000000052",
  "31000000-0000-4000-8000-000000000053",
  "31000000-0000-4000-8000-000000000054",
] as const;

export const LAUNCH_MONEY_DAILY_Q1 = {
  move: "31000000-0000-4000-8000-000000000501",
  stay: "31000000-0000-4000-8000-000000000502",
} as const;

export const LAUNCH_MONEY_DAILY_STAGE_SPEC = [
  {
    position: 1,
    stage: "instinct",
    requiresPrediction: false,
    pressureType: null,
    costType: null,
    costLabel: "Before any offer details",
  },
  {
    position: 2,
    stage: "pressure",
    requiresPrediction: false,
    pressureType: "PERSONAL_COST",
    costType: "TIME",
    costLabel: "Three months without work",
  },
  {
    position: 3,
    stage: "consequence",
    requiresPrediction: false,
    pressureType: "MONEY",
    costType: "CAREER",
    costLabel: "$68,000 salary",
  },
  {
    position: 4,
    stage: "flip",
    requiresPrediction: true,
    pressureType: "PERSPECTIVE",
    costType: null,
    costLabel: null,
  },
  {
    position: 5,
    stage: "line",
    requiresPrediction: false,
    pressureType: null,
    costType: null,
    costLabel: null,
  },
] as const;

export const LAUNCH_MONEY_DAILY_LINE_CHOICES = [
  {
    id: "31000000-0000-4000-8000-000000000541",
    label: "Never — that's their own life to live",
    tensionSide: "right",
  },
  {
    id: "31000000-0000-4000-8000-000000000542",
    label: "Only if they'd choose it freely",
    tensionSide: "right",
  },
  {
    id: "31000000-0000-4000-8000-000000000543",
    label: "If I've moved or sacrificed for them before",
    tensionSide: "left",
  },
  {
    id: "31000000-0000-4000-8000-000000000544",
    label: "If we're building a long-term life together",
    tensionSide: "left",
  },
  {
    id: "31000000-0000-4000-8000-000000000545",
    label: "If the opportunity is once-in-a-lifetime for us",
    tensionSide: "left",
  },
] as const;

export const LAUNCH_MONEY_DAILY_OUTSIDE_INVITATION =
  "Notice how differently a sacrifice sounds depending on who is being asked to make it.";

export const LAUNCH_MONEY_DAILY_DIRECT_QA_PATH = `/m/${LAUNCH_MONEY_DAILY_MARSHMALLOWS[0]}`;
