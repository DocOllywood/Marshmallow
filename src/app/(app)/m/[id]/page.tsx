import { notFound } from "next/navigation";

import { PlayExperience } from "@/components/play/PlayExperience";
import { ANALYTICS_EVENTS } from "@/lib/analytics/events";
import { trackEvent } from "@/server/actions/analytics";
import { markRevealNotificationReadAction } from "@/server/actions/notify";
import { getPlayMarshmallow } from "@/server/dal/play";

export default async function MarshmallowPage({
  params,
  searchParams,
}: PageProps<"/m/[id]">) {
  const { id } = await params;
  const query = await searchParams;
  const marshmallow = await getPlayMarshmallow(id);

  if (!marshmallow || marshmallow.screen === "unavailable") {
    notFound();
  }

  if (query.from === "notify") {
    await markRevealNotificationReadAction(marshmallow.id);
    await trackEvent(ANALYTICS_EVENTS.notificationClicked, { type: "reveal_ready" }, marshmallow.id);
  }

  const returned =
    marshmallow.sealedAt != null &&
    Date.parse(marshmallow.nowIso) - Date.parse(marshmallow.sealedAt) > 15_000;

  await trackEvent(
    ANALYTICS_EVENTS.marshmallowViewed,
    { screen: marshmallow.screen, sealed: marshmallow.sealed, play_mode: marshmallow.play_mode },
    marshmallow.id,
  );
  if (marshmallow.screen === "waiting" || marshmallow.screen === "finishing") {
    await trackEvent(ANALYTICS_EVENTS.waitingViewed, { returned }, marshmallow.id);
    if (returned) {
      await trackEvent(ANALYTICS_EVENTS.waitingReturned, {}, marshmallow.id);
    }
  }
  if (marshmallow.screen === "reveal_ready") {
    await trackEvent(ANALYTICS_EVENTS.revealReady, {}, marshmallow.id);
  }

  return (
    <main className="flex flex-1 flex-col">
      <PlayExperience marshmallow={marshmallow} />
    </main>
  );
}
