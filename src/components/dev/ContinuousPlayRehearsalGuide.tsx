import Link from "next/link";

import { MoneyPrimaryButton } from "@/components/MoneyPrimaryButton";
import {
  PRICE_QA_Q1_MARSHMALLOW_ID,
  PRICE_QA_CONTINUOUS_ROUND_ID,
} from "@/domain/content/continuous-experiments";
import { LAUNCH_MONEY_DAILY_ROUND_ID } from "@/domain/content/launch-money-daily";

const QA_STEPS = [
  "Create a fresh account (or use a test user with no Price QA entries).",
  "Complete onboarding — you should land on the continuous experiment or Home with PLAY NOW.",
  "From Home, start the guitar promise experiment (Price QA 008).",
  "Play Q1–Q5 with HOLD/MOVE reactions — same engine as Money Daily.",
  "Read Today's Read, then tap KEEP PLAYING if another experiment exists.",
  "Verify Day 1 (009) remains scheduled for Sep 2 — not playable from Home inventory.",
] as const;

export function ContinuousPlayRehearsalGuide() {
  return (
    <main className="flex flex-1 flex-col gap-6 pb-10 pt-6">
      <div className="flex flex-col gap-2">
        <p className="text-xs font-semibold tracking-[0.2em] text-money uppercase">Founder QA</p>
        <h1 className="font-display text-2xl font-semibold tracking-tight">Continuous play rehearsal</h1>
        <p className="text-sm leading-6 text-ink-muted">
          Uses hosted Price QA round{" "}
          <code className="text-xs">{PRICE_QA_CONTINUOUS_ROUND_ID}</code> — not Day 1 (
          <code className="text-xs">{LAUNCH_MONEY_DAILY_ROUND_ID}</code>). No production entries on
          the Sep 2 Daily.
        </p>
      </div>

      <ol className="flex list-decimal flex-col gap-3 pl-5 text-sm leading-6 text-ink">
        {QA_STEPS.map((step) => (
          <li key={step}>{step}</li>
        ))}
      </ol>

      <div className="flex flex-col gap-3 border-t border-border/60 pt-6">
        <MoneyPrimaryButton href={`/m/${PRICE_QA_Q1_MARSHMALLOW_ID}`}>
          OPEN PRICE QA (Q1)
        </MoneyPrimaryButton>
        <Link href="/home" className="text-center text-sm font-semibold text-money">
          Go to Home
        </Link>
        <Link href="/dev/money-day-1" className="text-center text-sm font-semibold text-ink-muted">
          Day 1 stage rehearsal (session only)
        </Link>
      </div>
    </main>
  );
}
