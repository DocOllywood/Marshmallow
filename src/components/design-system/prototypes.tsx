"use client";

import { useState } from "react";

import { ChoiceButton } from "@/components/ChoiceButton";
import { CountdownDisplay } from "@/components/CountdownDisplay";
import { MarshmallowCard } from "@/components/MarshmallowCard";
import { MarshmallowMascot } from "@/components/MarshmallowMascot";
import { ScoreDisplay } from "@/components/ScoreDisplay";

export function OpenPrototype() {
  const [choice, setChoice] = useState<"alex" | "jordan" | null>(null);

  return (
    <MarshmallowCard>
      <MarshmallowMascot state="thinking" size="sm" />
      <h2 className="font-display text-[1.85rem] leading-[1.08] font-semibold tracking-tight">
        What would hurt more to discover?
      </h2>
      <div className="flex flex-col gap-3">
        <ChoiceButton
          selected={choice === "alex"}
          onClick={() => setChoice("alex")}
        >
          Alex
        </ChoiceButton>
        <ChoiceButton
          selected={choice === "jordan"}
          onClick={() => setChoice("jordan")}
        >
          Jordan
        </ChoiceButton>
      </div>
    </MarshmallowCard>
  );
}

export function SealedPrototype() {
  return (
    <MarshmallowCard>
      <div className="flex items-center justify-between">
        <MarshmallowMascot state="sealed" size="sm" />
        <p className="text-xs font-semibold tracking-[0.18em] text-ink-muted uppercase">
          Sealed
        </p>
      </div>
      <h2 className="font-display text-[1.85rem] leading-[1.08] font-semibold tracking-tight">
        You chose Alex.
      </h2>
      <p className="text-base leading-6 text-ink">You predicted 64%.</p>
      <p className="text-sm text-ink-muted">Results tonight.</p>
    </MarshmallowCard>
  );
}

export function WaitingPrototype() {
  return (
    <MarshmallowCard tone="waiting">
      <MarshmallowMascot state="cooking" size="sm" heat={1} />
      <h2 className="font-display text-[1.85rem] leading-[1.08] font-semibold tracking-tight">
        Don&apos;t get toasted.
      </h2>
      <CountdownDisplay value="03:17:42" caption="Reveal in" />
    </MarshmallowCard>
  );
}

export function RevealPrototype() {
  return (
    <MarshmallowCard tone="toasted">
      <div className="flex items-center justify-between">
        <MarshmallowMascot state="toasted" size="sm" />
        <p className="text-xs font-semibold tracking-[0.18em] text-toasted uppercase">
          Toasted
        </p>
      </div>
      <ScoreDisplay accuracy={98} predictedPercent={64} crowdPercent={61} />
    </MarshmallowCard>
  );
}
