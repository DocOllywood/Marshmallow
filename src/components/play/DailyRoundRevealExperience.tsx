"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { MarshmallowMascot } from "@/components/MarshmallowMascot";
import { PrimaryButton } from "@/components/PrimaryButton";
import type {
  DailyRoundQuestionReveal,
  DailyRoundSummary,
} from "@/domain/daily/round";
import { openDailyRoundRevealAction } from "@/server/actions/play";

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

  async function open() {
    setPending(true);
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

export function DailyRoundRevealShow({
  reveals,
  summary,
}: {
  reveals: DailyRoundQuestionReveal[];
  summary: DailyRoundSummary;
}) {
  return (
    <div className="flex flex-1 flex-col gap-8 pb-10 pt-6">
      <div className="flex flex-col items-center gap-3 text-center">
        <MarshmallowMascot state="celebrating" size="lg" />
        <p className="text-xs font-semibold tracking-[0.18em] text-ink-muted uppercase">
          The crowd is in
        </p>
      </div>

      <ul className="flex flex-col gap-8">
        {reveals.map((item) => (
          <li key={item.id} className="flex flex-col gap-3 border-b border-border/60 pb-6 last:border-0">
            <p className="text-[10px] font-semibold tracking-[0.2em] text-ink-muted uppercase">
              Question {item.position}
            </p>
            <p className="font-display text-lg font-semibold leading-snug break-words">{item.question}</p>
            {item.ownChoiceLabel ? (
              <p className="text-sm text-ink-muted">
                You picked <span className="font-semibold text-ink">{item.ownChoiceLabel}</span>
                {item.predictedPct != null ? ` · You called ${item.predictedPct}%` : null}
              </p>
            ) : null}
            <p className="font-display text-4xl font-semibold tabular-nums">{Math.round(item.crowdPct)}%</p>
            <p className="font-display text-lg font-semibold uppercase break-words">{item.crowdLabel}</p>
            {item.errorCopy ? (
              <p className="text-sm font-semibold uppercase tracking-[0.14em] text-ink-muted">
                {item.errorCopy}
              </p>
            ) : null}
            {item.accuracy != null ? (
              <p className="text-sm font-semibold text-ink-muted">Accuracy {item.accuracy}</p>
            ) : null}
          </li>
        ))}
      </ul>

      <section className="flex flex-col gap-3 text-center">
        <p className="text-xs font-semibold tracking-[0.18em] text-ink-muted uppercase">
          How well did you read the room?
        </p>
        <p className="font-display text-2xl font-semibold">
          {summary.strongReadCount} of {reveals.length} strong reads
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
        <PrimaryButton href="/home">PLAY ANOTHER</PrimaryButton>
      </section>
    </div>
  );
}
