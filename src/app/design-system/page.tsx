import { notFound } from "next/navigation";

import { AppShell } from "@/components/AppShell";
import { ChoiceButton } from "@/components/ChoiceButton";
import { CountdownDisplay } from "@/components/CountdownDisplay";
import { EmptyState } from "@/components/EmptyState";
import { ErrorState } from "@/components/ErrorState";
import { LoadingState } from "@/components/LoadingState";
import { MarshmallowLogo } from "@/components/MarshmallowLogo";
import { MarshmallowMascot } from "@/components/MarshmallowMascot";
import { PageHeader } from "@/components/PageHeader";
import { PrimaryButton } from "@/components/PrimaryButton";
import { ScoreDisplay } from "@/components/ScoreDisplay";
import {
  OpenPrototype,
  RevealPrototype,
  SealedPrototype,
  WaitingPrototype,
} from "@/components/design-system/prototypes";

export const metadata = {
  title: "Design system",
};

export default function DesignSystemPage() {
  if (process.env.NODE_ENV === "production") {
    notFound();
  }

  return (
    <AppShell>
      <main className="flex flex-col gap-10 pb-16">
        <PageHeader
          eyebrow="Development"
          title="Design system"
          description="Visual prototypes only. No gameplay is wired."
        />

        <Section title="Brand">
          <MarshmallowLogo />
          <p className="font-display text-3xl leading-[1.05] font-semibold tracking-tight">
            What would hurt more to discover?
          </p>
          <p className="text-sm leading-6 text-ink-muted">
            Supporting copy stays compact. Numbers use tabular figures:{" "}
            <span className="font-semibold text-ink tabular-nums">64%</span>
          </p>
        </Section>

        <Section title="Mascot">
          <p className="text-sm text-ink-muted">
            One puff. Six states. Same silhouette.
          </p>
          <div className="flex flex-col gap-6">
            {(["sm", "md", "lg"] as const).map((size) => (
              <div key={size} className="flex flex-col gap-2">
                <p className="text-[10px] font-semibold tracking-[0.16em] text-ink-muted uppercase">
                  {size}
                </p>
                <div className="grid grid-cols-3 gap-4 sm:grid-cols-6">
                  <MascotSample state="fluffy" label="Fluffy" size={size} />
                  <MascotSample state="thinking" label="Thinking" size={size} />
                  <MascotSample state="sealed" label="Sealed" size={size} />
                  <MascotSample state="cooking" label="Cooking" size={size} heat={1} />
                  <MascotSample state="toasted" label="Toasted" size={size} />
                  <MascotSample state="celebrating" label="Celebrating" size={size} />
                </div>
              </div>
            ))}
          </div>
        </Section>

        <Section title="Buttons">
          <PrimaryButton type="button">Seal it</PrimaryButton>
          <ChoiceButton>Alex</ChoiceButton>
          <ChoiceButton selected>Jordan</ChoiceButton>
        </Section>

        <Section title="Open">
          <OpenPrototype />
        </Section>

        <Section title="Sealed">
          <SealedPrototype />
        </Section>

        <Section title="Waiting">
          <WaitingPrototype />
        </Section>

        <Section title="Reveal">
          <RevealPrototype />
        </Section>

        <Section title="Score">
          <ScoreDisplay accuracy={98} predictedPercent={64} crowdPercent={61} />
        </Section>

        <Section title="Countdown">
          <CountdownDisplay value="03:17:42" caption="Reveal in" />
        </Section>

        <Section title="Loading">
          <div className="rounded-[1.75rem] border border-border bg-surface">
            <LoadingState />
          </div>
        </Section>

        <Section title="Error">
          <div className="rounded-[1.75rem] border border-border bg-surface">
            <ErrorState />
          </div>
        </Section>

        <Section title="Empty">
          <div className="rounded-[1.75rem] border border-border bg-surface">
            <EmptyState
              title="Nothing here yet"
              description="This is the empty pattern for later product surfaces."
            />
          </div>
        </Section>
      </main>
    </AppShell>
  );
}

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="flex flex-col gap-4">
      <h2 className="text-xs font-semibold tracking-[0.18em] text-ink-muted uppercase">
        {title}
      </h2>
      {children}
    </section>
  );
}

function MascotSample({
  state,
  label,
  size = "sm",
  heat,
}: {
  state: React.ComponentProps<typeof MarshmallowMascot>["state"];
  label: string;
  size?: React.ComponentProps<typeof MarshmallowMascot>["size"];
  heat?: React.ComponentProps<typeof MarshmallowMascot>["heat"];
}) {
  return (
    <div className="flex flex-col items-center gap-2">
      <MarshmallowMascot state={state} size={size} heat={heat} />
      <span className="text-[10px] font-medium text-ink-muted">{label}</span>
    </div>
  );
}
