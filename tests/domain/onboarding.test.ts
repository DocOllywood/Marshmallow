import { describe, expect, it } from "vitest";

import {
  childTopicsForParents,
  isTopLevelTopic,
  topicMatchesInterests,
  type TopicRow,
} from "@/domain/onboarding/topics";

function topic(partial: Partial<TopicRow> & Pick<TopicRow, "id" | "name" | "slug">): TopicRow {
  return {
    kind: "category",
    parent_id: null,
    image_url: null,
    active: true,
    metadata: {},
    created_at: "",
    updated_at: "",
    ...partial,
  };
}

describe("onboarding topic helpers", () => {
  const reality = topic({
    id: "1",
    name: "Reality TV",
    slug: "reality-tv",
  });
  const island = topic({
    id: "2",
    name: "Island Heat",
    slug: "island-heat",
    kind: "show",
    parent_id: "1",
  });

  it("treats parentless active topics as worlds", () => {
    expect(isTopLevelTopic(reality)).toBe(true);
    expect(isTopLevelTopic(island)).toBe(false);
  });

  it("returns children only for selected worlds", () => {
    expect(childTopicsForParents([reality, island], ["1"]).map((row) => row.id)).toEqual(["2"]);
    expect(childTopicsForParents([reality, island], [])).toEqual([]);
  });

  it("matches a marshmallow when its parent world is selected", () => {
    const interests = new Set(["1"]);
    expect(topicMatchesInterests("2", [reality, island], interests)).toBe(true);
    expect(topicMatchesInterests("2", [reality, island], new Set())).toBe(false);
  });
});
