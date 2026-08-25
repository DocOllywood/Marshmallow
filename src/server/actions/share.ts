"use server";

import { revalidatePath } from "next/cache";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireOnboarded } from "@/server/dal/auth";

export type ShareActionResult =
  | { ok: true; publicId: string }
  | { ok: false; error: string };

export async function createShareCardAction(marshmallowId: string): Promise<ShareActionResult> {
  await requireOnboarded();
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("create_share_card", {
    p_marshmallow_id: marshmallowId,
  });
  if (error || !data?.public_id) {
    if (error?.message.includes("reveal_not_opened")) {
      return { ok: false, error: "Open your reveal before sharing." };
    }
    if (error?.message.includes("results_not_available")) {
      return { ok: false, error: "This Marshmallow isn't revealed yet." };
    }
    if (error?.message.includes("marshmallow_cancelled")) {
      return { ok: false, error: "Cancelled Marshmallows can't be shared." };
    }
    if (error?.message.includes("no_sealed_entry")) {
      return { ok: false, error: "You didn't play this one." };
    }
    return { ok: false, error: "Could not create a share card." };
  }
  revalidatePath(`/m/${marshmallowId}`);
  return { ok: true, publicId: data.public_id };
}
