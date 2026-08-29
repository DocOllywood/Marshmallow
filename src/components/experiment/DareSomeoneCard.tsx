"use client";

import { useState } from "react";

import { MarshmallowMascot } from "@/components/MarshmallowMascot";
import { MoneyPrimaryButton } from "@/components/MoneyPrimaryButton";
import { PrimaryButton } from "@/components/PrimaryButton";
import {
  createExperimentDareAction,
  trackDareLinkCopiedAction,
} from "@/server/actions/experiment-dare";
import { ANALYTICS_EVENTS } from "@/lib/analytics/events";
import { trackEvent } from "@/server/actions/analytics";

export function DareSomeoneCard({
  roundId,
  isPriceExperiment = false,
}: {
  roundId: string;
  isPriceExperiment?: boolean;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const ActionButton = isPriceExperiment ? MoneyPrimaryButton : PrimaryButton;

  const dareUrl =
    token && typeof window !== "undefined"
      ? `${window.location.origin}/dare/${token}`
      : token
        ? `/dare/${token}`
        : null;

  async function createDare() {
    setPending(true);
    setError(null);
    const result = await createExperimentDareAction(roundId);
    setPending(false);
    if (!result.ok) {
      setError(result.error);
      return;
    }
    setToken(result.token);
    void trackEvent(ANALYTICS_EVENTS.dareCreated, { round_id: roundId, dare_id: result.dareId });
  }

  async function copyLink() {
    if (!dareUrl || !token) return;
    try {
      await navigator.clipboard.writeText(dareUrl);
      await trackDareLinkCopiedAction(token, roundId);
    } catch {
      setError("Could not copy link.");
    }
  }

  async function shareNative() {
    if (!dareUrl || !token || !navigator.share) {
      await copyLink();
      return;
    }
    try {
      await navigator.share({
        title: "Marshmallow dare",
        text: "Same situation. Your answers stay blind until you're done.",
        url: dareUrl,
      });
      await trackDareLinkCopiedAction(token, roundId);
    } catch {
      /* user cancelled */
    }
  }

  return (
    <div
      className={`flex w-full max-w-[22rem] flex-col items-center gap-4 border-t pt-6 ${
        isPriceExperiment ? "border-money-border/50" : "border-border/60"
      }`}
    >
      <MarshmallowMascot state="thinking" size="sm" accentDepth={5} aria-hidden />
      <p className="text-center text-sm leading-6 text-ink-muted">
        Think someone you know would answer differently?
      </p>

      {!token ? (
        <ActionButton type="button" onClick={() => void createDare()} disabled={pending}>
          {pending ? "Creating…" : "DARE THEM"}
        </ActionButton>
      ) : (
        <div className="flex w-full flex-col gap-3">
          <p className="text-xs font-semibold tracking-[0.18em] text-ink-muted uppercase">
            Dare sent
          </p>
          {dareUrl ? (
            <p className="break-all text-center text-sm text-ink-muted">{dareUrl}</p>
          ) : null}
          <ActionButton type="button" onClick={() => void copyLink()}>
            COPY LINK
          </ActionButton>
          {typeof navigator !== "undefined" && "share" in navigator ? (
            <button
              type="button"
              onClick={() => void shareNative()}
              className="min-h-11 text-sm font-semibold text-ink-muted"
            >
              Share…
            </button>
          ) : null}
          <p className="text-center text-xs leading-5 text-ink-muted">
            They play blind. You compare Lines after.
          </p>
        </div>
      )}

      {error ? <p className="text-sm text-toasted">{error}</p> : null}
    </div>
  );
}
