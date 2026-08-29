"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";

import { ExperimentDailyHomeSection } from "@/components/experiment/ExperimentDailyHomeSection";
import { TodaysReadCard } from "@/components/daily/TodaysReadCard";
import { EmptyState } from "@/components/EmptyState";
import { MarshmallowMascot } from "@/components/MarshmallowMascot";
import { PrimaryButton } from "@/components/PrimaryButton";
import { isDailyRoundVisibleOnHome, dailyHomeState, type DailyRoundProgress } from "@/domain/daily/round";
import { ANALYTICS_EVENTS } from "@/lib/analytics/events";
import { trackEvent } from "@/server/actions/analytics";
import { heroHomeQuick, isWaitingForSample, moreHomeQuick } from "@/domain/play/sample";
import {
  formatShortCountdown,
  formatWaitPresentation,
  shouldShowShortCountdown,
} from "@/lib/format/duration";
import type { HomeFeed, HomeFeedCard } from "@/server/dal/home";

function worldLabel(topicName: string | null | undefined): string | null {
  if (!topicName?.trim()) return null;
  return topicName.trim().toUpperCase();
}

function compactCookingLabel(
  card: HomeFeedCard,
  remainingMs: number,
  waitingForSample: boolean,
): string {
  if (waitingForSample) return "Waiting for players";
  if (remainingMs <= 0) return "Almost ready";

  const mode = card.is_daily ? "daily" : card.play_mode;
  if (mode === "quick" && shouldShowShortCountdown(remainingMs)) {
    return formatShortCountdown(remainingMs);
  }

  const presentation = formatWaitPresentation({
    playMode: mode === "daily" || mode === "live" || mode === "quick" ? mode : "quick",
    remainingMs,
    revealsAt: card.reveals_at,
    closesAt: card.closes_at,
    waitingForSample,
  });

  if (mode === "daily") {
    return presentation.status.match(/Come back/i) ? "Come back tonight" : presentation.detail;
  }
  if (mode === "quick") {
    return presentation.detail;
  }
  return presentation.detail;
}

export function HomeFeedView({
  feed,
  firstName,
  identity,
}: {
  feed: HomeFeed;
  firstName: string;
  identity?: {
    rating: number | null;
    qualified: boolean;
    remaining: number;
    scoredCount: number;
    revealStreak: number;
  };
}) {
  const heroQuick = heroHomeQuick(feed.quickPlay);
  const moreQuick = moreHomeQuick(feed.quickPlay);

  const empty =
    !feed.dailyRound &&
    feed.readyToReveal.length === 0 &&
    feed.cooking.length === 0 &&
    !heroQuick &&
    feed.liveNow.length === 0 &&
    feed.recent.length === 0;

  return (
    <main className="flex flex-1 flex-col gap-7 pb-8">
      <header className="flex items-start justify-between gap-3 pt-6">
        <div className="min-w-0">
          <h1 className="font-display text-[1.65rem] leading-tight font-semibold tracking-tight">
            Hey {firstName}.
          </h1>
          {identity ? (
            <p className="mt-1 text-xs text-ink-muted">
              CrowdSense ·{" "}
              {identity.qualified && identity.rating != null ? (
                <>
                  <span className="font-semibold tabular-nums text-ink">{identity.rating}</span>
                  {identity.revealStreak > 0 ? (
                    <span> · 🔥 {identity.revealStreak}</span>
                  ) : null}
                </>
              ) : (
                <span>{identity.scoredCount}/5 to unlock</span>
              )}
            </p>
          ) : null}
        </div>
        <Link href="/notifications" className="shrink-0 text-sm font-semibold text-primary">
          Inbox
        </Link>
      </header>

      {empty ? (
        <EmptyState
          mascot="fluffy"
          title={feed.hasInterests ? "Nothing is cooking yet" : "Nothing open yet"}
          description={
            feed.hasInterests
              ? "No questions are open right now. Check back soon."
              : "The daily experiment lands here when it's ready."
          }
        />
      ) : null}

      {feed.readyToReveal.length > 0 ? (
        <ReadySection cards={feed.readyToReveal.slice(0, 3)} />
      ) : null}

      {heroQuick ? <QuickHero hero={heroQuick} more={moreQuick} /> : null}

      {feed.dailyRound && isDailyRoundVisibleOnHome(feed.dailyRound) ? (
        feed.dailyRound.isExperimentDaily ? (
          <ExperimentDailyHomeSection round={feed.dailyRound} />
        ) : (
          <DailyRoundSection round={feed.dailyRound} />
        )
      ) : null}

      {feed.liveNow.length > 0 ? <LiveSection cards={feed.liveNow} /> : null}

      {feed.cooking.length > 0 ? <CookingSection cards={feed.cooking} /> : null}

      {feed.recent.length > 0 ? <RecentSection cards={feed.recent} /> : null}
    </main>
  );
}

