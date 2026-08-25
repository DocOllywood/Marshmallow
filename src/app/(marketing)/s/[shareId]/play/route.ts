import { NextResponse } from "next/server";

import { ANALYTICS_EVENTS } from "@/lib/analytics/events";
import { trackEvent } from "@/server/actions/analytics";
import { getPublicShare, markSharePlay, sharePlayDestination } from "@/server/dal/notify-share";

export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  context: { params: Promise<{ shareId: string }> },
) {
  const { shareId } = await context.params;
  const share = await getPublicShare(shareId);
  if (!share) {
    return NextResponse.redirect(new URL("/", _request.url));
  }

  try {
    await markSharePlay(share.publicId);
    await trackEvent(ANALYTICS_EVENTS.sharePlayClicked, { public_id: share.publicId });
  } catch {
    // Attribution is best-effort.
  }

  const dest = await sharePlayDestination(share.publicId);
  return NextResponse.redirect(new URL(dest, _request.url));
}
