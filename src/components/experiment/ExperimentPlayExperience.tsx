"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { ChoiceButton } from "@/components/ChoiceButton";
import { MoneyPrimaryButton } from "@/components/MoneyPrimaryButton";
import { PrimaryButton } from "@/components/PrimaryButton";
import { BinaryPredictor, defaultPercentsFor, MultiPredictor } from "@/components/play/Predictors";
import { ExperimentCostDisplay } from "@/components/experiment/ExperimentCostDisplay";
import { ExperimentStageReactionInterstitial } from "@/components/experiment/ExperimentStageReactionInterstitial";
import { ExperimentStageHeader } from "@/components/experiment/ExperimentStageHeader";
import { ExperimentTodaysReadCard } from "@/components/experiment/ExperimentTodaysReadCard";
import { ExperimentRevealReadyGate } from "@/components/experiment/ExperimentRevealReadyGate";
import { ANALYTICS_EVENTS } from "@/lib/analytics/events";
import { isValidSealDistribution } from "@/domain/play/allocations";
import type { ExperimentStage } from "@/domain/daily/experiment";
import {
  buildExperimentStageReaction,
  type ExperimentStageReaction,
} from "@/domain/daily/experiment-stage-reaction";
import { priceStageMicrocopy } from "@/domain/daily/price";
import type { TensionSide } from "@/domain/daily/tension";
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
  const [stageReaction, setStageReaction] = useState<ExperimentStageReaction | null>(null);
  const [showTodaysRead, setShowTodaysRead] = useState(false);
  const [flipPhase, setFlipPhase] = useState<FlipPhase>(
    stage === "flip" && marshmallow.ownChoiceId && !marshmallow.sealed ? "predict" : "pick",
  );
  const [pending, startTransition] = useTransition();
  const predictedOnce = useRef(false);
  const dailyStarted = useRef(false);

  const tension = marshmallow.dailyRound?.tension ?? null;
  const position = marshmallow.roundPosition ?? 1;
  const isPrice = marshmallow.experimentArchetype === "price";
  const ActionButton = isPrice ? MoneyPrimaryButton : PrimaryButton;
  const accentEyebrow = isPrice ? "text-money" : "text-primary";
  const accentLink = isPrice ? "text-money" : "text-primary";
  const priceMicrocopy = isPrice ? priceStageMicrocopy(stage) : null;
  const showPriceIntro = isPrice && stage === "instinct" && position === 1 && !marshmallow.sealed;
  const scenarioTextClass =
    "font-display text-[clamp(1.275rem,5.25vw,2rem)] leading-[1.05] font-semibold tracking-tight break-words md:text-[clamp(1.5rem,6.5vw,2rem)] md:leading-[1.1]";
  const playStageGapClass = "gap-6 md:gap-8";

  useEffect(() => {
    if (!marshmallow.dailyRound || dailyStarted.current) return;
    if (marshmallow.dailyRound.sealedCount === 0 && position === 1) {
      dailyStarted.current = true;
      void trackEvent(
        ANALYTICS_EVENTS.dailyStarted,
        {
          round_id: marshmallow.dailyRound.roundId,
          experiment: true,
          entry_surface: marshmallow.entrySurface ?? "daily",
        },
        marshmallow.dailyRound.roundId,
      );
    }
  }, [marshmallow.dailyRound, marshmallow.entrySurface, position]);

  function reactionForSide(currentSide: TensionSide | null): ExperimentStageReaction {
    return buildExperimentStageReaction({
      stage,
      previousSide: marshmallow.experimentPriorTensionSide,
      currentSide,
      initialSide: marshmallow.experimentInitialTensionSide,
      costType: marshmallow.experimentCostType,
      costLabel: marshmallow.experimentCostLabel,
      archetype: marshmallow.experimentArchetype,
    });
  }

  function showStageReaction(currentSide: TensionSide | null) {
    setStageReaction(reactionForSide(currentSide));
    setSealing(false);
  }

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
    if (stage === "instinct" || stage === "pressure" || stage === "consequence") {
      showStageReaction(currentSide);
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
        {
          round_id: marshmallow.dailyRound.roundId,
          experiment: true,
          entry_surface: marshmallow.entrySurface ?? "daily",
        },
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
    const flipSide =
      marshmallow.choices.find((choice) => choice.id === choiceId)?.tensionSide ?? null;
    showStageReaction(flipSide);
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
    !stageReaction
  ) {
    return (
      <div className="flex flex-1 flex-col items-center gap-5 px-2 py-10 text-center">
        <p className={`text-xs font-semibold tracking-[0.22em] uppercase ${accentEyebrow}`}>Call locked</p>
        <ActionButton href={marshmallow.dailyNextHref}>CONTINUE</ActionButton>
        <Link href="/home" className={`min-h-11 text-sm font-semibold ${accentLink}`}>
          Home
        </Link>
      </div>
    );
  }

  if (marshmallow.sealed || justSealed) {
    const isLineStage = stage === "line" || marshmallow.isLine;
    const lockedLineLabel =
      isLineStage && choiceId
        ? marshmallow.choices.find((item) => item.id === choiceId)?.label ?? null
        : null;
    const hasTodaysRead =
      Boolean(marshmallow.dailyRound?.allSealed && marshmallow.dailyRound.todaysRead);

    if (lockedLineLabel && isLineStage) {
      if (hasTodaysRead && showTodaysRead) {
        return (
          <ExperimentTodaysReadCard
            read={marshmallow.dailyRound!.todaysRead!}
            roundId={marshmallow.dailyRound!.roundId}
            tensionSlug={marshmallow.dailyRound!.tension?.slug}
            isPriceExperiment={marshmallow.experimentArchetype === "price"}
            isContinuousPlay={marshmallow.entrySurface === "continuous"}
            keepPlayingHref={marshmallow.continuousNextHref}
            onKeepPlayingClick={() => {
              void trackEvent(
                ANALYTICS_EVENTS.nextMarshmallowClicked,
                {
                  entry_surface: marshmallow.entrySurface ?? "daily",
                  source: "keep_playing",
                },
                marshmallow.dailyRound?.roundId,
              );
            }}
          />
        );
      }

      return (
        <div
          className={cn(
            "flex flex-1 flex-col items-center gap-4 px-2 py-8 text-center md:py-10",
            justSealed && "seal-moment",
          )}
        >
          <p
            className={cn(
              "text-xs font-semibold tracking-[0.24em] uppercase",
              isPrice ? "text-money" : "text-ink-muted",
            )}
          >
            The line
          </p>
          <p className="max-w-[22rem] font-display text-[clamp(1.35rem,6vw,2rem)] leading-[1.1] font-semibold tracking-tight break-words text-ink">
            {lockedLineLabel}
          </p>
          <p className="max-w-[18rem] text-sm leading-6 text-ink-muted">
            That&apos;s where you drew it today.
          </p>
          {hasTodaysRead ? (
            <ActionButton onClick={() => setShowTodaysRead(true)}>SEE YOUR READ</ActionButton>
          ) : marshmallow.dailyNextHref && !marshmallow.dailyRound?.allSealed ? (
            <ActionButton href={marshmallow.dailyNextHref}>CONTINUE</ActionButton>
          ) : (
            <ActionButton href="/home">HOME</ActionButton>
          )}
        </div>
      );
    }

    if (hasTodaysRead) {
      return (
        <ExperimentTodaysReadCard
          read={marshmallow.dailyRound!.todaysRead!}
          roundId={marshmallow.dailyRound!.roundId}
          tensionSlug={marshmallow.dailyRound!.tension?.slug}
          isPriceExperiment={marshmallow.experimentArchetype === "price"}
          isContinuousPlay={marshmallow.entrySurface === "continuous"}
          keepPlayingHref={marshmallow.continuousNextHref}
          onKeepPlayingClick={() => {
            void trackEvent(
              ANALYTICS_EVENTS.nextMarshmallowClicked,
              {
                entry_surface: marshmallow.entrySurface ?? "daily",
                source: "keep_playing",
              },
              marshmallow.dailyRound?.roundId,
            );
          }}
        />
      );
    }

    return (
      <div className={cn("flex flex-1 flex-col items-center gap-4 px-2 py-10 text-center", justSealed && "seal-moment")}>
        <p className={`text-xs font-semibold tracking-[0.22em] uppercase ${accentEyebrow}`}>Call locked</p>
        {marshmallow.dailyNextHref && !marshmallow.dailyRound?.allSealed ? (
          <ActionButton href={marshmallow.dailyNextHref}>CONTINUE</ActionButton>
        ) : (
          <ActionButton href="/home">HOME</ActionButton>
        )}
      </div>
    );
  }

  if (stageReaction) {
    return (
      <ExperimentStageReactionInterstitial
        reaction={stageReaction}
        isPrice={isPrice}
        continueHref={marshmallow.dailyNextHref}
        ActionButton={ActionButton}
      />
    );
  }

  if (stage === "line" || marshmallow.isLine) {
    return (
      <div className={cn("flex flex-1 flex-col pb-8", playStageGapClass)}>
        <ExperimentStageHeader tension={tension} position={position} stage="line" archetype={isPrice ? "price" : "default"} />
        {isPrice ? (
          <p className="text-xs font-semibold tracking-[0.22em] text-money uppercase">Your line</p>
        ) : null}
        <h1 className={scenarioTextClass}>
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
      <div className={cn("flex flex-1 flex-col pb-8", playStageGapClass)}>
        <ExperimentStageHeader tension={tension} position={position} stage="flip" spacious archetype={isPrice ? "price" : "default"} />
        <div className="flex flex-col gap-4">
          <p className={`text-xs font-semibold tracking-[0.22em] uppercase ${accentEyebrow}`}>Read the room</p>
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
        <ActionButton onClick={() => void sealPrediction()} disabled={sealing || pending}>
          {sealing ? "Locking…" : "LOCK IT IN"}
        </ActionButton>
        {error ? <p className="text-center text-sm text-toasted">{error}</p> : null}
      </div>
    );
  }

  const showPriorChoice =
    (stage === "pressure" || stage === "consequence") && marshmallow.experimentPriorChoiceLabel;

  return (
    <div className={cn("flex flex-1 flex-col pb-8", playStageGapClass)}>
      {showPriceIntro ? (
        <div className="flex flex-col gap-2 border-b border-border/60 pb-4">
          <p className="text-xs font-semibold tracking-[0.2em] text-ink-muted uppercase">
            Today&apos;s experiment
          </p>
          {tension ? (
            <p className="text-xs font-semibold tracking-[0.2em] text-ink uppercase">
              {tension.displayLabel}
            </p>
          ) : null}
          <p className="font-display text-[clamp(1.25rem,5.5vw,1.65rem)] leading-[1.12] font-semibold tracking-tight break-words">
            {marshmallow.dailyRound?.title}
          </p>
          <p className="text-sm leading-6 text-ink-muted">
            Don&apos;t overthink it.
            <span className="block">We&apos;ll change the circumstances as you go.</span>
          </p>
        </div>
      ) : null}

      <ExperimentStageHeader
        tension={showPriceIntro ? null : tension}
        position={position}
        stage={stage}
        spacious={stage === "flip"}
        archetype={isPrice ? "price" : "default"}
      />

      {stage === "flip" ? (
        <p className="text-xs font-semibold tracking-[0.22em] text-ink-muted uppercase">
          {isPrice ? "Now you're on the other side of the offer." : "Now change sides."}
        </p>
      ) : null}

      {showPriorChoice ? (
        <div className="flex flex-col gap-1 rounded-xl border border-money-border/50 bg-money-soft/25 px-4 py-3">
          <p className="text-[10px] font-semibold tracking-[0.2em] text-ink-muted uppercase">You chose</p>
          <p className="font-display text-lg font-semibold uppercase tracking-tight text-ink">
            {marshmallow.experimentPriorChoiceLabel}
          </p>
        </div>
      ) : null}

      {stage === "pressure" && !isPrice ? (
        <p className="text-xs font-semibold tracking-[0.22em] text-ink-muted uppercase">
          Same secret. One new fact.
        </p>
      ) : null}

      {priceMicrocopy ? (
        <p
          className={cn(
            "text-xs font-semibold tracking-[0.22em] uppercase",
            stage === "pressure" ? "text-ink-muted" : "text-money",
          )}
        >
          {priceMicrocopy}
        </p>
      ) : null}

      {isPrice && stage === "consequence" ? (
        <div className="flex flex-col gap-3 border-y border-money-border/40 py-4 md:gap-4 md:py-5">
          <ExperimentCostDisplay
            costType={marshmallow.experimentCostType}
            costLabel={marshmallow.experimentCostLabel}
            prominent
          />
        </div>
      ) : null}

      {stage === "consequence" && !isPrice ? (
        <p className="text-xs font-semibold tracking-[0.22em] text-ink-muted uppercase">
          Now add the consequence.
        </p>
      ) : null}

      <h1 className={scenarioTextClass}>
        {marshmallow.question}
      </h1>

      {stage === "instinct" ? (
        <p className="text-sm text-ink-muted">
          {isPrice ? "Make your first call." : "Go with your first instinct."}
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
