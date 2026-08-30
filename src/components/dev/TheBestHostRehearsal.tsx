"use client";

import { useCallback, useState, useSyncExternalStore } from "react";

import { HostRehearsalEngine } from "@/components/dev/HostRehearsalEngine";
import { HOST_THE_BEST_CONFIG } from "@/domain/content/host-the-best-content";
import {
  THE_BEST_HOST_REHEARSAL_STORAGE_KEY,
  type TheBestHostRehearsalState,
} from "@/domain/dev/the-best-host-rehearsal-fixture";
import { initialHostPlayState } from "@/domain/dev/host-rehearsal-types";

function loadState(): TheBestHostRehearsalState {
  if (typeof window === "undefined") {
    return initialHostPlayState() as TheBestHostRehearsalState;
  }
  try {
    const raw = window.sessionStorage.getItem(THE_BEST_HOST_REHEARSAL_STORAGE_KEY);
    if (!raw) return initialHostPlayState() as TheBestHostRehearsalState;
    return { ...initialHostPlayState(), ...JSON.parse(raw) } as TheBestHostRehearsalState;
  } catch {
    return initialHostPlayState() as TheBestHostRehearsalState;
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
    const fresh = initialHostPlayState() as TheBestHostRehearsalState;
    setState(fresh);
    persistState(fresh);
  }, []);

  return (
    <HostRehearsalEngine
      config={HOST_THE_BEST_CONFIG}
      state={state}
      onUpdate={update}
      onReset={reset}
      completeMode="reset"
    />
  );
}
