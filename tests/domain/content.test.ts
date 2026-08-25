import { describe, expect, it } from "vitest";

import { archetypeLabel, archetypePrompt } from "@/domain/content/archetype";
import { emptyChecklist, parseChecklist } from "@/domain/content/checklist";
import {
  isConsumerPlayableInventory,
  BETA_INVENTORY_PREFIX,
} from "@/domain/content/inventory";
import { isSafeImageUrl } from "@/domain/content/image";
import { LONG_QUESTION_WARNING, isLongChoice, isLongQuestion } from "@/domain/content/length";
import { inventoryWarnings, parseContentInventory } from "@/domain/content/ops";
import { isDiscoverable, isProminentLive, staggerQuickSet } from "@/domain/content/schedule";
import {
  formatWaitPresentation,
  formatShortCountdown,
  shouldShowShortCountdown,
} from "@/lib/format/duration";

describe("question archetypes", () => {
  it("keeps templates as prompts, not locked copy", () => {
    expect(archetypeLabel("who_won")).toBe("WHO WON?");
    expect(archetypePrompt("who_won")).toContain("side");
    expect(archetypePrompt("freeform")).toMatch(/opinion/i);
  });
});

describe("editorial checklist", () => {
  it("starts unchecked and only marks provided keys", () => {
    expect(emptyChecklist().curiosity).toBe(false);
    expect(parseChecklist({ instant: true, extra: true }).instant).toBe(true);
    expect(parseChecklist({ instant: true }).clean).toBe(false);
  });
});

describe("mobile length warnings", () => {
  it("warns after 100 characters without blocking 280", () => {
    expect(isLongQuestion("short")).toBe(false);
    expect(isLongQuestion("x".repeat(101))).toBe(true);
    expect(LONG_QUESTION_WARNING).toMatch(/wrap/i);
    expect(isLongChoice("Yes")).toBe(false);
    expect(isLongChoice("x".repeat(25))).toBe(true);
  });
});

describe("bulk stagger", () => {
  it("matches the rolling beta stream", () => {
    const base = new Date("2026-08-22T20:00:00.000Z");
    const slots = staggerQuickSet(base, 3);
    expect(slots).toHaveLength(3);
    expect(slots[0]?.opensAt.toISOString()).toBe("2026-08-22T20:00:00.000Z");
    expect(slots[0]?.closesAt.toISOString()).toBe("2026-08-22T20:03:00.000Z");
    expect(slots[0]?.revealsAt.toISOString()).toBe("2026-08-22T20:04:00.000Z");
    expect(slots[1]?.opensAt.toISOString()).toBe("2026-08-22T20:00:00.000Z");
    expect(slots[1]?.closesAt.toISOString()).toBe("2026-08-22T20:04:00.000Z");
    expect(slots[2]?.opensAt.toISOString()).toBe("2026-08-22T20:01:00.000Z");
    expect(slots[2]?.revealsAt.toISOString()).toBe("2026-08-22T20:06:00.000Z");
  });
});

describe("expiration and inventory warnings", () => {
  it("keeps sealed history after expire and hides unsealed discovery", () => {
    const now = Date.parse("2026-08-22T12:00:00.000Z");
    const expired = Date.parse("2026-08-22T11:00:00.000Z");
    expect(isDiscoverable({ nowMs: now, expiresAtMs: expired, sealed: false })).toBe(false);
    expect(isDiscoverable({ nowMs: now, expiresAtMs: expired, sealed: true })).toBe(true);
    expect(isDiscoverable({ nowMs: now, expiresAtMs: null, sealed: false })).toBe(true);
  });

  it("only treats Live as prominent when editorial context exists", () => {
    expect(isProminentLive({ entityLabel: null, spoilerContext: null })).toBe(false);
    expect(isProminentLive({ entityLabel: "Finale night", spoilerContext: null })).toBe(true);
    expect(isProminentLive({ entityLabel: null, spoilerContext: "Episode 12" })).toBe(true);
  });

  it("warns below Quick/Daily targets without blocking", () => {
    const inventory = parseContentInventory({
      today: { quick: 9, live: 0, daily: 1 },
      tomorrow: { quick: 3, live: 0, daily: 0 },
      warn_quick_below: 5,
    });
    const notes = inventoryWarnings(inventory);
    expect(notes.some((note) => note.includes("Tomorrow Quick"))).toBe(true);
    expect(notes.some((note) => note.includes("Tomorrow Daily"))).toBe(true);
  });
});

describe("image url safety", () => {
  it("allows blank or http(s) only", () => {
    expect(isSafeImageUrl("")).toBe(true);
    expect(isSafeImageUrl("https://cdn.example/show.jpg")).toBe(true);
    expect(isSafeImageUrl("javascript:alert(1)")).toBe(false);
  });
});

describe("consumer inventory", () => {
  it("allows curated beta ids for open discovery", () => {
    expect(
      isConsumerPlayableInventory({
        id: `${BETA_INVENTORY_PREFIX}000000000001`,
        question: "Would most people rather be loved or understood?",
      }),
    ).toBe(true);
  });

  it("blocks known QA copy from open discovery", () => {
    expect(
      isConsumerPlayableInventory({
        id: "10000000-0000-4000-8000-000000000099",
        question: "Which snack disappears first at the reunion?",
      }),
    ).toBe(false);
  });

  it("blocks non-beta inventory without sealed history path", () => {
    expect(
      isConsumerPlayableInventory({
        id: "40000000-0000-4000-8000-000000000001",
        question: "Random leftover question",
      }),
    ).toBe(false);
  });
});

describe("humanized wait copy", () => {
  it("uses approximate minutes for quick waits over 3 minutes", () => {
    const presentation = formatWaitPresentation({
      playMode: "quick",
      remainingMs: 4 * 60_000,
      revealsAt: new Date(Date.now() + 4 * 60_000).toISOString(),
    });
    expect(presentation.status).toBe("Cooking…");
    expect(presentation.detail).toMatch(/Results in about 4 min/);
    expect(presentation.countdown).toBeNull();
  });

  it("shows MM:SS only in the short final window", () => {
    expect(shouldShowShortCountdown(2 * 60_000)).toBe(true);
    expect(formatShortCountdown(125_000)).toBe("02:05");
    expect(shouldShowShortCountdown(4 * 60_000)).toBe(false);
  });

  it("uses localized reveal time for daily without hour countdowns", () => {
    const revealsAt = "2026-08-22T22:00:00.000Z";
    const presentation = formatWaitPresentation({
      playMode: "daily",
      remainingMs: 6 * 60 * 60_000,
      revealsAt,
    });
    expect(presentation.status).toMatch(/Come back/);
    expect(presentation.detail).toMatch(/Reveal at/);
    expect(presentation.countdown).toBeNull();
  });

  it("uses close timing for live waits", () => {
    const presentation = formatWaitPresentation({
      playMode: "live",
      remainingMs: 2 * 60 * 60_000,
      revealsAt: "2026-08-22T20:00:00.000Z",
      closesAt: "2026-08-22T18:00:00.000Z",
    });
    expect(presentation.status).toBe("Results after it closes");
    expect(presentation.detail.length).toBeGreaterThan(0);
    expect(presentation.countdown).toBeNull();
  });
});