function SectionLabel({ children }: { children: string }) {
  return (
    <p className="text-xs font-semibold tracking-[0.18em] text-ink-muted uppercase">{children}</p>
  );
}

function QuestionText({
  children,
  size = "hero",
}: {
  children: string;
  size?: "hero" | "large" | "medium";
}) {
  const className =
    size === "hero"
      ? "font-display text-[clamp(1.85rem,8.5vw,2.5rem)] leading-[1.06] font-semibold tracking-tight break-words"
      : size === "large"
        ? "font-display text-[clamp(1.4rem,5.8vw,1.75rem)] leading-[1.1] font-semibold tracking-tight break-words"
        : "font-display text-base font-semibold leading-snug break-words";
  return <p className={className}>{children}</p>;
}

function WorldTag({ topicName }: { topicName: string | null | undefined }) {
  const label = worldLabel(topicName);
  if (!label) return null;
  return (
    <p className="text-[10px] font-semibold tracking-[0.2em] text-ink-muted/80 uppercase">{label}</p>
  );
}

function QuickHero({ hero, more }: { hero: HomeFeedCard; more: HomeFeedCard[] }) {
  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-col gap-2">
        <WorldTag topicName={hero.topicName} />
        <Link href={`/m/${hero.id}`} className="block min-w-0 touch-manipulation">
          <QuestionText size="hero">{hero.question}</QuestionText>
        </Link>
      </div>
      <PrimaryButton href={`/m/${hero.id}`}>PLAY QUICK</PrimaryButton>
      {more.length > 0 ? (
        <ul className="flex flex-col gap-3 border-t border-border/60 pt-4">
          {more.map((card) => (
            <li key={card.id}>
              <Link
                href={`/m/${card.id}`}
                className="block min-w-0 py-0.5 text-[0.95rem] leading-snug font-semibold text-ink/90 touch-manipulation hover:text-primary"
              >
                {card.question}
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
    </section>
  );
}

function DailyRoundSection({ round }: { round: DailyRoundProgress }) {
  const state = dailyHomeState(round);
  const playHref = round.currentPlayId ? `/m/${round.currentPlayId}` : "/home";
  const viewed = useRef(false);
  const world = worldLabel(round.topicName);
  const dilemmaCount = round.questions.length;

  useEffect(() => {
    if (viewed.current) return;
    viewed.current = true;
    void trackEvent(
      ANALYTICS_EVENTS.dailyViewed,
      { state, has_tension: round.tension != null },
      round.roundId,
    );
  }, [round.roundId, round.tension, state]);

  return (
    <section className="flex flex-col gap-4 border-l-2 border-primary/30 pl-4">
      <div className="flex flex-col gap-2">
        <p className="text-xs font-semibold tracking-[0.18em] text-primary uppercase">The Daily</p>
        <p className="text-[10px] font-semibold tracking-[0.2em] text-ink-muted/80 uppercase">
          Today everyone is playing
        </p>
        {world ? (
          <p className="text-xs font-semibold tracking-[0.2em] text-ink uppercase">{world}</p>
        ) : null}
        {round.tension ? (
          <p className="font-display text-sm font-semibold tracking-tight text-ink">
            {round.tension.displayLabel}
          </p>
        ) : null}
        <p className="font-display text-[clamp(1.2rem,5vw,1.55rem)] leading-[1.1] font-semibold tracking-tight break-words">
          {round.title}
        </p>
        {dilemmaCount > 0 ? (
          <p className="text-sm text-ink-muted">
            {dilemmaCount} {dilemmaCount === 1 ? "dilemma" : "dilemmas"}
          </p>
        ) : round.subtitle ? (
          <p className="text-sm leading-snug text-ink-muted">{round.subtitle}</p>
        ) : null}
      </div>

      {state === "play" ? (
        <PrimaryButton href={playHref}>PLAY TODAY&apos;S DAILY</PrimaryButton>
      ) : null}
      {state === "continue" ? (
        <>
          <p className="text-sm font-semibold text-ink-muted">
            {round.sealedCount} of {round.questions.length} locked
          </p>
          <PrimaryButton href={playHref}>CONTINUE TODAY&apos;S DAILY</PrimaryButton>
        </>
      ) : null}
      {state === "sealed" ? (
        round.todaysRead ? (
          <TodaysReadCard
            read={round.todaysRead}
            showHomeButton={false}
            roundId={round.roundId}
            tensionSlug={round.tension?.slug}
          />
        ) : (
          <>
            <p className="text-xs font-semibold tracking-[0.18em] text-primary uppercase">
              Daily sealed
            </p>
            <p className="text-sm text-ink-muted">The crowd is still deciding. Come back tonight.</p>
          </>
        )
      ) : null}
      {state === "ready" ? (
        <>
          <p className="text-xs font-semibold tracking-[0.18em] text-primary uppercase">
            The crowd is in
          </p>
          <PrimaryButton href={round.revealHref}>REVEAL THE DAILY</PrimaryButton>
        </>
      ) : null}
    </section>
  );
}

function ReadySection({ cards }: { cards: HomeFeedCard[] }) {
  return (
    <section className="flex flex-col gap-3">
      <SectionLabel>Ready</SectionLabel>
      <ul className="flex flex-col gap-4">
        {cards.map((card) => (
          <li key={card.id} className="flex flex-col gap-3 border-b border-border/60 pb-4 last:border-0 last:pb-0">
            <div className="flex items-start gap-3">
              <MarshmallowMascot state="toasted" size="sm" className="shrink-0" />
              <div className="min-w-0 flex-1">
                <WorldTag topicName={card.topicName} />
                <Link href={`/m/${card.id}`} className="mt-1 block min-w-0 touch-manipulation">
                  <QuestionText size="medium">{card.question}</QuestionText>
                </Link>
              </div>
            </div>
            <PrimaryButton href={`/m/${card.id}`}>REVEAL</PrimaryButton>
          </li>
        ))}
      </ul>
    </section>
  );
}

function CookingSection({ cards }: { cards: HomeFeedCard[] }) {
  return (
    <section className="flex flex-col gap-2">
      <SectionLabel>Cooking</SectionLabel>
      <ul className="flex flex-col gap-3">
        {cards.map((card) => (
          <li key={card.id}>
            <Link href={`/m/${card.id}`} className="block min-w-0 touch-manipulation">
              <p className="font-display text-sm font-semibold leading-snug break-words">
                {card.question}
              </p>
              <CookingMeta card={card} />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

function CookingMeta({ card }: { card: HomeFeedCard }) {
  const [nowMs, setNowMs] = useState(() => Date.now());
  useEffect(() => {
    const remaining = Date.parse(card.reveals_at) - Date.now();
    const ms = remaining > 0 && remaining <= 180_000 ? 1000 : 15_000;
    const id = window.setInterval(() => setNowMs(Date.now()), ms);
    return () => window.clearInterval(id);
  }, [card.reveals_at]);
  const waitingForPlayers = isWaitingForSample({
    status: card.status,
    nowMs,
    revealsAtMs: Date.parse(card.reveals_at),
    hardRevealsAtMs: Date.parse(card.hard_reveals_at),
  });
  const remaining = Date.parse(card.reveals_at) - nowMs;

  return (
    <p className="mt-1 text-xs text-ink-muted">
      {compactCookingLabel(card, remaining, waitingForPlayers)}
    </p>
  );
}

function RecentSection({ cards }: { cards: HomeFeedCard[] }) {
  return (
    <section className="flex flex-col gap-2">
      <SectionLabel>Recent</SectionLabel>
      <ul className="flex flex-col gap-3">
        {cards.map((card) => (
          <li key={card.id}>
            <Link href={`/m/${card.id}`} className="block min-w-0 touch-manipulation">
              <WorldTag topicName={card.topicName} />
              <p className="mt-0.5 line-clamp-2 font-display text-sm font-semibold leading-snug break-words">
                {card.question}
              </p>
              {card.accuracy != null ? (
                <p className="mt-1 text-xs text-ink-muted">Accuracy {card.accuracy}</p>
              ) : null}
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

function LiveSection({ cards }: { cards: HomeFeedCard[] }) {
  return (
    <section className="flex flex-col gap-2">
      <SectionLabel>Live</SectionLabel>
      <ul className="flex flex-col gap-2">
        {cards.map((card) => (
          <li key={card.id}>
            <Link href={`/m/${card.id}`} className="block min-w-0 rounded-xl px-1 py-2">
              <WorldTag topicName={card.topicName} />
              <QuestionText size="medium">{card.question}</QuestionText>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function HomeLoadError() {
  return (
    <EmptyState
      mascot="toasted"
      title="Home didn't load"
      description="The feed could not be fetched. Check your connection and try again."
      action={<PrimaryButton href="/home">Try home again</PrimaryButton>}
    />
  );
}

export function MissingProfileState() {
  return (
    <EmptyState
      mascot="toasted"
      title="Profile didn't land"
      description="Your account exists, but the profile row is missing. Sign out and back in. If it persists, the signup trigger needs a look."
      action={
        <Link href="/settings" className="text-sm font-semibold text-primary">
          Go to settings
        </Link>
      }
    />
  );
}
