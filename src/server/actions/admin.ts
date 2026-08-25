"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  marshmallowDraftSchema,
} from "@/lib/validations/marshmallow";
import { requireAdmin } from "@/server/dal/auth";

export type AdminActionState = { error: string; id?: string } | null;

function mapAdminError(message: string): string {
  if (message.includes("not_authorized") || message.includes("not_authenticated")) {
    return "You need an admin session for that.";
  }
  if (message.includes("question_invalid")) return "Question must be 8–280 characters.";
  if (message.includes("timestamps_invalid")) {
    return "Open must be before close, and close before reveal.";
  }
  if (message.includes("choices_duplicate")) return "Choices must be unique.";
  if (message.includes("choices_invalid")) return "Use 2–4 non-empty choices (max 80 characters).";
  if (message.includes("daily_conflict")) {
    return "Another Daily Marshmallow already uses that UTC date.";
  }
  if (message.includes("marshmallow_locked")) {
    return "This Marshmallow already opened. Question, choices, and open time are locked.";
  }
  if (message.includes("topic_invalid")) return "Pick an active topic, or none.";
  if (message.includes("reason_required")) return "Emergency close needs a reason.";
  if (message.includes("emergency_close_not_applicable")) {
    return "Emergency close only works on scheduled or open Marshmallows.";
  }
  if (message.includes("archive_not_applicable")) {
    return "Close it first. Open games cannot be archived.";
  }
  if (message.includes("image_url_invalid")) return "Image must be an http(s) URL, or blank.";
  if (message.includes("set_not_found")) return "That Quick Set was not found.";
  if (message.includes("template_not_found")) return "That template was not found.";
  if (message.includes("questions_invalid")) return "Add at least one question.";
  if (message.includes("marshmallow_not_found")) return "No queued Quick is available.";
  return "Could not save. Try again.";
}

function formPayload(formData: FormData) {
  const labels = formData
    .getAll("choice")
    .map(String)
    .filter((label) => label.trim().length > 0);
  const idValue = String(formData.get("id") ?? "");
  return {
    id: idValue.length > 0 ? idValue : undefined,
    question: String(formData.get("question") ?? ""),
    topic_id: String(formData.get("topic_id") || "") || null,
    choices: labels,
    opens_at: String(formData.get("opens_at") ?? ""),
    closes_at: String(formData.get("closes_at") ?? ""),
    reveals_at: String(formData.get("reveals_at") ?? ""),
    is_daily: formData.get("is_daily") === "on" || formData.get("play_mode") === "daily",
    play_mode: String(formData.get("play_mode") || "") || undefined,
    minimum_result_sample: String(formData.get("minimum_result_sample") ?? "") || undefined,
    hard_reveals_at: String(formData.get("hard_reveals_at") ?? "") || undefined,
    archetype: String(formData.get("archetype") || "") || undefined,
    freshness: String(formData.get("freshness") || "") || undefined,
    entity_label: String(formData.get("entity_label") ?? "") || null,
    spoiler_context: String(formData.get("spoiler_context") ?? "") || null,
    image_url: String(formData.get("image_url") ?? "") || null,
    expires_at: String(formData.get("expires_at") ?? "") || null,
    content_set_id: String(formData.get("content_set_id") || "") || null,
    checklist_instant: formData.get("checklist_instant") === "on",
    checklist_opinion: formData.get("checklist_opinion") === "on",
    checklist_curiosity: formData.get("checklist_curiosity") === "on",
    checklist_clean: formData.get("checklist_clean") === "on",
    checklist_visual: formData.get("checklist_visual") === "on",
    checklist_timely: formData.get("checklist_timely") === "on",
  };
}

function editorialArgs(data: {
  archetype?: string;
  freshness?: string;
  entity_label?: string | null;
  spoiler_context?: string | null;
  image_url?: string | null;
  expires_at?: string | null;
  content_set_id?: string | null;
  checklist_instant?: boolean;
  checklist_opinion?: boolean;
  checklist_curiosity?: boolean;
  checklist_clean?: boolean;
  checklist_visual?: boolean;
  checklist_timely?: boolean;
}) {
  return {
    p_archetype: data.archetype as
      | "who_won"
      | "who_lost"
      | "pick_one"
      | "will_it_happen"
      | "who_will"
      | "agree_disagree"
      | "lasting_power"
      | "side_with"
      | "better_moment"
      | "freeform"
      | undefined,
    p_freshness: data.freshness as "evergreen" | "timely" | "event_specific" | undefined,
    p_checklist: {
      instant: Boolean(data.checklist_instant),
      opinion: Boolean(data.checklist_opinion),
      curiosity: Boolean(data.checklist_curiosity),
      clean: Boolean(data.checklist_clean),
      visual: Boolean(data.checklist_visual),
      timely: Boolean(data.checklist_timely),
    },
    p_entity_label: data.entity_label ?? undefined,
    p_spoiler_context: data.spoiler_context ?? undefined,
    p_image_url: data.image_url ?? undefined,
    p_expires_at: data.expires_at ? toIso(data.expires_at) : undefined,
    p_content_set_id: data.content_set_id ?? undefined,
  };
}

