import type { HumanTension } from "@/domain/daily/tension";

export function TensionDisplay({
  tension,
  compact = false,
}: {
  tension: HumanTension;
  compact?: boolean;
}) {
  if (compact) {
    return (
      <p className="font-display text-sm font-semibold tracking-tight text-ink">
        {tension.displayLabel}
      </p>
    );
  }

  return (
    <div className="flex flex-col items-center gap-1 text-center">
      <p className="text-[10px] font-semibold tracking-[0.2em] text-primary uppercase">
        Today&apos;s tension
      </p>
      <p className="font-display text-[clamp(1.1rem,4.5vw,1.35rem)] font-semibold tracking-tight text-ink">
        {tension.leftLabel}
      </p>
      <p className="text-xs font-semibold tracking-[0.16em] text-ink-muted uppercase">vs.</p>
      <p className="font-display text-[clamp(1.1rem,4.5vw,1.35rem)] font-semibold tracking-tight text-ink">
        {tension.rightLabel}
      </p>
    </div>
  );
}
