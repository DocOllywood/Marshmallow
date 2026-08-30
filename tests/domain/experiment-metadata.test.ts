import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

import {
  EXPERIMENT_VERSION,
  parseDailyRoundExperimentMetadata,
  parseExperimentArchetype,
  isExperimentDailyRound,
} from "@/domain/daily/experiment";
import {
  parseExperimentPresentationMode,
  resolveExperimentPresentationMode,
} from "@/domain/host/presentation";

describe("experiment presentation metadata", () => {
  it("defaults missing presentation to standard", () => {
    expect(parseExperimentPresentationMode(null)).toBe("standard");
    expect(parseExperimentPresentationMode(undefined)).toBe("standard");
    expect(parseExperimentPresentationMode({})).toBe("standard");
    expect(parseExperimentPresentationMode({ experiment: { version: 1 } })).toBe("standard");
  });

  it('parses presentation "host" safely', () => {
    expect(
      parseExperimentPresentationMode({
        experiment: { version: 1, presentation: "host" },
      }),
    ).toBe("host");
    expect(
      resolveExperimentPresentationMode({
        experiment: { version: 1, presentation: "host" },
      }),
    ).toBe("host");
  });

  it("falls back invalid presentation strings to standard", () => {
    expect(
      parseExperimentPresentationMode({
        experiment: { version: 1, presentation: "legacy" },
      }),
    ).toBe("standard");
    expect(
      parseExperimentPresentationMode({
        experiment: { version: 1, presentation: "HOST" },
      }),
    ).toBe("standard");
    expect(
      parseExperimentPresentationMode({
        experiment: { version: 1, presentation: "" },
      }),
    ).toBe("standard");
  });

  it("falls back wrong-type presentation to standard", () => {
    expect(
      parseExperimentPresentationMode({
        experiment: { version: 1, presentation: 1 },
      }),
    ).toBe("standard");
    expect(
      parseExperimentPresentationMode({
        experiment: { version: 1, presentation: true },
      }),
    ).toBe("standard");
    expect(
      parseExperimentPresentationMode({
        experiment: { version: 1, presentation: ["host"] },
      }),
    ).toBe("standard");
  });

  it("keeps existing archetype parsing unchanged", () => {
    expect(parseExperimentArchetype({ experiment: { version: 1, archetype: "price" } })).toBe(
      "price",
    );
    expect(parseExperimentArchetype({ experiment: { version: 1, archetype: "host" } })).toBe(
      "default",
    );
    expect(parseExperimentArchetype({ experiment: { version: 1, archetype: "unknown" } })).toBe(
      "default",
    );
  });

  it("keeps existing experiment version parsing unchanged", () => {
    expect(isExperimentDailyRound({ experiment: { version: EXPERIMENT_VERSION } })).toBe(true);
    expect(isExperimentDailyRound({ experiment: { version: 2 } })).toBe(false);
    expect(isExperimentDailyRound({ experiment: { version: "1" } })).toBe(false);
  });

  it("includes presentation on parsed daily round metadata", () => {
    expect(parseDailyRoundExperimentMetadata({ experiment: { version: 1 } })).toEqual({
      version: 1,
      archetype: "default",
      priceReferenceSide: null,
      presentation: "standard",
    });
    expect(
      parseDailyRoundExperimentMetadata({
        experiment: { version: 1, archetype: "price", presentation: "host" },
      }),
    ).toEqual({
      version: 1,
      archetype: "price",
      priceReferenceSide: null,
      presentation: "host",
    });
  });
});

describe("production fixture presentation resolution", () => {
  const priceQaContinuousMetadata = {
    experiment: {
      version: 1,
      archetype: "price",
      price_reference_side: "left",
    },
  };

  const launchMoneyDay1Metadata = {
    experiment: {
      version: 1,
      archetype: "price",
      price_reference_side: "right",
    },
  };

  const defaultExperimentMetadata = {
    experiment: {
      version: 1,
      archetype: "default",
    },
  };

  it("resolves existing production-like round metadata to standard", () => {
    expect(resolveExperimentPresentationMode(priceQaContinuousMetadata)).toBe("standard");
    expect(resolveExperimentPresentationMode(launchMoneyDay1Metadata)).toBe("standard");
    expect(resolveExperimentPresentationMode(defaultExperimentMetadata)).toBe("standard");
    expect(resolveExperimentPresentationMode(null)).toBe("standard");
  });

  it("has no Host presentation consumer in production UI during Phase A", () => {
    const experimentPlaySrc = readSrc("src/components/experiment/ExperimentPlayExperience.tsx");
    const playExperienceSrc = readSrc("src/components/play/PlayExperience.tsx");

    expect(experimentPlaySrc).not.toContain("presentationMode");
    expect(playExperienceSrc).not.toContain("presentationMode");
  });
});

function readSrc(relativePath: string): string {
  return readFileSync(resolve(process.cwd(), relativePath), "utf8");
}
