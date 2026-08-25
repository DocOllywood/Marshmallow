"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { ANALYTICS_EVENTS } from "@/lib/analytics/events";
import { LEADERBOARD_TABS } from "@/domain/crowdsense/boards";
import { trackEvent } from "@/server/actions/analytics";
import { cn } from "@/lib/utils";

export type LeaderboardPayload = {
  board: string;
  weekStart: string;
  population: number;
  rows: {
    username: string;
    displayName: string;
    rating: number;
    scoredCount: number;
    rank: number;
  }[];
  viewer: {
    scoredCount: number;
    qualified: boolean;
    rating: number | null;
    rank: number | null;
    remaining: number;
  };
};

export function LeaderboardView({ board }: { board: LeaderboardPayload }) {
  const router = useRouter();

  function selectTab(id: string) {
    void trackEvent(ANALYTICS_EVENTS.leaderboardTabChanged, { tab: id });
    router.push(`/leaderboard?tab=${id}`);
  }

  return (
    <main className="flex flex-1 flex-col gap-6 pb-8">
      <header className="pt-6">
        <p className="text-xs font-semibold tracking-[0.18em] text-ink-muted uppercase">Board</p>
        <h1 className="mt-1 font-display text-[2rem] leading-[1.05] font-semibold tracking-tight">
          CrowdSense
        </h1>
        {board.board === "weekly" ? (
          <p className="mt-1 text-sm text-ink-muted">THIS WEEK · UTC week of {board.weekStart}</p>
        ) : null}
      </header>

      <div className="flex flex-wrap gap-2">
        {LEADERBOARD_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => selectTab(tab.id)}
            className={cn(
              "min-h-10 rounded-full px-3 text-sm font-semibold",
              board.board === tab.id ? "bg-primary text-primary-ink" : "bg-surface text-ink-muted",
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {board.viewer.qualified && board.viewer.rank != null ? (
        <p className="text-sm">
          #{board.viewer.rank} of {board.population}
          {board.viewer.rating != null ? ` · CrowdSense ${board.viewer.rating}` : ""}
        </p>
      ) : (
        <p className="text-sm text-ink-muted">
          {board.viewer.remaining} more prediction{board.viewer.remaining === 1 ? "" : "s"} to qualify
        </p>
      )}

      {board.rows.length === 0 ? (
        <p className="text-sm text-ink-muted">Nobody is qualified on this board yet.</p>
      ) : (
        <ol className="flex flex-col gap-3">
          {board.rows.map((row) => (
            <li key={row.username} className="flex items-baseline justify-between gap-3">
              <div className="min-w-0">
                <p className="font-display text-lg font-semibold leading-tight">
                  <span className="tabular-nums text-ink-muted">#{row.rank}</span>{" "}
                  <Link href={`/u/${row.username}`}>{row.displayName}</Link>
                </p>
                <p className="text-xs text-ink-muted">@{row.username}</p>
              </div>
              <p className="font-display text-2xl font-semibold tabular-nums">{row.rating}</p>
            </li>
          ))}
        </ol>
      )}
    </main>
  );
}
