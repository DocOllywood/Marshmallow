"use client";

import { useCallback, useState, useSyncExternalStore } from "react";

import { ChoiceButton } from "@/components/ChoiceButton";
import { ExperimentStageReactionInterstitial } from "@/components/experiment/ExperimentStageReactionInterstitial";
import { ExperimentStageHeader } from "@/components/experiment/ExperimentStageHeader";
import { ExperimentTodaysReadCard } from "@/components/experiment/ExperimentTodaysReadCard";
import { MarshmallowLogo } from "@/components/MarshmallowLogo";
import { MarshmallowMascot } from "@/components/MarshmallowMascot";
import { PrimaryButton } from "@/components/PrimaryButton";
import { BinaryPredictor } from "@/components/play/Predictors";
import { THE_BEST_OUTSIDE_COPY, THE_BEST_STAGES, THE_BEST_TITLE } from "@/domain/content/the-best-experiment";
import { buildExperimentStageReaction } from "@/domain/daily/experiment-stage-reaction";
import {
  buildRehearsalTheBestTodaysRead,
  currentTheBestStage,
  initialTheBestRehearsalState,
  THE_BEST_REHEARSAL_STORAGE_KEY,
  theBestChoiceSide,
  type TheBestRehearsalState,
} from "@/domain/dev/the-best-rehearsal-fixture";

function loadState(): TheBestRehearsalState {
  if (typeof window === "undefined") {
    return initialTheBestRehearsalState();
  }
  try {
    const raw = window.sessionStorage.getItem(THE_BEST_REHEARSAL_STORAGE_KEY);
    if (!raw) return initialTheBestRehearsalState();
    return { ...initialTheBestRehearsalState(), ...JSON.parse(raw) } as TheBestRehearsalState;
  } catch {
    return initialTheBestRehearsalState();
  }
}

function persistState(state: TheBestRehearsalState) {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(THE_BEST_REHEARSAL_STORAGE_KEY, JSON.stringify(state));
}

export function TheBestRehearsal() {
  const hydrated = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  if (!hydrated) {
    return null;
  }

  return <TheBestRehearsalInner />;
}

