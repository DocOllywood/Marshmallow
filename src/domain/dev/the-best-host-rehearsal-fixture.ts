import { THE_BEST_STAGES, theBestChoiceSide } from "@/domain/content/the-best-experiment";
import { HOST_THE_BEST_CONFIG } from "@/domain/content/host-the-best-content";
import {
  hostStageForPhase as stageForPhase,
  initialHostPlayState,
  type HostPhase,
  type HostPlayChoices,
  type HostPlayState,
  type HostReaction,
} from "@/domain/dev/host-rehearsal-types";

export const THE_BEST_HOST_REHEARSAL_STORAGE_KEY = "marshmallow-the-best-host-rehearsal";

export type { HostPhase, HostReaction, HostPlayChoices };

export type TheBestHostRehearsalState = HostPlayState;

export { initialHostPlayState };

export function initialTheBestHostRehearsalState(): TheBestHostRehearsalState {
  return initialHostPlayState();
}

export function hostQ1Reaction(choiceId: string): HostReaction {
  return HOST_THE_BEST_CONFIG.reactions.q1(choiceId);
}

export function hostQ2Reaction(choices: HostPlayChoices): HostReaction {
  return HOST_THE_BEST_CONFIG.reactions.q2(choices);
}

export function hostQ3Reaction(choices: HostPlayChoices): HostReaction {
  return HOST_THE_BEST_CONFIG.reactions.q3(choices);
}

export function hostQ4Reaction(choices: HostPlayChoices): HostReaction {
  return HOST_THE_BEST_CONFIG.reactions.q4(choices);
}

export function hostReadTheRoomPrompt(choices: HostPlayChoices) {
  return HOST_THE_BEST_CONFIG.reactions.readTheRoom(choices);
}

export function buildHostTodaysRead(state: TheBestHostRehearsalState) {
  return HOST_THE_BEST_CONFIG.buildTodaysRead(state);
}

export function hostStageForPhase(phase: HostPhase) {
  return stageForPhase(HOST_THE_BEST_CONFIG.stages, phase);
}

export { THE_BEST_STAGES, theBestChoiceSide };
