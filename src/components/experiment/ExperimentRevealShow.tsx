"use client";

import { useEffect, useRef } from "react";

import { GapDisplay } from "@/components/daily/GapDisplay";
import { PrimaryButton } from "@/components/PrimaryButton";
import { ANALYTICS_EVENTS } from "@/lib/analytics/events";
import type { DailyRoundQuestionReveal, DailyRoundSummary } from "@/domain/daily/round";
import type { ExperimentCrowdTrajectory } from "@/domain/daily/crowd-trajectory";
import { describeCrowdMovement } from "@/domain/daily/crowd-trajectory";
import type { UserPathPoint } from "@/domain/daily/experiment-play";
import { trackEvent } from "@/server/actions/analytics";

export function ExperimentRevealShow({
  reveals,
  summary,
  crowdTrajectory,
  userPath,
  roundId,
}: {
  reveals: DailyRoundQuestionReveal[];
  summary: DailyRoundSummary;
  crowdTrajectory: ExperimentCrowdTrajectory | null;
  userPath: UserPathPoint[];
  roundId?: string;
}) {
  const tracked = useRef(false);
  const flipReveal = reveals.find((item) => item.position === 4 && !item.isLine);
  const lineReveal = reveals.find((item) => item.isLine);

  useEffect(() => {
    if (tracked.current) return;
    tracked.current = true;
    void trackEvent(
      ANALYTICS_EVENTS.dailyRevealOpened,
      { viewed: true, round_id: roundId ?? null, experiment: true },
      roundId,
    );
  }, [roundId]);

  return (
    <div className="flex flex-1 flex-col gap-10 pb-10 pt-6">
      {crowdTrajectory ? (
        <section className="flex flex-col gap-4">
          <p className="text-xs font-semibold tracking-[0.22em] text-ink-muted uppercase">The crowd</p>
          <ul className="flex flex-col gap-3">
            {crowdTrajectory.points.map((point) => (
              <li key={point.stage} className="flex items-baseline justify-between gap-4">
                <span className="text-[11px] font-semibold tracking-[0.18em] text-ink-muted uppercase">
                  {point.stageLabel}
                </span>
                <span className="min-w-0 shrink font-display text-base font-semibold tabular-nums text-ink">
                  {point.crowdPct}% {point.sideLabel}
                </span>
              </li>
            ))}
          </ul>
          {describeCrowdMovement(crowdTrajectory) ? (
            <p className="pt-2 text-xs font-semibold tracking-[0.18em] text-primary uppercase">
              {describeCrowdMovement(crowdTrajectory)}
            </p>
          ) : null}
        </section>
      ) : null}

      {userPath.length > 0 ? (
        <section className="flex flex-col gap-4 border-t border-border/60 pt-8">
          <p className="text-xs font-semibold tracking-[0.22em] text-ink-muted uppercase">Your path</p>
          <ul className="flex flex-col gap-3">
            {userPath.map((point) => (
              <li key={point.stage} className="flex flex-col gap-0.5">
                <div className="flex items-baseline justify-between gap-4">
                  <span className="text-[11px] font-semibold tracking-[0.18em] text-ink-muted uppercase">
                    {point.stageLabel}
                  </span>
                  <span className="font-display text-base font-semibold uppercase text-ink">
                    {point.sideLabel}
                  </span>
                </div>
                {point.annotation ? (
                  <span className="text-right text-[10px] font-semibold tracking-[0.16em] text-primary uppercase">
                    {point.annotation}
                  </span>
                ) : null}
              </li>
            ))}
          </ul>
        </section>
      ) : null}

      {flipReveal ? (
        <section className="flex flex-col gap-4 border-t border-border/60 pt-8 text-center">
          <p className="text-xs font-semibold tracking-[0.18em] text-ink-muted uppercase">Your prediction</p>
          <p className="font-display text-3xl font-semibold tabular-nums">
            {flipReveal.predictedPct != null ? `${flipReveal.predictedPct}%` : "—"}
          </p>
          <p className="text-xs font-semibold tracking-[0.18em] text-ink-muted uppercase">
            Marshmallow players
          </p>
          <p className="font-display text-3xl font-semibold tabular-nums">{Math.round(flipReveal.crowdPct)}%</p>
          {flipReveal.gap ? (
            <div className="flex flex-col items-center gap-2 pt-2">
              <p className="text-xs font-semibold tracking-[0.18em] text-ink-muted uppercase">The gap</p>
              <GapDisplay gap={flipReveal.gap} />
            </div>
          ) : null}
          {flipReveal.accuracy != null ? (
            <p className="text-sm font-semibold text-ink-muted">Accuracy {flipReveal.accuracy}</p>
          ) : null}
          {summary.crowdsenseRating != null ? (
            <p className="text-sm text-ink-muted">
              CrowdSense {summary.crowdsenseRating}
              {summary.crowdsenseDelta != null && summary.crowdsenseDelta !== 0
                ? ` ${summary.crowdsenseDelta > 0 ? "+" : ""}${summary.crowdsenseDelta}`
                : ""}
            </p>
          ) : null}
        </section>
      ) : null}

      {lineReveal ? (
        <section className="flex flex-col gap-3 border-t border-border/60 pt-8">
          <p className="text-xs font-semibold tracking-[0.22em] text-ink-muted uppercase">
            Where players drew the line
          </p>
          <p className="text-sm text-ink-muted">{lineReveal.question}</p>
          {lineReveal.ownChoiceLabel ? (
            <p className="text-sm text-ink">
              Your line: <span className="font-semibold">{lineReveal.ownChoiceLabel}</span>
            </p>
          ) : null}
          <p className="text-sm text-ink-muted">
            Most common among Marshmallow players:{" "}
            <span className="font-semibold text-ink">
              {lineReveal.crowdModeLabel ?? lineReveal.crowdLabel}
            </span>
            {lineReveal.crowdPct > 0 ? ` (${Math.round(lineReveal.crowdPct)}%)` : ""}
          </p>
        </section>
      ) : null}

      <PrimaryButton href="/home">HOME</PrimaryButton>
    </div>
  );
}
