import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";

import { MarshmallowLogo } from "@/components/MarshmallowLogo";
import { PrimaryButton } from "@/components/PrimaryButton";
import { getPublicShare, recordShareVisit } from "@/server/dal/notify-share";
import { ANALYTICS_EVENTS } from "@/lib/analytics/events";
import { trackEvent } from "@/server/actions/analytics";
import { getAuthUser } from "@/server/dal/auth";

export async function generateMetadata({
  params,
}: PageProps<"/s/[shareId]">): Promise<Metadata> {
  const { shareId } = await params;
  const share = await getPublicShare(shareId);
  if (!share) {
    return { title: "Share not available" };
  }
  const description = `${share.copy.headline}. ${share.copy.challenge}`;
  return {
    title: share.shortQuestion,
    description,
    openGraph: {
      title: `${share.copy.headline} · Marshmallow`,
      description: share.shortQuestion,
    },
    twitter: {
      card: "summary_large_image",
      title: `${share.copy.headline} · Marshmallow`,
      description: share.shortQuestion,
    },
  };
}

export default async function SharePage({
  params,
}: PageProps<"/s/[shareId]">) {
  const { shareId } = await params;
  const share = await getPublicShare(shareId);
  if (!share) {
    notFound();
  }

  try {
    await recordShareVisit(share.publicId);
    await trackEvent(ANALYTICS_EVENTS.shareOpened, { public_id: share.publicId });
  } catch {
    // Public visit tracking is best-effort.
  }

  const user = await getAuthUser();

  return (
    <main className="flex flex-1 flex-col gap-6 py-8">
      <MarshmallowLogo />
      <p className="text-xs font-semibold tracking-[0.18em] text-primary uppercase">
        {share.copy.headline}
      </p>
      <h1 className="font-display text-[1.85rem] leading-[1.08] font-semibold tracking-tight">
        {share.question}
      </h1>
      <ul className="flex flex-col gap-1 font-display text-2xl font-semibold">
        {share.copy.lines.map((line) => (
          <li key={line}>{line}</li>
        ))}
      </ul>
      <p className="text-sm font-semibold tracking-[0.16em] text-ink-muted">
        {share.copy.brand}
      </p>
      <p className="text-sm">{share.copy.challenge}</p>
      <PrimaryButton
        href={`/s/${share.publicId}/play`}
        onClick={() => {
          void trackEvent(ANALYTICS_EVENTS.sharePlayClicked, { public_id: share.publicId });
        }}
      >
        PLAY A MARSHMALLOW
      </PrimaryButton>
      {!user ? (
        <p className="text-sm text-ink-muted">
          Already in?{" "}
          <Link href={`/login?next=${encodeURIComponent(`/s/${share.publicId}/play`)}`} className="font-semibold text-primary">
            Log in
          </Link>
        </p>
      ) : null}
      <p className="text-xs text-ink-muted">
        This result is already in. Play an open Marshmallow — you can&apos;t compete on this one retroactively.
      </p>
    </main>
  );
}
