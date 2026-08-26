import { MarshmallowLogo } from "@/components/MarshmallowLogo";
import { MarshmallowMascot } from "@/components/MarshmallowMascot";
import { PlayMarshmallowButton } from "@/components/auth/PlayMarshmallowButton";
import { PrimaryButton } from "@/components/PrimaryButton";

export default function LandingPage() {
  return (
    <main className="flex flex-1 flex-col pb-8">
      <div className="flex items-center justify-between pt-6">
        <MarshmallowLogo />
      </div>
      <div className="flex flex-1 flex-col items-center justify-center text-center">
        <MarshmallowMascot state="fluffy" size="lg" />
        <p className="mt-8 text-xs font-semibold tracking-[0.2em] text-ink-muted uppercase">
          Marshmallow
        </p>
        <h1 className="mt-2 font-display text-[2.35rem] leading-[1.02] font-semibold tracking-tight">
          A Daily Experiment in Being Human
        </h1>
        <p className="mt-4 max-w-[21rem] font-display text-lg font-semibold leading-snug">
          How well do you understand people — and the small choices that shape how we treat each
          other?
        </p>
        <p className="mt-4 max-w-[19rem] text-sm leading-6 text-ink-muted">
          Make your call.
          <span className="block">Predict what other Marshmallow players will do.</span>
          <span className="block">See what changes your mind.</span>
          <span className="block">Come back for the reveal.</span>
        </p>
      </div>
      <div className="flex flex-col gap-3">
        <PlayMarshmallowButton label="PLAY TODAY'S MARSHMALLOW" />
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
