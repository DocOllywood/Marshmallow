import {
  formatRate,
  parseBetaHealth,
  parseBetaCohorts,
  parseModePayoffMetrics,
  parseQuickSampleHealth,
  rate,
} from "@/domain/analytics/beta";
import { parseRevealReturnMetrics } from "@/domain/analytics/metrics";

function pct(value: number | null): string {
  if (value == null) return "—";
  return `${Math.round(value * 1000) / 10}%`;
}

function secondsLabel(value: number | null): string {
  if (value == null) return "—";
  if (value < 90) return `${Math.round(value)}s`;
  if (value < 3600) return `${Math.round(value / 60)} min`;
  return `${Math.round(value / 3600)}h`;
}

export function BetaHealthCard({
  raw,
  overallReturn,
  modePayoff,
  sampleHealth,
}: {
  raw: unknown;
  overallReturn: unknown;
  modePayoff?: unknown;
  sampleHealth?: unknown;
}) {
  const health = parseBetaHealth(raw);
  const overall = parseRevealReturnMetrics(overallReturn);
  const modes = parseModePayoffMetrics(modePayoff);
  const sample = sampleHealth ? parseQuickSampleHealth(sampleHealth) : null;
  const onboard = rate(health.users.onboarded, health.users.signups);
  const firstSeal = rate(health.users.first_seal, health.users.onboarded);
  const multiSession = rate(
    health.activation.first_session_multi_play,
    health.users.first_seal,
  );
  const complete = rate(health.continuation.reveal_completions, health.continuation.reveal_opens);
  const nextPlay = rate(health.continuation.next_play, health.continuation.reveal_opens);
  const multi = rate(health.continuation.multi_seal, health.users.first_seal);
  const qualify = rate(health.continuation.qualified, health.continuation.scored);
  const share = rate(health.viral.shares, health.viral.reveal_openers);
  const daily = health.returnByMode.find((row) => row.play_mode === "daily");
  const live = health.returnByMode.find((row) => row.play_mode === "live");
  const quick = health.returnByMode.find((row) => row.play_mode === "quick");

  return (
    <section className="flex flex-col gap-5 rounded-2xl border border-border bg-surface p-4">
      <p className="text-xs font-semibold tracking-[0.16em] text-ink-muted uppercase">
        Beta Health
      </p>

      <Block title="Users">
        <Metric label="Signups" value={health.users.signups} />
        <Metric label="Onboarding" value={`${formatRate(onboard)} (${onboard.numerator}/${onboard.denominator})`} />
        <Metric label="First seal" value={`${formatRate(firstSeal)} (${firstSeal.numerator}/${firstSeal.denominator})`} />
      </Block>

      <Block title="Quick activation">
        <Metric label="First Quick seal" value={modes.quick.first_seal} />
        <Metric
          label="Quick continuation"
          value={`${formatRate(rate(modes.quick.continued, modes.quick.first_seal))} (${modes.quick.continued}/${modes.quick.first_seal})`}
        />
        <Metric label="First Quick payoff" value={modes.quick.first_payoff} />
        <Metric
          label="Quick reveal-open"
          value={`${pct(quick?.rrr ?? null)} (${quick?.first_reveal_opens ?? 0}/${quick?.eligible_sealed_reveals ?? 0})`}
        />
        <Metric
          label="Average Quick sample"
          value={modes.quick.avg_sample == null ? "—" : Math.round(modes.quick.avg_sample * 10) / 10}
        />
        <Metric
          label="Median Quick payoff delay"
          value={secondsLabel(modes.quick.median_payoff_seconds)}
        />
        {sample ? (
          <>
            <Metric
              label="Promoted seal rate"
              value={`${formatRate(rate(sample.promoted.sealed, sample.promoted.views))} (${sample.promoted.sealed}/${sample.promoted.views})`}
            />
            <Metric
              label="Promoted median sample"
              value={
                sample.promoted.median_sample == null
                  ? "—"
                  : Math.round(sample.promoted.median_sample * 10) / 10
              }
            />
            <Metric
              label="Promoted min before hard"
              value={`${formatRate(rate(sample.promoted.reached_minimum_before_hard, sample.promoted.revealed))} (${sample.promoted.reached_minimum_before_hard}/${sample.promoted.revealed})`}
            />
          </>
        ) : null}
        <p className="col-span-2 text-xs text-ink-muted">
          Payoff delay starts at result_available_at, not the original target reveal.
        </p>
      </Block>

      <Block title="Daily retention">
        <Metric label="Daily seals" value={modes.daily.seals} />
        <Metric label="Daily eligible reveals" value={modes.daily.eligible_reveals} />
        <Metric
          label="Daily RRR"
          value={`${pct(daily?.rrr ?? null)} (${daily?.first_reveal_opens ?? 0}/${daily?.eligible_sealed_reveals ?? 0})`}
        />
        <Metric
          label="Median Daily return delay"
          value={secondsLabel(modes.daily.median_return_delay_seconds)}
        />
        <p className="col-span-2 text-xs text-ink-muted">
          Daily RRR is unchanged: first opens / eligible sealed revealed Dailies.
        </p>
      </Block>

      <Block title="Live">
        <Metric label="Live seals" value={modes.live.seals} />
        <Metric label="Live reveal opens" value={modes.live.reveal_opens} />
        <Metric
          label="Live RRR"
          value={`${pct(live?.rrr ?? null)} (${live?.first_reveal_opens ?? 0}/${live?.eligible_sealed_reveals ?? 0})`}
        />
      </Block>

      <Block title="Activation timing">
        <Metric label="Median first-seal time" value={secondsLabel(health.activation.median_first_seal_seconds)} />
        <Metric label="Median first-payoff time" value={secondsLabel(health.activation.median_first_payoff_seconds)} />
        <Metric
          label="First-session multi-play"
          value={`${formatRate(multiSession)} (${multiSession.numerator}/${multiSession.denominator})`}
        />
        <Metric
          label="Overall RRR"
          value={`${pct(overall.rrr)} (${overall.first_reveal_opens}/${overall.eligible_sealed_reveals})`}
        />
        <Metric label="Median reveal delay" value={secondsLabel(overall.median_open_seconds)} />
        <p className="col-span-2 text-xs text-ink-muted">
          Session = {health.activation.session_idle_seconds / 60} minutes from first seal. First
          payoff uses result_available_at.
        </p>
      </Block>

      <Block title="Continuation">
        <Metric label="Reveal completion" value={`${formatRate(complete)} (${complete.numerator}/${complete.denominator})`} />
        <Metric label="Next Play" value={`${formatRate(nextPlay)} (${nextPlay.numerator}/${nextPlay.denominator})`} />
        <Metric label="2+ seals" value={`${formatRate(multi)} (${multi.numerator}/${multi.denominator})`} />
        <Metric label="5+ scored" value={`${formatRate(qualify)} (${qualify.numerator}/${qualify.denominator})`} />
      </Block>

      <Block title="Skill">
        <Metric label="Qualified CrowdSense" value={health.skill.qualified} />
        <Metric label="Mean Accuracy" value={health.skill.mean_accuracy == null ? "—" : Math.round(health.skill.mean_accuracy)} />
        <Metric label="Median Accuracy" value={health.skill.median_accuracy == null ? "—" : Math.round(health.skill.median_accuracy)} />
        <Metric label="Mean CrowdSense" value={health.skill.mean_crowdsense == null ? "—" : Math.round(health.skill.mean_crowdsense)} />
        <Metric label="Median CrowdSense" value={health.skill.median_crowdsense == null ? "—" : Math.round(health.skill.median_crowdsense)} />
      </Block>

      <Block title="Viral">
        <Metric label="Shares" value={health.viral.shares} />
        <Metric label="Share / reveal openers" value={`${formatRate(share)} (${share.numerator}/${share.denominator})`} />
      </Block>

      <Block title="Abandonment">
        <Metric label="Onboarded, never viewed" value={health.abandonment.onboarded_never_viewed} />
        <Metric label="Viewed, no answer" value={health.abandonment.viewed_no_answer} />
        <Metric label="Answered, never sealed" value={health.abandonment.answered_never_sealed} />
        <Metric label="Sealed Quick, no chain" value={health.abandonment.sealed_quick_no_chain} />
        <Metric label="Quick ready, never opened" value={health.abandonment.quick_ready_never_opened} />
        <Metric label="Daily ready, never returned" value={health.abandonment.daily_ready_never_returned} />
        <Metric label="Revealed, never played again" value={health.abandonment.revealed_never_played_again} />
      </Block>
    </section>
  );
}