function toIso(localValue: string): string {
  const parsed = new Date(localValue);
  if (Number.isNaN(parsed.getTime())) {
    return localValue;
  }
  return parsed.toISOString();
}

export async function saveDraftAction(
  _prev: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  await requireAdmin();
  const parsed = marshmallowDraftSchema.safeParse(formPayload(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the form." };
  }

  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("admin_upsert_marshmallow", {
    p_id: parsed.data.id,
    p_question: parsed.data.question,
    p_topic_id: parsed.data.topic_id ?? undefined,
    p_opens_at: toIso(parsed.data.opens_at),
    p_closes_at: toIso(parsed.data.closes_at),
    p_reveals_at: toIso(parsed.data.reveals_at),
    p_is_daily: parsed.data.is_daily,
    p_play_mode: parsed.data.play_mode,
    p_choices: parsed.data.choices.map((label, sort_order) => ({ label, sort_order })),
    p_minimum_result_sample: parsed.data.minimum_result_sample,
    p_hard_reveals_at: parsed.data.hard_reveals_at
      ? toIso(parsed.data.hard_reveals_at)
      : undefined,
  });

  if (error) {
    return { error: mapAdminError(error.message) };
  }

  const id = data?.id;
  if (id) {
    const editorial = await supabase.rpc("admin_save_editorial", {
      p_marshmallow_id: id,
      ...editorialArgs(parsed.data),
    });
    if (editorial.error) {
      return { error: mapAdminError(editorial.error.message) };
    }
  }

  revalidatePath("/admin");
  if (id && !parsed.data.id) {
    redirect(`/admin/marshmallows/${id}`);
  }
  return { error: "", id };
}

export async function scheduleMarshmallowAction(
  _prev: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  await requireAdmin();
  const parsed = marshmallowDraftSchema.safeParse(formPayload(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Check the form." };
  }
  if (parsed.data.choices.length < 2) {
    return { error: "Schedule needs 2 to 4 choices." };
  }

  const supabase = await createSupabaseServerClient();
  const upsert = await supabase.rpc("admin_upsert_marshmallow", {
    p_id: parsed.data.id,
    p_question: parsed.data.question,
    p_topic_id: parsed.data.topic_id ?? undefined,
    p_opens_at: toIso(parsed.data.opens_at),
    p_closes_at: toIso(parsed.data.closes_at),
    p_reveals_at: toIso(parsed.data.reveals_at),
    p_is_daily: parsed.data.is_daily,
    p_play_mode: parsed.data.play_mode,
    p_choices: parsed.data.choices.map((label, sort_order) => ({ label, sort_order })),
    p_minimum_result_sample: parsed.data.minimum_result_sample,
    p_hard_reveals_at: parsed.data.hard_reveals_at
      ? toIso(parsed.data.hard_reveals_at)
      : undefined,
  });
  if (upsert.error) {
    return { error: mapAdminError(upsert.error.message) };
  }

  const id = upsert.data?.id ?? parsed.data.id;
  if (!id) {
    return { error: "Save a draft before scheduling." };
  }

  const editorial = await supabase.rpc("admin_save_editorial", {
    p_marshmallow_id: id,
    ...editorialArgs(parsed.data),
  });
  if (editorial.error) {
    return { error: mapAdminError(editorial.error.message) };
  }

  const { error } = await supabase.rpc("admin_schedule_marshmallow", { p_id: id });
  if (error) {
    return { error: mapAdminError(error.message) };
  }

  revalidatePath("/admin");
  redirect("/admin");
}

export async function emergencyCloseAction(
  _prev: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const reason = String(formData.get("reason") ?? "");
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("admin_emergency_close", {
    p_id: id,
    p_reason: reason,
  });
  if (error) {
    return { error: mapAdminError(error.message) };
  }
  revalidatePath("/admin");
  revalidatePath(`/admin/marshmallows/${id}`);
  return { error: "" };
}

export async function archiveMarshmallowAction(
  _prev: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("admin_archive_marshmallow", { p_id: id });
  if (error) {
    return { error: mapAdminError(error.message) };
  }
  revalidatePath("/admin");
  redirect("/admin");
}

export async function runLifecycleAction(
  prev: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  void prev;
  void formData;
  await requireAdmin();
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("run_due_lifecycle", { p_source: "admin" });
  if (error) {
    return { error: mapAdminError(error.message) };
  }
  revalidatePath("/admin");
  revalidatePath("/home");
  return { error: "" };
}

export async function duplicateMarshmallowAction(
  _prev: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("admin_duplicate_marshmallow", { p_id: id });
  if (error) {
    return { error: mapAdminError(error.message) };
  }
  revalidatePath("/admin");
  if (data?.id) {
    redirect(`/admin/marshmallows/${data.id}`);
  }
  return { error: "Could not duplicate." };
}

export async function rebuildCrowdsenseAction(
  prev: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  void prev;
  void formData;
  await requireAdmin();
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("admin_rebuild_crowdsense");
  if (error) {
    return { error: mapAdminError(error.message) };
  }
  revalidatePath("/admin");
  revalidatePath("/leaderboard");
  revalidatePath("/profile");
  return { error: "" };
}

export async function saveTemplateAction(
  _prev: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const name = String(formData.get("template_name") ?? "");
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("admin_save_template", {
    p_marshmallow_id: id,
    p_name: name || undefined,
  });
  if (error) {
    return { error: mapAdminError(error.message) };
  }
  revalidatePath("/admin/templates");
  return { error: "" };
}

export async function createFromTemplateAction(
  _prev: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  await requireAdmin();
  const id = String(formData.get("template_id") ?? "");
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("admin_create_from_template", {
    p_template_id: id,
  });
  if (error) {
    return { error: mapAdminError(error.message) };
  }
  revalidatePath("/admin");
  if (data?.id) {
    redirect(`/admin/marshmallows/${data.id}`);
  }
  return { error: "Could not create from template." };
}

export async function createContentSetAction(
  _prev: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  await requireAdmin();
  const name = String(formData.get("name") ?? "");
  const notes = String(formData.get("notes") ?? "");
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("admin_create_content_set", {
    p_name: name,
    p_notes: notes || undefined,
  });
  if (error) {
    return { error: mapAdminError(error.message) };
  }
  revalidatePath("/admin/sets");
  if (data?.id) {
    redirect(`/admin/sets/${data.id}`);
  }
  return { error: "Could not create set." };
}

export async function batchCreateQuickAction(
  _prev: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  await requireAdmin();
  const questions = String(formData.get("questions") ?? "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean);
  if (questions.length === 0) {
    return { error: "Add at least one question, one per line." };
  }
  const supabase = await createSupabaseServerClient();
  const setId = String(formData.get("set_id") || "") || undefined;
  const { data, error } = await supabase.rpc("admin_batch_create_quick", {
    p_questions: questions,
    p_set_id: setId,
    p_topic_id: String(formData.get("topic_id") || "") || undefined,
    p_archetype: (String(formData.get("archetype") || "freeform") || "freeform") as
      | "who_won"
      | "who_lost"
      | "pick_one"
      | "will_it_happen"
      | "who_will"
      | "agree_disagree"
      | "lasting_power"
      | "side_with"
      | "better_moment"
      | "freeform",
    p_choice_a: String(formData.get("choice_a") || "Yes"),
    p_choice_b: String(formData.get("choice_b") || "No"),
  });
  if (error) {
    return { error: mapAdminError(error.message) };
  }
  revalidatePath("/admin");
  revalidatePath("/admin/sets");
  const count = (data as { count?: number } | null)?.count ?? questions.length;
  if (setId) {
    redirect(`/admin/sets/${setId}`);
  }
  return { error: "", id: String(count) };
}

export async function bulkScheduleSetAction(
  _prev: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  await requireAdmin();
  const setId = String(formData.get("set_id") ?? "");
  const base = String(formData.get("base_opens_at") ?? "");
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("admin_bulk_schedule_set", {
    p_set_id: setId,
    p_base_opens_at: toIso(base),
  });
  if (error) {
    return { error: mapAdminError(error.message) };
  }
  revalidatePath("/admin");
  revalidatePath(`/admin/sets/${setId}`);
  redirect("/admin");
}

export async function setQuickPriorityAction(
  _prev: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  await requireAdmin();
  const id = String(formData.get("id") ?? "");
  const priority = Number(formData.get("priority") ?? 0);
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("admin_set_quick_priority", {
    p_id: id,
    p_priority: Number.isFinite(priority) ? priority : 0,
  });
  if (error) {
    return { error: mapAdminError(error.message) };
  }
  revalidatePath("/admin");
  return { error: "" };
}

export async function swapQuickPriorityAction(
  _prev: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  await requireAdmin();
  const idA = String(formData.get("id_a") ?? "");
  const idB = String(formData.get("id_b") ?? "");
  const priorityA = Number(formData.get("priority_a") ?? 0);
  const priorityB = Number(formData.get("priority_b") ?? 0);
  const supabase = await createSupabaseServerClient();
  const first = await supabase.rpc("admin_set_quick_priority", {
    p_id: idA,
    p_priority: priorityB,
  });
  if (first.error) {
    return { error: mapAdminError(first.error.message) };
  }
  const second = await supabase.rpc("admin_set_quick_priority", {
    p_id: idB,
    p_priority: priorityA,
  });
  if (second.error) {
    return { error: mapAdminError(second.error.message) };
  }
  revalidatePath("/admin");
  return { error: "" };
}

export async function promoteNextQuickAction(
  prev: AdminActionState,
  formData: FormData,
): Promise<AdminActionState> {
  void prev;
  void formData;
  await requireAdmin();
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.rpc("admin_promote_next_quick");
  if (error) {
    return { error: mapAdminError(error.message) };
  }
  revalidatePath("/admin");
  return { error: "" };
}
