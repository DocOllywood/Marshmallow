/** Money Week editorial contract — Days 2–7 (draft QA). Day 1: launch-money-daily.ts */

export type MoneyWeekDaySpec = {
  day: number;
  roundId: string;
  roundDate: string;
  title: string;
  subtitle: string;
  tensionId: string;
  tensionSlug: string;
  principleId: string;
  principleSlug: string;
  priceReferenceSide: "left" | "right";
  outsideInvitation: string;
  marshmallowIds: readonly [string, string, string, string, string];
  q1: { move: string; stay: string };
  stages: readonly {
    position: number;
    stage: string;
    requiresPrediction: boolean;
    pressureType: string | null;
    costType: string | null;
    costLevel: number | null;
    costLabel: string | null;
  }[];
  lineChoices: readonly {
    id: string;
    label: string;
    tensionSide: "left" | "right" | "neutral";
  }[];
  directQaPath: string;
};

export const MONEY_WEEK_PRINCIPLES = [
  {
    id: "60000000-0000-4000-8000-000000000004",
    slug: "generosity-vs-boundaries",
    displayName: "Generosity versus boundaries",
    description:
      "When helping someone you care about conflicts with protecting your own limits.",
  },
  {
    id: "60000000-0000-4000-8000-000000000005",
    slug: "ambition-vs-time",
    displayName: "Ambition versus time",
    description: "When earning more conflicts with the life you want outside work.",
  },
  {
    id: "60000000-0000-4000-8000-000000000006",
    slug: "privacy-vs-gain",
    displayName: "Privacy versus gain",
    description:
      "When keeping something private conflicts with what someone will pay to hear.",
  },
  {
    id: "60000000-0000-4000-8000-000000000007",
    slug: "fairness-vs-self-interest",
    displayName: "Fairness versus self-interest",
    description: "When equal treatment conflicts with what someone you love needs.",
  },
  {
    id: "60000000-0000-4000-8000-000000000008",
    slug: "integrity-vs-advancement",
    displayName: "Integrity versus advancement",
    description: "When moving up conflicts with work you can stand behind.",
  },
  {
    id: "60000000-0000-4000-8000-000000000009",
    slug: "security-vs-autonomy",
    displayName: "Security versus autonomy",
    description:
      "When tying your finances to someone else conflicts with protecting your own standing.",
  },
] as const;

