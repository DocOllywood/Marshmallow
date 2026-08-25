import type { Database } from "@/lib/supabase/types";

export type TopicRow = Database["public"]["Tables"]["topics"]["Row"];

export function isTopLevelTopic(topic: Pick<TopicRow, "parent_id" | "active">) {
  return topic.parent_id == null && topic.active;
}

export function childTopicsForParents(
  topics: readonly TopicRow[],
  parentIds: readonly string[],
): TopicRow[] {
  const parents = new Set(parentIds);
  return topics.filter(
    (topic) => topic.active && topic.parent_id != null && parents.has(topic.parent_id),
  );
}

export function topicMatchesInterests(
  topicId: string | null,
  topics: readonly TopicRow[],
  interestIds: ReadonlySet<string>,
): boolean {
  if (interestIds.size === 0) {
    return false;
  }
  if (!topicId) {
    return true;
  }
  if (interestIds.has(topicId)) {
    return true;
  }
  const topic = topics.find((item) => item.id === topicId);
  return Boolean(topic?.parent_id && interestIds.has(topic.parent_id));
}
