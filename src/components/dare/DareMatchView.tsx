import { experimentStageAccentStyle } from "@/domain/daily/experiment-stage-accent";
import type { DareComparisonView } from "@/domain/dare/comparison";

export function DareMatchView({
  comparison,
  otherLabel,
  roundRevealed,
}: {
  comparison: DareComparisonView;
  otherLabel: string;
  roundRevealed: boolean;
}) {
  return (
    <section className="flex flex-col gap-8 px-2 py-6">
      <div className="flex flex-col gap-2 text-center">
        <p className="font-display text-[clamp(1.35rem,6vw,2rem)] font-semibold tracking-tight uppercase text-ink">
          {comparison.headline}
        </p>
        <p className="text-sm font-semibold uppercase tracking-[0.16em] text-money">
          {comparison.summary}
        </p>
        {comparison.movementCopy ? (
          <p className="mx-auto max-w-[22rem] text-sm leading-6 text-ink-muted">
            {comparison.movementCopy}
          </p>
        ) : null}
      </div>

      <div className="mx-auto flex w-full max-w-[22rem] flex-col gap-4">
        {comparison.stages.map((row) => (
          <div
            key={row.stageLabel}
            className="flex flex-col gap-2 border-b border-money-border/40 pb-3 text-left"
          >
            <p
              className="text-[10px] font-semibold tracking-[0.22em] uppercase"
              style={experimentStageAccentStyle(
                row.stageLabel === "INSTINCT"
                  ? "instinct"
                  : row.stageLabel === "PRESSURE"
                    ? "pressure"
                    : row.stageLabel === "THE PRICE"
                      ? "consequence"
                      : "flip",
              )}
            >
              {row.stageLabel}
            </p>
            <p className="text-sm text-ink">
              <span className="font-semibold">You:</span> {row.viewerChoice}
            </p>
            <p className="text-sm text-ink-muted">
              <span className="font-semibold">{otherLabel}:</span> {row.otherChoice}
            </p>
          </div>
        ))}

        {comparison.viewerLine || comparison.otherLine ? (
          <div className="flex flex-col gap-3 border-t border-money-border/50 pt-4">
            <p className="text-[10px] font-semibold tracking-[0.22em] text-money uppercase">
              The Line
            </p>
            <div className="flex flex-col gap-2 text-left">
              <p className="text-[10px] font-semibold tracking-[0.18em] text-ink-muted uppercase">
                You
              </p>
              <p className="font-display text-base font-semibold text-ink">
                {comparison.viewerLine}
              </p>
            </div>
            <div className="flex flex-col gap-2 text-left">
              <p className="text-[10px] font-semibold tracking-[0.18em] text-ink-muted uppercase">
                {otherLabel}
              </p>
              <p className="font-display text-base font-semibold text-ink">
                {comparison.otherLine}
              </p>
            </div>
          </div>
        ) : null}
      </div>

      {!roundRevealed ? (
        <p className="text-center text-xs leading-5 text-ink-muted">
          Crowd results stay hidden until the daily reveal opens.
        </p>
      ) : null}
    </section>
  );
}
