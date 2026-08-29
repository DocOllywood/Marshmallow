"use client";

import { useEffect, useState } from "react";

import { MarshmallowMascot } from "@/components/MarshmallowMascot";
import { applyAllocation, evenSplit } from "@/domain/play/allocations";
import type { PlayChoice } from "@/domain/play/types";
import { cn } from "@/lib/utils";

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(true);
  useEffect(() => {
    if (typeof window.matchMedia !== "function") return;
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduced(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);
  return reduced;
}

export function BinaryPredictor({
  choices,
  selectedId,
  percents,
  onChange,
  disabled,
}: {
  choices: PlayChoice[];
  selectedId: string;
  percents: number[];
  onChange: (next: number[]) => void;
  disabled?: boolean;
}) {
  const reducedMotion = usePrefersReducedMotion();
  const selectedIndex = choices.findIndex((choice) => choice.id === selectedId);
  const otherIndex = selectedIndex === 0 ? 1 : 0;
  const selected = choices[selectedIndex];
  const other = choices[otherIndex];
  const selectedPct = percents[selectedIndex] ?? 50;
  const otherPct = percents[otherIndex] ?? 50;

  if (!selected || !other) {
    return null;
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 space-y-2">
          <p className="text-base font-medium text-ink">You picked {selected.label}.</p>
          <p className="text-sm leading-snug text-ink-muted">
            How many people do you think agree with you?
          </p>
        </div>
        <MarshmallowMascot
          state="thinking"
          size="sm"
          predictionLean={selectedPct}
          className="shrink-0"
        />
      </div>

      <p
        className={cn(
          "predict-pct font-display text-center text-[clamp(3.5rem,18vw,4.75rem)] leading-none font-semibold tabular-nums",
          !reducedMotion && "will-change-transform",
        )}
        aria-live="polite"
        aria-atomic="true"
      >
        {selectedPct}%
      </p>

      <label className="flex flex-col gap-3 px-1 py-2">
        <span className="sr-only">
          Predicted percent for {selected.label}, currently {selectedPct} percent
        </span>
        <input
          type="range"
          min={0}
          max={100}
          step={1}
          value={selectedPct}
          disabled={disabled}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={selectedPct}
          aria-valuetext={`${selectedPct} percent for ${selected.label}, ${otherPct} percent for ${other.label}`}
          onChange={(event) =>
            onChange(applyAllocation(percents, selectedIndex, Number(event.target.value)))
          }
          onKeyDown={(event) => {
            if (event.key === "ArrowLeft" || event.key === "ArrowRight") {
              event.stopPropagation();
            }
          }}
          className="predict-slider w-full touch-manipulation"
          style={{ ["--pct" as string]: `${selectedPct}%` }}
        />
      </label>

      <div className="overflow-hidden rounded-full bg-border">
        <div
          className={cn("flex h-2.5", !reducedMotion && "transition-[width] duration-150 ease-out")}
          style={{ width: `${selectedPct}%` }}
        >
          <div className="predict-dist-fill h-full w-full" />
        </div>
      </div>

      <ul className="flex flex-col gap-3 text-sm">
        <li className="flex items-start justify-between gap-3">
          <span className="min-w-0 flex-1 font-semibold leading-snug break-words">
            <span className="tabular-nums">{selectedPct}%</span> {selected.label}
          </span>
        </li>
        <li className="flex items-start justify-between gap-3 text-ink-muted">
          <span className="min-w-0 flex-1 leading-snug break-words">
            <span className="tabular-nums">{otherPct}%</span> {other.label}
          </span>
        </li>
      </ul>
    </div>
  );
}

export function MultiPredictor({
  choices,
  percents,
  onChange,
  disabled,
}: {
  choices: PlayChoice[];
  percents: number[];
  onChange: (next: number[]) => void;
  disabled?: boolean;
}) {
  const total = percents.reduce((sum, value) => sum + value, 0);

  return (
    <div className="flex flex-col gap-4">
      <p className="font-display text-[1.65rem] leading-[1.1] font-semibold tracking-tight">
        Predict the crowd.
      </p>
      <p className="text-sm text-ink-muted">Split exactly 100% across the crowd.</p>
      {choices.map((choice, index) => (
        <div key={choice.id} className="flex items-center gap-2">
          <p className="min-w-0 flex-1 text-sm font-semibold uppercase">{choice.label}</p>
          <button
            type="button"
            disabled={disabled}
            aria-label={`Decrease ${choice.label}`}
            onClick={() => onChange(applyAllocation(percents, index, (percents[index] ?? 0) - 1))}
            className="flex size-12 items-center justify-center rounded-xl border border-border text-xl touch-manipulation"
          >
            −
          </button>
          <input
            type="number"
            min={0}
            max={100}
            value={percents[index] ?? 0}
            disabled={disabled}
            aria-label={`${choice.label} percent`}
            onChange={(event) =>
              onChange(applyAllocation(percents, index, Number(event.target.value)))
            }
            className="h-12 w-16 rounded-xl border border-border bg-surface text-center tabular-nums"
          />
          <button
            type="button"
            disabled={disabled}
            aria-label={`Increase ${choice.label}`}
            onClick={() => onChange(applyAllocation(percents, index, (percents[index] ?? 0) + 1))}
            className="flex size-12 items-center justify-center rounded-xl border border-border text-xl touch-manipulation"
          >
            +
          </button>
        </div>
      ))}
      <p className={total === 100 ? "text-sm text-positive" : "text-sm text-toasted"}>
        Total {total}%
      </p>
    </div>
  );
}

export function defaultPercentsFor(
  choices: PlayChoice[],
  allocations: { choice_id: string; predicted_pct: number }[],
): number[] {
  if (allocations.length === choices.length) {
    return choices.map(
      (choice) => allocations.find((item) => item.choice_id === choice.id)?.predicted_pct ?? 0,
    );
  }
  return evenSplit(choices.length);
}
