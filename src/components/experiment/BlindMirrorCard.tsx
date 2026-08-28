import type { BlindMirrorComparison } from "@/domain/daily/blind-mirror";

export function BlindMirrorCard({ comparison }: { comparison: BlindMirrorComparison }) {
  return (
    <div className="flex w-full max-w-[22rem] flex-col gap-4 border-t border-border/60 pt-5 text-center">
      <p className="text-xs font-semibold tracking-[0.18em] text-primary uppercase">Blind mirror</p>
      <p className="font-display text-[clamp(1.05rem,4.5vw,1.35rem)] leading-snug font-semibold tracking-tight uppercase">
        You&apos;ve faced this rule before.
      </p>

      <div className="flex flex-col gap-4 pt-1">
        <div className="flex flex-col gap-1">
          <p className="text-[10px] font-semibold tracking-[0.2em] text-ink-muted uppercase">
            {comparison.earlierContext.label}
          </p>
          <p className="font-display text-base font-semibold uppercase text-ink">
            {comparison.earlierResultLabel}
          </p>
        </div>
        <div className="flex flex-col gap-1">
          <p className="text-[10px] font-semibold tracking-[0.2em] text-ink-muted uppercase">
            {comparison.laterContext.label}
          </p>
          <p className="font-display text-base font-semibold uppercase text-ink">
            {comparison.laterResultLabel}
          </p>
        </div>
      </div>

      <p className="max-w-[20rem] font-display text-[clamp(1rem,4vw,1.2rem)] leading-snug font-semibold tracking-tight uppercase">
        {comparison.headline}
      </p>
    </div>
  );
}
