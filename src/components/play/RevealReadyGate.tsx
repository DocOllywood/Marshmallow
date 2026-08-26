"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { MarshmallowMascot } from "@/components/MarshmallowMascot";
import { PrimaryButton } from "@/components/PrimaryButton";
import type { PlayMode } from "@/domain/play/mode";
import { ANALYTICS_EVENTS } from "@/lib/analytics/events";
import { trackEvent } from "@/server/actions/analytics";
import { openRevealAction } from "@/server/actions/play";

export function RevealReadyGate({
  marshmallowId,
  question,
  playMode,
  revealHref,
}: {
  marshmallowId: string;
  question: string;
  playMode: PlayMode;
  revealHref?: string;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, setPending] = useState(false);

  if (revealHref) {
    return (
      <div className="flex flex-1 flex-col items-center gap-5 py-10 text-center">
        <MarshmallowMascot state="toasted" size="lg" heat={2} />
        <p className="text-xs font-semibold tracking-[0.18em] text-primary uppercase">
          The crowd is in
        </p>
        <h1 className="font-display text-[clamp(1.5rem,6.5vw,1.85rem)] leading-[1.08] font-semibold tracking-tight break-words">
          {question}
        </h1>
        <PrimaryButton href={revealHref}>REVEAL THE DAILY</PrimaryButton>
      </div>
    );
  }

  async function open() {
    setPending(true);
    const result = await openRevealAction(marshmallowId);
    if (!result.ok) {
      setPending(false);
      setError(result.error ?? "Could not open reveal.");
      if (result.error?.includes("finishing")) {
        router.refresh();
      }
      return;
    }
    void trackEvent(ANALYTICS_EVENTS.revealOpened, { play_mode: playMode }, marshmallowId);
    router.refresh();
  }

  return (
    <div className="flex flex-1 flex-col items-center gap-5 py-10 text-center">
      <MarshmallowMascot state={pending ? "toasted" : "cooking"} size="lg" heat={2} />
      <p className="text-xs font-semibold tracking-[0.18em] text-primary uppercase">
        Ready to reveal
      </p>
      <h1 className="font-display text-[clamp(1.5rem,6.5vw,1.85rem)] leading-[1.08] font-semibold tracking-tight break-words">
        {question}
      </h1>
      <PrimaryButton onClick={() => void open()} disabled={pending}>
        {pending ? "Opening…" : "REVEAL"}
      </PrimaryButton>
      {error ? <p className="text-sm text-toasted">{error}</p> : null}
    </div>
  );
}
