"use client";

import { MarshmallowMascot } from "@/components/MarshmallowMascot";
import { MoneyPrimaryButton } from "@/components/MoneyPrimaryButton";
import type { ContinuousExperimentOffer } from "@/server/dal/continuous-experiment";
import { formatScheduledExperimentOpen } from "@/domain/daily/scheduled-preview";

export type ContinuousHomeSectionVariant =
  | "play-now"
  | "more-experiments"
  | "keep-playing";

export function ContinuousExperimentHomeSection({
  offer,
  variant,
}: {
  offer: ContinuousExperimentOffer;
  variant: ContinuousHomeSectionVariant;
}) {
  const sectionLabel =
    variant === "play-now"
      ? "Play now"
      : variant === "keep-playing"
        ? "Keep playing"
        : "More experiments";

  const ctaLabel =
    offer.inProgress && offer.sealedCount > 0 ? "CONTINUE" : "PLAY NOW";

  return (
    <section className="flex flex-col gap-4 border-t border-border/60 pt-6">
      <p className="text-xs font-semibold tracking-[0.2em] text-ink-muted uppercase">
        {sectionLabel}
      </p>
      <div className="flex flex-col gap-4 rounded-2xl border border-border/70 bg-surface/40 px-4 py-5">
        <MarshmallowMascot state="fluffy" size="sm" className="self-center" aria-hidden />
        <div className="flex flex-col gap-2 text-center">
          <p className="font-display text-[clamp(1.15rem,5vw,1.45rem)] leading-[1.1] font-semibold tracking-tight break-words uppercase text-ink">
            {offer.homeHeadline}
          </p>
          <p className="text-sm leading-6 text-ink-muted">{offer.homeTeaser}</p>
          {offer.inProgress && offer.sealedCount > 0 ? (
            <p className="text-xs font-semibold tracking-[0.16em] text-ink-muted uppercase">
              {offer.sealedCount} of 5 locked
            </p>
          ) : null}
        </div>
        <MoneyPrimaryButton href={offer.playHref}>{ctaLabel}</MoneyPrimaryButton>
      </div>
    </section>
  );
}

export function ContinuousCaughtUpSection({
  nextDailyOpensAt,
}: {
  nextDailyOpensAt: string | null;
}) {
  const schedule =
    nextDailyOpensAt != null ? formatScheduledExperimentOpen(nextDailyOpensAt) : null;

  return (
    <section className="flex flex-col items-center gap-3 rounded-2xl border border-border/70 bg-surface/30 px-5 py-7 text-center">
      <p className="text-xs font-semibold tracking-[0.2em] text-ink-muted uppercase">
        You&apos;re caught up
      </p>
      <p className="max-w-[20rem] text-sm leading-6 text-ink-muted">
        {schedule ? (
          <>
            The next Daily opens {schedule.weekdayLine.replace(/^A new experiment opens /i, "")}
            <span className="mt-1 block text-xs font-semibold tracking-[0.16em] text-ink uppercase">
              {schedule.dateTimeLine}
            </span>
          </>
        ) : (
          "Check back when the next Daily opens."
        )}
      </p>
    </section>
  );
}
