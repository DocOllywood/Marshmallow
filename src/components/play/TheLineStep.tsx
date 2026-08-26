import { ChoiceButton } from "@/components/ChoiceButton";
import type { PlayChoice } from "@/domain/play/types";

export function TheLineStep({
  choices,
  selectedId,
  disabled,
  onSelect,
}: {
  choices: readonly PlayChoice[];
  selectedId: string | null;
  disabled?: boolean;
  onSelect: (choiceId: string) => void;
}) {
  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-1">
        <p className="text-xs font-semibold tracking-[0.18em] text-primary uppercase">The Line</p>
        <p className="text-sm text-ink-muted">Where&apos;s your line?</p>
      </div>
      <div className="flex flex-col gap-3">
        {choices.map((choice) => (
          <ChoiceButton
            key={choice.id}
            selected={selectedId === choice.id}
            disabled={disabled}
            onClick={() => onSelect(choice.id)}
          >
            {choice.label}
          </ChoiceButton>
        ))}
      </div>
    </div>
  );
}
