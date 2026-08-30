import type { HostExperimentConfig, HostPlayChoices, HostReaction } from "@/domain/dev/host-rehearsal-types";
import { hostSideAt } from "@/domain/dev/host-rehearsal-types";
import { buildTrajectoryHostRead } from "@/domain/dev/host-read-builders";

export const DEPOSIT_CHOICE_IDS = {
  q1Report: "deposit-q1-report",
  q1Wait: "deposit-q1-wait",
  q2Report: "deposit-q2-report",
  q2Wait: "deposit-q2-wait",
  q3Report: "deposit-q3-report",
  q3Keep: "deposit-q3-keep",
  q4No: "deposit-q4-no",
  q4Yes: "deposit-q4-yes",
  lineDayOne: "deposit-line-day-one",
  lineFewDays: "deposit-line-few-days",
  lineNotice: "deposit-line-notice",
  lineMonth: "deposit-line-month",
  lineNever: "deposit-line-never",
} as const;

const STAGES = [
  {
    position: 1,
    stage: "instinct" as const,
    question:
      "$4,800 landed in your account.\n\nWrong name. Right routing number.\n\nIt's been there four days.",
    choices: [
      { id: DEPOSIT_CHOICE_IDS.q1Report, label: "REPORT IT", tensionSide: "left" as const },
      { id: DEPOSIT_CHOICE_IDS.q1Wait, label: "WAIT AND SEE", tensionSide: "right" as const },
    ],
  },
  {
    position: 2,
    stage: "pressure" as const,
    question: "Your rent posts tomorrow.",
    choices: [
      { id: DEPOSIT_CHOICE_IDS.q2Report, label: "REPORT IT NOW", tensionSide: "left" as const },
      { id: DEPOSIT_CHOICE_IDS.q2Wait, label: "WAIT ONE MORE DAY", tensionSide: "right" as const },
    ],
  },
  {
    position: 3,
    stage: "consequence" as const,
    question: "Two weeks pass.\n\nNobody has noticed.",
    choices: [
      { id: DEPOSIT_CHOICE_IDS.q3Report, label: "REPORT IT", tensionSide: "left" as const },
      { id: DEPOSIT_CHOICE_IDS.q3Keep, label: "KEEP IT", tensionSide: "right" as const },
    ],
  },
  {
    position: 4,
    stage: "flip" as const,
    question:
      "Last month you sent $200 to the wrong person.\n\nThey haven't returned it.\n\nWould you ask for it back?",
    choices: [
      { id: DEPOSIT_CHOICE_IDS.q4No, label: "NO", tensionSide: "left" as const },
      { id: DEPOSIT_CHOICE_IDS.q4Yes, label: "YES", tensionSide: "right" as const },
    ],
  },
  {
    position: 5,
    stage: "line" as const,
    isLine: true,
    question: "HOW LONG COULD IT SIT THERE BEFORE YOU'D KEEP IT?",
    choices: [
      { id: DEPOSIT_CHOICE_IDS.lineDayOne, label: "I COULDN'T KEEP IT PAST DAY ONE", tensionSide: "left" as const },
      { id: DEPOSIT_CHOICE_IDS.lineFewDays, label: "A FEW DAYS IF NO ONE ASKED", tensionSide: "left" as const },
      { id: DEPOSIT_CHOICE_IDS.lineNotice, label: "UNTIL SOMEONE NOTICED", tensionSide: "neutral" as const },
      { id: DEPOSIT_CHOICE_IDS.lineMonth, label: "A MONTH IF IT STAYED QUIET", tensionSide: "right" as const },
      { id: DEPOSIT_CHOICE_IDS.lineNever, label: "IF IT NEVER GOT CLAIMED", tensionSide: "right" as const },
    ],
  },
] as const;

function sideAt(choices: HostPlayChoices, position: number) {
  return hostSideAt(STAGES, choices, position);
}

function q1Reaction(choiceId: string): HostReaction {
  const side = STAGES[0]!.choices.find((c) => c.id === choiceId)?.tensionSide;
  if (side === "right") {
    return { headline: "YOU DIDN'T REPORT IT.", supportingLine: "You sure?" };
  }
  return { headline: "YOU REPORTED IT.", supportingLine: "You sure?" };
}

function q2Reaction(choices: HostPlayChoices): HostReaction {
  const q1Side = sideAt(choices, 1);
  const q2Side = sideAt(choices, 2);
  if (q1Side && q2Side && q1Side === q2Side) {
    return { headline: "STILL WAITING.", supportingLine: "Okay.\n\nOne more thing." };
  }
  return { headline: "THAT MOVED YOU.", supportingLine: "Okay.\n\nOne more thing." };
}

function q3Reaction(choices: HostPlayChoices): HostReaction {
  const q2Side = sideAt(choices, 2);
  const q3Side = sideAt(choices, 3);
  if (q2Side === "right" && q3Side === "right") {
    return {
      headline: "THE RENT DIDN'T MOVE YOU.",
      supportingLine: "THE SILENCE DID.\n\nNow switch sides.",
    };
  }
  if (q3Side === "right") {
    return { headline: "THERE IT IS.", supportingLine: "Now switch sides." };
  }
  if (q3Side === "left") {
    return { headline: "STILL NOT YOURS.", supportingLine: "Okay.\n\nNow switch sides." };
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
    return { lead: "You'd ask for it back.", question: "How many people would?" };
  }
  return { lead: "You wouldn't ask.", question: "How many people would?" };
}

export const HOST_DEPOSIT_CONFIG: HostExperimentConfig = {
  id: "deposit",
  title: "THE DEPOSIT",
  labSubtitle: "Money / rationalization",
  introLine: "You didn't steal it. You just haven't said anything.",
  stages: STAGES,
  reactions: { q1: q1Reaction, q2: q2Reaction, q3: q3Reaction, q4: q4Reaction, readTheRoom },
  fallbackReadHeadline: "THAT'S WHERE YOU LANDED.",
  buildTodaysRead: (input) =>
    buildTrajectoryHostRead(STAGES, input, {
      q3q4Inverse: {
        leftRight: ["YOU'D RETURN THE $4,800.", "YOU'D ASK FOR $200."],
        rightLeft: ["YOU'D KEEP THE $4,800.", "YOU WOULDN'T ASK FOR $200."],
      },
      heldLeft: ["YOU REPORTED IT.", "EVEN WHEN NO ONE WAS LOOKING."],
      heldRight: ["YOU WAITED IT OUT.", "THEN KEPT IT."],
      multiMove: ["YOU MOVED.", "THEN DREW THE LINE SOMEWHERE ELSE."],
      firstMovePressure: "RENT MOVED YOU.",
      firstMoveConsequence: [
        {
          when: (q2, q3) => q2 === "right" && q3 === "right",
          read: ["THE RENT DIDN'T MOVE YOU.", "THE SILENCE DID."],
        },
        {
          when: (q2, q3) => q2 === "right" && q3 === "left",
          read: ["TWO WEEKS CHANGED IT.", "THEN YOU REPORTED IT."],
        },
      ],
      firstMoveSingle: "YOUR ANSWER MOVED AS THE CIRCUMSTANCES CHANGED.",
      fallbackHeadline: "THAT'S WHERE YOU LANDED.",
    }),
};
