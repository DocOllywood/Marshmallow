import { LeaderboardView } from "@/components/leaderboard/LeaderboardView";
import { ErrorState } from "@/components/ErrorState";
import { ANALYTICS_EVENTS } from "@/lib/analytics/events";
import { isLeaderboardTabId } from "@/domain/crowdsense/boards";
import { trackEvent } from "@/server/actions/analytics";
import { getLeaderboard } from "@/server/dal/crowdsense";

export default async function LeaderboardPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string }>;
}) {
  const params = await searchParams;
  const tab = isLeaderboardTabId(params.tab) ? params.tab : "overall";

  await trackEvent(ANALYTICS_EVENTS.leaderboardViewed, { tab });

  let board: Awaited<ReturnType<typeof getLeaderboard>> | null = null;
  try {
    board = await getLeaderboard(tab);
  } catch {
    board = null;
  }

  if (!board) {
    return (
      <main className="flex flex-1 flex-col">
        <ErrorState title="Board didn't load" description="CrowdSense rankings will return shortly." />
      </main>
    );
  }

  return <LeaderboardView board={board} />;
}
