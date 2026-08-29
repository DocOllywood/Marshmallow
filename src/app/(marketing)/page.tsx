import { MarshmallowLogo } from "@/components/MarshmallowLogo";
import { PriceLadderExample } from "@/components/marketing/PriceLadderExample";
import { PlayMarshmallowButton } from "@/components/auth/PlayMarshmallowButton";
import { PrimaryButton } from "@/components/PrimaryButton";

export default function LandingPage() {
  return (
    <main className="flex flex-1 flex-col gap-10 pb-8 pt-6">
      <div className="flex items-center justify-between">
        <MarshmallowLogo />
      </div>

      <div className="flex flex-col items-center text-center">
        <p className="text-xs font-semibold tracking-[0.22em] text-ink-muted uppercase">Marshmallow</p>
        <h1 className="mt-3 font-display text-[clamp(2rem,9vw,2.65rem)] leading-[0.98] font-semibold tracking-tight text-ink">
          What&apos;s your price?
        </h1>
        <p className="mt-4 max-w-[21rem] text-base leading-7 text-ink">
          Money changes people.
          <span className="block">Find out where it changes you.</span>
        </p>
        <p className="mt-3 max-w-[19rem] text-sm leading-6 text-ink-muted">
          One uncomfortable money experiment every day.
        </p>
        <div className="mt-8 w-full">
          <PlayMarshmallowButton label="PLAY TODAY'S EXPERIMENT" />
        </div>
      </div>

      <section className="flex flex-col items-center gap-5 border-t border-border/60 pt-8 text-center">
        <div className="space-y-1">
          <p className="text-xs font-semibold tracking-[0.2em] text-ink uppercase">One situation.</p>
          <p className="text-xs font-semibold tracking-[0.2em] text-ink uppercase">The price changes.</p>
          <p className="text-xs font-semibold tracking-[0.2em] text-money uppercase">See if you do.</p>
        </div>
        <PriceLadderExample />
        <p className="max-w-[20rem] text-sm leading-6 text-ink-muted">
          <span className="font-semibold text-ink">Money is only the beginning.</span>
          <span className="mt-2 block">
            Your price might be money. It might be loyalty, time, status, privacy, love, or belonging.
          </span>
        </p>
      </section>

      <div className="mt-auto flex flex-col gap-3">
        <PrimaryButton
          href="/login"
          className="border-2 border-ink bg-transparent text-ink hover:opacity-80"
        >
          Already have an account? Log in
        </PrimaryButton>
        <p className="text-center text-xs text-ink-muted">
          <a href="/signup">Create an account</a>
          {" · "}
          <a href="/privacy">Privacy</a>
          {" · "}
          <a href="/terms">Terms</a>
          {" · "}
          <a href="/community">Community</a>
        </p>
      </div>
    </main>
  );
}
