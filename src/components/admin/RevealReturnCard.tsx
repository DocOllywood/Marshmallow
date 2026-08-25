import { parseRevealReturnMetrics } from "@/domain/analytics/metrics";

export function RevealReturnCard({ raw }: { raw: unknown }) {
  const metrics = parseRevealReturnMetrics(raw);
  const rrr =
    metrics.rrr == null ? "—" : `${Math.round(metrics.rrr * 1000) / 10}%`;
  const bonus =
    metrics.bonus_rate == null ? "—" : `${Math.round(metrics.bonus_rate * 1000) / 10}%`;
  const median =
    metrics.median_open_seconds == null
      ? "—"
      : `${Math.round(metrics.median_open_seconds / 60)} min`;

  return (
    <section className="rounded-2xl border border-border bg-surface p-4">
      <p className="text-xs font-semibold tracking-[0.16em] text-ink-muted uppercase">
        Reveal Return Rate
      </p>
      <p className="mt-1 font-display text-3xl font-semibold tabular-nums">{rrr}</p>
      <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
        <div>
          <dt className="text-ink-muted">Eligible sealed reveals</dt>
          <dd className="font-semibold tabular-nums">{metrics.eligible_sealed_reveals}</dd>
        </div>
        <div>
          <dt className="text-ink-muted">First reveal opens</dt>
          <dd className="font-semibold tabular-nums">{metrics.first_reveal_opens}</dd>
        </div>
        <div>
          <dt className="text-ink-muted">Bonus qualification</dt>
          <dd className="font-semibold tabular-nums">{bonus}</dd>
        </div>
        <div>
          <dt className="text-ink-muted">Median time to open</dt>
          <dd className="font-semibold tabular-nums">{median}</dd>
        </div>
      </dl>
      <p className="mt-3 text-xs text-ink-muted">
        Directional while sample size is small. Counted from sealed entries on legitimately
        revealed Marshmallows, not client events.
      </p>
    </section>
  );
}
