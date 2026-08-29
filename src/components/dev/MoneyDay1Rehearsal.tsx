"use client";

import { useCallback, useState, useSyncExternalStore } from "react";

import { ChoiceButton } from "@/components/ChoiceButton";
import { ExperimentCostDisplay } from "@/components/experiment/ExperimentCostDisplay";
import { ExperimentStageReactionInterstitial } from "@/components/experiment/ExperimentStageReactionInterstitial";
import { ExperimentRevealShow } from "@/components/experiment/ExperimentRevealShow";
import { ExperimentStageHeader } from "@/components/experiment/ExperimentStageHeader";
import { ExperimentTodaysReadCard } from "@/components/experiment/ExperimentTodaysReadCard";
import { OutsideTheExperiment } from "@/components/experiment/OutsideTheExperiment";
import { MoneyBrandHeader } from "@/components/MoneyBrandHeader";
import { MarshmallowMascot } from "@/components/MarshmallowMascot";
import { MoneyPrimaryButton } from "@/components/MoneyPrimaryButton";
import {
  LAUNCH_MONEY_DAILY_STAGES,
  LAUNCH_MONEY_DAILY_TITLE,
} from "@/domain/content/launch-money-daily";
import { buildExperimentStageReaction } from "@/domain/daily/experiment-stage-reaction";
import { priceStageMicrocopy } from "@/domain/daily/price";
import {
  buildRehearsalRevealPayload,
  buildRehearsalTodaysRead,
  choiceSide,
  currentRehearsalStage,
  initialMoneyDay1RehearsalState,
  MONEY_DAY1_REHEARSAL_STORAGE_KEY,
  MONEY_DAY1_REHEARSAL_TENSION,
  type MoneyDay1RehearsalState,
} from "@/domain/dev/money-day-1-rehearsal-fixture";
import { BinaryPredictor } from "@/components/play/Predictors";
import { cn } from "@/lib/utils";

function loadState(): MoneyDay1RehearsalState {
  if (typeof window === "undefined") {
    return initialMoneyDay1RehearsalState();
  }
  try {
    const raw = window.sessionStorage.getItem(MONEY_DAY1_REHEARSAL_STORAGE_KEY);
    if (!raw) return initialMoneyDay1RehearsalState();
    return { ...initialMoneyDay1RehearsalState(), ...JSON.parse(raw) } as MoneyDay1RehearsalState;
  } catch {
    return initialMoneyDay1RehearsalState();
  }
}

function persistState(state: MoneyDay1RehearsalState) {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(MONEY_DAY1_REHEARSAL_STORAGE_KEY, JSON.stringify(state));
}

export function MoneyDay1Rehearsal() {
  const hydrated = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  if (!hydrated) {
    return null;
  }

  return <MoneyDay1RehearsalInner />;
}

