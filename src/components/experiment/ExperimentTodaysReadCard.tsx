"use client";

import { useEffect, useRef } from "react";

import { MoneyPrimaryButton } from "@/components/MoneyPrimaryButton";
import { PrimaryButton } from "@/components/PrimaryButton";
import { DareSomeoneCard } from "@/components/experiment/DareSomeoneCard";
import { BlindMirrorCard } from "@/components/experiment/BlindMirrorCard";
import { experimentDaresEnabled } from "@/lib/env/experiment-dares";
import { OutsideTheExperiment } from "@/components/experiment/OutsideTheExperiment";
import { ANALYTICS_EVENTS } from "@/lib/analytics/events";
import type { BlindMirrorComparison } from "@/domain/daily/blind-mirror";
import type { TodaysRead } from "@/domain/daily/todays-read";
import { trackEvent } from "@/server/actions/analytics";

export function ExperimentTodaysReadCard({
  read,
  homeHref = "/home",
  showHomeButton = true,
  keepPlayingHref = null,
  onKeepPlayingClick,
  roundId,
  tensionSlug,
  blindMirror,
  isPriceExperiment = false,
  skipAnalytics = false,
}: {
  read: TodaysRead;
  homeHref?: string;
  showHomeButton?: boolean;
  roundId?: string;
  tensionSlug?: string | null;
  blindMirror?: BlindMirrorComparison | null;
  isPriceExperiment?: boolean;
  skipAnalytics?: boolean;
  keepPlayingHref?: string | null;
  onKeepPlayingClick?: () => void;
}) {
  const tracked = useRef(false);
  const priceRead = read.isPrice || isPriceExperiment;
  const hypotheticalLines = read.bodyLines.filter((line) =>
    /hypothetical experiment/i.test(line),
  );
  const showHypotheticalNearHeadline =
    priceRead && hypotheticalLines.length > 0 && /^\$|MOVED AT/i.test(read.headline);

  useEffect(() => {
    if (skipAnalytics || tracked.current) return;
    tracked.current = true;
    void trackEvent(
      ANALYTICS_EVENTS.todaysReadViewed,
      { legacy: read.isLegacy, experiment: read.isExperiment ?? true },
      roundId,
    );
  }, [read.isExperiment, read.isLegacy, roundId, skipAnalytics]);

  return (
    <div className="flex flex-col items-center gap-6 px-2 py-8 text-center">
      <p
        className={`text-xs font-semibold tracking-[0.18em] uppercase ${priceRead ? "text-money" : "text-ink-muted"}`}
      >
        Today&apos;s read
      </p>
      <p className="max-w-[22rem] font-display text-[clamp(1.35rem,5.5vw,1.85rem)] leading-[1.12] font-semibold tracking-tight break-words uppercase text-ink">
        {read.headline}
      </p>
      {showHypotheticalNearHeadline ? (
        <p className="max-w-[22rem] text-sm leading-6 text-ink-muted">{hypotheticalLines[0]}</p>
      ) : null}

      {priceRead && read.priceSections ? (
        <div className="flex w-full max-w-[22rem] flex-col gap-4 border-t border-money-border/50 pt-4 text-left">
          {read.priceSections.startedLabel ? (
            <div className="flex flex-col gap-1">
              <p className="text-[10px] font-semibold tracking-[0.2em] text-ink-muted uppercase">
                You started
              </p>
              <p className="font-display text-base font-semibold uppercase text-ink">
                {read.priceSections.startedLabel}
              </p>
            </div>
          ) : null}
          {read.priceSections.endedLabel ? (
            <div className="flex flex-col gap-1">
              <p className="text-[10px] font-semibold tracking-[0.2em] text-ink-muted uppercase">
                You ended
              </p>
              <p className="font-display text-base font-semibold uppercase text-ink">
                {read.priceSections.endedLabel}
              </p>
            </div>
          ) : null}
          {read.priceSections.movedSummary && !showHypotheticalNearHeadline ? (
            <div className="flex flex-col gap-1">
              <p className="text-[10px] font-semibold tracking-[0.2em] text-ink-muted uppercase">
                What moved
              </p>
              <p className="text-sm leading-6 text-ink-muted">{read.priceSections.movedSummary}</p>
            </div>
          ) : null}
          {read.lineCopy ? (
            <div className="flex flex-col gap-1 border-t border-money-border/40 pt-3">
              <p className="text-[10px] font-semibold tracking-[0.2em] text-money uppercase">Your line</p>
              <p className="font-display text-base font-semibold text-ink">{read.lineCopy}</p>
            </div>
          ) : null}
        </div>
      ) : (
        <>
          {read.bodyLines.map((line) => (
            <p key={line} className="max-w-[22rem] text-sm leading-6 text-ink-muted">
              {line}
            </p>
          ))}
          {read.lineCopy ? (
            <div className="max-w-[22rem] space-y-1 pt-2">
              <p className="text-xs font-semibold tracking-[0.2em] text-ink-muted uppercase">Your line</p>
              <p className="font-display text-base font-semibold text-ink">{read.lineCopy}</p>
            </div>
          ) : null}
        </>
      )}

      {blindMirror ? <BlindMirrorCard comparison={blindMirror} /> : null}
      {experimentDaresEnabled() && roundId ? (
        <DareSomeoneCard roundId={roundId} isPriceExperiment={priceRead} />
      ) : null}
      <OutsideTheExperiment tensionSlug={tensionSlug} moneyTone={priceRead} />
      <div className="flex flex-col gap-2 pt-2">
        <p className={`text-xs font-semibold tracking-[0.18em] uppercase ${priceRead ? "text-money" : "text-ink-muted"}`}>
          {priceRead ? "Your line is locked." : "Your calls are locked."}
        </p>
        <p className="max-w-[20rem] text-sm leading-6 text-ink-muted">
          The crowd is still deciding.
        </p>
        <p className="max-w-[20rem] text-sm leading-6 text-ink-muted">
          Come back for the reveal.
        </p>
      </div>
      {read.tomorrowTease ? (
        <div className="flex flex-col gap-1 border-t border-border/60 pt-5">
          <p className="text-[10px] font-semibold tracking-[0.2em] text-ink-muted uppercase">Tomorrow</p>
          <p className="font-display text-base font-semibold tracking-tight text-ink">{read.tomorrowTease}</p>
        </div>
      ) : null}
      {showHomeButton ? (
        <div className="flex w-full max-w-[22rem] flex-col gap-2 pt-2">
          {keepPlayingHref ? (
            priceRead ? (
              <MoneyPrimaryButton href={keepPlayingHref} onClick={onKeepPlayingClick}>
                KEEP PLAYING
              </MoneyPrimaryButton>
            ) : (
              <PrimaryButton href={keepPlayingHref} onClick={onKeepPlayingClick}>
                KEEP PLAYING
              </PrimaryButton>
            )
          ) : null}
          {priceRead ? (
            <MoneyPrimaryButton
              href={homeHref}
              className={keepPlayingHref ? "border-2 border-money bg-transparent text-money hover:opacity-80" : undefined}
            >
              HOME
            </MoneyPrimaryButton>
          ) : (
            <PrimaryButton href={homeHref}>HOME</PrimaryButton>
          )}
        </div>
      ) : null}
    </div>
  );
}
