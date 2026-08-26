import { ANALYTICS_EVENTS } from "@/lib/analytics/events";
import { trackEvent } from "@/server/actions/analytics";
import { requireOnboarded } from "@/server/dal/auth";
import { getOwnProfilePayload } from "@/server/dal/crowdsense";
import { ProfileView } from "@/components/profile/ProfileView";
import { ErrorState } from "@/components/ErrorState";

export default async function ProfilePage() {
  const { user, profile } = await requireOnboarded();
  await trackEvent(ANALYTICS_EVENTS.profileViewed, {});

  let payload: Awaited<ReturnType<typeof getOwnProfilePayload>> | null = null;
  try {
    payload = await getOwnProfilePayload(profile.username, profile.display_name);
  } catch {
    payload = null;
  }

  if (!payload) {
    return (
      <main className="flex flex-1 flex-col">
        <ErrorState title="Profile didn't load" description="Try again in a moment." />
      </main>
    );
  }

  return <ProfileView profile={payload} isAnonymous={user.is_anonymous === true} />;
}
