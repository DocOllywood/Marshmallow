function num(value: unknown): string {
  if (value == null) return "—";
  return String(Math.round(Number(value)));
}

export function CalibrationCard({ raw }: { raw: unknown }) {
  const row = (raw ?? {}) as Record<string, unknown>;
  return (
    <section className="rounded-2xl border border-border bg-surface p-4">
      <p className="text-xs font-semibold tracking-[0.16em] text-ink-muted uppercase">
        CrowdSense calibration
      </p>
      <dl className="mt-3 grid grid-cols-2 gap-2 text-sm">
        <Metric label="Official scores" value={num(row.total_official_scores)} />
        <Metric label="Mean Accuracy" value={num(row.mean_accuracy)} />
        <Metric label="Median Accuracy" value={num(row.median_accuracy)} />
        <Metric label="p10 / p25" value={`${num(row.p10)} / ${num(row.p25)}`} />
        <Metric label="p75 / p90" value={`${num(row.p75)} / ${num(row.p90)}`} />
        <Metric label="Qualified CrowdSense" value={num(row.qualified_crowdsense_count)} />
        <Metric label="Mean CrowdSense" value={num(row.mean_qualified_crowdsense)} />
        <Metric label="Median CrowdSense" value={num(row.median_qualified_crowdsense)} />
      </dl>
      <p className="mt-3 text-xs text-ink-muted">
        Inspection only. The prior is not auto-adjusted.
      </p>
    </section>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <dt className="text-ink-muted">{label}</dt>
      <dd className="font-semibold tabular-nums">{value}</dd>
    </div>
  );
}
