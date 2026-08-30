import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { HostContentLab } from "@/components/dev/HostContentLab";
import { DEPOSIT_CHOICE_IDS } from "@/domain/content/host-deposit-content";
import { FLIRTS_CHOICE_IDS } from "@/domain/content/host-flirts-content";
import { HOST_CONTENT_LAB_EXPERIMENTS } from "@/domain/dev/host-content-lab-catalog";
import { HOST_CONTENT_LAB_STORAGE_KEY } from "@/domain/dev/host-content-lab-state";
import { HOST_DEPOSIT_CONFIG } from "@/domain/content/host-deposit-content";
import { HOST_FLIRTS_CONFIG } from "@/domain/content/host-flirts-content";
import { hostSideAt } from "@/domain/dev/host-rehearsal-types";

const ROOT = process.cwd();

function readSrc(relativePath: string) {
  return readFileSync(resolve(ROOT, relativePath), "utf8");
}

afterEach(() => {
  cleanup();
  window.sessionStorage.clear();
});

describe("Host Content Lab route safety", () => {
  it("404s outside dev", () => {
    const page = readSrc("src/app/dev/host-content-lab/page.tsx");
    expect(page).toContain("isDevEnvironment");
    expect(page).toContain("notFound");
  });

  it("has no supabase server actions or analytics", () => {
    const lab = readSrc("src/components/dev/HostContentLab.tsx");
    const engine = readSrc("src/components/dev/HostRehearsalEngine.tsx");
    expect(lab).not.toMatch(/supabase|server\/actions|trackEvent/);
    expect(engine).not.toMatch(/supabase|server\/actions|trackEvent/);
  });
});

describe("Host Content Lab catalog", () => {
  it("lists all four experiments", () => {
    expect(HOST_CONTENT_LAB_EXPERIMENTS).toHaveLength(4);
    expect(HOST_CONTENT_LAB_EXPERIMENTS.map((e) => e.id)).toEqual([
      "the-best",
      "flirts",
      "deposit",
      "public-praise",
    ]);
  });

  it("uses separate session storage namespace", () => {
    expect(HOST_CONTENT_LAB_STORAGE_KEY).toBe("marshmallow-host-content-lab");
  });
});

