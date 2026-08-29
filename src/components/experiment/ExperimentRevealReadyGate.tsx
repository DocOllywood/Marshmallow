"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { MarshmallowMascot } from "@/components/MarshmallowMascot";
import { MoneyPrimaryButton } from "@/components/MoneyPrimaryButton";
import { ANALYTICS_EVENTS } from "@/lib/analytics/events";
import { openDailyRoundRevealAction } from "@/server/actions/play";
import { trackEvent } from "@/server/actions/analytics";

export function ExperimentRevealReadyGate({
  roundId,
  title,
  revealHref,
}: {
  roundId: string;
  title: string;
  revealHref: string;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const tracked = useRef(false);

  useEffect(() => {
    if (tracked.current) return;
    tracked.current = true;
    void trackEvent(ANALYTICS_EVENTS.dailyRevealAvailable, { round_id: roundId, experiment: true }, roundId);
  }, [roundId]);

  async function open() {
    setPending(true);
    void trackEvent(ANALYTICS_EVENTS.dailyRevealOpened, { round_id: roundId, experiment: true }, roundId);
    const result = await openDailyRoundRevealAction(roundId);
    if (!result.ok) {
      setPending(false);
      setError(result.error ?? "Could not open reveal.");
      return;
    }
    router.push(revealHref);
    router.refresh();
  }

  return (
    <div className="flex flex-1 flex-col items-center gap-6 px-2 py-12 text-center">
      <MarshmallowMascot state={pending ? "toasted" : "cooking"} size="lg" heat={2} />
      <p className="text-xs font-semibold tracking-[0.22em] text-money uppercase">The crowd is in.</p>
      <p className="max-w-[20rem] font-display text-[clamp(1.35rem,5.5vw,1.75rem)] leading-snug font-semibold tracking-tight">
        Where did everyone else move?
      </p>
      <MoneyPrimaryButton onClick={() => void open()} disabled={pending}>
        {pending ? "Opening…" : "REVEAL THE EXPERIMENT"}
      </MoneyPrimaryButton>
      {error ? <p className="text-sm text-toasted">{error}</p> : null}
      <p className="sr-only">{title}</p>
    </div>
  );
}
