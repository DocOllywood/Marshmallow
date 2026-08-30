import type { HostExperimentConfig, HostPlayChoices, HostReaction } from "@/domain/dev/host-rehearsal-types";
import { hostSideAt } from "@/domain/dev/host-rehearsal-types";
import { buildTrajectoryHostRead } from "@/domain/dev/host-read-builders";

export const FLIRTS_CHOICE_IDS = {
  q1Stop: "flirts-q1-stop",
  q1Keep: "flirts-q1-keep",
  q2Leave: "flirts-q2-leave",
  q2Reply: "flirts-q2-reply",
  q3No: "flirts-q3-no",
  q3Mention: "flirts-q3-mention",
  q4No: "flirts-q4-no",
  q4Yes: "flirts-q4-yes",
  lineNothing: "flirts-line-nothing",
  lineAskAgain: "flirts-line-ask-again",
  lineKeeps: "flirts-line-keeps",
  lineHurt: "flirts-line-hurt",
  lineNow: "flirts-line-now",
} as const;

const STAGES = [
  {
    position: 1,
    stage: "instinct" as const,
    question:
      "Your close friend's partner has been texting you.\n\nNothing explicit.\n\nJust a little too personal, a little too often.",
    choices: [
      { id: FLIRTS_CHOICE_IDS.q1Stop, label: "STOP REPLYING", tensionSide: "left" as const },
      { id: FLIRTS_CHOICE_IDS.q1Keep, label: "KEEP REPLYING", tensionSide: "right" as const },
    ],
  },
  {
    position: 2,
    stage: "pressure" as const,
    question: "They text:\n\n\"You're the only one who actually gets me.\"",
    choices: [
      { id: FLIRTS_CHOICE_IDS.q2Leave, label: "LEAVE ON READ", tensionSide: "left" as const },
      { id: FLIRTS_CHOICE_IDS.q2Reply, label: "REPLY AGAIN", tensionSide: "right" as const },
    ],
  },
  {
    position: 3,
    stage: "consequence" as const,
    question: "Your friend asks:\n\n\"Has [partner] been acting weird to you?\"",
    choices: [
      { id: FLIRTS_CHOICE_IDS.q3No, label: "SAY NO", tensionSide: "left" as const },
      { id: FLIRTS_CHOICE_IDS.q3Mention, label: "MENTION THE TEXTS", tensionSide: "right" as const },
    ],
  },
  {
    position: 4,
    stage: "flip" as const,
    question:
      "Your friend texts:\n\n\"I think my partner likes someone. Is it you?\"\n\nWould you say yes?",
    choices: [
      { id: FLIRTS_CHOICE_IDS.q4No, label: "SAY NO", tensionSide: "left" as const },
      { id: FLIRTS_CHOICE_IDS.q4Yes, label: "SAY YES", tensionSide: "right" as const },
    ],
  },
  {
    position: 5,
    stage: "line" as const,
    isLine: true,
    question: "HOW MUCH TRUTH DO THEY DESERVE?",
    choices: [
      { id: FLIRTS_CHOICE_IDS.lineNothing, label: "NOTHING — NOT MY PROBLEM", tensionSide: "left" as const },
      { id: FLIRTS_CHOICE_IDS.lineAskAgain, label: "ONLY IF THEY ASK AGAIN", tensionSide: "left" as const },
      { id: FLIRTS_CHOICE_IDS.lineKeeps, label: "IF IT KEEPS HAPPENING", tensionSide: "neutral" as const },
      { id: FLIRTS_CHOICE_IDS.lineHurt, label: "IF THEY SEEM HURT", tensionSide: "right" as const },
      { id: FLIRTS_CHOICE_IDS.lineNow, label: "NOW — I'D WANT TO KNOW", tensionSide: "right" as const },
    ],
  },
] as const;

function sideAt(choices: HostPlayChoices, position: number) {
  return hostSideAt(STAGES, choices, position);
}

function q1Reaction(choiceId: string): HostReaction {
  const side = STAGES[0]!.choices.find((c) => c.id === choiceId)?.tensionSide;
  if (side === "right") {
    return { headline: "YOU KEPT REPLYING.", supportingLine: "You sure?" };
  }
  return { headline: "YOU STOPPED.", supportingLine: "You sure?" };
}

