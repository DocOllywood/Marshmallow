"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { useState } from "react";

import { GapDisplay } from "@/components/daily/GapDisplay";
import { MarshmallowMascot } from "@/components/MarshmallowMascot";
import { PrimaryButton } from "@/components/PrimaryButton";
import { ANALYTICS_EVENTS } from "@/lib/analytics/events";
import type {
  DailyRoundQuestionReveal,
  DailyRoundSummary,
} from "@/domain/daily/round";
import { openDailyRoundRevealAction } from "@/server/actions/play";
import { trackEvent } from "@/server/actions/analytics";

export function DailyRoundRevealGate({
  roundId,
  title,
}: {
  roundId: string;
  title: string;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const tracked = useRef(false);

  useEffect(() => {
    if (tracked.current) return;
    tracked.current = true;
    void trackEvent(ANALYTICS_EVENTS.dailyRevealAvailable, { round_id: roundId }, roundId);
  }, [roundId]);

  async function open() {
    setPending(true);
    void trackEvent(ANALYTICS_EVENTS.dailyRevealOpened, { round_id: roundId }, roundId);
    const result = await openDailyRoundRevealAction(roundId);
    if (!result.ok) {
      setPending(false);
      setError(result.error ?? "Could not open reveal.");
      return;
    }
    router.refresh();
  }

  return (
    <div className="flex flex-1 flex-col items-center gap-5 py-10 text-center">
      <MarshmallowMascot state={pending ? "toasted" : "cooking"} size="lg" heat={2} />
      <p className="text-xs font-semibold tracking-[0.18em] text-primary uppercase">
        Daily ready
      </p>
      <h1 className="font-display text-[clamp(1.5rem,6.5vw,1.85rem)] leading-[1.08] font-semibold tracking-tight break-words">
        {title}
      </h1>
      <PrimaryButton onClick={() => void open()} disabled={pending}>
        {pending ? "Opening…" : "REVEAL THE DAILY"}
      </PrimaryButton>
      {error ? <p className="text-sm text-toasted">{error}</p> : null}
    </div>
  );
}

function QuestionGap({ item }: { item: DailyRoundQuestionReveal }) {
  const tracked = useRef(false);

  useEffect(() => {
    if (!item.gap || tracked.current) return;
    tracked.current = true;
    void trackEvent(
      ANALYTICS_EVENTS.gapViewed,
      { gap_points: item.gap.gapPoints, position: item.position },
      item.id,
    );
  }, [item.gap, item.id, item.position]);

  if (!item.gap) {
    return null;
  }

  return <GapDisplay gap={item.gap} />;
}

export function DailyRoundRevealShow({
  reveals,
  summary,
  roundId,
}: {
  reveals: DailyRoundQuestionReveal[];
  summary: DailyRoundSummary;
  roundId?: string;
}) {
  const tracked = useRef(false);

  useEffect(() => {
    if (tracked.current) return;
    tracked.current = true;
    void trackEvent(ANALYTICS_EVENTS.dailyRevealOpened, { viewed: true, round_id: roundId ?? null }, roundId);
  }, [roundId]);

  return (
    <div className="flex flex-1 flex-col gap-8 pb-10 pt-6">
      <div className="flex flex-col items-center gap-3 text-center">
        <MarshmallowMascot state="celebrating" size="lg" />
        <p className="text-xs font-semibold tracking-[0.18em] text-ink-muted uppercase">
          Marshmallow players weighed in
        </p>
      </div>

      <ul className="flex flex-col gap-8">
        {reveals.map((item) => (
          <li key={item.id} className="flex flex-col gap-3 border-b border-border/60 pb-6 last:border-0">
            <p className="text-[10px] font-semibold tracking-[0.2em] text-ink-muted uppercase">
              Question {item.position}
              {item.isLine ? " · The Line" : ""}
            </p>
            <p className="font-display text-lg font-semibold leading-snug break-words">{item.question}</p>
            {item.ownChoiceLabel ? (
              <p className="text-sm text-ink-muted">
                {item.isLine ? "Your line" : "You picked"}{" "}
                <span className="font-semibold text-ink">{item.ownChoiceLabel}</span>
              </p>
            ) : null}
            {!item.isLine ? (
              <>
                <QuestionGap item={item} />
                {item.crowdModeLabel && item.crowdModeLabel !== item.crowdLabel ? (
                  <p className="text-sm text-ink-muted">
                    Most Marshmallow players chose{" "}
                    <span className="font-semibold text-ink">{item.crowdModeLabel}</span>
                  </p>
                ) : null}
                {item.errorCopy ? (
                  <p className="text-xs font-semibold uppercase tracking-[0.14em] text-ink-muted">
                    Accuracy note: {item.errorCopy}
                  </p>
                ) : null}
                {item.accuracy != null ? (
                  <p className="text-sm font-semibold text-ink-muted">Accuracy {item.accuracy}</p>
                ) : null}
              </>
            ) : (
              <p className="text-sm text-ink-muted">
                Most common line among Marshmallow players:{" "}
                <span className="font-semibold text-ink">{item.crowdModeLabel ?? item.crowdLabel}</span>
                {item.crowdPct > 0 ? ` (${Math.round(item.crowdPct)}%)` : ""}
              </p>
            )}
          </li>
        ))}
      </ul>

      <section className="flex flex-col gap-3 text-center">
        <p className="text-xs font-semibold tracking-[0.18em] text-ink-muted uppercase">
          How well did you read Marshmallow players?
        </p>
        <p className="font-display text-2xl font-semibold">
          {summary.strongReadCount} of {summary.scoredQuestionCount} strong reads
        </p>
        <p className="text-sm font-semibold text-ink-muted">
          Average Accuracy {summary.averageAccuracy}
        </p>
        {summary.contextCopy ? (
          <p className="text-xs font-semibold tracking-[0.16em] text-ink-muted uppercase">
            {summary.contextCopy}
          </p>
        ) : null}
        {summary.crowdsenseRating != null ? (
          <p className="text-sm text-ink-muted">
            CrowdSense {summary.crowdsenseRating}
            {summary.crowdsenseDelta != null && summary.crowdsenseDelta !== 0
              ? ` ${summary.crowdsenseDelta > 0 ? "+" : ""}${summary.crowdsenseDelta}`
              : ""}
          </p>
        ) : null}
        <p className="text-sm text-ink-muted">Tomorrow, another round about being human.</p>
        <PrimaryButton
          href="/home"
          onClick={() => void trackEvent(ANALYTICS_EVENTS.nextDailyReturn, { round_id: roundId ?? null }, roundId)}
        >
          PLAY ANOTHER
        </PrimaryButton>
      </section>
    </div>
  );
}
