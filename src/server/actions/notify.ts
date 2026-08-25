"use server";

import { revalidatePath } from "next/cache";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import { requireOnboarded, requireUser } from "@/server/dal/auth";

export type NotifyActionResult = { ok: boolean; error?: string };

export async function markNotificationReadAction(id: string): Promise<NotifyActionResult> {
  await requireUser();
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", id)
    .is("read_at", null);
  if (error) {
    return { ok: false, error: error.message };
  }
  revalidatePath("/notifications");
  return { ok: true };
}

export async function markRevealNotificationReadAction(marshmallowId: string) {
  await requireUser();
  const supabase = await createSupabaseServerClient();
  await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("marshmallow_id", marshmallowId)
    .eq("type", "reveal_ready")
    .is("read_at", null);
}

export async function updateNotificationPrefsAction(formData: FormData) {
  await requireOnboarded();
  const supabase = await createSupabaseServerClient();
  const user = await requireUser();
  const { error } = await supabase
    .from("notification_prefs")
    .update({
      email_reveal_ready: formData.get("email_reveal_ready") === "on",
      email_daily: formData.get("email_daily") === "on",
      email_streak: formData.get("email_streak") === "on",
    })
    .eq("user_id", user.id);
  if (error) {
    throw new Error(error.message);
  }
  revalidatePath("/settings");
}
