import { parseGrowthMetrics } from "@/domain/analytics/growth";

export function GrowthMetricsCard({ raw }: { raw: unknown }) {
  const metrics = parseGrowthMetrics(raw);
  const playRate =
    metrics.sharePlayRate == null ? "—" : `${Math.round(metrics.sharePlayRate * 1000) / 10}%`;
  const signupRate =
    metrics.shareSignupRate == null ? "—" : `${Math.round(metrics.shareSignupRate * 1000) / 10}%`;
  const median =
    metrics.medianNotifyToOpenSeconds == null
      ? "—"
      : `${Math.round(metrics.medianNotifyToOpenSeconds / 60)} min`;

  return (
    <section className="rounded-2xl border border-border bg-surface p-4">
      <p className="text-xs font-semibold tracking-[0.16em] text-ink-muted uppercase">
        Notifications & sharing
      </p>
      <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
        <Metric label="Reveal-ready created" value={metrics.revealReadyCreated} />
        <Metric label="Opens after notify" value={metrics.revealOpensAfterNotification} />
        <Metric label="Median notify → open" value={median} />
        <Metric label="Share visitors" value={metrics.shareVisitors} />
        <Metric label="Share → Play" value={playRate} />
        <Metric label="Share → Signup" value={signupRate} />
      </dl>
      <p className="mt-3 text-xs text-ink-muted">
        Notify → open is association, not causation. Share rates are unique valid share visits
        with a Play click or attributed signup.
      </p>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string | number }) {
  return (
    <div>
      <dt className="text-ink-muted">{label}</dt>
      <dd className="font-semibold tabular-nums">{value}</dd>
    </div>
  );
}