function TheBestRehearsalInner() {
  const [state, setState] = useState<TheBestRehearsalState>(loadState);

  const update = useCallback((next: TheBestRehearsalState) => {
    setState(next);
    persistState(next);
  }, []);

  const reset = useCallback(() => {
    const fresh = initialTheBestRehearsalState();
    setState(fresh);
    persistState(fresh);
  }, []);

  const stage = currentTheBestStage(state);
  const todaysRead =
    state.phase === "todays-read" || state.phase === "outside" || state.phase === "complete"
      ? buildRehearsalTheBestTodaysRead(state)
      : null;

  return (
    <div className="flex min-h-dvh flex-col pb-8">
      <div className="flex items-start justify-between gap-3 pt-4">
        <MarshmallowLogo showMascot className="min-w-0 flex-1" />
        <button
          type="button"
          onClick={reset}
          className="mt-1 shrink-0 text-[10px] font-semibold tracking-[0.16em] text-ink-muted uppercase touch-manipulation hover:text-ink"
        >
          Reset rehearsal
        </button>
      </div>

      <p className="mt-2 text-center text-[10px] font-semibold tracking-[0.2em] text-ink-muted uppercase">
        Rehearsal data · dev only
      </p>

      {state.phase === "intro" ? (
        <section className="flex flex-1 flex-col gap-5 border-l-2 border-primary/30 pl-4 pt-6">
          <p className="text-xs font-semibold tracking-[0.2em] text-ink-muted uppercase">The experiment</p>
          <p className="font-display text-[clamp(1.25rem,5.5vw,1.65rem)] leading-[1.12] font-semibold tracking-tight break-words uppercase">
            {THE_BEST_TITLE}
          </p>
          <div className="space-y-1 text-sm leading-6 text-ink-muted">
            <p>One situation.</p>
            <p>Five changes.</p>
            <p>Find your line.</p>
          </div>
          <PrimaryButton onClick={() => update({ ...state, phase: "play", stageIndex: 0 })}>
            BEGIN EXPERIMENT
          </PrimaryButton>
        </section>
      ) : null}

      {state.phase === "play" ? (
        <PlayStage
          stageIndex={state.stageIndex}
          onChoice={(choiceId) => {
            if (stage.stage === "flip") {
              update({
                ...state,
                choices: { ...state.choices, [stage.position]: choiceId },
                phase: "flip-predict",
              });
              return;
            }
            if (stage.isLine) {
              update({
                ...state,
                lineChoiceId: choiceId,
                phase: "line-locked",
              });
              return;
            }
            update({
              ...state,
              choices: { ...state.choices, [stage.position]: choiceId },
              phase: "locked",
            });
          }}
        />
      ) : null}

      {state.phase === "flip-predict" ? (
        <FlipPredictStage
          state={state}
          onSeal={() => update({ ...state, phase: "locked" })}
          onPredictionChange={(flipPrediction) => update({ ...state, flipPrediction })}
        />
      ) : null}

      {state.phase === "locked" ? (
        <LockedStage
          state={state}
          onContinue={() => {
            const nextIndex = state.stageIndex + 1;
            if (nextIndex >= THE_BEST_STAGES.length) {
              update({ ...state, phase: "todays-read" });
              return;
            }
            update({ ...state, phase: "play", stageIndex: nextIndex });
          }}
        />
      ) : null}

      {state.phase === "line-locked" ? (
        <div className="flex flex-1 flex-col items-center gap-4 px-2 py-10 text-center seal-moment">
          <p className="text-xs font-semibold tracking-[0.24em] text-ink-muted uppercase">The line</p>
          <p className="max-w-[22rem] font-display text-[clamp(1.35rem,6vw,2rem)] leading-[1.1] font-semibold tracking-tight break-words text-ink">
            {THE_BEST_STAGES[4]?.choices.find((choice) => choice.id === state.lineChoiceId)?.label}
          </p>
          <p className="max-w-[18rem] text-sm leading-6 text-ink-muted">
            That&apos;s where you drew it today.
          </p>
          <PrimaryButton onClick={() => update({ ...state, phase: "todays-read" })}>
            SEE YOUR READ
          </PrimaryButton>
        </div>
      ) : null}

      {state.phase === "todays-read" && todaysRead ? (
        <div className="flex flex-1 flex-col">
          <ExperimentTodaysReadCard read={todaysRead} showHomeButton={false} skipAnalytics />
          <div className="mt-4 flex justify-center">
            <PrimaryButton onClick={() => update({ ...state, phase: "outside" })}>CONTINUE</PrimaryButton>
          </div>
        </div>
      ) : null}

      {state.phase === "outside" ? (
        <div className="flex flex-1 flex-col items-center gap-8 px-2 py-10 text-center">
          <TheBestOutside />
          <PrimaryButton onClick={() => update({ ...state, phase: "complete" })}>CONTINUE</PrimaryButton>
        </div>
      ) : null}

      {state.phase === "complete" ? (
        <div className="flex flex-1 flex-col items-center gap-6 px-2 py-12 text-center">
          <MarshmallowMascot state="fluffy" size="lg" aria-hidden />
          <p className="text-sm text-ink-muted">Rehearsal complete.</p>
          <PrimaryButton href="/home">HOME</PrimaryButton>
        </div>
      ) : null}
    </div>
  );
}

function TheBestOutside() {
  return (
    <div className="flex w-full max-w-[22rem] flex-col gap-3 border-t border-border/60 pt-5 text-center">
      <p className="text-xs font-semibold tracking-[0.18em] text-primary uppercase">Outside the experiment</p>
      {THE_BEST_OUTSIDE_COPY.map((line) => (
        <p key={line} className="text-sm leading-6 text-ink-muted">
          {line}
        </p>
      ))}
    </div>
  );
}

