import "server-only";

import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { TopicRow } from "@/domain/onboarding/topics";

export async function listActiveTopics(): Promise<TopicRow[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("topics")
    .select("id, kind, parent_id, name, slug, image_url, active, metadata, created_at, updated_at")
    .eq("active", true)
    .order("name");

  if (error) {
    throw new Error(error.message);
  }

  return data ?? [];
}

export async function listOwnTopicPrefIds(): Promise<string[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("user_topic_prefs")
    .select("topic_id");

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).map((row) => row.topic_id);
}
