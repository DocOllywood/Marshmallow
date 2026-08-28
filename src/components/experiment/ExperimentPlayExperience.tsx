"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { ChoiceButton } from "@/components/ChoiceButton";
import { PrimaryButton } from "@/components/PrimaryButton";
import { BinaryPredictor, defaultPercentsFor, MultiPredictor } from "@/components/play/Predictors";
import { ExperimentMovementFeedback } from "@/components/experiment/ExperimentMovementFeedback";
import { ExperimentStageHeader } from "@/components/experiment/ExperimentStageHeader";
import { ExperimentTodaysReadCard } from "@/components/experiment/ExperimentTodaysReadCard";
import { ExperimentRevealReadyGate } from "@/components/experiment/ExperimentRevealReadyGate";
import { ANALYTICS_EVENTS } from "@/lib/analytics/events";
import { isValidSealDistribution } from "@/domain/play/allocations";
import type { ExperimentStage } from "@/domain/daily/experiment";
import {
  compareExperimentMovement,
  type ExperimentMovementFeedback as MovementFeedback,
} from "@/domain/daily/experiment-play";
import { priceStageMicrocopy } from "@/domain/daily/price";
import { parseTensionSide } from "@/domain/daily/tension";
import {
  saveDraftPlayAction,
  sealLinePlayAction,
  sealPickOnlyPlayAction,
  sealPlayAction,
} from "@/server/actions/play";
import { trackEvent } from "@/server/actions/analytics";
import type { PlayMarshmallow } from "@/server/dal/play";
import { cn } from "@/lib/utils";

type FlipPhase = "pick" | "predict";

