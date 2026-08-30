"use client";

import { useCallback, useState, useSyncExternalStore } from "react";

import { ChoiceButton } from "@/components/ChoiceButton";
import { ExperimentTodaysReadCard } from "@/components/experiment/ExperimentTodaysReadCard";
import { MarshmallowLogo } from "@/components/MarshmallowLogo";
import { MarshmallowMascot } from "@/components/MarshmallowMascot";
import { PrimaryButton } from "@/components/PrimaryButton";
import { BinaryPredictor } from "@/components/play/Predictors";
import { THE_BEST_OUTSIDE_COPY, THE_BEST_TITLE } from "@/domain/content/the-best-experiment";
import {
  buildYouSureTodaysRead,
  initialTheBestYouSureRehearsalState,
  THE_BEST_YOU_SURE_REHEARSAL_STORAGE_KEY,
  youSureQ1Reaction,
  youSureQ2Reaction,
  youSureQ3Reaction,
  youSureQ4Reaction,
  youSureStageForPhase,
  type TheBestYouSureRehearsalState,
  type YouSurePhase,
  type YouSureReaction,
} from "@/domain/dev/the-best-you-sure-rehearsal-fixture";

function loadState(): TheBestYouSureRehearsalState {
  if (typeof window === "undefined") {
    return initialTheBestYouSureRehearsalState();
  }
  try {
    const raw = window.sessionStorage.getItem(THE_BEST_YOU_SURE_REHEARSAL_STORAGE_KEY);
    if (!raw) return initialTheBestYouSureRehearsalState();
    return { ...initialTheBestYouSureRehearsalState(), ...JSON.parse(raw) } as TheBestYouSureRehearsalState;
  } catch {
    return initialTheBestYouSureRehearsalState();
  }
}

function persistState(state: TheBestYouSureRehearsalState) {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(THE_BEST_YOU_SURE_REHEARSAL_STORAGE_KEY, JSON.stringify(state));
}

export function TheBestYouSureRehearsal() {
  const hydrated = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  if (!hydrated) {
    return null;
  }

  return <TheBestYouSureRehearsalInner />;
}

