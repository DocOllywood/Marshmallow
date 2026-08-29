import type { BlindMirrorComparison } from "@/domain/daily/blind-mirror";

export function BlindMirrorCard({ comparison }: { comparison: BlindMirrorComparison }) {
  return (
    <div className="flex w-full max-w-[22rem] flex-col gap-4 border-t border-border/70 pt-5 text-center">
      <p className="text-[10px] font-semibold tracking-[0.22em] text-ink-muted uppercase">
        Blind mirror
      </p>
      <p className="font-display text-[clamp(1rem,4.2vw,1.25rem)] leading-snug font-semibold tracking-tight uppercase text-ink">
        You&apos;ve faced this rule before.
      </p>

      <div className="flex flex-col gap-4 pt-1">
        <div className="flex flex-col gap-1">
          <p className="text-[10px] font-semibold tracking-[0.2em] text-ink-muted uppercase">Then</p>
          <p className="font-display text-base font-semibold uppercase text-ink">
            {comparison.earlierResultLabel}
          </p>
        </div>
        <div className="flex flex-col gap-1">
          <p className="text-[10px] font-semibold tracking-[0.2em] text-ink-muted uppercase">Now</p>
          <p className="font-display text-base font-semibold uppercase text-ink">
            {comparison.laterResultLabel}
          </p>
        </div>
      </div>

      <p className="max-w-[20rem] text-xs font-semibold tracking-[0.16em] text-ink-muted uppercase">
        Same rule.
        <span className="block">Different call.</span>
      </p>
    </div>
  );
}
