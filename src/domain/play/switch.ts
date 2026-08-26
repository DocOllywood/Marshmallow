import type { PlayChoice } from "@/domain/play/types";

export function alternateChoice(
  choices: readonly PlayChoice[],
  selectedId: string,
): PlayChoice | null {
  return choices.find((choice) => choice.id !== selectedId) ?? null;
}

export function needsSwitchStep(input: {
  switchPrompt: string | null;
  ownChoiceId: string | null;
  switchStayed: boolean | null;
}): boolean {
  return (
    Boolean(input.switchPrompt?.trim()) &&
    input.ownChoiceId != null &&
    input.switchStayed == null
  );
}