function TheBestYouSureRehearsalInner() {
  const [state, setState] = useState<TheBestYouSureRehearsalState>(loadState);

  const update = useCallback((next: TheBestYouSureRehearsalState) => {
    setState(next);
    persistState(next);
  }, []);

  const reset = useCallback(() => {
    const fresh = initialTheBestYouSureRehearsalState();
    setState(fresh);
    persistState(fresh);
  }, []);

  const todaysRead =
    state.phase === "todays-read" || state.phase === "outside" || state.phase === "complete"
      ? buildYouSureTodaysRead(state)
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
        Rehearsal data · dev only · you sure?
      </p>

      {state.phase === "intro" ? (
        <section className="flex flex-1 flex-col items-center gap-6 px-2 py-10 text-center">
          <MarshmallowMascot state="fluffy" size="lg" aria-hidden />
          <p className="font-display text-[clamp(1.5rem,6vw,2rem)] font-semibold tracking-tight uppercase">
            {THE_BEST_TITLE}
          </p>
          <p className="max-w-[20rem] text-sm leading-6 text-ink-muted">
            Marshmallow talks you through the same dilemma — no stage labels.
          </p>
          <PrimaryButton onClick={() => update({ ...state, phase: "q1-play" })}>BEGIN</PrimaryButton>
        </section>
      ) : null}

      {isPlayPhase(state.phase) ? (
        <QuestionStage
          phase={state.phase}
          onChoice={(choiceId) => {
            const stage = youSureStageForPhase(state.phase)!;
            if (state.phase === "q1-play") {
              update({
                ...state,
                choices: { ...state.choices, [stage.position]: choiceId },
                phase: "q1-react",
              });
              return;
            }
            if (state.phase === "q2-play") {
              update({
                ...state,
                choices: { ...state.choices, [stage.position]: choiceId },
                phase: "q2-react",
              });
              return;
            }
            if (state.phase === "q3-play") {
              update({
                ...state,
                choices: { ...state.choices, [stage.position]: choiceId },
                phase: "q3-react",
              });
              return;
            }
            if (state.phase === "q4-play") {
              update({
                ...state,
                choices: { ...state.choices, [stage.position]: choiceId },
                phase: "q4-react",
              });
              return;
            }
            if (state.phase === "line-play") {
              update({
                ...state,
                lineChoiceId: choiceId,
                phase: "line-locked",
              });
            }
          }}
        />
      ) : null}

      {state.phase === "q1-react" ? (
        <ReactionBeat
          reaction={youSureQ1Reaction(state.choices[1]!)}
          onContinue={() => update({ ...state, phase: "q2-play" })}
        />
      ) : null}

      {state.phase === "q2-react" ? (
        <ReactionBeat
          reaction={youSureQ2Reaction(state.choices)}
          onContinue={() => update({ ...state, phase: "q3-play" })}
        />
      ) : null}

      {state.phase === "q3-react" ? (
        <ReactionBeat
          reaction={youSureQ3Reaction(state.choices)}
          onContinue={() => update({ ...state, phase: "switch-sides" })}
        />
      ) : null}

      {state.phase === "switch-sides" ? (
        <div className="flex flex-1 flex-col items-center gap-8 px-4 py-16 text-center">
          <MarshmallowMascot state="thinking" size="lg" aria-hidden />
          <p className="font-display text-[clamp(1.35rem,6vw,2rem)] font-semibold tracking-tight uppercase text-ink">
            NOW SWITCH SIDES.
          </p>
          <PrimaryButton onClick={() => update({ ...state, phase: "q4-play" })}>CONTINUE</PrimaryButton>
        </div>
      ) : null}

      {state.phase === "q4-react" ? (
        <ReactionBeat
          reaction={youSureQ4Reaction(state.choices) ?? { headline: "YOU MOVED." }}
          onContinue={() => update({ ...state, phase: "q4-predict" })}
        />
      ) : null}

      {state.phase === "q4-predict" ? (
        <PredictStage
          state={state}
          onSeal={() => update({ ...state, phase: "line-play" })}
          onPredictionChange={(flipPrediction) => update({ ...state, flipPrediction })}
        />
      ) : null}

      {state.phase === "line-locked" ? (
        <div className="flex flex-1 flex-col items-center gap-5 px-2 py-12 text-center">
          <p className="text-xs font-semibold tracking-[0.24em] text-primary uppercase">The line</p>
          <p className="max-w-[22rem] font-display text-[clamp(1.35rem,6vw,2rem)] leading-[1.1] font-semibold tracking-tight break-words text-ink">
            {youSureStageForPhase("line-play")?.choices.find((c) => c.id === state.lineChoiceId)?.label}
          </p>
          <PrimaryButton onClick={() => update({ ...state, phase: "todays-read" })}>SEE YOUR READ</PrimaryButton>
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

function isPlayPhase(phase: YouSurePhase): boolean {
  return phase === "q1-play" || phase === "q2-play" || phase === "q3-play" || phase === "q4-play" || phase === "line-play";
}

function QuestionStage({
  phase,
  onChoice,
}: {
  phase: YouSurePhase;
  onChoice: (choiceId: string) => void;
}) {
  const stage = youSureStageForPhase(phase);
  if (!stage) return null;

  return (
    <div className="flex flex-1 flex-col gap-10 px-2 pb-10 pt-8">
      {phase === "line-play" ? (
        <p className="text-center text-xs font-semibold tracking-[0.24em] text-primary uppercase">The line</p>
      ) : null}
      <h1 className="whitespace-pre-line text-center font-display text-[clamp(1.55rem,7vw,2.15rem)] leading-[1.08] font-semibold tracking-tight break-words">
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

function ReactionBeat({
  reaction,
  onContinue,
}: {
  reaction: YouSureReaction;
  onContinue: () => void;
}) {
  const lines = reaction.supportingLine?.split("\n") ?? [];
  return (
    <div className="flex flex-1 flex-col items-center gap-8 px-4 py-16 text-center">
      <MarshmallowMascot state="thinking" size="lg" aria-hidden />
      <div className="flex max-w-[22rem] flex-col gap-3">
        <p className="font-display text-[clamp(1.35rem,6vw,2rem)] font-semibold tracking-tight uppercase text-ink">
          {reaction.headline}
        </p>
        {lines.map((line) => (
          <p key={line} className="text-sm leading-6 text-ink-muted">
            {line}
          </p>
        ))}
      </div>
      <PrimaryButton onClick={onContinue}>CONTINUE</PrimaryButton>
    </div>
  );
}

function PredictStage({
  state,
  onSeal,
  onPredictionChange,
}: {
  state: TheBestYouSureRehearsalState;
  onSeal: () => void;
  onPredictionChange: (value: [number, number]) => void;
}) {
  const stage = youSureStageForPhase("q4-predict")!;
  const choiceId = state.choices[stage.position];

  return (
    <div className="flex flex-1 flex-col gap-10 px-2 pb-10 pt-8">
      <MarshmallowMascot state="thinking" size="md" className="mx-auto" aria-hidden />
      <div className="flex flex-col gap-3 text-center">
        <p className="text-xs font-semibold tracking-[0.22em] text-primary uppercase">Read the room</p>
        <p className="font-display text-[clamp(1.25rem,5.5vw,1.75rem)] leading-snug font-semibold tracking-tight">
          What % of Marshmallow players would ask who?
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