export const MONEY_WEEK_DAYS: MoneyWeekDaySpec[] = [
  {
    day: 2,
    roundId: "40000000-0000-4000-8000-000000000010",
    roundDate: "2026-11-03",
    title: "How much should you cover for a friend?",
    subtitle: "One friendship. One tab. See where your answer moves.",
    tensionId: "50000000-0000-4000-8000-000000000002",
    tensionSlug: "loyalty-self-preservation",
    principleId: "60000000-0000-4000-8000-000000000004",
    principleSlug: "generosity-vs-boundaries",
    priceReferenceSide: "left",
    outsideInvitation:
      "Notice one friendship today where money sits quietly underneath what someone can or can't do.",
    marshmallowIds: [
      "31000000-0000-4000-8000-000000000060",
      "31000000-0000-4000-8000-000000000061",
      "31000000-0000-4000-8000-000000000062",
      "31000000-0000-4000-8000-000000000063",
      "31000000-0000-4000-8000-000000000064",
    ],
    q1: {
      move: "31000000-0000-4000-8000-000000000601",
      stay: "31000000-0000-4000-8000-000000000602",
    },
    stages: [
      {
        position: 1,
        stage: "instinct",
        requiresPrediction: false,
        pressureType: null,
        costType: null,
        costLevel: null,
        costLabel: "Before any cost",
      },
      {
        position: 2,
        stage: "pressure",
        requiresPrediction: false,
        pressureType: "LOYALTY",
        costType: "RELATIONSHIP",
        costLevel: 1,
        costLabel: "They covered your rent",
      },
      {
        position: 3,
        stage: "consequence",
        requiresPrediction: false,
        pressureType: "MONEY",
        costType: "MONEY",
        costLevel: 2,
        costLabel: "$300/month",
      },
      {
        position: 4,
        stage: "flip",
        requiresPrediction: true,
        pressureType: "PERSPECTIVE",
        costType: null,
        costLevel: null,
        costLabel: null,
      },
      {
        position: 5,
        stage: "line",
        requiresPrediction: false,
        pressureType: null,
        costType: null,
        costLevel: null,
        costLabel: null,
      },
    ],
    lineChoices: [
      {
        id: "31000000-0000-4000-8000-000000000641",
        label: "Never — I pay my own way",
        tensionSide: "right",
      },
      {
        id: "31000000-0000-4000-8000-000000000642",
        label: "Only if I can pay them back",
        tensionSide: "right",
      },
      {
        id: "31000000-0000-4000-8000-000000000643",
        label: "If they've helped me before",
        tensionSide: "left",
      },
      {
        id: "31000000-0000-4000-8000-000000000644",
        label: "If they're offering freely",
        tensionSide: "left",
      },
      {
        id: "31000000-0000-4000-8000-000000000645",
        label: "If I'd do the same for them",
        tensionSide: "left",
      },
    ],
    directQaPath: "/m/31000000-0000-4000-8000-000000000060",
  },
  {
    day: 3,
    roundId: "40000000-0000-4000-8000-000000000011",
    roundDate: "2026-11-10",
    title: "What would you trade for a bigger paycheck?",
    subtitle: "One raise. One schedule. See where your answer moves.",
    tensionId: "50000000-0000-4000-8000-000000000005",
    tensionSlug: "time-ambition",
    principleId: "60000000-0000-4000-8000-000000000005",
    principleSlug: "ambition-vs-time",
    priceReferenceSide: "left",
    outsideInvitation:
      "Think about what you'd trade an ordinary Saturday for — if someone offered enough.",
    marshmallowIds: [
      "31000000-0000-4000-8000-000000000070",
      "31000000-0000-4000-8000-000000000071",
      "31000000-0000-4000-8000-000000000072",
      "31000000-0000-4000-8000-000000000073",
      "31000000-0000-4000-8000-000000000074",
    ],
    q1: {
      move: "31000000-0000-4000-8000-000000000701",
      stay: "31000000-0000-4000-8000-000000000702",
    },
    stages: [
      {
        position: 1,
        stage: "instinct",
        requiresPrediction: false,
        pressureType: null,
        costType: null,
        costLevel: null,
        costLabel: "Before any offer",
      },
      {
        position: 2,
        stage: "pressure",
        requiresPrediction: false,
        pressureType: "PERSONAL_COST",
        costType: "MONEY",
        costLevel: 1,
        costLabel: "Behind on saving",
      },
      {
        position: 3,
        stage: "consequence",
        requiresPrediction: false,
        pressureType: "TIME",
        costType: "TIME",
        costLevel: 2,
        costLabel: "26 weekends a year",
      },
      {
        position: 4,
        stage: "flip",
        requiresPrediction: true,
        pressureType: "PERSPECTIVE",
        costType: null,
        costLevel: null,
        costLabel: null,
      },
      {
        position: 5,
        stage: "line",
        requiresPrediction: false,
        pressureType: null,
        costType: null,
        costLevel: null,
        costLabel: null,
      },
    ],
    lineChoices: [
      {
        id: "31000000-0000-4000-8000-000000000741",
        label: "Zero — weekends stay mine",
        tensionSide: "left",
      },
      {
        id: "31000000-0000-4000-8000-000000000742",
        label: "Up to 6 weekends",
        tensionSide: "left",
      },
      {
        id: "31000000-0000-4000-8000-000000000743",
        label: "Up to 12 weekends",
        tensionSide: "right",
      },
      {
        id: "31000000-0000-4000-8000-000000000744",
        label: "Up to 26 if the pay is right",
        tensionSide: "right",
      },
      {
        id: "31000000-0000-4000-8000-000000000745",
        label: "Any amount for enough pay",
        tensionSide: "right",
      },
    ],
    directQaPath: "/m/31000000-0000-4000-8000-000000000070",
  },
  {
    day: 4,
    roundId: "40000000-0000-4000-8000-000000000012",
    roundDate: "2026-11-17",
    title: "Would you sell a private story?",
    subtitle: "One secret. One offer. See where your answer moves.",
    tensionId: "50000000-0000-4000-8000-000000000004",
    tensionSlug: "gain-privacy",
    principleId: "60000000-0000-4000-8000-000000000006",
    principleSlug: "privacy-vs-gain",
    priceReferenceSide: "right",
    outsideInvitation:
      "Notice one thing you wouldn't tell a stranger for any price — and one you might.",
    marshmallowIds: [
      "31000000-0000-4000-8000-000000000080",
      "31000000-0000-4000-8000-000000000081",
      "31000000-0000-4000-8000-000000000082",
      "31000000-0000-4000-8000-000000000083",
      "31000000-0000-4000-8000-000000000084",
    ],
    q1: {
      move: "31000000-0000-4000-8000-000000000801",
      stay: "31000000-0000-4000-8000-000000000802",
    },
    stages: [
      {
        position: 1,
        stage: "instinct",
        requiresPrediction: false,
        pressureType: null,
        costType: null,
        costLevel: null,
        costLabel: "Before any offer",
      },
      {
        position: 2,
        stage: "pressure",
        requiresPrediction: false,
        pressureType: "LOYALTY",
        costType: "RELATIONSHIP",
        costLevel: 1,
        costLabel: "They asked you not to tell",
      },
      {
        position: 3,
        stage: "consequence",
        requiresPrediction: false,
        pressureType: "MONEY",
        costType: "MONEY",
        costLevel: 2,
        costLabel: "$5,000",
      },
      {
        position: 4,
        stage: "flip",
        requiresPrediction: true,
        pressureType: "PERSPECTIVE",
        costType: null,
        costLevel: null,
        costLabel: null,
      },
      {
        position: 5,
        stage: "line",
        requiresPrediction: false,
        pressureType: null,
        costType: null,
        costLevel: null,
        costLabel: null,
      },
    ],
    lineChoices: [
      {
        id: "31000000-0000-4000-8000-000000000841",
        label: "Nothing — some things stay private",
        tensionSide: "right",
      },
      {
        id: "31000000-0000-4000-8000-000000000842",
        label: "Only if everyone involved agreed",
        tensionSide: "right",
      },
      {
        id: "31000000-0000-4000-8000-000000000843",
        label: "If it could help people like us",
        tensionSide: "left",
      },
      {
        id: "31000000-0000-4000-8000-000000000844",
        label: "If the story was already mostly public",
        tensionSide: "left",
      },
      {
        id: "31000000-0000-4000-8000-000000000845",
        label: "If I needed the money urgently",
        tensionSide: "left",
      },
    ],
    directQaPath: "/m/31000000-0000-4000-8000-000000000080",
  },
  {
    day: 5,
    roundId: "40000000-0000-4000-8000-000000000013",
    roundDate: "2026-11-24",
    title: "Is equal always fair?",
    subtitle: "One inheritance. Two needs. See where your answer moves.",
    tensionId: "50000000-0000-4000-8000-000000000011",
    tensionSlug: "loyalty-justice",
    principleId: "60000000-0000-4000-8000-000000000007",
    principleSlug: "fairness-vs-self-interest",
    priceReferenceSide: "left",
    outsideInvitation:
      "Notice one split today — money, effort, or credit — that wouldn't feel equal to everyone involved.",
    marshmallowIds: [
      "31000000-0000-4000-8000-000000000090",
      "31000000-0000-4000-8000-000000000091",
      "31000000-0000-4000-8000-000000000092",
      "31000000-0000-4000-8000-000000000093",
      "31000000-0000-4000-8000-000000000094",
    ],
    q1: {
      move: "31000000-0000-4000-8000-000000000901",
      stay: "31000000-0000-4000-8000-000000000902",
    },
    stages: [
      {
        position: 1,
        stage: "instinct",
        requiresPrediction: false,
        pressureType: null,
        costType: null,
        costLevel: null,
        costLabel: "Before any details",
      },
      {
        position: 2,
        stage: "pressure",
        requiresPrediction: false,
        pressureType: "LOYALTY",
        costType: "RELATIONSHIP",
        costLevel: 1,
        costLabel: "They supported you for a year",
      },
      {
        position: 3,
        stage: "consequence",
        requiresPrediction: false,
        pressureType: "MONEY",
        costType: "MONEY",
        costLevel: 2,
        costLabel: "$40,000 debt",
      },
      {
        position: 4,
        stage: "flip",
        requiresPrediction: true,
        pressureType: "PERSPECTIVE",
        costType: null,
        costLevel: null,
        costLabel: null,
      },
      {
        position: 5,
        stage: "line",
        requiresPrediction: false,
        pressureType: null,
        costType: null,
        costLevel: null,
        costLabel: null,
      },
    ],
    lineChoices: [
      {
        id: "31000000-0000-4000-8000-000000000941",
        label: "50/50, always",
        tensionSide: "right",
      },
      {
        id: "31000000-0000-4000-8000-000000000942",
        label: "60/40 in their favor",
        tensionSide: "left",
      },
      {
        id: "31000000-0000-4000-8000-000000000943",
        label: "70/30 in their favor",
        tensionSide: "left",
      },
      {
        id: "31000000-0000-4000-8000-000000000944",
        label: "Whatever they need",
        tensionSide: "left",
      },
      {
        id: "31000000-0000-4000-8000-000000000945",
        label: "I'd give them all of it",
        tensionSide: "left",
      },
    ],
    directQaPath: "/m/31000000-0000-4000-8000-000000000090",
  },
  {
    day: 6,
    roundId: "40000000-0000-4000-8000-000000000014",
    roundDate: "2026-12-01",
    title: "Would you take a promotion you don't believe in?",
    subtitle: "One promotion. One compromise. See where your answer moves.",
    tensionId: "50000000-0000-4000-8000-000000000009",
    tensionSlug: "status-authenticity",
    principleId: "60000000-0000-4000-8000-000000000008",
    principleSlug: "integrity-vs-advancement",
    priceReferenceSide: "right",
    outsideInvitation: "Listen for one pitch today where the price sounds better than the product.",
    marshmallowIds: [
      "31000000-0000-4000-8000-000000000100",
      "31000000-0000-4000-8000-000000000101",
      "31000000-0000-4000-8000-000000000102",
      "31000000-0000-4000-8000-000000000103",
      "31000000-0000-4000-8000-000000000104",
    ],
    q1: {
      move: "31000000-0000-4000-8000-000000000a01",
      stay: "31000000-0000-4000-8000-000000000a02",
    },
    stages: [
      {
        position: 1,
        stage: "instinct",
        requiresPrediction: false,
        pressureType: null,
        costType: null,
        costLevel: null,
        costLabel: "Before any offer",
      },
      {
        position: 2,
        stage: "pressure",
        requiresPrediction: false,
        pressureType: "PERSONAL_COST",
        costType: "MONEY",
        costLevel: 1,
        costLabel: "You're the main earner",
      },
      {
        position: 3,
        stage: "consequence",
        requiresPrediction: false,
        pressureType: "MONEY",
        costType: "MONEY",
        costLevel: 2,
        costLabel: "$45,000 raise",
      },
      {
        position: 4,
        stage: "flip",
        requiresPrediction: true,
        pressureType: "PERSPECTIVE",
        costType: null,
        costLevel: null,
        costLabel: null,
      },
      {
        position: 5,
        stage: "line",
        requiresPrediction: false,
        pressureType: null,
        costType: null,
        costLevel: null,
        costLabel: null,
      },
    ],
    lineChoices: [
      {
        id: "31000000-0000-4000-8000-000000000a41",
        label: "None — not for any amount",
        tensionSide: "right",
      },
      {
        id: "31000000-0000-4000-8000-000000000a42",
        label: "15% at most",
        tensionSide: "right",
      },
      {
        id: "31000000-0000-4000-8000-000000000a43",
        label: "25% if I needed it",
        tensionSide: "right",
      },
      {
        id: "31000000-0000-4000-8000-000000000a44",
        label: "50% for the right money",
        tensionSide: "left",
      },
      {
        id: "31000000-0000-4000-8000-000000000a45",
        label: "100% or more",
        tensionSide: "left",
      },
    ],
    directQaPath: "/m/31000000-0000-4000-8000-000000000100",
  },
  {
    day: 7,
    roundId: "40000000-0000-4000-8000-000000000015",
    roundDate: "2026-12-08",
    title: "Would you co-sign for family?",
    subtitle: "One signature. One risk. See where your answer moves.",
    tensionId: "50000000-0000-4000-8000-000000000006",
    tensionSlug: "forgiveness-self-respect",
    principleId: "60000000-0000-4000-8000-000000000009",
    principleSlug: "security-vs-autonomy",
    priceReferenceSide: "right",
    outsideInvitation:
      "Think about one favor you'd extend — and where you'd draw the line if it touched your finances.",
    marshmallowIds: [
      "31000000-0000-4000-8000-000000000110",
      "31000000-0000-4000-8000-000000000111",
      "31000000-0000-4000-8000-000000000112",
      "31000000-0000-4000-8000-000000000113",
      "31000000-0000-4000-8000-000000000114",
    ],
    q1: {
      move: "31000000-0000-4000-8000-000000000b01",
      stay: "31000000-0000-4000-8000-000000000b02",
    },
    stages: [
      {
        position: 1,
        stage: "instinct",
        requiresPrediction: false,
        pressureType: null,
        costType: null,
        costLevel: null,
        costLabel: "Before any obligation",
      },
      {
        position: 2,
        stage: "pressure",
        requiresPrediction: false,
        pressureType: "LOYALTY",
        costType: "RELATIONSHIP",
        costLevel: 1,
        costLabel: "They co-signed for you",
      },
      {
        position: 3,
        stage: "consequence",
        requiresPrediction: false,
        pressureType: "MONEY",
        costType: "REPUTATION",
        costLevel: 2,
        costLabel: "Your credit on the line",
      },
      {
        position: 4,
        stage: "flip",
        requiresPrediction: true,
        pressureType: "PERSPECTIVE",
        costType: null,
        costLevel: null,
        costLabel: null,
      },
      {
        position: 5,
        stage: "line",
        requiresPrediction: false,
        pressureType: null,
        costType: null,
        costLevel: null,
        costLabel: null,
      },
    ],
    lineChoices: [
      { id: "31000000-0000-4000-8000-000000000b41", label: "Never", tensionSide: "right" },
      {
        id: "31000000-0000-4000-8000-000000000b42",
        label: "Only with a repayment plan",
        tensionSide: "right",
      },
      {
        id: "31000000-0000-4000-8000-000000000b43",
        label: "If they've co-signed for me",
        tensionSide: "left",
      },
      {
        id: "31000000-0000-4000-8000-000000000b44",
        label: "If I'd pay it for them anyway",
        tensionSide: "left",
      },
      {
        id: "31000000-0000-4000-8000-000000000b45",
        label: "Only for a small amount I could absorb",
        tensionSide: "left",
      },
    ],
    directQaPath: "/m/31000000-0000-4000-8000-000000000110",
  },
];

