import Link from "next/link";

import { PageHeader } from "@/components/PageHeader";

export default function PrivacyPage() {
  return (
    <main className="flex flex-1 flex-col gap-6 pb-10 pt-6">
      <PageHeader
        eyebrow="Draft for attorney review"
        title="Privacy"
        description="This describes what Marshmallow currently stores. It is not legal advice and is not a guarantee."
      />
      <div className="space-y-4 text-sm leading-6 text-ink-muted">
        <p>We collect account information: email, username, display name, and sign-in metadata from our auth provider.</p>
        <p>We store your predictions, sealed entries, official scores, Accuracy, CrowdSense ratings rebuilt from official scores, streaks, and reveal opens.</p>
        <p>We record first-party product analytics events such as views, seals, reveal opens, and shares. These stay in our database for product measurement. Official gameplay state is the source of truth.</p>
        <p>Share links may set first-party cookies <code>mw_vid</code> and <code>mw_share</code> so we can attribute a later Play click or signup to a share visit.</p>
        <p>In-app Reveal Ready notifications are created for Live and Daily Marshmallows you sealed. Quick Marshmallows do not create inbox notifications. Email sending is currently off for beta.</p>
        <p>We do not sell your predictions. Other players cannot see your sealed entry before a legitimate reveal.</p>
      </div>
      <Link href="/" className="text-sm font-semibold text-primary">Back</Link>
    </main>
  );
}
