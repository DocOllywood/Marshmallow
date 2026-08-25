import { notFound } from "next/navigation";

import { PublicProfileView } from "@/components/profile/PublicProfileView";
import { ANALYTICS_EVENTS } from "@/lib/analytics/events";
import { trackEvent } from "@/server/actions/analytics";
import { getPublicPlayer } from "@/server/dal/crowdsense";

export default async function PublicPlayerPage({
  params,
}: {
  params: Promise<{ username: string }>;
}) {
  const { username } = await params;
  const player = await getPublicPlayer(username);
  if (!player || !player.username) {
    notFound();
  }

  await trackEvent(ANALYTICS_EVENTS.publicProfileViewed, { username: player.username });

  return <PublicProfileView player={player} />;
}
