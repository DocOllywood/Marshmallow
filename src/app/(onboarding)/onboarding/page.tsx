import { OnboardingFlow } from "@/components/onboarding/OnboardingFlow";
import { MissingProfileState } from "@/components/home/HomeFeed";
import { requireOnboardingSession } from "@/server/dal/auth";

export default async function OnboardingPage() {
  const { profile } = await requireOnboardingSession();

  if (!profile) {
    return (
      <main className="flex flex-1 flex-col">
        <MissingProfileState />
      </main>
    );
  }

  return (
    <OnboardingFlow username={profile.username} displayName={profile.display_name} />
  );
}
