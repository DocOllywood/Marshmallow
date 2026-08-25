import { ErrorState } from "@/components/ErrorState";
import { OnboardingFlow } from "@/components/onboarding/OnboardingFlow";
import { MissingProfileState } from "@/components/home/HomeFeed";
import { requireOnboardingSession } from "@/server/dal/auth";
import { listActiveTopics, listOwnTopicPrefIds } from "@/server/dal/topics";
import type { TopicRow } from "@/domain/onboarding/topics";

export default async function OnboardingPage() {
  const { profile } = await requireOnboardingSession();

  if (!profile) {
    return (
      <main className="flex flex-1 flex-col">
        <MissingProfileState />
      </main>
    );
  }

  let topics: TopicRow[] | null = null;
  let prefIds: string[] = [];
  try {
    const loaded = await Promise.all([listActiveTopics(), listOwnTopicPrefIds()]);
    topics = loaded[0];
    prefIds = loaded[1];
  } catch {
    topics = null;
  }

  if (!topics) {
    return (
      <main className="flex flex-1 flex-col">
        <ErrorState
          title="Worlds didn't load"
          description="We couldn't fetch topics. Check your connection and try again."
        />
      </main>
    );
  }

  return (
    <OnboardingFlow
      topics={topics}
      username={profile.username}
      displayName={profile.display_name}
      initialTopicIds={prefIds}
    />
  );
}
