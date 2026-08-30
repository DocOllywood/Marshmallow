import type { HostExperimentConfig, HostPlayChoices, HostReaction } from "@/domain/dev/host-rehearsal-types";
import { hostSideAt } from "@/domain/dev/host-rehearsal-types";
import { buildTrajectoryHostRead } from "@/domain/dev/host-read-builders";

export const PRAISE_CHOICE_IDS = {
  q1Them: "praise-q1-them",
  q1You: "praise-q1-you",
  q2Them: "praise-q2-them",
  q2Yourself: "praise-q2-yourself",
  q3Them: "praise-q3-them",
  q3Win: "praise-q3-win",
  q4Yes: "praise-q4-yes",
  q4No: "praise-q4-no",
  lineAll: "praise-line-all",
  lineMost: "praise-line-most",
  lineSplit: "praise-line-split",
  lineMention: "praise-line-mention",
  lineNone: "praise-line-none",
} as const;

const STAGES = [
  {
    position: 1,
    stage: "instinct" as const,
    question:
      "In front of everyone, your mentor asks who deserves recognition for the win.\n\nYou know it's your rival.\n\nThe room is looking at you.",
    choices: [
      { id: PRAISE_CHOICE_IDS.q1Them, label: "NAME THEM", tensionSide: "left" as const },
      { id: PRAISE_CHOICE_IDS.q1You, label: "TAKE THE CREDIT", tensionSide: "right" as const },
    ],
  },
  {
    position: 2,
    stage: "pressure" as const,
    question: "Your mentor presses:\n\n\"Who made the biggest difference?\"",
    choices: [
      { id: PRAISE_CHOICE_IDS.q2Them, label: "NAME THEM", tensionSide: "left" as const },
      { id: PRAISE_CHOICE_IDS.q2Yourself, label: "NAME YOURSELF", tensionSide: "right" as const },
    ],
  },
  {
    position: 3,
    stage: "consequence" as const,
    question:
      "Your rival catches your eye.\n\nAlmost imperceptibly, they shake their head — begging you not to.",
    choices: [
      { id: PRAISE_CHOICE_IDS.q3Them, label: "STILL NAME THEM", tensionSide: "left" as const },
      { id: PRAISE_CHOICE_IDS.q3Win, label: "TAKE THE WIN", tensionSide: "right" as const },
    ],
  },
  {
    position: 4,
    stage: "flip" as const,
    question:
      "Alone afterward, your mentor says:\n\n\"Between us — your rival carried it. Should I say that publicly tomorrow?\"\n\nWould you say yes?",
    choices: [
      { id: PRAISE_CHOICE_IDS.q4Yes, label: "YES", tensionSide: "left" as const },
      { id: PRAISE_CHOICE_IDS.q4No, label: "NO", tensionSide: "right" as const },
    ],
  },
  {
    position: 5,
    stage: "line" as const,
    isLine: true,
    question: "HOW MUCH WOULD YOU GIVE THEM?",
    choices: [
      { id: PRAISE_CHOICE_IDS.lineAll, label: "ALL OF IT — THEY EARNED IT", tensionSide: "left" as const },
      { id: PRAISE_CHOICE_IDS.lineMost, label: "MOST OF IT", tensionSide: "left" as const },
      { id: PRAISE_CHOICE_IDS.lineSplit, label: "SPLIT IT EVENLY", tensionSide: "neutral" as const },
      { id: PRAISE_CHOICE_IDS.lineMention, label: "A MENTION IN PASSING", tensionSide: "right" as const },
      { id: PRAISE_CHOICE_IDS.lineNone, label: "NONE IN PUBLIC", tensionSide: "right" as const },
    ],
  },
] as const;

function sideAt(choices: HostPlayChoices, position: number) {
  return hostSideAt(STAGES, choices, position);
}

function q1Reaction(choiceId: string): HostReaction {
  const side = STAGES[0]!.choices.find((c) => c.id === choiceId)?.tensionSide;
  if (side === "right") {
    return { headline: "YOU TOOK IT.", supportingLine: "You sure?" };
  }
  return { headline: "YOU GAVE IT AWAY.", supportingLine: "You sure?" };
}

