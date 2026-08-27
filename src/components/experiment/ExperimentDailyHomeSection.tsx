"use client";

import { useEffect, useRef } from "react";

import { ExperimentTodaysReadCard } from "@/components/experiment/ExperimentTodaysReadCard";
import { PrimaryButton } from "@/components/PrimaryButton";
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
    <section className="flex flex-col gap-5 border-l-2 border-primary/30 pl-4">
      <div className="flex flex-col gap-3">
        <p className="text-xs font-semibold tracking-[0.2em] text-primary uppercase">
          The daily experiment
        </p>
        <p className="text-[10px] font-semibold tracking-[0.2em] text-ink-muted/80 uppercase">
          Today everyone is playing
        </p>
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
          <p>See where your answer moves.</p>
        </div>
      </div>

      {state === "play" ? <PrimaryButton href={playHref}>BEGIN</PrimaryButton> : null}
      {state === "continue" ? (
        <>
          <p className="text-sm text-ink-muted">{round.sealedCount} of 5 locked</p>
          <PrimaryButton href={playHref}>CONTINUE</PrimaryButton>
        </>
      ) : null}
      {state === "sealed" ? (
        round.todaysRead ? (
          <ExperimentTodaysReadCard
            read={round.todaysRead}
            showHomeButton={false}
            roundId={round.roundId}
            tensionSlug={round.tension?.slug}
          />
        ) : (
          <p className="text-sm text-ink-muted">Come back tonight.</p>
        )
      ) : null}
      {state === "ready" ? (
        <>
          <p className="text-xs font-semibold tracking-[0.18em] text-primary uppercase">The crowd is in.</p>
          <PrimaryButton href={round.revealHref}>REVEAL THE EXPERIMENT</PrimaryButton>
        </>
      ) : null}
    </section>
  );
}
