"use client";

import { useEffect, useRef } from "react";

import { ExperimentTodaysReadCard } from "@/components/experiment/ExperimentTodaysReadCard";
import { MoneyPrimaryButton } from "@/components/MoneyPrimaryButton";
import type { DailyRoundProgress } from "@/domain/daily/round";
import { dailyHomeState } from "@/domain/daily/round";
import { ANALYTICS_EVENTS } from "@/lib/analytics/events";
import { trackEvent } from "@/server/actions/analytics";

export function ExperimentDailyHomeSection({ round }: { round: DailyRoundProgress }) {
  const state = dailyHomeState(round);
  const playHref = round.currentPlayId ? `/m/${round.currentPlayId}` : "/home";
  const viewed = useRef(false);

  useEffect(() => {
    if (viewed.current) return;
    viewed.current = true;
    void trackEvent(
      ANALYTICS_EVENTS.dailyViewed,
      { state, has_tension: round.tension != null, experiment: true },
      round.roundId,
    );
  }, [round.roundId, round.tension, state]);

  return (
    <section className="flex flex-col gap-5 border-l-2 border-money-border pl-4">
      <div className="flex flex-col gap-3">
        <p className="text-xs font-semibold tracking-[0.2em] text-ink-muted uppercase">
          The daily experiment
        </p>
        <p className="text-xs font-semibold tracking-[0.22em] text-money uppercase">Today&apos;s price</p>
        {round.tension ? (
          <p className="text-xs font-semibold tracking-[0.2em] text-ink uppercase">
            {round.tension.displayLabel}
          </p>
        ) : null}
        <p className="font-display text-[clamp(1.25rem,5.5vw,1.65rem)] leading-[1.12] font-semibold tracking-tight break-words">
          {round.title}
        </p>
        <div className="space-y-1 text-sm leading-6 text-ink-muted">
          <p>One situation.</p>
          <p>Five changes.</p>
          <p>Find your line.</p>
        </div>
      </div>

      {state === "play" && round.currentPlayId ? (
        <MoneyPrimaryButton href={playHref}>BEGIN EXPERIMENT</MoneyPrimaryButton>
      ) : null}
      {state === "continue" && round.currentPlayId ? (
        <>
          <p className="text-sm text-ink-muted">{round.sealedCount} of 5 locked</p>
          <MoneyPrimaryButton href={playHref}>CONTINUE EXPERIMENT</MoneyPrimaryButton>
        </>
      ) : null}
      {state === "sealed" ? (
        round.todaysRead ? (
          <ExperimentTodaysReadCard
            read={round.todaysRead}
            showHomeButton={false}
            roundId={round.roundId}
            tensionSlug={round.tension?.slug}
            blindMirror={round.blindMirror}
            isPriceExperiment={round.experimentArchetype === "price"}
          />
        ) : (
          <p className="text-sm text-ink-muted">Your calls are locked. Come back tonight.</p>
        )
      ) : null}
      {state === "ready" ? (
        <>
          <p className="text-xs font-semibold tracking-[0.18em] text-money uppercase">The crowd is in.</p>
          <MoneyPrimaryButton href={round.revealHref}>SEE WHAT CHANGED</MoneyPrimaryButton>
        </>
      ) : null}
    </section>
  );
}
