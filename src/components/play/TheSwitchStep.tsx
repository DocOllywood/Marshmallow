import { ChoiceButton } from "@/components/ChoiceButton";
import type { PlayChoice } from "@/domain/play/types";
import { alternateChoice } from "@/domain/play/switch";

export function TheSwitchStep({
  switchPrompt,
  originalChoice,
  choices,
  disabled,
  onStay,
  onSwitch,
}: {
  switchPrompt: string;
  originalChoice: PlayChoice;
  choices: readonly PlayChoice[];
  disabled?: boolean;
  onStay: () => void;
  onSwitch: () => void;
}) {
  const alternate = alternateChoice(choices, originalChoice.id);

  return (
    <div className="flex flex-col gap-5">
      <p className="text-xs font-semibold tracking-[0.18em] text-primary uppercase">The Switch</p>
      <p className="font-display text-[clamp(1.25rem,5.5vw,1.55rem)] leading-snug font-semibold tracking-tight break-words">
        {switchPrompt}
      </p>
      <div className="flex flex-col gap-3">
        <ChoiceButton disabled={disabled} onClick={onStay}>
          Stay with {originalChoice.label}
        </ChoiceButton>
        {alternate ? (
          <ChoiceButton disabled={disabled} onClick={onSwitch}>
            Switch to {alternate.label}
          </ChoiceButton>
        ) : null}
      </div>
    </div>
  );
}
