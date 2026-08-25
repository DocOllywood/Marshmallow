import type { TopicRow } from "@/domain/onboarding/topics";
import {
  CROWDSENSE_WORLD_SLUGS,
  type CrowdsenseWorldSlug,
} from "@/domain/crowdsense/rating";

export function worldSlugForTopic(
  topicId: string | null,
  topics: readonly TopicRow[],
): CrowdsenseWorldSlug | null {
  if (!topicId) {
    return null;
  }
  const byId = new Map(topics.map((topic) => [topic.id, topic]));
  let current = byId.get(topicId) ?? null;
  const seen = new Set<string>();
  while (current) {
    if (seen.has(current.id)) {
      return null;
    }
    seen.add(current.id);
    if (current.parent_id == null) {
      return (CROWDSENSE_WORLD_SLUGS as readonly string[]).includes(current.slug)
        ? (current.slug as CrowdsenseWorldSlug)
        : null;
    }
    current = byId.get(current.parent_id) ?? null;
  }
  return null;
}
