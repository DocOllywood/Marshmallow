"use client";

import { useEffect, useState } from "react";

import { MarshmallowMascot, type MascotState } from "@/components/MarshmallowMascot";
import { PrimaryButton } from "@/components/PrimaryButton";
import { ANALYTICS_EVENTS } from "@/lib/analytics/events";
import { formatRevealSummary } from "@/domain/scoring/presentation";
import {
  accuracyLabel,
  crowdAlignment,
  crowdWinnerId,
  revealContextCopy,
} from "@/domain/scoring/copy";
import { isRevealStreakMilestone } from "@/domain/reputation/streaks";
import { trackEvent } from "@/server/actions/analytics";
import type { PlayMarshmallow, RevealPayload } from "@/domain/play/types";
import { ShareResultCard } from "@/components/play/ShareResultCard";
import { PlayModeBadge } from "@/components/play/PlayModeBadge";
import { BetaFeedbackForm } from "@/components/feedback/BetaFeedbackForm";
import { crowdVoiceHeading } from "@/domain/play/mode";
import { crowdVoiceSubhead } from "@/domain/play/sample";
import { CROWDSENSE_TAGLINE } from "@/domain/crowdsense/rating";
import { cn } from "@/lib/utils";

const REVEAL_STEPS = 4;

function prefersReducedMotion() {
  if (typeof window === "undefined" || typeof window.matchMedia !== "function") {
    return true;
  }
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function revealMascot(step: number): MascotState {
  if (step <= 0) return "cooking";
  if (step >= REVEAL_STEPS) return "celebrating";
  return "toasted";
}

export function RevealShow({ marshmallow }: { marshmallow: PlayMarshmallow }) {
  const reveal = marshmallow.reveal;
  const personalized = marshmallow.screen === "revealed";
  const [step, setStep] = useState(() => (prefersReducedMotion() ? REVEAL_STEPS : 0));

  useEffect(() => {
    if (prefersReducedMotion()) {
      void trackEvent(ANALYTICS_EVENTS.revealCompleted, { reduced: true }, marshmallow.id);
      return;
    }
    const delays = [680, 1280, 1880, 2480];
    const timers = delays.map((ms, index) =>
      window.setTimeout(() => {
        setStep(index + 1);
        if (index === delays.length - 1) {
          void trackEvent(ANALYTICS_EVENTS.revealCompleted, { reduced: false }, marshmallow.id);
        }
      }, ms),
    );
    return () => timers.forEach((id) => window.clearTimeout(id));
  }, [marshmallow.id]);

  if (!reveal) {
    return null;
  }

  if (reveal.totalVotes === 0) {
    return (
      <ZeroCrowd
        nextHref={marshmallow.nextHref}
        marshmallowId={marshmallow.id}
        playMode={marshmallow.play_mode}
      />
    );
  }

  if (!personalized) {
    return (
      <SpectatorCrowd
        reveal={reveal}
        nextHref={marshmallow.nextHref}
        marshmallowId={marshmallow.id}
        playMode={marshmallow.play_mode}
      />
    );
  }

  const own = reveal.choices.find((choice) => choice.choiceId === marshmallow.ownChoiceId);
  const winnerId = crowdWinnerId(
    reveal.choices.map((choice) => ({ id: choice.choiceId, votePct: choice.votePct })),
  );
  const alignment = marshmallow.ownChoiceId
    ? crowdAlignment(marshmallow.ownChoiceId, winnerId)
    : "split";
  const binary = reveal.choices.length === 2 && own?.youPct != null;
  const summary =
    binary && own ? formatRevealSummary(own.youPct ?? 0, own.votePct) : null;
  const label = reveal.accuracy != null ? accuracyLabel(reveal.accuracy) : null;
  const crowdLeader = [...reveal.choices].sort((a, b) => b.votePct - a.votePct)[0];
  const contextCopy = revealContextCopy({
    errorPoints: summary?.errorPoints ?? null,
    accuracy: reveal.accuracy,
    alignment,
  });

  const feedbackContext =
    marshmallow.play_mode === "quick"
      ? "quick_reveal"
      : marshmallow.play_mode === "live"
        ? "live_reveal"
        : "daily_reveal";

  return (
    <div className="flex flex-1 flex-col gap-6 pb-10 pt-6">
      <div className="flex flex-col items-center gap-3 text-center">
        <MarshmallowMascot state={revealMascot(step)} size="lg" />
        {step === 0 && !prefersReducedMotion() ? (
          <p className="text-xs font-semibold tracking-[0.18em] text-ink-muted uppercase">
            Almost there
          </p>
        ) : null}
      </div>

      {step >= 1 && crowdLeader ? (
        <section className="reveal-step text-center">
          <p className="text-xs font-semibold tracking-[0.18em] text-ink-muted uppercase">
            The crowd is in
          </p>
          {crowdVoiceSubhead(reveal.totalVotes) ? (
            <p className="mt-1 text-xs text-ink-muted">{crowdVoiceSubhead(reveal.totalVotes)}</p>
          ) : null}
          <p className="mt-4 font-display text-[clamp(3rem,16vw,4.5rem)] leading-none font-semibold tabular-nums">
            {Math.round(crowdLeader.votePct)}%
          </p>
          <p className="mt-3 font-display text-[1.35rem] leading-tight font-semibold uppercase break-words">
            {crowdLeader.label}
          </p>
        </section>
      ) : null}

      {step >= 2 && own ? (
        <section className="reveal-step text-center">
          <p className="text-xs font-semibold tracking-[0.18em] text-ink-muted uppercase">
            You called
          </p>
          {binary ? (
            <p className="mt-3 font-display text-[clamp(2.5rem,14vw,3.75rem)] leading-none font-semibold tabular-nums">
              {own.youPct}%
            </p>
          ) : (
            <YouVsCrowd reveal={reveal} />
          )}
        </section>
      ) : null}

      {step >= 3 ? (
        <section className="reveal-step flex flex-col items-center gap-2 text-center">
          {summary && own ? (
            <>
              <p className="text-xs font-semibold tracking-[0.18em] text-ink-muted uppercase">
                The crowd landed at {Math.round(own.votePct)}%
              </p>
              <p className="font-display text-[clamp(1.75rem,8vw,2.25rem)] font-semibold leading-tight uppercase">
                {summary.errorCopy}
              </p>
            </>
          ) : label ? (
            <p className="font-display text-[clamp(1.75rem,8vw,2.25rem)] font-semibold leading-tight">
              {label}
            </p>
          ) : null}
          {reveal.accuracy != null ? (
            <p className="text-sm font-semibold tracking-[0.16em] uppercase text-ink-muted">
              Accuracy {reveal.accuracy}
            </p>
          ) : null}
          {contextCopy ? (
            <p className="text-xs font-semibold tracking-[0.16em] text-ink-muted uppercase">
              {contextCopy}
            </p>
          ) : null}
        </section>
      ) : null}

      {step >= REVEAL_STEPS ? (
        <section className="reveal-step flex flex-col gap-3">
          {reveal.basePoints != null ? (
            <p className="font-display text-center text-4xl font-semibold tabular-nums">
              +{reveal.basePoints} points
            </p>
          ) : null}
          {reveal.bonusEarned ? (
            <p className="text-sm">
              +{reveal.bonusPoints} Reveal Bonus
              <span className="block text-ink-muted">You came back within 24 hours.</span>
            </p>
          ) : null}
          {reveal.streakQualified && reveal.streakCurrent != null ? (
            <p
              className={cn(
                "text-sm font-semibold text-center",
                isRevealStreakMilestone(reveal.streakCurrent) && "font-display text-xl",
              )}
            >
              🔥 Reveal Streak: {reveal.streakCurrent}
            </p>
          ) : null}
          {binary && !summary && contextCopy ? (
            <p className="text-center text-xs font-semibold tracking-[0.16em] text-ink-muted uppercase">
              {contextCopy}
            </p>
          ) : null}
          {reveal.crowdsenseRating != null ? (
            <p className="text-center text-sm text-ink-muted">
              CrowdSense {reveal.crowdsenseRating}
              {reveal.crowdsenseDelta != null && reveal.crowdsenseDelta !== 0
                ? ` ${reveal.crowdsenseDelta > 0 ? "+" : ""}${reveal.crowdsenseDelta}`
                : ""}
            </p>
          ) : reveal.accuracy != null ? (
            <div className="text-center text-sm text-ink-muted">
              <p>CrowdSense — Calibrating</p>
              <p className="text-xs">{CROWDSENSE_TAGLINE}</p>
            </div>
          ) : null}
          <ShareResultCard marshmallowId={marshmallow.id} />
          <details className="rounded-[1.25rem] border border-border bg-surface px-4 py-3">
            <summary className="cursor-pointer text-sm font-semibold">
              Help us make Marshmallow better
            </summary>
            <div className="mt-3">
              <BetaFeedbackForm context={feedbackContext} marshmallowId={marshmallow.id} />
            </div>
          </details>
          {marshmallow.play_mode === "daily" ? (
            <p className="text-center text-sm text-ink-muted">
              Tomorrow, another question about being human.
            </p>
          ) : null}
          <PrimaryButton
            href={marshmallow.nextHref}
            onClick={() =>
              void trackEvent(
                ANALYTICS_EVENTS.nextMarshmallowClicked,
                { href: marshmallow.nextHref },
                marshmallow.id,
              )
            }
          >
            PLAY ANOTHER
          </PrimaryButton>
        </section>
      ) : null}
    </div>
  );
}

function YouVsCrowd({ reveal }: { reveal: RevealPayload }) {
  return (
    <ul className="mt-3 flex flex-col gap-3 text-left">
      {reveal.choices.map((choice) => (
        <li key={choice.choiceId}>
          <p className="text-xs font-semibold tracking-[0.16em] uppercase text-ink-muted">
            {choice.label}
          </p>
          <p className="text-sm">You {choice.youPct ?? 0}%</p>
          <p className="text-sm">Crowd {Math.round(choice.votePct)}%</p>
          <div className="mt-1 h-2 overflow-hidden rounded-full bg-border">
            <div
              className="h-full bg-ink"
              style={{ width: `${Math.max(0, Math.min(100, choice.votePct))}%` }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}

function SpectatorCrowd({
  reveal,
  nextHref,
  marshmallowId,
  playMode,
}: {
  reveal: RevealPayload;
  nextHref: string;
  marshmallowId: string;
  playMode: PlayMarshmallow["play_mode"];
}) {
  const crowdLeader = [...reveal.choices].sort((a, b) => b.votePct - a.votePct)[0];
  return (
    <div className="flex flex-1 flex-col gap-6 py-10">
      <PlayModeBadge mode={playMode} />
      <MarshmallowMascot state="toasted" size="lg" />
      <p className="text-xs font-semibold tracking-[0.18em] text-ink-muted uppercase">
        {crowdVoiceHeading(reveal.totalVotes)}
      </p>
      {crowdLeader ? (
        <>
          <p className="font-display text-5xl font-semibold tabular-nums">
            {Math.round(crowdLeader.votePct)}%
          </p>
          <p className="font-display text-2xl font-semibold uppercase break-words">
            {crowdLeader.label}
          </p>
        </>
      ) : null}
      <p className="text-sm text-ink-muted">You didn&apos;t play this one.</p>
      <PrimaryButton
        href={nextHref}
        onClick={() =>
          void trackEvent(ANALYTICS_EVENTS.nextMarshmallowClicked, { href: nextHref }, marshmallowId)
        }
      >
        PLAY AN OPEN MARSHMALLOW
      </PrimaryButton>
    </div>
  );
}

function ZeroCrowd({
  nextHref,
  marshmallowId,
  playMode,
}: {
  nextHref: string;
  marshmallowId: string;
  playMode: PlayMarshmallow["play_mode"];
}) {
  return (
    <div className="flex flex-1 flex-col items-center gap-4 py-10 text-center">
      <PlayModeBadge mode={playMode} />
      <MarshmallowMascot state="fluffy" size="lg" />
      <h1 className="font-display text-[2rem] leading-[1.05] font-semibold tracking-tight">
        Not enough players this time.
      </h1>
      <p className="text-sm text-ink-muted">No result was scored.</p>
      <PrimaryButton
        href={nextHref}
        onClick={() =>
          void trackEvent(ANALYTICS_EVENTS.nextMarshmallowClicked, { href: nextHref }, marshmallowId)
        }
      >
        PLAY ANOTHER
      </PrimaryButton>
    </div>
  );
}
