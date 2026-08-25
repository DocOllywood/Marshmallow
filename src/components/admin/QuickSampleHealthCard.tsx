import { formatRate, parseQuickSampleHealth, rate } from "@/domain/analytics/beta";

export function QuickSampleHealthCard({ raw }: { raw: unknown }) {
  const health = parseQuickSampleHealth(raw);
  const beforeTarget = rate(health.reached_minimum_before_target, health.revealed_quicks);
  const extension = rate(health.required_extension, health.revealed_quicks);
  const hardMax = rate(health.hit_hard_maximum, health.revealed_quicks);
  const zero = rate(health.zero_response, health.revealed_quicks);
  const promotedSeal = rate(health.promoted.sealed, health.promoted.views);
  const promotedMin = rate(
    health.promoted.reached_minimum_before_hard,
    health.promoted.revealed,
  );

  return (
    <section className="flex flex-col gap-3 rounded-2xl border border-border bg-surface p-4">
      <p className="text-xs font-semibold tracking-[0.16em] text-ink-muted uppercase">
        Quick sample health
      </p>
      <dl className="grid grid-cols-2 gap-2 text-sm">
        <div>
          <dt className="text-ink-muted">Median sealed sample</dt>
          <dd className="font-semibold tabular-nums">
            {health.median_sample == null ? "—" : Math.round(health.median_sample * 10) / 10}
          </dd>
        </div>
        <div>
          <dt className="text-ink-muted">Reached min before target</dt>
          <dd className="font-semibold tabular-nums">
            {formatRate(beforeTarget)} ({beforeTarget.numerator}/{beforeTarget.denominator})
          </dd>
        </div>
        <div>
          <dt className="text-ink-muted">Required extension</dt>
          <dd className="font-semibold tabular-nums">
            {formatRate(extension)} ({extension.numerator}/{extension.denominator})
          </dd>
        </div>
        <div>
          <dt className="text-ink-muted">Hit hard maximum</dt>
          <dd className="font-semibold tabular-nums">
            {formatRate(hardMax)} ({hardMax.numerator}/{hardMax.denominator})
          </dd>
        </div>
        <div>
          <dt className="text-ink-muted">Zero-response rate</dt>
          <dd className="font-semibold tabular-nums">
            {formatRate(zero)} ({zero.numerator}/{zero.denominator})
          </dd>
        </div>
        <div>
          <dt className="text-ink-muted">Revealed Quicks</dt>
          <dd className="font-semibold tabular-nums">{health.revealed_quicks}</dd>
        </div>
        <div>
          <dt className="text-ink-muted">Promoted seal rate</dt>
          <dd className="font-semibold tabular-nums">
            {formatRate(promotedSeal)} ({promotedSeal.numerator}/{promotedSeal.denominator})
          </dd>
        </div>
        <div>
          <dt className="text-ink-muted">Promoted median sample</dt>
          <dd className="font-semibold tabular-nums">
            {health.promoted.median_sample == null
              ? "—"
              : Math.round(health.promoted.median_sample * 10) / 10}
          </dd>
        </div>
        <div className="col-span-2">
          <dt className="text-ink-muted">Promoted reached min before hard reveal</dt>
          <dd className="font-semibold tabular-nums">
            {formatRate(promotedMin)} ({promotedMin.numerator}/{promotedMin.denominator})
          </dd>
        </div>
      </dl>
    </section>
  );
}