export function ExperimentPlayExperience({ marshmallow }: { marshmallow: PlayMarshmallow }) {
  const router = useRouter();
  const stage = marshmallow.experimentStage ?? inferStage(marshmallow.roundPosition);
  const [choiceId, setChoiceId] = useState(marshmallow.ownChoiceId);
  const [percents, setPercents] = useState(() =>
    defaultPercentsFor(marshmallow.choices, marshmallow.allocations),
  );
  const [error, setError] = useState<string | null>(null);
  const [sealing, setSealing] = useState(false);
  const [justSealed, setJustSealed] = useState(false);
  const [movementFeedback, setMovementFeedback] = useState<MovementFeedback>(null);
  const [flipPhase, setFlipPhase] = useState<FlipPhase>(
    stage === "flip" && marshmallow.ownChoiceId && !marshmallow.sealed ? "predict" : "pick",
  );
  const [pending, startTransition] = useTransition();
  const predictedOnce = useRef(false);
  const dailyStarted = useRef(false);

  const tension = marshmallow.dailyRound?.tension ?? null;
  const position = marshmallow.roundPosition ?? 1;
  const isPrice = marshmallow.dailyRound?.experimentArchetype === "price";
  const priceMicrocopy = isPrice ? priceStageMicrocopy(stage) : null;

  useEffect(() => {
    if (!marshmallow.dailyRound || dailyStarted.current) return;
    if (marshmallow.dailyRound.sealedCount === 0 && position === 1) {
      dailyStarted.current = true;
      void trackEvent(
        ANALYTICS_EVENTS.dailyStarted,
        { round_id: marshmallow.dailyRound.roundId, experiment: true },
        marshmallow.dailyRound.roundId,
      );
    }
  }, [marshmallow.dailyRound, position]);

  async function selectChoice(id: string, choiceMetadata?: unknown) {
    setChoiceId(id);
    setError(null);
    const result = await saveDraftPlayAction({
      marshmallowId: marshmallow.id,
      ownChoiceId: id,
    });
    if (result.closed) {
      router.refresh();
      setError(result.error ?? "This Marshmallow just closed.");
      return;
    }
    if (!result.ok) {
      setError(result.error ?? "Could not save.");
      return;
    }
    void trackEvent(ANALYTICS_EVENTS.answerSelected, { choice: id }, marshmallow.id);

    if (stage === "flip") {
      setFlipPhase("predict");
      return;
    }

    if (!marshmallow.requiresPrediction) {
      await sealPickOnlyChoice(id, choiceMetadata);
    }
  }

  async function sealPickOnlyChoice(id: string, choiceMetadata?: unknown) {
    setSealing(true);
    const result = await sealPickOnlyPlayAction({
      marshmallowId: marshmallow.id,
      ownChoiceId: id,
    });
    if (result.closed) {
      setSealing(false);
      router.refresh();
      setError(result.error ?? "This Marshmallow just closed.");
      return;
    }
    if (!result.ok && !result.sealed) {
      setSealing(false);
      setError(result.error ?? "Could not seal.");
      return;
    }

    void trackEvent(
      ANALYTICS_EVENTS.predictionSealed,
      { n: 0, play_mode: marshmallow.play_mode, pick_only: true, experiment: true },
      marshmallow.id,
    );
    trackDailyLocked();

    const currentSide = parseTensionSide(choiceMetadata);
    if (stage === "pressure" || stage === "consequence") {
      setMovementFeedback(
        compareExperimentMovement(marshmallow.experimentPriorTensionSide, currentSide),
      );
      setSealing(false);
      return;
    }

    setJustSealed(true);
    window.setTimeout(() => {
      setSealing(false);
      router.refresh();
    }, 700);
  }

  function trackDailyLocked() {
    if (!marshmallow.dailyRound) return;
    void trackEvent(
      ANALYTICS_EVENTS.dailyQuestionLocked,
      {
        position,
        round_id: marshmallow.dailyRound.roundId,
        pick_only: true,
        experiment: true,
      },
      marshmallow.id,
    );
    if (position === 5) {
      void trackEvent(
        ANALYTICS_EVENTS.dailyCompleted,
        { round_id: marshmallow.dailyRound.roundId, experiment: true },
        marshmallow.dailyRound.roundId,
      );
    }
  }

  function onPercents(next: number[]) {
    setPercents(next);
    if (!predictedOnce.current) {
      predictedOnce.current = true;
      void trackEvent(ANALYTICS_EVENTS.predictionStarted, { n: next.length }, marshmallow.id);
    }
    if (choiceId) {
      startTransition(() => {
        void saveDraftPlayAction({
          marshmallowId: marshmallow.id,
          ownChoiceId: choiceId,
          allocations: marshmallow.choices.map((choice, index) => ({
            choice_id: choice.id,
            predicted_pct: next[index] ?? 0,
          })),
        });
      });
    }
  }

  async function sealPrediction() {
    if (!choiceId || !isValidSealDistribution(percents)) {
      setError("Predictions must add up to 100%.");
      return;
    }
    setSealing(true);
    const result = await sealPlayAction({
      marshmallowId: marshmallow.id,
      ownChoiceId: choiceId,
      allocations: marshmallow.choices.map((choice, index) => ({
        choice_id: choice.id,
        predicted_pct: percents[index] ?? 0,
      })),
    });
    if (result.closed) {
      setSealing(false);
      router.refresh();
      return;
    }
    if (!result.ok && !result.sealed) {
      setSealing(false);
      setError(result.error ?? "Could not seal.");
      return;
    }
    void trackEvent(
      ANALYTICS_EVENTS.predictionSealed,
      { n: percents.length, play_mode: marshmallow.play_mode, experiment: true },
      marshmallow.id,
    );
    trackDailyLocked();
    setJustSealed(true);
    window.setTimeout(() => {
      setSealing(false);
      router.refresh();
    }, 700);
  }

  async function sealLine(choice: string) {
    setChoiceId(choice);
    setSealing(true);
    const result = await sealLinePlayAction({
      marshmallowId: marshmallow.id,
      ownChoiceId: choice,
    });
    if (result.closed || (!result.ok && !result.sealed)) {
      setSealing(false);
      setError(result.error ?? "Could not lock.");
      return;
    }
    trackDailyLocked();
    setJustSealed(true);
    window.setTimeout(() => {
      setSealing(false);
      router.refresh();
    }, 700);
  }

  if (marshmallow.screen === "reveal_ready" && marshmallow.dailyRound) {
    return (
      <ExperimentRevealReadyGate
        roundId={marshmallow.dailyRound.roundId}
        title={marshmallow.dailyRound.title}
        revealHref={marshmallow.dailyRound.revealHref}
      />
    );
  }

  if (
    marshmallow.dailyRound &&
    marshmallow.sealed &&
    !marshmallow.dailyRound.allSealed &&
    marshmallow.dailyNextHref &&
    !movementFeedback
  ) {
    return (
      <div className="flex flex-1 flex-col items-center gap-5 px-2 py-10 text-center">
        <p className="text-xs font-semibold tracking-[0.22em] text-primary uppercase">Call locked</p>
        <PrimaryButton href={marshmallow.dailyNextHref}>CONTINUE</PrimaryButton>
        <Link href="/home" className="min-h-11 text-sm font-semibold text-primary">
          Home
        </Link>
      </div>
    );
  }

  if (marshmallow.sealed || justSealed) {
    if (marshmallow.dailyRound?.allSealed && marshmallow.dailyRound.todaysRead) {
      return (
        <ExperimentTodaysReadCard
          read={marshmallow.dailyRound.todaysRead}
          roundId={marshmallow.dailyRound.roundId}
          tensionSlug={marshmallow.dailyRound.tension?.slug}
        />
      );
    }

    return (
      <div className={cn("flex flex-1 flex-col items-center gap-4 px-2 py-10 text-center", justSealed && "seal-moment")}>
        <p className="text-xs font-semibold tracking-[0.22em] text-primary uppercase">Call locked</p>
        {marshmallow.dailyNextHref && !marshmallow.dailyRound?.allSealed ? (
          <PrimaryButton href={marshmallow.dailyNextHref}>CONTINUE</PrimaryButton>
        ) : (
          <PrimaryButton href="/home">HOME</PrimaryButton>
        )}
      </div>
    );
  }

  if (movementFeedback) {
    return (
      <div className="flex flex-1 flex-col items-center gap-6 px-2 py-12 text-center">
        <ExperimentMovementFeedback feedback={movementFeedback} />
        {marshmallow.dailyNextHref ? (
          <PrimaryButton href={marshmallow.dailyNextHref}>CONTINUE</PrimaryButton>
        ) : null}
      </div>
    );
  }

  if (stage === "line" || marshmallow.isLine) {
    return (
      <div className="flex flex-1 flex-col gap-8 pb-8">
        <ExperimentStageHeader tension={tension} position={position} stage="line" archetype={isPrice ? "price" : "default"} />
        <h1 className="font-display text-[clamp(1.5rem,6.5vw,2rem)] leading-[1.1] font-semibold tracking-tight break-words">
          {marshmallow.question}
        </h1>
        <div className="flex flex-col gap-3">
          {marshmallow.choices.map((choice) => (
            <ChoiceButton
              key={choice.id}
              selected={choiceId === choice.id}
              disabled={pending || sealing}
              onClick={() => void sealLine(choice.id)}
            >
              {choice.label}
            </ChoiceButton>
          ))}
        </div>
        {error ? <p className="text-center text-sm text-toasted">{error}</p> : null}
      </div>
    );
  }

  if (stage === "flip" && flipPhase === "predict" && choiceId) {
    return (
      <div className="flex flex-1 flex-col gap-8 pb-8">
        <ExperimentStageHeader tension={tension} position={position} stage="flip" spacious archetype={isPrice ? "price" : "default"} />
        <div className="flex flex-col gap-4">
          <p className="text-xs font-semibold tracking-[0.22em] text-primary uppercase">Read the room</p>
          <p className="font-display text-[clamp(1.25rem,5vw,1.65rem)] leading-snug font-semibold tracking-tight">
            Now that you&apos;ve made your calls:
          </p>
          <p className="font-display text-[clamp(1.25rem,5vw,1.65rem)] leading-snug font-semibold tracking-tight uppercase">
            What do you think Marshmallow players will do?
          </p>
          <p className="text-sm leading-6 text-ink-muted">
            Don&apos;t answer for yourself. Predict the room.
          </p>
        </div>
        {marshmallow.choices.length === 2 ? (
          <BinaryPredictor
            choices={marshmallow.choices}
            selectedId={choiceId}
            percents={percents}
            onChange={onPercents}
            disabled={sealing}
          />
        ) : (
          <MultiPredictor
            choices={marshmallow.choices}
            percents={percents}
            onChange={onPercents}
            disabled={sealing}
          />
        )}
        <PrimaryButton onClick={() => void sealPrediction()} disabled={sealing || pending}>
          {sealing ? "Locking…" : "LOCK IT IN"}
        </PrimaryButton>
        {error ? <p className="text-center text-sm text-toasted">{error}</p> : null}
      </div>
    );
  }

  const showPriorChoice =
    (stage === "pressure" || stage === "consequence") && marshmallow.experimentPriorChoiceLabel;

  return (
    <div className="flex flex-1 flex-col gap-8 pb-8">
      <ExperimentStageHeader
        tension={tension}
        position={position}
        stage={stage}
        spacious={stage === "flip"}
        archetype={isPrice ? "price" : "default"}
      />

      {stage === "flip" ? (
        <p className="text-xs font-semibold tracking-[0.22em] text-primary uppercase">
          {isPrice ? "Now you're the person paying the price." : "Now change sides."}
        </p>
      ) : null}

      {showPriorChoice ? (
        <div className="flex flex-col gap-1">
          <p className="text-[10px] font-semibold tracking-[0.2em] text-ink-muted uppercase">You chose</p>
          <p className="font-display text-lg font-semibold uppercase tracking-tight text-ink">
            {marshmallow.experimentPriorChoiceLabel}
          </p>
        </div>
      ) : null}

      {stage === "pressure" && !isPrice ? (
        <p className="text-xs font-semibold tracking-[0.22em] text-primary uppercase">
          Same secret. One new fact.
        </p>
      ) : null}

      {stage === "consequence" && !isPrice ? (
        <p className="text-xs font-semibold tracking-[0.22em] text-primary uppercase">
          Now add the consequence.
        </p>
      ) : null}

      {priceMicrocopy && stage !== "flip" ? (
        <p className="text-xs font-semibold tracking-[0.22em] text-primary uppercase">
          {priceMicrocopy}
        </p>
      ) : null}

      <h1 className="font-display text-[clamp(1.5rem,6.5vw,2rem)] leading-[1.1] font-semibold tracking-tight break-words">
        {marshmallow.question}
      </h1>

      {stage === "instinct" ? (
        <p className="text-sm text-ink-muted">
          {isPrice ? "What do you do?" : "Go with your first instinct."}
        </p>
      ) : null}

      <div className="flex flex-col gap-3">
        {marshmallow.choices.map((item) => (
          <ChoiceButton
            key={item.id}
            selected={choiceId === item.id}
            disabled={pending || sealing}
            onClick={() =>
              void selectChoice(
                item.id,
                item.tensionSide != null ? { tension_side: item.tensionSide } : null,
              )
            }
          >
            {item.label}
          </ChoiceButton>
        ))}
      </div>

      {error ? <p className="text-center text-sm text-toasted">{error}</p> : null}
    </div>
  );
}

function inferStage(position: number | null | undefined): ExperimentStage {
  if (position === 2) return "pressure";
  if (position === 3) return "consequence";
  if (position === 4) return "flip";
  if (position === 5) return "line";
  return "instinct";
}