function PlayStage({
  stageIndex,
  onChoice,
}: {
  stageIndex: number;
  onChoice: (choiceId: string) => void;
}) {
  const stage = THE_BEST_STAGES[stageIndex]!;

  return (
    <div className="flex flex-1 flex-col gap-8 pb-8 pt-4">
      {stage.position === 1 ? (
        <MarshmallowMascot state="fluffy" size="md" className="mx-auto" aria-hidden />
      ) : null}

      <ExperimentStageHeader
        tension={null}
        position={stage.position}
        stage={stage.stage}
        spacious={stage.stage === "flip"}
      />

      {stage.isLine ? (
        <p className="text-xs font-semibold tracking-[0.22em] text-primary uppercase">The line</p>
      ) : null}

      <h1 className="whitespace-pre-line font-display text-[clamp(1.5rem,6.5vw,2rem)] leading-[1.1] font-semibold tracking-tight break-words">
        {stage.question}
      </h1>

      <div className="flex flex-col gap-3">
        {stage.choices.map((choice) => (
          <ChoiceButton key={choice.id} onClick={() => onChoice(choice.id)}>
            {choice.label}
          </ChoiceButton>
        ))}
      </div>
    </div>
  );
}

function LockedStage({
  state,
  onContinue,
}: {
  state: TheBestRehearsalState;
  onContinue: () => void;
}) {
  const stage = currentTheBestStage(state);
  const priorStage = state.stageIndex > 0 ? THE_BEST_STAGES[state.stageIndex - 1] : null;
  const priorChoiceId = priorStage ? state.choices[priorStage.position] : null;
  const priorSide =
    priorStage && priorChoiceId ? theBestChoiceSide(priorStage, priorChoiceId) : null;
  const currentChoiceId = stage.isLine ? state.lineChoiceId : state.choices[stage.position];
  const currentSide = currentChoiceId ? theBestChoiceSide(stage, currentChoiceId) : null;
  const initialChoiceId = state.choices[1];
  const initialSide = initialChoiceId
    ? theBestChoiceSide(THE_BEST_STAGES[0]!, initialChoiceId)
    : null;

  const reaction = buildExperimentStageReaction({
    stage: stage.stage,
    previousSide: priorSide,
    currentSide,
    initialSide,
  });

  return (
    <ExperimentStageReactionInterstitial
      reaction={reaction}
      onContinue={onContinue}
      ActionButton={PrimaryButton}
    />
  );
}

function FlipPredictStage({
  state,
  onSeal,
  onPredictionChange,
}: {
  state: TheBestRehearsalState;
  onSeal: () => void;
  onPredictionChange: (value: [number, number]) => void;
}) {
  const stage = THE_BEST_STAGES[3]!;
  const choiceId = state.choices[stage.position];

  return (
    <div className="flex flex-1 flex-col gap-8 pb-8 pt-4">
      <ExperimentStageHeader tension={null} position={stage.position} stage="flip" spacious />
      <MarshmallowMascot state="thinking" size="sm" className="mx-auto" aria-hidden />
      <div className="flex flex-col gap-4">
        <p className="text-xs font-semibold tracking-[0.22em] text-primary uppercase">Read the room</p>
        <p className="font-display text-[clamp(1.25rem,5vw,1.65rem)] leading-snug font-semibold tracking-tight">
          What % of Marshmallow players would ask who?
        </p>
        <p className="text-sm leading-6 text-ink-muted">
          Don&apos;t answer for yourself. Predict the room.
        </p>
      </div>
      {choiceId ? (
        <BinaryPredictor
          choices={stage.choices.map((choice, index) => ({
            id: choice.id,
            label: choice.label,
            sort_order: index,
            tensionSide: choice.tensionSide,
          }))}
          selectedId={choiceId}
          percents={state.flipPrediction}
          onChange={(next) => onPredictionChange([next[0] ?? 50, next[1] ?? 50])}
        />
      ) : null}
      <PrimaryButton onClick={onSeal}>LOCK IT IN</PrimaryButton>
    </div>
  );
}
