import { PageHeader } from "@/components/PageHeader";
import { SignUpForm } from "@/components/auth/AuthForms";
import { ANALYTICS_EVENTS } from "@/lib/analytics/events";
import { safeInternalPath } from "@/lib/http/safe-path";
import { trackEvent } from "@/server/actions/analytics";

export default async function SignupPage({
  searchParams,
}: PageProps<"/signup">) {
  const params = await searchParams;
  const nextPath = typeof params.next === "string" ? safeInternalPath(params.next) : undefined;
  const shareId =
    typeof params.share === "string" && /^[a-f0-9]{32}$/.test(params.share)
      ? params.share
      : undefined;

  if (shareId) {
    await trackEvent(ANALYTICS_EVENTS.shareSignupStarted, { public_id: shareId });
  }

  return (
    <main className="flex flex-1 flex-col">
      <PageHeader
        title="Join Marshmallow"
        description="Pick a username, then make your call."
      />
      <SignUpForm nextPath={nextPath} shareId={shareId} />
    </main>
  );
}
