import { notFound, redirect } from "next/navigation";

import { TodaysReadCard } from "@/components/daily/TodaysReadCard";
import {
  DailyRoundRevealGate,
  DailyRoundRevealShow,
} from "@/components/play/DailyRoundRevealExperience";
import { getDailyRoundProgressById, getDailyRoundReveal } from "@/server/dal/daily-round";

export default async function DailyRoundRevealPage({
  params,
}: PageProps<"/daily/[roundId]/reveal">) {
  const { roundId } = await params;
  const progress = await getDailyRoundProgressById(roundId);

  if (!progress) {
    notFound();
  }

  if (!progress.allSealed) {
    redirect(progress.currentPlayId ? `/m/${progress.currentPlayId}` : "/home");
  }

  if (!progress.allRevealed) {
    return (
      <main className="flex flex-1 flex-col">
        {progress.todaysRead ? (
          <TodaysReadCard read={progress.todaysRead} />
        ) : (
          <div className="flex flex-1 flex-col items-center justify-center gap-4 px-2 py-10 text-center">
            <p className="text-xs font-semibold tracking-[0.18em] text-primary uppercase">Daily sealed</p>
            <h1 className="font-display text-[1.85rem] leading-[1.08] font-semibold tracking-tight break-words">
              {progress.title}
            </h1>
            <p className="max-w-[20rem] text-sm leading-6 text-ink-muted">
              5 calls locked · Come back for the reveal
            </p>
          </div>
        )}
      </main>
    );
  }

  if (!progress.anyRevealOpened) {
    return (
      <main className="flex flex-1 flex-col">
        <DailyRoundRevealGate roundId={roundId} title={progress.title} />
      </main>
    );
  }

  const payload = await getDailyRoundReveal(roundId);
  if (!payload) {
    notFound();
  }

  return (
    <main className="flex flex-1 flex-col">
      <DailyRoundRevealShow
        reveals={payload.reveals}
        summary={payload.summary}
      />
    </main>
  );
}