export const MONEY_WEEK_QUESTIONS: Record<number, [string, string, string, string, string]> = {
  2: [
    "Your closest friend can't keep paying their share of group outings. Would you quietly cover them so they can still come?",
    "They once covered your rent for two months when you were broke. What now?",
    "Covering them would cost you about $300 a month — a night out plus one group trip. What do you do?",
    "You're the friend who earns less. A friend offers to pay your share from now on so you can keep coming. Would you accept?",
    "When is it fair for a friend to pay your way?",
  ],
  3: [
    "You like your work-life balance. Your manager offers 25% more if you take on-call weekends. Would you take it?",
    "You're behind on saving for a home down payment. What now?",
    "You'd work every other weekend — about 26 weekends a year. What do you do?",
    "You're the manager. An employee turns down the weekend pay bump to protect their time off. Would you respect that?",
    "How many on-call weekends a year is too many for a raise?",
  ],
  4: [
    "A podcast offers to pay you for a true family story they don't know you'd share. Would you tell it?",
    "The story involves your sibling, who asked you to keep it between you. What now?",
    "The offer is $5,000. What do you do?",
    "You're the sibling. They shared your private story on a podcast for money. Would you forgive them?",
    "What would have to be true before you'd share a family secret for money?",
  ],
  5: [
    "Your parent left you and your sibling equal inheritances. Your sibling asks you to take less because they need it more. Would you?",
    "They supported you financially for a year when you were out of work. What now?",
    "An uneven split would wipe out $40,000 of their medical debt. Your share would mostly sit in savings. What do you do?",
    "You're the sibling who needs more. They refuse to split unevenly. Would you resent them?",
    "What inheritance split would feel fair?",
  ],
  6: [
    "You're offered a promotion with nearly double the pay — but you'd have to publicly stand behind work you don't fully believe in. Would you take it?",
    "You're the main earner in your household right now. What now?",
    "The raise is $45,000 a year. What do you do?",
    "You're a customer who was misled. An executive you know turned down that promotion on principle. Would you respect them?",
    "What pay increase would make defending something you disagree with feel fair?",
  ],
  7: [
    "Your sibling asks you to co-sign a $20,000 loan — you'd be on the hook if they miss payments. You don't think they'll keep up. Would you co-sign?",
    "They co-signed a loan for you five years ago when you needed it. What now?",
    "If they default, the debt lands on your credit — and you may have to pay it yourself. What do you do?",
    "You're the sibling. They won't co-sign for you. Would you understand?",
    "When would co-signing for someone feel fair?",
  ],
};