function q2Reaction(choices: HostPlayChoices): HostReaction {
  const q1Side = sideAt(choices, 1);
  const q2Side = sideAt(choices, 2);
  if (q1Side && q2Side && q1Side === q2Side) {
    return { headline: "STILL THERE.", supportingLine: "Okay.\n\nOne more thing." };
  }
  return { headline: "THAT CHANGED IT.", supportingLine: "Okay.\n\nOne more thing." };
}

function q3Reaction(choices: HostPlayChoices): HostReaction {
  const q1Side = sideAt(choices, 1);
  const q2Side = sideAt(choices, 2);
  const q3Side = sideAt(choices, 3);
  if (q1Side === "right" && q2Side === "right" && q3Side === "left") {
    return {
      headline: "THE TEXTS STAYED PRIVATE.",
      supportingLine: "Okay.\n\nNow switch sides.",
    };
  }
  if (q3Side === "left") {
    return { headline: "STILL NO.", supportingLine: "Okay.\n\nNow switch sides." };
  }
  if (q3Side === "right") {
    return { headline: "THERE IT IS.", supportingLine: "Now switch sides." };
  }
  return { headline: "THAT MOVED YOU.", supportingLine: "Now switch sides." };
}

function q4Reaction(choices: HostPlayChoices): HostReaction {
  const q3Side = sideAt(choices, 3);
  const q4Side = sideAt(choices, 4);
  if (q3Side === "right" && q4Side === "left") {
    return { headline: "DIFFERENT FROM THIS SIDE." };
  }
  if (q3Side === "left" && q4Side === "right") {
    return { headline: "YOU MOVED." };
  }
  if (q3Side && q4Side && q3Side === q4Side) {
    return { headline: "SAME CALL. OTHER SIDE." };
  }
  return { headline: "NOTED." };
}

function readTheRoom(choices: HostPlayChoices) {
  const side = sideAt(choices, 4);
  if (side === "right") {
    return { lead: "You'd say yes.", question: "How many people would?" };
  }
  return { lead: "You wouldn't say yes.", question: "How many people would?" };
}

export const HOST_FLIRTS_CONFIG: HostExperimentConfig = {
  id: "flirts",
  title: "THE FRIEND'S PARTNER FLIRTS",
  labSubtitle: "Desire / complicity",
  introLine: "Attention you should not want — hosted.",
  stages: STAGES,
  reactions: { q1: q1Reaction, q2: q2Reaction, q3: q3Reaction, q4: q4Reaction, readTheRoom },
  fallbackReadHeadline: "THAT'S WHERE YOU LANDED.",
  buildTodaysRead: (input) =>
    buildTrajectoryHostRead(STAGES, input, {
      q3q4Inverse: {
        leftRight: ["YOU LIED TO YOUR FRIEND.", "YOU'D ADMIT IT TO THEIR FACE."],
        rightLeft: ["YOU TOLD YOUR FRIEND.", "YOU'D DENY IT TO THEIR FACE."],
      },
      heldLeft: ["YOU KEPT YOUR DISTANCE.", "EVEN WHEN THEY REACHED OUT."],
      heldRight: ["YOU STAYED IN THE THREAD.", "EVEN WHEN IT GOT PERSONAL."],
      multiMove: ["YOU MOVED.", "THEN DREW THE LINE SOMEWHERE ELSE."],
      firstMovePressure: "\"YOU'RE THE ONLY ONE\" MOVED YOU.",
      firstMoveConsequence: [
        {
          when: (q2, q3) => q2 === "right" && q3 === "left",
          read: ["YOU KEPT REPLYING.", "THEN SAID NOTHING."],
        },
        {
          when: (q2, q3) => q2 === "left" && q3 === "right",
          read: ["YOU LEFT ON READ.", "THEN MENTIONED THE TEXTS."],
        },
      ],
      firstMoveSingle: "YOUR ANSWER MOVED AS THE CIRCUMSTANCES CHANGED.",
      fallbackHeadline: "THAT'S WHERE YOU LANDED.",
    }),
};
