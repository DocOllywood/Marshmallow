import type { ExperimentArchetype, ExperimentStage } from "@/domain/daily/experiment";
import {
  experimentStageHeaderLabel,
  experimentStageNumber,
} from "@/domain/daily/experiment-play";
import { priceStagePresentationLabel } from "@/domain/daily/price";
import type { HumanTension } from "@/domain/daily/tension";
import { cn } from "@/lib/utils";

export function ExperimentStageHeader({
  tension,
  position,
  stage,
  total = 5,
  spacious = false,
  archetype = "default",
}: {
  tension: HumanTension | null;
  position: number;
  stage: ExperimentStage;
  total?: number;
  spacious?: boolean;
  archetype?: ExperimentArchetype;
}) {
  const isPrice = archetype === "price";
  const stageLabel =
    isPrice ? priceStagePresentationLabel(stage) : experimentStageHeaderLabel(stage);
  const stageNumber = experimentStageNumber(position);
  const priceAccent =
    isPrice &&
    (stage === "consequence" || stage === "line" || stage === "pressure");

  return (
    <header className={`flex flex-col gap-3 ${spacious ? "pb-4 pt-6" : "pt-4"}`}>
      {tension ? (
        <p className="text-xs font-semibold tracking-[0.2em] text-ink uppercase">
          {tension.displayLabel}
        </p>
      ) : null}
      <p className="text-[11px] font-semibold tracking-[0.22em] text-ink-muted uppercase">
        {stageNumber} / {String(total).padStart(2, "0")}
      </p>
      <p
        className={cn(
          "text-xs font-semibold tracking-[0.24em] uppercase",
          priceAccent ? "text-money" : "text-ink-muted",
          isPrice && stage === "consequence" && "text-[0.8rem] tracking-[0.28em]",
        )}
      >
        {stageLabel}
      </p>
    </header>
  );
}
