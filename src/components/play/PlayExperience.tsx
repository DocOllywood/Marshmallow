"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { ChoiceButton } from "@/components/ChoiceButton";
import { MarshmallowMascot } from "@/components/MarshmallowMascot";
import { PlayModeBadge } from "@/components/play/PlayModeBadge";
import { PrimaryButton } from "@/components/PrimaryButton";
import { BinaryPredictor, defaultPercentsFor, MultiPredictor } from "@/components/play/Predictors";
import { RevealReadyGate } from "@/components/play/RevealReadyGate";
import { RevealShow } from "@/components/play/RevealExperience";
import {
  CancelledView,
  FinishingView,
  MissedView,
  ScheduledView,
  StillCookingView,
  WaitingCopy,
} from "@/components/play/PlayStates";
import { ANALYTICS_EVENTS } from "@/lib/analytics/events";
import { isValidSealDistribution } from "@/domain/play/allocations";
import { isPlayableNextHref } from "@/domain/play/next";
import { saveDraftPlayAction, sealPlayAction } from "@/server/actions/play";
import { trackEvent } from "@/server/actions/analytics";
import type { PlayMarshmallow } from "@/server/dal/play";
import { cn } from "@/lib/utils";

export function PlayExperience({ marshmallow }: { marshmallow: PlayMarshmallow }) {
  const router = useRouter();
  const [choiceId, setChoiceId] = useState(marshmallow.ownChoiceId);
  const [percents, setPercents] = useState(() =>
    defaultPercentsFor(marshmallow.choices, marshmallow.allocations),
  );
  const [error, setError] = useState<string | null>(null);
  const [sealing, setSealing] = useState(false);
  const [justSealed, setJustSealed] = useState(false);
  const [remainingMs, setRemainingMs] = useState(
    () => Date.parse(marshmallow.reveals_at) - Date.now(),
  );
  const [pending, startTransition] = useTransition();
  const predictedOnce = useRef(false);
  const draftTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const changeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTrackedMix = useRef<string | null>(null);

  const selected = marshmallow.choices.find((choice) => choice.id === choiceId);
  const selectedPct =
    marshmallow.choices.findIndex((choice) => choice.id === choiceId) >= 0
      ? percents[marshmallow.choices.findIndex((choice) => choice.id === choiceId)] ?? null
      : null;

  useEffect(() => {
    const tick = () => setRemainingMs(Date.parse(marshmallow.reveals_at) - Date.now());
    tick();
    const id = window.setInterval(tick, 1000);
    return () => window.clearInterval(id);
  }, [marshmallow.reveals_at]);

  useEffect(() => {
    if (remainingMs > 0) {
      return;
    }
    if (
      marshmallow.screen === "waiting" ||
      marshmallow.screen === "finishing" ||
      marshmallow.screen === "still_cooking"
    ) {
      router.refresh();
    }
  }, [remainingMs, marshmallow.screen, router]);

  useEffect(() => {
    if (marshmallow.screen !== "finishing" && marshmallow.screen !== "still_cooking") {
      return;
    }
    const id = window.setInterval(() => router.refresh(), 4000);
    return () => window.clearInterval(id);
  }, [marshmallow.screen, router]);

  async function selectChoice(id: string) {
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
  }

  function onPercents(next: number[]) {
    setPercents(next);
    if (!predictedOnce.current) {
      predictedOnce.current = true;
      void trackEvent(ANALYTICS_EVENTS.predictionStarted, { n: next.length }, marshmallow.id);
    }
    if (draftTimer.current) {
      clearTimeout(draftTimer.current);
    }
    draftTimer.current = setTimeout(() => {
      if (choiceId) {
        startTransition(() => {
          void saveDraftPlayAction({
            marshmallowId: marshmallow.id,
            ownChoiceId: choiceId,
            allocations: marshmallow.choices.map((choice, index) => ({
              choice_id: choice.id,
              predicted_pct: next[index] ?? 0,
            })),
          }).then((result) => {
            if (result.closed) {
              router.refresh();
              setError(result.error ?? "This Marshmallow just closed.");
              return;
            }
            if (!result.ok) {
              setError(result.error ?? "Could not save.");
            }
          });
        });
      }
    }, 400);

    if (changeTimer.current) {
      clearTimeout(changeTimer.current);
    }
    changeTimer.current = setTimeout(() => {
      const signature = next.join(",");
      if (lastTrackedMix.current === signature) {
        return;
      }
      lastTrackedMix.current = signature;
      void trackEvent(
        ANALYTICS_EVENTS.predictionChanged,
        { own: next[marshmallow.choices.findIndex((choice) => choice.id === choiceId)] ?? 0 },
        marshmallow.id,
      );
    }, 2000);
  }

  async function seal() {
    if (!choiceId) {
      return;
    }
    if (!isValidSealDistribution(percents)) {
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
      { n: percents.length, play_mode: marshmallow.play_mode },
      marshmallow.id,
    );
    setJustSealed(true);
    window.setTimeout(() => {
      setSealing(false);
      router.refresh();
    }, 700);
  }

  if (marshmallow.screen === "cancelled") {
    return <CancelledView />;
  }
  if (marshmallow.screen === "scheduled") {
    return <ScheduledView opensAt={marshmallow.opens_at} />;
  }
  if (marshmallow.screen === "missed") {
    return <MissedView />;
  }
  if (marshmallow.screen === "reveal_ready") {
    return (
      <RevealReadyGate
        marshmallowId={marshmallow.id}
        question={marshmallow.question}
        playMode={marshmallow.play_mode}
      />
    );
  }
  if (marshmallow.screen === "revealed" || marshmallow.screen === "revealed_spectator") {
    return <RevealShow marshmallow={marshmallow} />;
  }
  if (marshmallow.screen === "still_cooking") {
    return (
      <StillCookingView
        nextHref={marshmallow.nextHref}
        showPlayAnother={
          marshmallow.play_mode === "quick" && isPlayableNextHref(marshmallow.nextHref)
        }
      />
    );
  }
  if (marshmallow.screen === "finishing") {
    return <FinishingView />;
  }

  if (marshmallow.screen === "waiting" || marshmallow.sealed || justSealed) {
    const playAnother =
      marshmallow.play_mode === "quick" && isPlayableNextHref(marshmallow.nextHref);
    const isQuick = marshmallow.play_mode === "quick";
    return (
      <div className={cn(justSealed && "seal-moment")}>
        {justSealed ? (
          <div className="flex flex-col items-center gap-4 px-2 py-10 text-center">
            <MarshmallowMascot state="sealed" size="lg" />
            <p className="text-xs font-semibold tracking-[0.18em] text-primary uppercase">
              {isQuick ? "Call locked" : "Sealed"}
            </p>
            <p className="font-display text-2xl font-semibold">
              You picked {selected?.label ?? "your answer"}.
            </p>
            {isQuick && selectedPct != null ? (
              <p className="text-base text-ink-muted">
                You think {selectedPct}% of players agree.
              </p>
            ) : selectedPct != null ? (
              <p>You predicted {selectedPct}%.</p>
            ) : null}
            {isQuick ? (
              <p className="max-w-[20rem] text-sm leading-6 text-ink-muted">
                Let&apos;s see how well you read the room.
              </p>
            ) : (
              <p className="text-sm text-ink-muted">Come back for the reveal.</p>
            )}
            {playAnother ? (
              <>
                <PrimaryButton href={marshmallow.nextHref}>PLAY ANOTHER</PrimaryButton>
                <Link href="/home" className="min-h-11 text-sm font-semibold text-primary">
                  Home
                </Link>
              </>
            ) : (
              <PrimaryButton href="/home">HOME</PrimaryButton>
            )}
          </div>
        ) : (
          <WaitingCopy
            choiceLabel={selected?.label ?? "your pick"}
            predictedPct={selectedPct}
            revealsAt={marshmallow.reveals_at}
            closesAt={marshmallow.closes_at}
            remainingMs={remainingMs}
            nextHref={marshmallow.nextHref}
            showPlayAnother={playAnother}
            playMode={marshmallow.play_mode}
          />
        )}
      </div>
    );
  }

  const showPredict = choiceId != null;

  return (
    <div className="flex flex-1 flex-col gap-6 pb-8">
      <div className="pt-4">
        <PlayModeBadge mode={marshmallow.play_mode} />
      </div>
      <h1 className="font-display text-[clamp(1.65rem,7.5vw,2.15rem)] leading-[1.08] font-semibold tracking-tight break-words">
        {marshmallow.question}
      </h1>
      {!showPredict ? (
        <>
          <p className="text-xs font-semibold tracking-[0.18em] text-primary uppercase">
            Make your call
          </p>
          <div className="flex flex-col gap-3">
            {marshmallow.choices.map((choice) => (
              <ChoiceButton
                key={choice.id}
                selected={choiceId === choice.id}
                disabled={pending || sealing}
                onClick={() => void selectChoice(choice.id)}
              >
                {choice.label}
              </ChoiceButton>
            ))}
          </div>
        </>
      ) : (
        <div className="flex flex-col gap-5">
          <p className="text-xs font-semibold tracking-[0.18em] text-primary uppercase">
            Now read the room
          </p>
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
          <PrimaryButton onClick={() => void seal()} disabled={sealing || pending}>
            {sealing ? "Locking…" : "LOCK IT IN"}
          </PrimaryButton>
          <p className="text-center text-sm text-ink-muted">
            Once locked, your call can&apos;t change.
          </p>
        </div>
      )}
      {error ? (
        <p role="alert" className="text-center text-sm text-toasted">
          {error}
        </p>
      ) : null}
    </div>
  );
}

