import { formatRevealSummary } from "@/domain/scoring/presentation";
import { cn } from "@/lib/utils";

type ScoreDisplayProps = {
  accuracy: number;
  predictedPercent?: number;
  crowdPercent?: number;
  className?: string;
};

export function ScoreDisplay({
  accuracy,
  predictedPercent,
  crowdPercent,
  className,
}: ScoreDisplayProps) {
  const summary =
    predictedPercent !== undefined && crowdPercent !== undefined
      ? formatRevealSummary(predictedPercent, crowdPercent)
      : null;

  return (
    <div className={cn("flex flex-col gap-3", className)}>
      {summary ? (
        <div className="space-y-1 text-base leading-6 text-ink">
          <p>You predicted {summary.predictedPercent}%.</p>
          <p>The crowd landed at {summary.crowdPercent}%.</p>
          <p className="text-ink-muted">{summary.errorCopy}</p>
        </div>
      ) : null}
      <div>
        <p className="text-xs font-semibold tracking-[0.18em] text-ink-muted uppercase">
          Accuracy
        </p>
        <p className="font-display text-6xl leading-none font-semibold tracking-tight text-positive tabular-nums">
          {accuracy}
        </p>
      </div>
    </div>
  );
}
