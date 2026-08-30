import type { HostContentLabExperimentId } from "@/domain/dev/host-content-lab-catalog";
import { initialHostPlayState, type HostPlayState } from "@/domain/dev/host-rehearsal-types";

export const HOST_CONTENT_LAB_STORAGE_KEY = "marshmallow-host-content-lab";

export type HostContentLabScreen = "selector" | "play" | "complete";

export type HostContentLabState = {
  screen: HostContentLabScreen;
  experimentId: HostContentLabExperimentId | null;
  play: HostPlayState;
};

export function initialHostContentLabState(): HostContentLabState {
  return {
    screen: "selector",
    experimentId: null,
    play: initialHostPlayState(),
  };
}

export function initialHostContentLabPlayFor(
  experimentId: HostContentLabExperimentId,
): HostContentLabState {
  return {
    screen: "play",
    experimentId,
    play: initialHostPlayState(),
  };
}
