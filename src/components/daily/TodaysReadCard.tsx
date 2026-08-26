"use client";

import { useEffect, useRef } from "react";

import { MarshmallowMascot } from "@/components/MarshmallowMascot";
import { PrimaryButton } from "@/components/PrimaryButton";
import { ANALYTICS_EVENTS } from "@/lib/analytics/events";
import type { TodaysRead } from "@/domain/daily/todays-read";
import { trackEvent } from "@/server/actions/analytics";
import { TodaysMarshmallow } from "@/components/daily/TodaysMarshmallow";

export function TodaysReadCard({
  read,
  homeHref = "/home",
  showHomeButton = true,
  roundId,
  tensionSlug,
}: {
  read: TodaysRead;
  homeHref?: string;
  showHomeButton?: boolean;
  roundId?: string;
  tensionSlug?: string | null;
}) {
  const tracked = useRef(false);

  useEffect(() => {
    if (tracked.current) return;
    tracked.current = true;
    void trackEvent(
      ANALYTICS_EVENTS.todaysReadViewed,
      { legacy: read.isLegacy },
      roundId,
    );
  }, [read.isLegacy, roundId]);

  return (
    <div className="flex flex-col items-center gap-5 px-2 py-8 text-center">
      <MarshmallowMascot state="sealed" size="lg" />
      <p className="text-xs font-semibold tracking-[0.18em] text-primary uppercase">Today&apos;s read</p>
      <p className="max-w-[22rem] font-display text-[clamp(1.35rem,5.5vw,1.75rem)] leading-snug font-semibold tracking-tight break-words uppercase">
        {read.headline}
      </p>
      {read.bodyLines.map((line) => (
        <p key={line} className="max-w-[22rem] text-sm leading-6 text-ink-muted">
          {line}
        </p>
      ))}
      {read.switchCopy ? (
        <p className="max-w-[22rem] text-sm leading-6 text-ink-muted">{read.switchCopy}</p>
      ) : null}
      {read.lineCopy ? (
        <div className="max-w-[22rem] space-y-1 text-sm leading-6 text-ink-muted">
          <p className="text-xs font-semibold tracking-[0.16em] text-ink-muted uppercase">Your line</p>
          <p className="font-semibold text-ink">{read.lineCopy}</p>
        </div>
      ) : null}
      <TodaysMarshmallow tensionSlug={tensionSlug} />
      <div className="flex flex-col gap-2 pt-2">
        <p className="text-xs font-semibold tracking-[0.18em] text-primary uppercase">
          Your calls are locked
        </p>
        <p className="max-w-[20rem] text-sm leading-6 text-ink-muted">
          The crowd is still deciding.
        </p>
        <p className="max-w-[20rem] text-sm leading-6 text-ink-muted">Come back tonight.</p>
      </div>
      {read.tomorrowTease ? (
        <div className="flex flex-col gap-1 border-t border-border/60 pt-5">
          <p className="text-[10px] font-semibold tracking-[0.2em] text-ink-muted uppercase">Tomorrow</p>
          <p className="font-display text-base font-semibold tracking-tight text-ink">{read.tomorrowTease}</p>
        </div>
      ) : null}
      {showHomeButton ? <PrimaryButton href={homeHref}>HOME</PrimaryButton> : null}
    </div>
  );
}