export const MONEY_WEEK_BINARY_CHOICES: Record<
  number,
  readonly [string, string, string, string, string, string, string, string]
> = {
  2: [
    "Cover their share",
    "Let them sit it out",
    "Cover their share",
    "Let them sit it out",
    "Cover them",
    "Stop covering",
    "No — I'll pay my own share",
    "Yes — I'd accept",
  ],
  3: [
    "Decline",
    "Accept",
    "Decline",
    "Accept",
    "Decline",
    "Accept",
    "Yes",
    "No — I'd question their commitment",
  ],
  4: [
    "Share it",
    "Keep it private",
    "Share it",
    "Keep it private",
    "Share it",
    "Keep it private",
    "Yes",
    "No",
  ],
  5: [
    "Give them more",
    "Keep it equal",
    "Give them more",
    "Keep it equal",
    "Give them more",
    "Keep it equal",
    "Yes",
    "No — fair is fair",
  ],
  6: [
    "Take it",
    "Decline",
    "Take it",
    "Decline",
    "Take it",
    "Decline",
    "Yes",
    "No",
  ],
  7: [
    "Co-sign",
    "Refuse",
    "Co-sign",
    "Refuse",
    "Co-sign",
    "Refuse",
    "Yes",
    "No",
  ],
};

export const MONEY_WEEK_BINARY_SIDES: Record<
  number,
  readonly [string, string, string, string, string, string, string, string]