function q2Reaction(choices: HostPlayChoices): HostReaction {
  const q1Side = sideAt(choices, 1);
  const q2Side = sideAt(choices, 2);
  if (q1Side && q2Side && q1Side === q2Side) {
    return { headline: "STILL GENEROUS.", supportingLine: "Okay.\n\nOne more thing." };
  }
  return { headline: "THAT MOVED YOU.", supportingLine: "Okay.\n\nOne more thing." };
}

function q3Reaction(choices: HostPlayChoices): HostReaction {
  const q1Side = sideAt(choices, 1);
  const q2Side = sideAt(choices, 2);
  const q3Side = sideAt(choices, 3);
  if (q1Side === "left" && q2Side === "left" && q3Side === "right") {
    return {
      headline: "THEY BEGGED.",
      supportingLine: "YOU TOOK IT ANYWAY.\n\nNow switch sides.",
    };
  }
  if (q3Side === "left") {
    return { headline: "STILL THEIR WIN.", supportingLine: "Okay.\n\nNow switch sides." };
  }
  if (q3Side === "right") {
    return { headline: "THERE IT IS.", supportingLine: "Now switch sides." };
  }
  return { headline: "THAT MOVED YOU.", supportingLine: "Now switch sides." };
}

function q4Reaction(choices: HostPlayChoices): HostReaction {
  const q3Side = sideAt(choices, 3);
  const q4Side = sideAt(choices, 4);
  if (q3Side === "left" && q4Side === "right") {
    return { headline: "DIFFERENT FROM THIS SIDE." };
  }
  if (q3Side === "right" && q4Side === "left") {
    return { headline: "YOU MOVED." };
  }
  if (q3Side && q4Side && q3Side === q4Side) {
    return { headline: "SAME CALL. OTHER SIDE." };
  }
  return { headline: "NOTED." };
}

function readTheRoom(choices: HostPlayChoices) {
  const side = sideAt(choices, 4);
  if (side === "left") {
    return { lead: "You'd tell the room.", question: "How many people would?" };
  }
  return { lead: "You wouldn't.", question: "How many people would?" };
}

export const HOST_PUBLIC_PRAISE_CONFIG: HostExperimentConfig = {
  id: "public-praise",
  title: "THE PUBLIC PRAISE",
  labSubtitle: "Status / ego",
  introLine: "The room is watching. Your rival is too.",
  stages: STAGES,
  reactions: { q1: q1Reaction, q2: q2Reaction, q3: q3Reaction, q4: q4Reaction, readTheRoom },
  fallbackReadHeadline: "THAT'S WHERE YOU LANDED.",
  buildTodaysRead: (input) =>
    buildTrajectoryHostRead(STAGES, input, {
      q3q4Inverse: {
        leftRight: ["YOU PRAISED THEM IN PUBLIC.", "YOU'D LET IT STAND TOMORROW."],
        rightLeft: ["YOU TOOK IT IN THE ROOM.", "YOU'D GIVE IT BACK TOMORROW."],
      },
      heldLeft: ["YOU GAVE THEM THE WIN.", "EVEN WHEN THEY BEGGED YOU NOT TO."],
      heldRight: ["YOU TOOK THE CREDIT.", "EVEN WHEN THE ROOM WAS WATCHING."],
      multiMove: ["YOU MOVED.", "THEN DREW THE LINE SOMEWHERE ELSE."],
      firstMovePressure: "\"BIGGEST DIFFERENCE\" MOVED YOU.",
      firstMoveConsequence: [
        {
          when: (_q2, q3) => q3 === "right",
          read: ["THEY SHOOK THEIR HEAD.", "YOU TOOK IT."],
        },
        {
          when: (q2, q3) => q2 === "right" && q3 === "left",
          read: ["YOU TOOK IT FIRST.", "THEN GAVE IT BACK."],
        },
      ],
      firstMoveSingle: "YOUR ANSWER MOVED AS THE CIRCUMSTANCES CHANGED.",
      fallbackHeadline: "THAT'S WHERE YOU LANDED.",
    }),
};
