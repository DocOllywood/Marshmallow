"use client";

import { useActionState, useState } from "react";

import { MoneyBrandHeader } from "@/components/MoneyBrandHeader";
import { MarshmallowMascot } from "@/components/MarshmallowMascot";
import { MoneyPrimaryButton } from "@/components/MoneyPrimaryButton";
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

const HOW_STEPS = [
  { title: "Instinct", body: "Make your first call." },
  { title: "Pressure", body: "One thing changes." },
  { title: "The price", body: "Now it costs you something." },
  { title: "Flip", body: "See it from the other side." },
  { title: "The line", body: "Find where your answer changes." },
] as const;

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
            i <= index ? "bg-money" : "bg-border",
          )}
        />
      ))}
    </div>
  );
}

function Welcome({ onContinue }: { onContinue: () => void }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center text-center">
      <MoneyBrandHeader className="w-full text-left" />
      <MarshmallowMascot state="fluffy" size="lg" className="mt-4" aria-hidden />
      <h1 className="mt-6 font-display text-[clamp(2rem,9vw,2.4rem)] leading-[0.98] font-semibold tracking-tight">
        What&apos;s your price?
      </h1>
      <p className="mt-4 max-w-[18rem] text-sm leading-6 text-ink">
        Money changes people.
        <span className="block">Find out where it changes you.</span>
      </p>
      <div className="mt-10 w-full">
        <MoneyPrimaryButton onClick={onContinue}>CONTINUE</MoneyPrimaryButton>
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
      <MoneyBrandHeader />
      <h1 className="mt-4 font-display text-[2.1rem] leading-[1.05] font-semibold tracking-tight">
        How it works
      </h1>
      <ol className="mt-6 flex flex-col gap-3">
        {HOW_STEPS.map((item) => (
          <HowStep key={item.title} title={item.title} body={item.body} />
        ))}
      </ol>
      <div className="mt-auto flex flex-col gap-3 pt-8">
        <MoneyPrimaryButton onClick={onContinue}>SHOW ME</MoneyPrimaryButton>
        <BackButton onClick={onBack} />
      </div>
    </div>
  );
}

function HowStep({ title, body }: { title: string; body: string }) {
  const priceStage = title.toLowerCase() === "the price" || title.toLowerCase() === "the line";
  return (
    <li className="flex flex-col gap-1 rounded-[1.25rem] border border-border bg-surface px-4 py-3 text-left">
      <p
        className={cn(
          "text-xs font-semibold tracking-[0.18em] uppercase",
          priceStage ? "text-money" : "text-ink-muted",
        )}
      >
        {title}
      </p>
      <p className="text-sm font-medium text-ink">{body}</p>
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
      <MoneyBrandHeader />
      <input type="hidden" name="topic_ids" value={BETA_ONBOARDING_DEFAULT_TOPIC_ID} />
      <h1 className="mt-4 font-display text-[2.1rem] leading-[1.05] font-semibold tracking-tight">
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
      <p className="mt-6 text-sm leading-6 text-ink-muted">
        No right answers.
        <span className="block">No financial advice.</span>
        <span className="block">Just your decisions.</span>
      </p>
      {state?.error ? (
        <p role="alert" className="mt-4 text-sm text-toasted">
          {state.error}
        </p>
      ) : null}
      <div className="mt-auto flex flex-col gap-3 pt-8">
        <MoneyPrimaryButton type="submit" disabled={pending}>
          {pending ? "Saving…" : "PLAY MY FIRST EXPERIMENT"}
        </MoneyPrimaryButton>
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
