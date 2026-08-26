import type { GapResult } from "@/domain/scoring/gap";

export function GapDisplay({ gap }: { gap: GapResult }) {
  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-border/70 bg-surface/40 px-4 py-4">
      <div className="grid grid-cols-2 gap-4 text-center">
        <div className="flex flex-col gap-1">
          <p className="text-[10px] font-semibold tracking-[0.18em] text-ink-muted uppercase">
            You predicted
          </p>
          <p className="font-display text-3xl font-semibold tabular-nums">{gap.predictedPct}%</p>
        </div>
        <div className="flex flex-col gap-1">
          <p className="text-[10px] font-semibold tracking-[0.18em] text-ink-muted uppercase">
            Marshmallow players
          </p>
          <p className="font-display text-3xl font-semibold tabular-nums">{gap.crowdPct}%</p>
        </div>
      </div>
      <div className="flex flex-col items-center gap-1 border-t border-border/60 pt-3 text-center">
        <p className="text-[10px] font-semibold tracking-[0.18em] text-primary uppercase">The gap</p>
        <p className="font-display text-2xl font-semibold tabular-nums">{gap.gapPoints} points</p>
        <p className="text-xs font-semibold tracking-[0.14em] text-ink uppercase">{gap.tierCopy}</p>
        {gap.directionCopy ? (
          <p className="max-w-[18rem] text-sm leading-6 text-ink-muted">{gap.directionCopy}</p>
        ) : null}
      </div>
    </div>
  );
}