describe("Host Content Lab selector UI", () => {
  it("renders selector with all experiments", () => {
    render(<HostContentLab />);
    expect(screen.getByText(/Host Content Lab/i)).toBeTruthy();
    expect(screen.getByText(/THE BEST/i)).toBeTruthy();
    expect(screen.getByText(/THE FRIEND'S PARTNER FLIRTS/i)).toBeTruthy();
    expect(screen.getByText(/THE DEPOSIT/i)).toBeTruthy();
    expect(screen.getByText(/THE PUBLIC PRAISE/i)).toBeTruthy();
  });
});

describe("semantic mappings", () => {
  it("maps flirts Q1 sides correctly", () => {
    expect(hostSideAt(HOST_FLIRTS_CONFIG.stages, { 1: FLIRTS_CHOICE_IDS.q1Stop }, 1)).toBe("left");
    expect(hostSideAt(HOST_FLIRTS_CONFIG.stages, { 1: FLIRTS_CHOICE_IDS.q1Keep }, 1)).toBe("right");
  });

  it("maps deposit Q1 sides correctly", () => {
    expect(hostSideAt(HOST_DEPOSIT_CONFIG.stages, { 1: DEPOSIT_CHOICE_IDS.q1Report }, 1)).toBe("left");
    expect(hostSideAt(HOST_DEPOSIT_CONFIG.stages, { 1: DEPOSIT_CHOICE_IDS.q1Wait }, 1)).toBe("right");
  });
});

describe("Host reactions and reads", () => {
  it("combines Q3 reaction with switch tease", () => {
    const reaction = HOST_FLIRTS_CONFIG.reactions.q3({
      1: FLIRTS_CHOICE_IDS.q1Keep,
      2: FLIRTS_CHOICE_IDS.q2Reply,
      3: FLIRTS_CHOICE_IDS.q3No,
    });
    expect(reaction.supportingLine).toContain("Now switch sides.");
  });

  it("shows deposit rent/silence reaction only on valid path", () => {
    const valid = HOST_DEPOSIT_CONFIG.reactions.q3({
      1: DEPOSIT_CHOICE_IDS.q1Wait,
      2: DEPOSIT_CHOICE_IDS.q2Wait,
      3: DEPOSIT_CHOICE_IDS.q3Keep,
    });
    expect(valid.headline).toBe("THE RENT DIDN'T MOVE YOU.");

    const invalid = HOST_DEPOSIT_CONFIG.reactions.q3({
      1: DEPOSIT_CHOICE_IDS.q1Report,
      2: DEPOSIT_CHOICE_IDS.q2Report,
      3: DEPOSIT_CHOICE_IDS.q3Keep,
    });
    expect(invalid.headline).not.toBe("THE RENT DIDN'T MOVE YOU.");
  });

  it("uses quiet fallback for new experiments not legacy locked copy", () => {
    const read = HOST_DEPOSIT_CONFIG.buildTodaysRead({
      choices: {},
      lineChoiceId: null,
    });
    expect(read.headline).toBe("THAT'S WHERE YOU LANDED.");
    expect(read.headline).not.toBe("YOUR CALLS ARE LOCKED IN.");
  });

  it("builds deposit inverse read", () => {
    const read = HOST_DEPOSIT_CONFIG.buildTodaysRead({
      choices: {
        1: DEPOSIT_CHOICE_IDS.q1Wait,
        2: DEPOSIT_CHOICE_IDS.q2Wait,
        3: DEPOSIT_CHOICE_IDS.q3Keep,
        4: DEPOSIT_CHOICE_IDS.q4No,
      },
      lineChoiceId: DEPOSIT_CHOICE_IDS.lineNever,
    });
    expect(read.headline).toBe("YOU'D KEEP THE $4,800.");
  });
});

describe("Host Content Lab play flow", () => {
  it("completes deposit path through Read the Room", () => {
    render(<HostContentLab />);
    fireEvent.click(screen.getByRole("button", { name: /THE DEPOSIT/i }));
    fireEvent.click(screen.getByRole("button", { name: /^BEGIN$/i }));
    fireEvent.click(screen.getByRole("button", { name: /WAIT AND SEE/i }));
    fireEvent.click(screen.getByRole("button", { name: /CONTINUE/i }));
    fireEvent.click(screen.getByRole("button", { name: /WAIT ONE MORE DAY/i }));
    fireEvent.click(screen.getByRole("button", { name: /CONTINUE/i }));
    fireEvent.click(screen.getByRole("button", { name: /KEEP IT/i }));
    fireEvent.click(screen.getByRole("button", { name: /CONTINUE/i }));
    fireEvent.click(screen.getByRole("button", { name: /^NO$/i }));
    fireEvent.click(screen.getByRole("button", { name: /READ THE ROOM/i }));
    expect(screen.getByText(/Read the room/i)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /LOCK IT/i }));
    fireEvent.click(screen.getByRole("button", { name: /IF IT NEVER GOT CLAIMED/i }));
    expect(screen.queryByText(/Outside the experiment/i)).toBeNull();
    expect(screen.queryByText(/crowd is still deciding/i)).toBeNull();
  });

  it("returns to selector after ANOTHER MARSHMALLOW", () => {
    render(<HostContentLab />);
    fireEvent.click(screen.getByRole("button", { name: /THE PUBLIC PRAISE/i }));
    fireEvent.click(screen.getByRole("button", { name: /^BEGIN$/i }));
    fireEvent.click(screen.getByRole("button", { name: /TAKE THE CREDIT/i }));
    fireEvent.click(screen.getByRole("button", { name: /CONTINUE/i }));
    fireEvent.click(screen.getByRole("button", { name: /NAME YOURSELF/i }));
    fireEvent.click(screen.getByRole("button", { name: /CONTINUE/i }));
    fireEvent.click(screen.getByRole("button", { name: /TAKE THE WIN/i }));
    fireEvent.click(screen.getByRole("button", { name: /CONTINUE/i }));
    fireEvent.click(screen.getByRole("button", { name: /^NO$/i }));
    fireEvent.click(screen.getByRole("button", { name: /READ THE ROOM/i }));
    fireEvent.click(screen.getByRole("button", { name: /LOCK IT/i }));
    fireEvent.click(screen.getByRole("button", { name: /NONE IN PUBLIC/i }));
    fireEvent.click(screen.getByRole("button", { name: /ANOTHER MARSHMALLOW/i }));
    fireEvent.click(screen.getByRole("button", { name: /ANOTHER MARSHMALLOW/i }));
    expect(screen.getByText(/Host Content Lab/i)).toBeTruthy();
  });
});

describe("prototype regression", () => {
  it("prototype C uses shared engine", () => {
    const src = readSrc("src/components/dev/TheBestHostRehearsal.tsx");
    expect(src).toContain("HostRehearsalEngine");
    expect(src).toContain("HOST_THE_BEST_CONFIG");
  });

  it("prototype A unchanged", () => {
    const src = readSrc("src/components/dev/TheBestRehearsal.tsx");
    expect(src).toContain("THE_BEST_REHEARSAL_STORAGE_KEY");
    expect(src).not.toContain("HostContentLab");
  });

  it("prototype B unchanged", () => {
    const src = readSrc("src/components/dev/TheBestYouSureRehearsal.tsx");
    expect(src).toContain("THE_BEST_YOU_SURE_REHEARSAL_STORAGE_KEY");
    expect(src).not.toContain("HostContentLab");
  });
});
