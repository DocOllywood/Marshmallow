"use client";

import { useCallback, useState, useSyncExternalStore } from "react";

import { HostRehearsalEngine } from "@/components/dev/HostRehearsalEngine";
import { MoneyPrimaryButton } from "@/components/MoneyPrimaryButton";
import {
  getHostExperimentConfig,
  HOST_CONTENT_LAB_EXPERIMENTS,
  type HostContentLabExperimentId,
} from "@/domain/dev/host-content-lab-catalog";
import {
  HOST_CONTENT_LAB_STORAGE_KEY,
  initialHostContentLabPlayFor,
  initialHostContentLabState,
  type HostContentLabState,
} from "@/domain/dev/host-content-lab-state";
import { initialHostPlayState } from "@/domain/dev/host-rehearsal-types";

function loadState(): HostContentLabState {
  if (typeof window === "undefined") {
    return initialHostContentLabState();
  }
  try {
    const raw = window.sessionStorage.getItem(HOST_CONTENT_LAB_STORAGE_KEY);
    if (!raw) return initialHostContentLabState();
    return { ...initialHostContentLabState(), ...JSON.parse(raw) } as HostContentLabState;
  } catch {
    return initialHostContentLabState();
  }
}

function persistState(state: HostContentLabState) {
  if (typeof window === "undefined") return;
  window.sessionStorage.setItem(HOST_CONTENT_LAB_STORAGE_KEY, JSON.stringify(state));
}

export function HostContentLab() {
  const hydrated = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  if (!hydrated) {
    return null;
  }

  return <HostContentLabInner />;
}

function HostContentLabInner() {
  const [state, setState] = useState<HostContentLabState>(loadState);

  const update = useCallback((next: HostContentLabState) => {
    setState(next);
    persistState(next);
  }, []);

  const resetAll = useCallback(() => {
    const fresh = initialHostContentLabState();
    setState(fresh);
    persistState(fresh);
  }, []);

  const startExperiment = useCallback(
    (experimentId: HostContentLabExperimentId) => {
      update(initialHostContentLabPlayFor(experimentId));
    },
    [update],
  );

  if (state.screen === "selector") {
    return (
      <div className="host-content-lab flex min-h-dvh flex-col gap-6 px-2 pb-10 pt-6 [--predict-track-fill:var(--money)]">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-xs font-semibold tracking-[0.22em] text-money uppercase">Dev only</p>
            <h1 className="font-display text-[clamp(1.35rem,5.5vw,1.85rem)] font-semibold tracking-tight uppercase">
              Host Content Lab
            </h1>
          </div>
          <button
            type="button"
            onClick={resetAll}
            className="mt-1 shrink-0 text-[10px] font-semibold tracking-[0.16em] text-ink-muted uppercase touch-manipulation hover:text-ink"
          >
            Reset lab
          </button>
        </div>
        <p className="text-sm leading-6 text-ink-muted">
          Same Host engine. Different content. Tap an experiment to play.
        </p>
        <ul className="flex flex-col gap-3">
          {HOST_CONTENT_LAB_EXPERIMENTS.map((experiment) => (
            <li key={experiment.id}>
              <button
                type="button"
                onClick={() => startExperiment(experiment.id as HostContentLabExperimentId)}
                className="flex w-full flex-col gap-1 rounded-2xl border-2 border-border bg-surface px-4 py-4 text-left touch-manipulation transition-colors hover:border-money/50"
              >
                <span className="font-display text-base font-semibold uppercase tracking-tight text-ink">
                  {experiment.title}
                </span>
                <span className="text-sm text-ink-muted">{experiment.labSubtitle}</span>
              </button>
            </li>
          ))}
        </ul>
        <MoneyPrimaryButton href="/home" className="mt-auto">
          HOME
        </MoneyPrimaryButton>
      </div>
    );
  }

  const config = state.experimentId ? getHostExperimentConfig(state.experimentId) : null;
  if (!config || state.screen !== "play") {
    return null;
  }

  return (
    <HostRehearsalEngine
      config={config}
      state={state.play}
      onUpdate={(play) => update({ ...state, play })}
      onReset={() => {
        if (!state.experimentId) return;
        update(initialHostContentLabPlayFor(state.experimentId));
      }}
      bannerLabel="Rehearsal data · dev only · host content lab"
      completeMode="lab"
      onReturnToLab={() =>
        update({
          screen: "selector",
          experimentId: null,
          play: initialHostPlayState(),
        })
      }
    />
  );
}