function MoneyDay1RehearsalInner() {
  const [state, setState] = useState<MoneyDay1RehearsalState>(loadState);

  const update = useCallback((next: MoneyDay1RehearsalState) => {
    setState(next);
    persistState(next);
  }, []);

  const reset = useCallback(() => {
    const fresh = initialMoneyDay1RehearsalState();
    setState(fresh);
    persistState(fresh);
  }, []);

  const stage = currentRehearsalStage(state);
  const accentDepth = Math.min(5, Math.max(0, stage.position)) as 0 | 1 | 2 | 3 | 4 | 5;
  const revealPayload =
    state.phase === "reveal" ? buildRehearsalRevealPayload(state) : null;
  const todaysRead =
    state.phase === "todays-read" || state.phase === "outside" || state.phase === "wait"
      ? buildRehearsalTodaysRead(state)
      : null;

  return (
    <div className="money-experiment flex min-h-dvh flex-col pb-8">
      <div className="flex items-start justify-between gap-3">
        <MoneyBrandHeader className="flex-1 pt-4 pb-0" />
        <button
          type="button"
          onClick={reset}
          className="mt-4 shrink-0 text-[10px] font-semibold tracking-[0.16em] text-money-muted uppercase touch-manipulation hover:text-money"
        >
          Reset rehearsal
        </button>
      </div>

      <p className="mt-2 text-center text-[10px] font-semibold tracking-[0.2em] text-ink-muted uppercase">
        Rehearsal data · dev only
      </p>

      {state.phase === "intro" ? (
        <section className="flex flex-1 flex-col gap-5 border-l-2 border-money-border pl-4 pt-6">
          <p className="text-xs font-semibold tracking-[0.2em] text-ink-muted uppercase">
            The daily experiment
          </p>
          <p className="text-xs font-semibold tracking-[0.22em] text-money uppercase">
            Today&apos;s price
          </p>
          <p className="text-xs font-semibold tracking-[0.2em] text-ink uppercase">
            {MONEY_DAY1_REHEARSAL_TENSION.displayLabel}
          </p>
          <p className="font-display text-[clamp(1.25rem,5.5vw,1.65rem)] leading-[1.12] font-semibold tracking-tight break-words">
            {LAUNCH_MONEY_DAILY_TITLE}
          </p>
          <div className="space-y-1 text-sm leading-6 text-ink-muted">
            <p>One situation.</p>
            <p>Five changes.</p>
            <p>Find your line.</p>
          </div>
          <MoneyPrimaryButton
            onClick={() => update({ ...state, phase: "play", stageIndex: 0 })}
          >
            BEGIN EXPERIMENT
          </MoneyPrimaryButton>
        </section>
      ) : null}

      {state.phase === "play" ? (
        <PlayStage
          state={state}
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
          accentDepth={accentDepth}
        />
      ) : null}

      {state.phase === "flip-predict" ? (
        <FlipPredictStage
          state={state}
          onSeal={() =>
            update({
              ...state,
              phase: "locked",
            })
          }
          onPredictionChange={(flipPrediction) => update({ ...state, flipPrediction })}
          accentDepth={accentDepth}
        />
      ) : null}

      {state.phase === "locked" ? (
        <LockedStage
          state={state}
          onContinue={() => {
            const nextIndex = state.stageIndex + 1;
            if (nextIndex >= LAUNCH_MONEY_DAILY_STAGES.length) {
              update({ ...state, phase: "todays-read" });
              return;
            }
            update({ ...state, phase: "play", stageIndex: nextIndex });
          }}
        />
      ) : null}

      {state.phase === "line-locked" ? (
        <div className="flex flex-1 flex-col items-center gap-4 px-2 py-10 text-center seal-moment">
          <MarshmallowMascot state="sealed" size="md" accentDepth={5} aria-hidden />
          <p className="text-xs font-semibold tracking-[0.24em] text-money uppercase">The line</p>
          <p className="max-w-[22rem] font-display text-[clamp(1.35rem,6vw,2rem)] leading-[1.1] font-semibold tracking-tight break-words text-ink">
            {LAUNCH_MONEY_DAILY_STAGES[4]?.choices.find((c) => c.id === state.lineChoiceId)?.label}
          </p>
          <MoneyPrimaryButton onClick={() => update({ ...state, phase: "todays-read" })}>
            CONTINUE
          </MoneyPrimaryButton>
        </div>
      ) : null}

      {state.phase === "todays-read" && todaysRead ? (
        <div className="flex flex-1 flex-col">
          <ExperimentTodaysReadCard
            read={todaysRead}
            showHomeButton={false}
            tensionSlug={MONEY_DAY1_REHEARSAL_TENSION.slug}
            isPriceExperiment
            skipAnalytics
          />
          <div className="mt-4 flex justify-center">
            <MoneyPrimaryButton onClick={() => update({ ...state, phase: "outside" })}>
              CONTINUE
            </MoneyPrimaryButton>
          </div>
        </div>
      ) : null}

      {state.phase === "outside" ? (
        <div className="flex flex-1 flex-col items-center gap-8 px-2 py-10 text-center">
          <OutsideTheExperiment tensionSlug={MONEY_DAY1_REHEARSAL_TENSION.slug} moneyTone />
          <MoneyPrimaryButton onClick={() => update({ ...state, phase: "wait" })}>
            CONTINUE
          </MoneyPrimaryButton>
        </div>
      ) : null}

      {state.phase === "wait" ? (
        <div className="flex flex-1 flex-col items-center gap-6 px-2 py-12 text-center">
          <MarshmallowMascot state="cooking" size="lg" accentDepth={3} aria-hidden />
          <p className="text-xs font-semibold tracking-[0.22em] text-money uppercase">Waiting</p>
          <p className="max-w-[20rem] text-sm leading-6 text-ink-muted">
            The crowd is still deciding. Come back when the reveal opens.
          </p>
          <MoneyPrimaryButton onClick={() => update({ ...state, phase: "reveal" })}>
            PREVIEW REVEAL
          </MoneyPrimaryButton>
        </div>
      ) : null}

      {state.phase === "reveal" && revealPayload ? (
        <div className="flex flex-1 flex-col gap-6 pt-4">
          <ExperimentRevealShow
            reveals={revealPayload.reveals}
            summary={revealPayload.summary}
            crowdTrajectory={revealPayload.crowdTrajectory}
            priceCrowdHeldTrajectory={revealPayload.priceCrowdHeldTrajectory}
            userPath={revealPayload.userPath}
            roundId={revealPayload.roundId}
            isPriceExperiment
            skipAnalytics
            rehearsalLabel
          />
        </div>
      ) : null}
    </div>
  );
}

