/** Editorial contract for launch Money Era daily — partner dream job (draft QA). */

export const LAUNCH_MONEY_DAILY_ROUND_ID = "40000000-0000-4000-8000-000000000009";
/** Pre-promotion direct-URL QA slot (hosted moves to BETA_ROUND_DATE on launch). */
export const LAUNCH_MONEY_DAILY_ROUND_DATE = "2026-10-27";
/** Live beta calendar date — Wed 2026-09-02 (Money Week Day 1). */
export const LAUNCH_MONEY_DAILY_BETA_ROUND_DATE = "2026-09-02";
export const LAUNCH_MONEY_DAILY_BETA_OPENS_AT = "2026-09-02T12:00:00.000Z";
export const LAUNCH_MONEY_DAILY_BETA_CLOSES_AT = "2026-09-03T01:00:00.000Z";
export const LAUNCH_MONEY_DAILY_BETA_REVEALS_AT = "2026-09-03T03:30:00.000Z";
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

/** Canonical Day 1 editorial — mirrors hosted refine migration (single source for rehearsal). */
export const LAUNCH_MONEY_DAILY_TITLE = "Would you move for their dream job?";
export const LAUNCH_MONEY_DAILY_SUBTITLE = "One offer. Two lives. See where your answer moves.";
export const LAUNCH_MONEY_DAILY_TENSION_DISPLAY = "BELONGING vs. INDEPENDENCE";

export const LAUNCH_MONEY_DAILY_BINARY_LABELS = {
  move: "Move with them",
  stay: "Stay where you are",
} as const;

export const LAUNCH_MONEY_DAILY_FLIP_LABELS = {
  stay: "No, I would stay",
  go: "Yes, I would go",
} as const;

export const LAUNCH_MONEY_DAILY_QUESTIONS = [
  "Your partner was offered a job they've wanted for years in another city. You'd have to leave your job, your friends, and the life you built where you are. Would you move with them?",
  "The role comes with a 40% raise for them — but you would likely be unemployed for at least three months after moving, with no guarantee you'd find work quickly. What now?",
  "Moving means giving up your $68,000-a-year job — with nothing else lined up. What do you do?",
  "Now you're your partner. You got the offer in another city. They say they won't move — they won't leave their job, friends, or the life they built. Would you take the job anyway?",
  "When is it fair to ask your partner to move for your career?",
] as const;

export const LAUNCH_MONEY_DAILY_Q2 = {
  move: "31000000-0000-4000-8000-000000000511",
  stay: "31000000-0000-4000-8000-000000000512",
} as const;

export const LAUNCH_MONEY_DAILY_Q3 = {
  move: "31000000-0000-4000-8000-000000000521",
  stay: "31000000-0000-4000-8000-000000000522",
} as const;

export const LAUNCH_MONEY_DAILY_Q4 = {
  stay: "31000000-0000-4000-8000-000000000531",
  go: "31000000-0000-4000-8000-000000000532",
} as const;

export type LaunchMoneyDailyStageContent = {
  position: number;
  marshmallowId: string;
  stage: (typeof LAUNCH_MONEY_DAILY_STAGE_SPEC)[number]["stage"];
  question: string;
  requiresPrediction: boolean;
  pressureType: string | null;
  costType: string | null;
  costLabel: string | null;
  isLine: boolean;
  choices: readonly { id: string; label: string; tensionSide: "left" | "right" }[];
};

export const LAUNCH_MONEY_DAILY_STAGES: readonly LaunchMoneyDailyStageContent[] =
  LAUNCH_MONEY_DAILY_STAGE_SPEC.map((spec, index) => {
    const position = spec.position;
    const question = LAUNCH_MONEY_DAILY_QUESTIONS[index] ?? "";
    if (position === 5) {
      return {
        ...spec,
        marshmallowId: LAUNCH_MONEY_DAILY_MARSHMALLOWS[4]!,
        question,
        isLine: true,
        choices: LAUNCH_MONEY_DAILY_LINE_CHOICES.map((choice) => ({
          id: choice.id,
          label: choice.label,
          tensionSide: choice.tensionSide as "left" | "right",
        })),
      };
    }
    if (position === 4) {
      return {
        ...spec,
        marshmallowId: LAUNCH_MONEY_DAILY_MARSHMALLOWS[3]!,
        question,
        isLine: false,
        choices: [
          { id: LAUNCH_MONEY_DAILY_Q4.stay, label: LAUNCH_MONEY_DAILY_FLIP_LABELS.stay, tensionSide: "left" },
          { id: LAUNCH_MONEY_DAILY_Q4.go, label: LAUNCH_MONEY_DAILY_FLIP_LABELS.go, tensionSide: "right" },
        ],
      };
    }
    const qChoices =
      position === 1
        ? LAUNCH_MONEY_DAILY_Q1
        : position === 2
          ? LAUNCH_MONEY_DAILY_Q2
          : LAUNCH_MONEY_DAILY_Q3;
    return {
      ...spec,
      marshmallowId: LAUNCH_MONEY_DAILY_MARSHMALLOWS[position - 1]!,
      question,
      isLine: false,
      choices: [
        {
          id: qChoices.move,
          label: LAUNCH_MONEY_DAILY_BINARY_LABELS.move,
          tensionSide: "left" as const,
        },
        {
          id: qChoices.stay,
          label: LAUNCH_MONEY_DAILY_BINARY_LABELS.stay,
          tensionSide: "right" as const,
        },
      ],
    };
  });
