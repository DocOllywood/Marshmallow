import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { describe, expect, it } from "vitest";

import { THE_BEST_CHOICE_IDS } from "@/domain/content/the-best-experiment";
import {
  buildHostTodaysRead,
  hostQ3Reaction,
  hostQ4Reaction,
  initialTheBestHostRehearsalState,
  THE_BEST_HOST_REHEARSAL_STORAGE_KEY,
} from "@/domain/dev/the-best-host-rehearsal-fixture";

const ROOT = process.cwd();

function readSrc(relativePath: string) {
  return readFileSync(resolve(ROOT, relativePath), "utf8");
}

describe("prototype A unchanged", () => {
  it("keeps control rehearsal source intact", () => {
    const src = readSrc("src/components/dev/TheBestRehearsal.tsx");
    expect(src).toContain("THE_BEST_REHEARSAL_STORAGE_KEY");
    expect(src).toContain("ExperimentStageHeader");
    expect(src).not.toContain("the-best-host");
  });
});

describe("prototype B unchanged", () => {
  it("keeps you sure rehearsal source intact", () => {
    const src = readSrc("src/components/dev/TheBestYouSureRehearsal.tsx");
    expect(src).toContain("THE_BEST_YOU_SURE_REHEARSAL_STORAGE_KEY");
    expect(src).toContain("switch-sides");
    expect(src).not.toContain("the-best-host");
  });
});

describe("the-best host fixture", () => {
  it("uses separate session storage", () => {
    expect(THE_BEST_HOST_REHEARSAL_STORAGE_KEY).toBe("marshmallow-the-best-host-rehearsal");
    expect(initialTheBestHostRehearsalState().phase).toBe("intro");
  });

  it("combines Q3 reaction and switch tease on one interstitial", () => {
    const reaction = hostQ3Reaction({
      1: THE_BEST_CHOICE_IDS.q1Yes,
      2: THE_BEST_CHOICE_IDS.q2StillYes,
      3: THE_BEST_CHOICE_IDS.q3Refuse,
    });
    expect(reaction.headline).toBe("STILL NO.");
    expect(reaction.supportingLine).toContain("Now switch sides.");
  });

  it("has no dedicated switch-sides phase in host types", () => {
    const fixture = readSrc("src/domain/dev/the-best-host-rehearsal-fixture.ts");
    expect(fixture).not.toContain('"switch-sides"');
  });

  it("preserves shared semantic today's read", () => {
    const read = buildHostTodaysRead({
      phase: "todays-read",
      choices: {
        1: THE_BEST_CHOICE_IDS.q1Yes,
        2: THE_BEST_CHOICE_IDS.q2StillYes,
        3: THE_BEST_CHOICE_IDS.q3Refuse,
        4: THE_BEST_CHOICE_IDS.q4Yes,
      },
      flipPrediction: [62, 38],
      lineChoiceId: THE_BEST_CHOICE_IDS.lineWho,
    });
    expect(read.headline).toBe("YOU WOULDN'T GIVE THE NAME.");
    expect(read.bodyLines[0]).toBe("YOU'D ASK FOR IT.");
    expect(read.lineCopy).toBe("TELL ME WHO IT WAS");
  });

  it("uses Q4 inverse reaction for read-the-room handoff", () => {
    const reaction = hostQ4Reaction({
      1: THE_BEST_CHOICE_IDS.q1Yes,
      2: THE_BEST_CHOICE_IDS.q2StillYes,
      3: THE_BEST_CHOICE_IDS.q3Refuse,
      4: THE_BEST_CHOICE_IDS.q4Yes,
    });
    expect(reaction.headline).toBe("DIFFERENT FROM THIS SIDE.");
  });
});

describe("the-best host production safety", () => {
  it("404s outside dev", () => {
    const page = readSrc("src/app/dev/the-best-host/page.tsx");
    expect(page).toContain("isDevEnvironment");
    expect(page).toContain("notFound");
  });

  it("has no supabase or server actions in component", () => {
    const src = readSrc("src/components/dev/TheBestHostRehearsal.tsx");
    expect(src).not.toMatch(/supabase|server\/actions|trackEvent/);
    expect(src).not.toMatch(/ExperimentTodaysReadCard/);
  });

  it("omits outside and daily wait copy from host ending", () => {
    const src = readSrc("src/components/dev/TheBestHostRehearsal.tsx");
    expect(src).not.toMatch(/Outside the experiment|crowd is still deciding|Come back for the reveal|Your calls are locked/i);
    expect(src).not.toContain("THE_BEST_OUTSIDE_COPY");
  });

  it("uses sage money tokens via shared host engine", () => {
    const wrapper = readSrc("src/components/dev/TheBestHostRehearsal.tsx");
    const engine = readSrc("src/components/dev/HostRehearsalEngine.tsx");
    expect(wrapper).toContain("HostRehearsalEngine");
    expect(engine).toContain("MoneyPrimaryButton");
    expect(engine).toContain("text-money");
    expect(engine).not.toMatch(/from "@\/components\/PrimaryButton"/);
  });
});
