"use client";

import { useCallback, useState, useSyncExternalStore } from "react";

import { ChoiceButton } from "@/components/ChoiceButton";
import { MarshmallowLogo } from "@/components/MarshmallowLogo";
import { MarshmallowMascot } from "@/components/MarshmallowMascot";
import { MoneyPrimaryButton } from "@/components/MoneyPrimaryButton";
import { THE_BEST_TITLE } from "@/domain/content/the-best-experiment";
import { applyAllocation } from "@/domain/play/allocations";
import {
  buildHostTodaysRead,
  hostQ1Reaction,
  hostQ2Reaction,
  hostQ3Reaction,
  hostQ4Reaction,
  hostReadTheRoomPrompt,
  hostStageForPhase,
  initialTheBestHostRehearsalState,
  THE_BEST_HOST_REHEARSAL_STORAGE_KEY,
  type HostPhase,
  type HostReaction,
  type TheBestHostRehearsalState,
} from "@/domain/dev/the-best-host-rehearsal-fixture";
import type { TodaysRead } from "@/domain/daily/todays-read";
import { cn } from "@/lib/utils";

function loadState(): TheBestHostRehearsalState {
  if (typeof window === "undefined") {
    return initialTheBestHostRehearsalState();
  }
  try {
    const raw = window.sessionStorage.getItem(THE_BEST_HOST_REHEARSAL_STORAGE_KEY);
    if (!raw) return initialTheBestHostRehearsalState();
    return { ...initialTheBestHostRehearsalState(), ...JSON.parse(raw) } as TheBestHostRehearsalState;
  } catch {
    return initialTheBestHostRehearsalState();
  }
}

function persistState(state: TheBestHostRehearsalState) {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(THE_BEST_HOST_REHEARSAL_STORAGE_KEY, JSON.stringify(state));
}

export function TheBestHostRehearsal() {
  const hydrated = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  if (!hydrated) {
    return null;
  }

  return <TheBestHostRehearsalInner />;
}

function TheBestHostRehearsalInner() {
  const [state, setState] = useState<TheBestHostRehearsalState>(loadState);

  const update = useCallback((next: TheBestHostRehearsalState) => {
    setState(next);
    persistState(next);
  }, []);

  const reset = useCallback(() => {
    const fresh = initialTheBestHostRehearsalState();
    setState(fresh);
    persistState(fresh);
  }, []);

  const todaysRead = state.phase === "todays-read" ? buildHostTodaysRead(state) : null;

  return (
    <div className="host-rehearsal flex min-h-dvh flex-col pb-8 [--predict-track-fill:var(--money)]">
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
        Rehearsal data · dev only · the host
      </p>

      {state.phase === "intro" ? (
        <section className="flex flex-1 flex-col items-center gap-6 px-2 py-10 text-center">
          <MarshmallowMascot state="fluffy" size="lg" aria-hidden />
          <p className="font-display text-[clamp(1.5rem,6vw,2rem)] font-semibold tracking-tight uppercase">
            {THE_BEST_TITLE}
          </p>
          <p className="max-w-[20rem] text-sm leading-6 text-ink-muted">
            Marshmallow hosts — no stage labels, fewer taps.
          </p>
          <MoneyPrimaryButton onClick={() => update({ ...state, phase: "q1-play" })}>BEGIN</MoneyPrimaryButton>
        </section>
      ) : null}

      {isPlayPhase(state.phase) ? (
        <QuestionStage
          phase={state.phase}
          onChoice={(choiceId) => {
            const stage = hostStageForPhase(state.phase)!;
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
                phase: "todays-read",
              });
            }
          }}
        />
      ) : null}

      {state.phase === "q1-react" ? (
        <ReactionBeat
          reaction={hostQ1Reaction(state.choices[1]!)}
          onContinue={() => update({ ...state, phase: "q2-play" })}
        />
      ) : null}

      {state.phase === "q2-react" ? (
        <ReactionBeat
          reaction={hostQ2Reaction(state.choices)}
          onContinue={() => update({ ...state, phase: "q3-play" })}
        />
      ) : null}

      {state.phase === "q3-react" ? (
        <ReactionBeat
          reaction={hostQ3Reaction(state.choices)}
          onContinue={() => update({ ...state, phase: "q4-play" })}
        />
      ) : null}

      {state.phase === "q4-react" ? (
        <Q4ReactionBeat
          reaction={hostQ4Reaction(state.choices)}
          onReadTheRoom={() => update({ ...state, phase: "q4-predict" })}
        />
      ) : null}

      {state.phase === "q4-predict" ? (
        <HostReadTheRoomStage
          state={state}
          onSeal={() => update({ ...state, phase: "line-play" })}
          onPredictionChange={(flipPrediction) => update({ ...state, flipPrediction })}
        />
      ) : null}

      {state.phase === "todays-read" && todaysRead ? (
        <HostTodaysReadEnding
          read={todaysRead}
          onAnotherMarshmallow={() => update({ ...state, phase: "complete" })}
        />
      ) : null}

      {state.phase === "complete" ? (
        <div className="flex flex-1 flex-col items-center gap-6 px-2 py-12 text-center">
          <MarshmallowMascot state="fluffy" size="lg" aria-hidden />
          <p className="max-w-[18rem] text-sm leading-6 text-ink-muted">That&apos;s one Marshmallow.</p>
          <MoneyPrimaryButton onClick={reset}>ANOTHER MARSHMALLOW</MoneyPrimaryButton>
          <a href="/home" className="text-sm font-medium text-ink-muted touch-manipulation hover:text-ink">
            Home
          </a>
        </div>
      ) : null}
    </div>
  );
}

