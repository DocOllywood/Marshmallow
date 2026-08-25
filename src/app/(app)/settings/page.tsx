import Link from "next/link";

import { PageHeader } from "@/components/PageHeader";
import { PrimaryButton } from "@/components/PrimaryButton";
import { BetaFeedbackForm } from "@/components/feedback/BetaFeedbackForm";
import { NotificationPrefsForm } from "@/components/settings/NotificationPrefsForm";
import { requireUser } from "@/server/dal/auth";
import { signOutAction } from "@/server/actions/auth";
import { getNotificationPrefs } from "@/server/dal/notify-share";

export default async function SettingsPage() {
  await requireUser();
  let prefs = {
    emailRevealReady: false,
    emailDaily: false,
    emailStreak: false,
    emailSendingEnabled: false,
  };
  try {
    prefs = await getNotificationPrefs();
  } catch {
    // Defaults stay conservative.
  }

  return (
    <main className="flex flex-1 flex-col gap-8 pb-8">
      <PageHeader
        title="Settings"
        description="Reveal-ready in-app notes stay on. Optional email is off unless you turn it on."
      />
      <NotificationPrefsForm prefs={prefs} />
      <BetaFeedbackForm context="settings" />
      <p className="text-sm">
        <Link href="/notifications" className="font-semibold text-primary">
          Inbox
        </Link>
      </p>
      <p className="text-xs text-ink-muted">
        <Link href="/privacy">Privacy</Link>
        {" · "}
        <Link href="/terms">Terms</Link>
        {" · "}
        <Link href="/community">Community Guidelines</Link>
        <span className="mt-1 block">Drafts for attorney review.</span>
      </p>
      <form action={signOutAction}>
        <PrimaryButton type="submit">Log out</PrimaryButton>
      </form>
    </main>
  );
}
