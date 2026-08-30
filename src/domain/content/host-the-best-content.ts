import { THE_BEST_STAGES, THE_BEST_TITLE, buildTheBestTodaysRead } from "@/domain/content/the-best-experiment";
import type { HostExperimentConfig, HostPlayChoices, HostReaction } from "@/domain/dev/host-rehearsal-types";
import { hostSideAt } from "@/domain/dev/host-rehearsal-types";

const STAGES = THE_BEST_STAGES;

function sideAt(choices: HostPlayChoices, position: number) {
  return hostSideAt(STAGES, choices, position);
}

function q1Reaction(choiceId: string): HostReaction {
  const stage = STAGES[0]!;
  const side = stage.choices.find((c) => c.id === choiceId)?.tensionSide;
  if (side === "left") {
    return { headline: "YOU SAID YES.", supportingLine: "You sure?" };
  }
  return { headline: "YOU SAID NO.", supportingLine: "You sure?" };
}

function q2Reaction(choices: HostPlayChoices): HostReaction {
  const q1Side = sideAt(choices, 1);
  const q2Side = sideAt(choices, 2);
  if (q1Side && q2Side && q1Side === q2Side) {
    return { headline: "STILL SURE.", supportingLine: "Okay.\n\nOne more thing." };
  }
  return { headline: "THAT MOVED YOU.", supportingLine: "Okay.\n\nOne more thing." };
}

function q3Reaction(choices: HostPlayChoices): HostReaction {
  const q2Side = sideAt(choices, 2);
  const q3Side = sideAt(choices, 3);
  if (q2Side === "right" && q3Side === "left") {
    return {
      headline: "THE TRUTH WAS EASY.",
      supportingLine: "THE NAME WASN'T.\n\nNow switch sides.",
    };
  }
  if (q3Side === "left") {
    return { headline: "STILL NO.", supportingLine: "Okay.\n\nNow switch sides." };
  }
  if (q2Side === "left" && q3Side === "right") {
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
  if (q3Side && q4Side && q3Side === q4Side) {
    return { headline: "SAME CALL. OTHER SIDE." };
  }
  if (q3Side && q4Side && q3Side !== q4Side) {
    return { headline: "YOU MOVED." };
  }
  return { headline: "NOTED." };
}

function readTheRoom(choices: HostPlayChoices) {
  const side = sideAt(choices, 4);
  if (side === "right") {
    return { lead: "You'd ask.", question: "How many people would?" };
  }
  return { lead: "You wouldn't ask.", question: "How many people would?" };
}

export const HOST_THE_BEST_CONFIG: HostExperimentConfig = {
  id: "the-best",
  title: THE_BEST_TITLE,
  labSubtitle: "Intimacy / ego",
  introLine: "Marshmallow hosts — no stage labels, fewer taps.",
  stages: STAGES,
  reactions: {
    q1: q1Reaction,
    q2: q2Reaction,
    q3: q3Reaction,
    q4: q4Reaction,
    readTheRoom,
  },
  buildTodaysRead: (input) => buildTheBestTodaysRead(input),
};

export { q1Reaction as hostTheBestQ1Reaction, q2Reaction as hostTheBestQ2Reaction };