function isPlayPhase(phase: HostPhase): boolean {
  return (
    phase === "q1-play" ||
    phase === "q2-play" ||
    phase === "q3-play" ||
    phase === "q4-play" ||
    phase === "line-play"
  );
}

function QuestionStage({
  phase,
  onChoice,
}: {
  phase: HostPhase;
  onChoice: (choiceId: string) => void;
}) {
  const stage = hostStageForPhase(phase);
  if (!stage) return null;

  const isLine = phase === "line-play";

  return (
    <div
      className={cn(
        "flex flex-1 flex-col px-2 pb-8 pt-6",
        isLine ? "gap-8" : "gap-8",
      )}
    >
      {isLine ? (
        <p className="text-center text-xs font-semibold tracking-[0.26em] text-money uppercase">The line</p>
      ) : null}
      <h1
        className={cn(
          "whitespace-pre-line text-center font-display font-semibold tracking-tight break-words",
          isLine
            ? "text-[clamp(1.35rem,5.5vw,1.75rem)] leading-[1.12]"
            : "text-[clamp(1.55rem,7vw,2.15rem)] leading-[1.08]",
        )}
      >
        {stage.question}
      </h1>
      <div className="flex flex-col gap-3">
        {stage.choices.map((choice) => (
          <ChoiceButton
            key={choice.id}
            onClick={() => onChoice(choice.id)}
            className={isLine ? "border-money-border/70 hover:border-money/50" : undefined}
          >
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
  reaction: HostReaction;
  onContinue: () => void;
}) {
  const lines = reaction.supportingLine?.split("\n").filter(Boolean) ?? [];
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 px-4 py-10 text-center">
      <MarshmallowMascot state="thinking" size="lg" aria-hidden />
      <div className="flex max-w-[22rem] flex-col gap-2">
        <p className="font-display text-[clamp(1.35rem,6vw,2rem)] font-semibold tracking-tight uppercase text-ink">
          {reaction.headline}
        </p>
        {lines.map((line) => (
          <p key={line} className="text-sm leading-6 text-ink-muted">
            {line}
          </p>
        ))}
      </div>
      <MoneyPrimaryButton className="max-w-[22rem]" onClick={onContinue}>
        CONTINUE
      </MoneyPrimaryButton>
    </div>
  );
}

function Q4ReactionBeat({
  reaction,
  onReadTheRoom,
}: {
  reaction: HostReaction;
  onReadTheRoom: () => void;
}) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-6 px-4 py-10 text-center">
      <MarshmallowMascot state="thinking" size="lg" aria-hidden />
      <p className="max-w-[22rem] font-display text-[clamp(1.35rem,6vw,2rem)] font-semibold tracking-tight uppercase text-ink">
        {reaction.headline}
      </p>
      <MoneyPrimaryButton className="max-w-[22rem]" onClick={onReadTheRoom}>
        READ THE ROOM
      </MoneyPrimaryButton>
    </div>
  );
}