export function BetaCohortsTable({ raw }: { raw: unknown }) {
  const rows = parseBetaCohorts(raw);
  if (rows.length === 0) {
    return (
      <section className="rounded-2xl border border-border bg-surface p-4">
        <p className="text-xs font-semibold tracking-[0.16em] text-ink-muted uppercase">Cohorts</p>
        <p className="mt-2 text-sm text-ink-muted">No signup weeks yet.</p>
      </section>
    );
  }
  return (
    <section className="overflow-x-auto rounded-2xl border border-border bg-surface p-4">
      <p className="text-xs font-semibold tracking-[0.16em] text-ink-muted uppercase">Cohorts</p>
      <table className="mt-3 w-full min-w-[36rem] text-left text-xs">
        <thead>
          <tr className="text-ink-muted">
            <th className="py-1 pr-2">Week</th>
            <th>Users</th>
            <th>Onboard %</th>
            <th>First seal %</th>
            <th>Quick payoff %</th>
            <th>Daily return %</th>
            <th>2nd seal %</th>
            <th>5-score %</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.week} className="border-t border-border">
              <td className="py-1 pr-2">{row.week}</td>
              <td>{row.users}</td>
              <td>{formatRate(rate(row.onboarded, row.users))}</td>
              <td>{formatRate(rate(row.first_seal, row.users))}</td>
              <td>{formatRate(rate(row.first_quick_payoff, row.users))}</td>
              <td>{formatRate(rate(row.daily_reveal_return, row.users))}</td>
              <td>{formatRate(rate(row.second_seal, row.users))}</td>
              <td>{formatRate(rate(row.qualified_5, row.users))}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

function Block({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-xs font-semibold tracking-[0.14em] uppercase">{title}</p>
      <dl className="mt-2 grid grid-cols-2 gap-2 text-sm">{children}</dl>
    </div>
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
