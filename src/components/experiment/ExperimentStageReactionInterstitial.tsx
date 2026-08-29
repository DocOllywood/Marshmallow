"use client";

import { useEffect, useRef } from "react";

import { MarshmallowMascot } from "@/components/MarshmallowMascot";
import type { MascotState } from "@/components/MarshmallowMascot";
import { experimentStageAccentStyle } from "@/domain/daily/experiment-stage-accent";
import {
  experimentStageAccentDepth,
  type ExperimentStageReaction,
} from "@/domain/daily/experiment-stage-reaction";
import { cn } from "@/lib/utils";

type ContinueButtonProps = {
  href?: string;
  onClick?: () => void;
  children: React.ReactNode;
};

export function ExperimentStageReactionInterstitial({
  reaction,
  isPrice = false,
  continueHref,
  onContinue,
  ActionButton,
  onViewed,
}: {
  reaction: ExperimentStageReaction;
  isPrice?: boolean;
  continueHref?: string | null;
  onContinue?: () => void;
  ActionButton: React.ComponentType<ContinueButtonProps & { disabled?: boolean }>;
  onViewed?: () => void;
}) {
  const viewed = useRef(false);
  const accentDepth = experimentStageAccentDepth(reaction.stage);
  const accentStyle = isPrice ? experimentStageAccentStyle(reaction.stage) : undefined;

  useEffect(() => {
    if (viewed.current) return;
    viewed.current = true;
    onViewed?.();
  }, [onViewed]);

  const mascotState = reaction.mascotState as MascotState;

  return (
    <div
      className={cn(
        "flex flex-1 flex-col items-center gap-6 px-2 py-12 text-center seal-moment",
        isPrice && "money-experiment",
      )}
    >
      <MarshmallowMascot
        state={mascotState}
        size="lg"
        accentDepth={isPrice ? accentDepth : 0}
        aria-hidden
      />

      <div className="flex max-w-[22rem] flex-col gap-3">
        <p
          className={cn(
            "font-display text-[clamp(1.25rem,5.5vw,1.75rem)] leading-[1.08] font-semibold tracking-tight uppercase",
            !isPrice && "text-ink",
          )}
          style={accentStyle}
        >
          {reaction.headline}
        </p>
        <p className="text-sm leading-6 text-ink-muted">{reaction.supportingLine}</p>
      </div>

      {reaction.nextTease ? (
        <p
          className={cn(
            "max-w-[20rem] text-xs font-semibold tracking-[0.22em] uppercase",
            !isPrice && "text-ink-muted",
          )}
          style={isPrice ? accentStyle : undefined}
        >
          {reaction.nextTease}
        </p>
      ) : null}

      {continueHref ? (
        <ActionButton href={continueHref}>CONTINUE</ActionButton>
      ) : onContinue ? (
        <ActionButton onClick={onContinue}>CONTINUE</ActionButton>
      ) : null}
    </div>
  );
}
