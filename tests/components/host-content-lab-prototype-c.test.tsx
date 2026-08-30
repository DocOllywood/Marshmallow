import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

import { TheBestHostRehearsal } from "@/components/dev/TheBestHostRehearsal";
import { THE_BEST_CHOICE_IDS } from "@/domain/content/the-best-experiment";

afterEach(() => {
  cleanup();
  window.sessionStorage.clear();
});

describe("Prototype C regression via shared engine", () => {
  it("still runs the-best host intro and Q1 reaction", () => {
    render(<TheBestHostRehearsal />);
    expect(screen.getByText(/the host/i)).toBeTruthy();
    fireEvent.click(screen.getByRole("button", { name: /^BEGIN$/i }));
    fireEvent.click(screen.getByRole("button", { name: /SAY YES/i }));
    expect(screen.getByText(/YOU SAID YES/i)).toBeTruthy();
  });

  it("still uses separate storage from content lab", () => {
    const src = readFileSync(
      resolve(process.cwd(), "src/domain/dev/the-best-host-rehearsal-fixture.ts"),
      "utf8",
    );
    expect(src).toContain("marshmallow-the-best-host-rehearsal");
    expect(src).not.toContain("marshmallow-host-content-lab");
  });

  it("preserves the-best today's read behavior", async () => {
    const { buildHostTodaysRead } = await import("@/domain/dev/the-best-host-rehearsal-fixture");
    const read = buildHostTodaysRead({
      phase: "todays-read",
      choices: {
        1: THE_BEST_CHOICE_IDS.q1Yes,
        2: THE_BEST_CHOICE_IDS.q2StillYes,
        3: THE_BEST_CHOICE_IDS.q3Refuse,
        4: THE_BEST_CHOICE_IDS.q4Yes,
      },
      flipPrediction: [50, 50],
      lineChoiceId: THE_BEST_CHOICE_IDS.lineWho,
    });
    expect(read.headline).toBe("YOU WOULDN'T GIVE THE NAME.");
  });
});
