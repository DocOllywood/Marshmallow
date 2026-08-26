import { MarshmallowLogo } from "@/components/MarshmallowLogo";
import { MarshmallowMascot } from "@/components/MarshmallowMascot";
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
          The Human Relationships Game
        </h1>
        <p className="mt-4 font-display text-xl font-semibold leading-snug">
          How well do you understand other people?
        </p>
        <p className="mt-4 max-w-[19rem] text-sm leading-6 text-ink-muted">
          Answer for yourself.
          <span className="block">Predict everyone else.</span>
          <span className="block">Then see how well you read the room.</span>
        </p>
      </div>
      <div className="flex flex-col gap-3">
        <PrimaryButton href="/signup">PLAY MARSHMALLOW</PrimaryButton>
        <PrimaryButton
          href="/login"
          className="border-2 border-ink bg-transparent text-ink hover:opacity-80"
        >
          Log in
        </PrimaryButton>
        <p className="text-center text-xs text-ink-muted">
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
