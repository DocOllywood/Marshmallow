import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";

export async function listAdminMarshmallows() {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("marshmallows")
    .select(
      "id, question, status, opens_at, closes_at, reveals_at, hard_reveals_at, minimum_result_sample, is_daily, play_mode, daily_on, topic_id, entity_label, spoiler_context, expires_at, topics(name, slug)",
    )
    .order("opens_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return data ?? [];
}

export async function getAdminMarshmallow(id: string) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("marshmallows")
    .select(
      "id, question, status, opens_at, closes_at, reveals_at, hard_reveals_at, minimum_result_sample, is_daily, play_mode, daily_on, topic_id, entity_label, spoiler_context, image_url, expires_at, marshmallow_choices(id, label, sort_order)",
    )
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }
  if (!data) {
    return null;
  }

  const editorial = await supabase
    .from("marshmallow_editorial")
    .select("archetype, freshness, checklist, content_set_id, set_position")
    .eq("marshmallow_id", id)
    .maybeSingle();

  return {
    ...data,
    editorial: editorial.data,
  };
}

export async function listContentSets() {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("content_sets")
    .select("id, name, notes, created_at")
    .order("created_at", { ascending: false });
  if (error) {
    throw new Error(error.message);
  }
  return data ?? [];
}

export async function getContentSet(id: string) {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("content_sets")
    .select("id, name, notes, created_at")
    .eq("id", id)
    .maybeSingle();
  if (error) {
    throw new Error(error.message);
  }
  if (!data) {
    return null;
  }
  const items = await supabase
    .from("marshmallow_editorial")
    .select(
      "set_position, marshmallow_id, archetype, marshmallows(id, question, status, play_mode, opens_at, closes_at, reveals_at)",
    )
    .eq("content_set_id", id)
    .order("set_position");
  if (items.error) {
    throw new Error(items.error.message);
  }
  return { ...data, items: items.data ?? [] };
}

export async function listContentTemplates() {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("content_templates")
    .select("id, name, question, play_mode, archetype, created_at")
    .order("created_at", { ascending: false });
  if (error) {
    throw new Error(error.message);
  }
  return data ?? [];
}

export async function getContentInventory() {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("get_content_inventory");
  if (error) {
    throw new Error(error.message);
  }
  return data;
}

export async function getContentCalendar() {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("get_content_calendar");
  if (error) {
    throw new Error(error.message);
  }
  return data;
}

export async function getEditorialComparisons() {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("get_editorial_comparisons");
  if (error) {
    throw new Error(error.message);
  }
  return data;
}

export async function listAdminTopics() {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("topics")
    .select("id, name, slug, kind, parent_id")
    .eq("active", true)
    .order("name");
  if (error) {
    throw new Error(error.message);
  }
  return data ?? [];
}

export async function getRevealReturnMetrics() {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("get_reveal_return_metrics");
  if (error) {
    throw new Error(error.message);
  }
  return data;
}

export async function getGrowthMetrics() {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("get_growth_metrics");
  if (error) {
    throw new Error(error.message);
  }
  return data;
}

export async function getBetaHealth() {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("get_beta_health");
  if (error) {
    throw new Error(error.message);
  }
  return data;
}

export async function getRevealReturnByMode() {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("get_reveal_return_metrics_by_mode");
  if (error) {
    throw new Error(error.message);
  }
  return data;
}

export async function getContentHealth() {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("get_content_health");
  if (error) {
    throw new Error(error.message);
  }
  return data;
}

export async function getBetaCohorts() {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("get_beta_cohorts");
  if (error) {
    throw new Error(error.message);
  }
  return data;
}

export async function getAccuracyCalibration() {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("get_accuracy_calibration");
  if (error) {
    throw new Error(error.message);
  }
  return data;
}

export async function getQuickTestSession() {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("get_quick_test_session");
  if (error) {
    throw new Error(error.message);
  }
  return data;
}

export async function getQuickSampleHealth() {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("get_quick_sample_health");
  if (error) {
    throw new Error(error.message);
  }
  return data;
}

export async function getModePayoffMetrics() {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("get_mode_payoff_metrics");
  if (error) {
    throw new Error(error.message);
  }
  return data;
}

export async function listBetaFeedback() {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("list_beta_feedback");
  if (error) {
    throw new Error(error.message);
  }
  return data;
}
