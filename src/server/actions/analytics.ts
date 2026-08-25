"use server";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Json } from "@/lib/supabase/types";
import type { AnalyticsEventName, AnalyticsPayload } from "@/lib/analytics/events";

export async function trackEvent(
  event: AnalyticsEventName,
  payload: AnalyticsPayload = {},
  marshmallowId?: string,
) {
  try {
    const supabase = await createSupabaseServerClient();
    await supabase.rpc("track_product_event", {
      p_event_type: event,
      p_payload: payload as Json,
      p_marshmallow_id: marshmallowId,
    });
  } catch {
    // Analytics is never authoritative. Swallow transport errors.
  }
}
