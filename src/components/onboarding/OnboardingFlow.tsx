"use client";

import { useActionState, useState } from "react";

import { MarshmallowLogo } from "@/components/MarshmallowLogo";
import { MarshmallowMascot, type MascotState } from "@/components/MarshmallowMascot";
import { PrimaryButton } from "@/components/PrimaryButton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ANALYTICS_EVENTS } from "@/lib/analytics/events";
import { cn } from "@/lib/utils";
import { BETA_ONBOARDING_DEFAULT_TOPIC_ID } from "@/domain/onboarding/beta";
import { completeOnboardingAction } from "@/server/actions/onboarding";
import { trackEvent } from "@/server/actions/analytics";

type OnboardingFlowProps = {
  username: string;
  displayName: string;
};

const STEPS = ["welcome", "how", "finish"] as const;
type Step = (typeof STEPS)[number];

export function OnboardingFlow({ username, displayName }: OnboardingFlowProps) {
  const [step, setStep] = useState<Step>("welcome");
  const [started, setStarted] = useState(false);
  const [state, action, pending] = useActionState(completeOnboardingAction, null);

  function start() {
    if (!started) {
      setStarted(true);
      void trackEvent(ANALYTICS_EVENTS.onboardingStarted);
    }
    setStep("how");
  }

  return (
    <main className="flex flex-1 flex-col">
      <StepDots step={step} />

      {step === "welcome" ? <Welcome onContinue={start} /> : null}

      {step === "how" ? (
        <HowToPlay onBack={() => setStep("welcome")} onContinue={() => setStep("finish")} />
      ) : null}

      {step === "finish" ? (
        <Finish
          username={username}
          displayName={displayName}
          state={state}
          action={action}
          pending={pending}
          onBack={() => setStep("how")}
        />
      ) : null}
    </main>
  );
}

function StepDots({ step }: { step: Step }) {
  const index = STEPS.indexOf(step);
  return (
    <div className="flex justify-center gap-2 pt-4" aria-hidden>
      {STEPS.map((item, i) => (
        <span
          key={item}
          className={cn(
            "h-1.5 w-6 rounded-full",
            i <= index ? "bg-primary" : "bg-border",
          )}
        />
      ))}
    </div>
  );
}

function Welcome({ onContinue }: { onContinue: () => void }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center text-center">
      <MarshmallowLogo />
      <MarshmallowMascot state="fluffy" size="hero" className="mt-8" />
      <p className="mt-4 text-xs font-semibold tracking-[0.2em] text-ink-muted uppercase">
        Marshmallow
      </p>
      <h1 className="mt-2 font-display text-[2.2rem] leading-[0.98] font-semibold tracking-tight">
        A Daily Experiment in Being Human
      </h1>
      <p className="mt-4 max-w-[18rem] text-sm leading-6 text-ink-muted">
        Five small dilemmas about how we treat each other.
      </p>
      <div className="mt-10 w-full">
        <PrimaryButton onClick={onContinue}>Continue</PrimaryButton>
      </div>
    </div>
  );
}

function HowToPlay({
  onBack,
  onContinue,
}: {
  onBack: () => void;
  onContinue: () => void;
}) {
  return (
    <div className="flex flex-1 flex-col pb-6">
      <h1 className="mt-8 font-display text-[2.1rem] leading-[1.05] font-semibold tracking-tight">
        How Marshmallow works
      </h1>
      <ol className="mt-6 flex flex-col gap-4">
        <HowStep state="thinking" title="CALL" body="Make your instinctive choice." />
        <HowStep
          state="thinking"
          title="PRESSURE"
          body="See what happens when circumstances change."
        />
        <HowStep state="sealed" title="FLIP" body="See the situation from the other side." />
        <HowStep
          state="toasted"
          title="REVEAL"
          body="Come back and discover where everyone else moved."
        />
      </ol>
      <div className="mt-auto flex flex-col gap-3 pt-8">
        <PrimaryButton onClick={onContinue}>Got it</PrimaryButton>
        <BackButton onClick={onBack} />
      </div>
    </div>
  );
}

function HowStep({
  state,
  title,
  body,
}: {
  state: MascotState;
  title: string;
  body: string;
}) {
  return (
    <li className="flex items-center gap-4 rounded-[1.5rem] border border-border bg-surface p-4">
      <MarshmallowMascot state={state} size="md" />
      <div>
        <p className="text-xs font-semibold tracking-[0.18em] text-primary uppercase">{title}</p>
        <p className="mt-1 text-sm font-medium text-ink">{body}</p>
      </div>
    </li>
  );
}

function Finish({
  username,
  displayName,
  state,
  action,
  pending,
  onBack,
}: {
  username: string;
  displayName: string;
  state: { error: string } | null;
  action: (payload: FormData) => void;
  pending: boolean;
  onBack: () => void;
}) {
  return (
    <form action={action} className="flex flex-1 flex-col pb-6">
      <input type="hidden" name="topic_ids" value={BETA_ONBOARDING_DEFAULT_TOPIC_ID} />
      <MarshmallowMascot state="celebrating" size="lg" className="mt-8 self-center" />
      <h1 className="mt-6 font-display text-[2.1rem] leading-[1.05] font-semibold tracking-tight">
        You&apos;re in, @{username}.
      </h1>
      <p className="mt-2 text-sm text-ink-muted">
        Username is locked from signup. Add a display name if you want a nickname.
      </p>
      <div className="mt-6 flex flex-col gap-2">
        <Label htmlFor="display_name">Display name (optional)</Label>
        <Input
          id="display_name"
          name="display_name"
          defaultValue={displayName === username ? "" : displayName}
          maxLength={48}
          className="min-h-12 rounded-xl bg-surface px-3 text-base"
        />
      </div>
      {state?.error ? (
        <p role="alert" className="mt-4 text-sm text-toasted">
          {state.error}
        </p>
      ) : null}
      <div className="mt-auto flex flex-col gap-3 pt-8">
        <PrimaryButton type="submit" disabled={pending}>
          {pending ? "Saving…" : "PLAY MY FIRST MARSHMALLOW"}
        </PrimaryButton>
        <BackButton onClick={onBack} />
      </div>
    </form>
  );
}

function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="min-h-12 text-sm font-semibold text-ink-muted">
      Back
    </button>
  );
}
