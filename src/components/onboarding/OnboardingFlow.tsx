"use client";

import { useActionState, useMemo, useState } from "react";

import { MarshmallowLogo } from "@/components/MarshmallowLogo";
import { MarshmallowMascot, type MascotState } from "@/components/MarshmallowMascot";
import { PrimaryButton } from "@/components/PrimaryButton";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ANALYTICS_EVENTS } from "@/lib/analytics/events";
import { cn } from "@/lib/utils";
import {
  childTopicsForParents,
  isTopLevelTopic,
  type TopicRow,
} from "@/domain/onboarding/topics";
import { completeOnboardingAction } from "@/server/actions/onboarding";
import { trackEvent } from "@/server/actions/analytics";

type OnboardingFlowProps = {
  topics: TopicRow[];
  username: string;
  displayName: string;
  initialTopicIds: string[];
};

const STEPS = ["welcome", "worlds", "fandoms", "how", "finish"] as const;
type Step = (typeof STEPS)[number];

export function OnboardingFlow({
  topics,
  username,
  displayName,
  initialTopicIds,
}: OnboardingFlowProps) {
  const [step, setStep] = useState<Step>("welcome");
  const [selected, setSelected] = useState<Set<string>>(() => new Set(initialTopicIds));
  const [started, setStarted] = useState(false);
  const [state, action, pending] = useActionState(completeOnboardingAction, null);

  const worlds = topics.filter(isTopLevelTopic);
  const selectedWorlds = worlds.filter((topic) => selected.has(topic.id)).map((topic) => topic.id);
  const fandoms = useMemo(
    () => childTopicsForParents(topics, selectedWorlds),
    [topics, selectedWorlds],
  );
  const persistedIds = [...selected].filter((id) => {
    const topic = topics.find((item) => item.id === id);
    if (!topic) {
      return false;
    }
    if (topic.parent_id == null) {
      return true;
    }
    return selected.has(topic.parent_id);
  });

  function toggle(id: string, kind: "world" | "fandom") {
    const adding = !selected.has(id);
    setSelected((current) => {
      const next = new Set(current);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
    if (adding) {
      void trackEvent(
        kind === "world"
          ? ANALYTICS_EVENTS.onboardingCategorySelected
          : ANALYTICS_EVENTS.onboardingTopicSelected,
        { topic_id: id },
      );
    }
  }

  function start() {
    if (!started) {
      setStarted(true);
      void trackEvent(ANALYTICS_EVENTS.onboardingStarted);
    }
    setStep("worlds");
  }

  function goFandoms() {
    if (selectedWorlds.length === 0) {
      return;
    }
    if (fandoms.length === 0) {
      setStep("how");
      return;
    }
    setStep("fandoms");
  }

  return (
    <main className="flex flex-1 flex-col">
      <StepDots step={step} />

      {step === "welcome" ? (
        <Welcome onContinue={start} />
      ) : null}

      {step === "worlds" ? (
        <Worlds
          worlds={worlds}
          selected={selected}
          onToggle={(id) => toggle(id, "world")}
          onBack={() => setStep("welcome")}
          onContinue={goFandoms}
        />
      ) : null}

      {step === "fandoms" ? (
        <Fandoms
          fandoms={fandoms}
          selected={selected}
          onToggle={(id) => toggle(id, "fandom")}
          onBack={() => setStep("worlds")}
          onContinue={() => setStep("how")}
        />
      ) : null}

      {step === "how" ? (
        <HowToPlay onBack={() => setStep(fandoms.length ? "fandoms" : "worlds")} onContinue={() => setStep("finish")} />
      ) : null}

      {step === "finish" ? (
        <Finish
          username={username}
          displayName={displayName}
          topicIds={persistedIds}
          canSubmit={selectedWorlds.length > 0}
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
        The Human Nature Game
      </h1>
      <p className="mt-4 max-w-[18rem] text-sm leading-6 text-ink-muted">
        Answer for yourself. Predict everyone else. Discover how well you understand people.
      </p>
      <div className="mt-10 w-full">
        <PrimaryButton onClick={onContinue}>Continue</PrimaryButton>
      </div>
    </div>
  );
}

function Worlds({
  worlds,
  selected,
  onToggle,
  onBack,
  onContinue,
}: {
  worlds: TopicRow[];
  selected: Set<string>;
  onToggle: (id: string) => void;
  onBack: () => void;
  onContinue: () => void;
}) {
  const canContinue = worlds.some((topic) => selected.has(topic.id));

  return (
    <div className="flex flex-1 flex-col pb-6">
      <h1 className="mt-8 font-display text-[2.1rem] leading-[1.05] font-semibold tracking-tight">
        What are you into?
      </h1>
      <p className="mt-2 text-sm text-ink-muted">Pick at least one world.</p>
      {worlds.length === 0 ? (
        <p className="mt-6 text-sm text-ink-muted">
          No worlds are published yet. That&apos;s a content setup issue, not you.
        </p>
      ) : (
        <div className="mt-6 grid grid-cols-2 gap-3">
          {worlds.map((topic) => (
            <TopicCard
              key={topic.id}
              name={topic.name}
              selected={selected.has(topic.id)}
              onClick={() => onToggle(topic.id)}
            />
          ))}
        </div>
      )}
      <div className="mt-auto flex flex-col gap-3 pt-8">
        <PrimaryButton onClick={onContinue} disabled={!canContinue}>
          Continue
        </PrimaryButton>
        <BackButton onClick={onBack} />
      </div>
    </div>
  );
}

function Fandoms({
  fandoms,
  selected,
  onToggle,
  onBack,
  onContinue,
}: {
  fandoms: TopicRow[];
  selected: Set<string>;
  onToggle: (id: string) => void;
  onBack: () => void;
  onContinue: () => void;
}) {
  return (
    <div className="flex flex-1 flex-col pb-6">
      <h1 className="mt-8 font-display text-[2.1rem] leading-[1.05] font-semibold tracking-tight">
        Anything you never miss?
      </h1>
      <p className="mt-2 text-sm text-ink-muted">Optional. Continue without extra picks.</p>
      <div className="mt-6 flex flex-wrap gap-2">
        {fandoms.map((topic) => (
          <button
            key={topic.id}
            type="button"
            onClick={() => onToggle(topic.id)}
            className={cn(
              "min-h-12 rounded-full border px-4 text-sm font-semibold touch-manipulation",
              selected.has(topic.id)
                ? "border-primary bg-primary text-primary-ink"
                : "border-border bg-surface text-ink",
            )}
          >
            {topic.name}
          </button>
        ))}
      </div>
      <div className="mt-auto flex flex-col gap-3 pt-8">
        <PrimaryButton onClick={onContinue}>Continue</PrimaryButton>
        <BackButton onClick={onBack} />
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
        <HowStep state="thinking" title="PICK" body="What would you choose?" />
        <HowStep state="thinking" title="PREDICT" body="What do you think everyone else chose?" />
        <HowStep state="sealed" title="LOCK" body="Make your call before seeing the crowd." />
        <HowStep state="toasted" title="REVEAL" body="Find out how well you understand people." />
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
  topicIds,
  canSubmit,
  state,
  action,
  pending,
  onBack,
}: {
  username: string;
  displayName: string;
  topicIds: string[];
  canSubmit: boolean;
  state: { error: string } | null;
  action: (payload: FormData) => void;
  pending: boolean;
  onBack: () => void;
}) {
  return (
    <form action={action} className="flex flex-1 flex-col pb-6">
      {topicIds.map((id) => (
        <input key={id} type="hidden" name="topic_ids" value={id} />
      ))}
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
        <PrimaryButton type="submit" disabled={pending || !canSubmit}>
          {pending ? "Saving…" : "PLAY MY FIRST MARSHMALLOW"}
        </PrimaryButton>
        <BackButton onClick={onBack} />
      </div>
    </form>
  );
}

function TopicCard({
  name,
  selected,
  onClick,
}: {
  name: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex min-h-28 items-center justify-center rounded-[1.5rem] border px-3 text-center text-base font-semibold leading-tight touch-manipulation",
        selected
          ? "border-primary bg-primary text-primary-ink"
          : "border-border bg-surface text-ink",
      )}
    >
      {name}
    </button>
  );
}

function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="min-h-12 text-sm font-semibold text-ink-muted">
      Back
    </button>
  );
}