function HostReadTheRoomStage({
  state,
  onSeal,
  onPredictionChange,
}: {
  state: TheBestHostRehearsalState;
  onSeal: () => void;
  onPredictionChange: (value: [number, number]) => void;
}) {
  const stage = hostStageForPhase("q4-predict")!;
  const choiceId = state.choices[stage.position];
  const selectedIndex = stage.choices.findIndex((choice) => choice.id === choiceId);
  const selectedPct = state.flipPrediction[selectedIndex >= 0 ? selectedIndex : 0] ?? 50;
  const prompt = hostReadTheRoomPrompt(state.choices);

  return (
    <div className="flex flex-1 flex-col items-center gap-8 px-2 pb-10 pt-8 text-center">
      <p className="text-xs font-semibold tracking-[0.24em] text-money uppercase">Read the room</p>
      <div className="flex max-w-[22rem] flex-col gap-2">
        <p className="font-display text-[clamp(1.25rem,5.5vw,1.65rem)] font-semibold tracking-tight text-ink">
          {prompt.lead}
        </p>
        <p className="text-base leading-snug text-ink-muted">{prompt.question}</p>
      </div>
      <p
        className="font-display text-[clamp(3.5rem,18vw,4.75rem)] leading-none font-semibold tabular-nums text-money"
        aria-live="polite"
      >
        {selectedPct}%
      </p>
      {choiceId && selectedIndex >= 0 ? (
        <label className="flex w-full max-w-[22rem] flex-col gap-2 px-1 py-2">
          <span className="sr-only">Predicted percent, currently {selectedPct} percent</span>
          <input
            type="range"
            min={0}
            max={100}
            step={1}
            value={selectedPct}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={selectedPct}
            aria-valuetext={`${selectedPct} percent`}
            onChange={(event) => {
              const next = applyAllocation(
                [...state.flipPrediction],
                selectedIndex,
                Number(event.target.value),
              );
              onPredictionChange([next[0] ?? 50, next[1] ?? 50]);
            }}
            className="predict-slider w-full touch-manipulation"
            style={{ ["--pct" as string]: `${selectedPct}%` }}
          />
        </label>
      ) : null}
      <MoneyPrimaryButton className="max-w-[22rem]" onClick={onSeal}>
        LOCK IT
      </MoneyPrimaryButton>
    </div>
  );
}

function HostTodaysReadEnding({
  read,
  onAnotherMarshmallow,
}: {
  read: TodaysRead;
  onAnotherMarshmallow: () => void;
}) {
  return (
    <div className="flex flex-1 flex-col items-center gap-5 px-2 py-8 text-center">
      <p className="text-xs font-semibold tracking-[0.2em] text-money uppercase">Today&apos;s read</p>
      <p className="max-w-[22rem] font-display text-[clamp(1.35rem,5.5vw,1.85rem)] leading-[1.12] font-semibold tracking-tight break-words uppercase text-ink">
        {read.headline}
      </p>
      {read.bodyLines.map((line) => (
        <p key={line} className="max-w-[22rem] text-sm leading-6 text-ink-muted">
          {line}
        </p>
      ))}
      {read.lineCopy ? (
        <div className="max-w-[22rem] space-y-1 border-t border-money-border/50 pt-4">
          <p className="text-xs font-semibold tracking-[0.2em] text-money uppercase">Your line</p>
          <p className="font-display text-base font-semibold text-ink">{read.lineCopy}</p>
        </div>
      ) : null}
      <div className="flex w-full max-w-[22rem] flex-col gap-3 pt-4">
        <MoneyPrimaryButton onClick={onAnotherMarshmallow}>ANOTHER MARSHMALLOW</MoneyPrimaryButton>
        <a href="/home" className="text-sm font-medium text-ink-muted touch-manipulation hover:text-ink">
          Home
        </a>
      </div>
    </div>
  );
}