function PlayStage({
  state,
  onChoice,
  accentDepth,
}: {
  state: MoneyDay1RehearsalState;
  onChoice: (choiceId: string) => void;
  accentDepth: 0 | 1 | 2 | 3 | 4 | 5;
}) {
  const stage = currentRehearsalStage(state);
  const microcopy = priceStageMicrocopy(stage.stage);
  const priorStage = state.stageIndex > 0 ? LAUNCH_MONEY_DAILY_STAGES[state.stageIndex - 1] : null;
  const priorChoiceId = priorStage ? state.choices[priorStage.position] : null;
  const priorLabel = priorChoiceId
    ? priorStage?.choices.find((c) => c.id === priorChoiceId)?.label
    : null;

  return (
    <div className="flex flex-1 flex-col gap-8 pb-8 pt-4">
      {stage.position === 1 ? (
        <div className="flex flex-col gap-2 border-b border-border/60 pb-4">
          <MarshmallowMascot state="fluffy" size="md" accentDepth={accentDepth} className="mx-auto" aria-hidden />
        </div>
      ) : null}

      <ExperimentStageHeader
        tension={stage.position === 1 ? MONEY_DAY1_REHEARSAL_TENSION : MONEY_DAY1_REHEARSAL_TENSION}
        position={stage.position}
        stage={stage.stage}
        spacious={stage.stage === "flip"}
        archetype="price"
      />

      {priorLabel && (stage.stage === "pressure" || stage.stage === "consequence") ? (
        <div className="flex flex-col gap-1 rounded-xl border border-money-border/50 bg-money-soft/25 px-4 py-3">
          <p className="text-[10px] font-semibold tracking-[0.2em] text-ink-muted uppercase">You chose</p>
          <p className="font-display text-lg font-semibold uppercase tracking-tight text-ink">{priorLabel}</p>
        </div>
      ) : null}

      {microcopy ? (
        <p
          className={cn(
            "text-xs font-semibold tracking-[0.22em] uppercase",
            stage.stage === "pressure" ? "text-ink-muted" : "text-money",
          )}
        >
          {microcopy}
        </p>
      ) : null}

      {stage.stage === "consequence" ? (
        <div className="flex flex-col gap-4 border-y border-money-border/40 py-5">
          <ExperimentCostDisplay costType={stage.costType} costLabel={stage.costLabel} prominent />
        </div>
      ) : null}

      {stage.stage === "flip" ? (
        <p className="text-xs font-semibold tracking-[0.22em] text-ink-muted uppercase">
          Now you&apos;re on the other side of the offer.
        </p>
      ) : null}

      {stage.isLine ? (
        <p className="text-xs font-semibold tracking-[0.22em] text-money uppercase">Your line</p>
      ) : null}

      <h1 className="font-display text-[clamp(1.5rem,6.5vw,2rem)] leading-[1.1] font-semibold tracking-tight break-words">
        {stage.question}
      </h1>

      {stage.stage === "instinct" ? (
        <p className="text-sm text-ink-muted">Make your first call.</p>
      ) : null}

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
  state: MoneyDay1RehearsalState;
  onContinue: () => void;
}) {
  const stage = currentRehearsalStage(state);
  const priorStage = state.stageIndex > 0 ? LAUNCH_MONEY_DAILY_STAGES[state.stageIndex - 1] : null;
  const priorChoiceId = priorStage ? state.choices[priorStage.position] : null;
  const priorSide = priorStage && priorChoiceId ? choiceSide(priorStage, priorChoiceId) : null;
  const currentChoiceId = state.choices[stage.position];
  const currentSide = currentChoiceId ? choiceSide(stage, currentChoiceId) : null;
  const initialChoiceId = state.choices[1];
  const initialSide = initialChoiceId
    ? choiceSide(LAUNCH_MONEY_DAILY_STAGES[0]!, initialChoiceId)
    : null;

  const reaction = buildExperimentStageReaction({
    stage: stage.stage,
    previousSide: priorSide,
    currentSide,
    initialSide,
    costType: stage.costType,
    costLabel: stage.costLabel,
    archetype: "price",
  });

  return (
    <ExperimentStageReactionInterstitial
      reaction={reaction}
      isPrice
      onContinue={onContinue}
      ActionButton={MoneyPrimaryButton}
    />
  );
}

function FlipPredictStage({
  state,
  onSeal,
  onPredictionChange,
  accentDepth,
}: {
  state: MoneyDay1RehearsalState;
  onSeal: () => void;
  onPredictionChange: (value: [number, number]) => void;
  accentDepth: 0 | 1 | 2 | 3 | 4 | 5;
}) {
  const stage = currentRehearsalStage(state);
  const choiceId = state.choices[stage.position];
  const percents = state.flipPrediction;

  return (
    <div className="flex flex-1 flex-col gap-8 pb-8 pt-4">
      <ExperimentStageHeader
        tension={MONEY_DAY1_REHEARSAL_TENSION}
        position={stage.position}
        stage="flip"
        spacious
        archetype="price"
      />
      <MarshmallowMascot state="thinking" size="sm" accentDepth={accentDepth} className="mx-auto" aria-hidden />
      <div className="flex flex-col gap-4">
        <p className="text-xs font-semibold tracking-[0.22em] text-money uppercase">Read the room</p>
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
      {choiceId ? (
        <BinaryPredictor
          choices={stage.choices.map((c, i) => ({
            id: c.id,
            label: c.label,
            sort_order: i,
            tensionSide: c.tensionSide,
          }))}
          selectedId={choiceId}
          percents={percents}
          onChange={(next) => onPredictionChange([next[0] ?? 50, next[1] ?? 50])}
        />
      ) : null}
      <MoneyPrimaryButton onClick={onSeal}>LOCK IT IN</MoneyPrimaryButton>
    </div>
  );
}