> = {
  2: ["left", "right", "left", "right", "left", "right", "right", "left"],
  3: ["left", "right", "left", "right", "left", "right", "left", "right"],
  4: ["left", "right", "left", "right", "left", "right", "left", "right"],
  5: ["left", "right", "left", "right", "left", "right", "left", "right"],
  6: ["left", "right", "left", "right", "left", "right", "right", "left"],
  7: ["left", "right", "left", "right", "left", "right", "left", "right"],
};

export const MONEY_WEEK_RESERVED_DATES = [
  "2026-10-13",
  "2026-10-20",
  "2026-10-27",
  ...MONEY_WEEK_DAYS.map((day) => day.roundDate),
];

/** Plain-English pole definitions — left/right must mean the same thing at every stage. */
export type MoneyWeekSemanticSide = {
  left: string;
  right: string;
  /** What price_reference_side crowd trajectory measures retention of. */
  priceReferenceMeasures: string;
};

export const MONEY_WEEK_SEMANTIC_SIDES: Record<number, MoneyWeekSemanticSide> = {
  2: {
    left: "Extend generosity — cover or accept help for a friend",
    right: "Protect personal financial boundary — let them sit out or pay your own way",
    priceReferenceMeasures: "continued covering their share as the cost rose",
  },
  3: {
    left: "Protect your time outside work (decline the raise)",
    right: "Push your career forward (accept the raise)",
    priceReferenceMeasures: "continued declining the on-call schedule as the cost rose",
  },
  4: {
    left: "Choose the gain — share the story",
    right: "Protect privacy — keep the story private",
    priceReferenceMeasures: "continued keeping the story private as the offer rose",
  },
  5: {
    left: "Prioritize loyalty and need — give sibling more",
    right: "Prioritize equal fairness — keep the split even",
    priceReferenceMeasures: "continued giving sibling more as the stakes rose",
  },
  6: {
    left: "Prioritize status and advancement — take the promotion",
    right: "Prioritize authenticity — decline the promotion",
    priceReferenceMeasures: "continued declining the promotion as the raise rose",
  },
  7: {
    left: "Extend forgiveness or family support — co-sign or understand",
    right: "Protect self-respect and financial standing — refuse or hold the line",
    priceReferenceMeasures: "continued refusing to co-sign as the risk rose",
  },
};

/** Q1 first choice (index 0) must always map to the declared left pole. */
export const MONEY_WEEK_Q1_LEFT_CHOICE_INDEX = 0;
