import { HomeFeedView, HomeLoadError } from "@/components/home/HomeFeed";
import { ANALYTICS_EVENTS } from "@/lib/analytics/events";
import { trackEvent } from "@/server/actions/analytics";
import { requireOnboarded } from "@/server/dal/auth";
import { getIdentityChip } from "@/server/dal/crowdsense";
import { getHomeFeed, type HomeFeed } from "@/server/dal/home";
import { listActiveTopics, listOwnTopicPrefIds } from "@/server/dal/topics";

export default async function HomePage() {
  const { profile } = await requireOnboarded();

  let feed: HomeFeed | null = null;
  let identity: Awaited<ReturnType<typeof getIdentityChip>> | undefined;
  try {
    const [topics, prefIds] = await Promise.all([
      listActiveTopics(),
      listOwnTopicPrefIds(),
    ]);
    feed = await getHomeFeed(topics, prefIds);
    identity = await getIdentityChip();
    await trackEvent(ANALYTICS_EVENTS.homeViewed, {
      ready: feed.readyToReveal.length,
      waiting: feed.cooking.length,
      quick: feed.quickPlay.length,
      live: feed.liveNow.length,
      open: feed.openNow.length,
    });
  } catch {
    feed = null;
  }

  if (!feed) {
    return (
      <main className="flex flex-1 flex-col">
        <HomeLoadError />
      </main>
    );
  }

  return (
    <HomeFeedView
      feed={feed}
      firstName={profile.display_name.split(" ")[0] ?? profile.username}
      username={profile.username}
      identity={identity}
    />
  );
}
