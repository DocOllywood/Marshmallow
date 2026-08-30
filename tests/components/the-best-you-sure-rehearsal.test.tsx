import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

vi.mock("@/server/actions/analytics", () => ({
  trackEvent: vi.fn(async () => undefined),
}));

import { TheBestYouSureRehearsal } from "@/components/dev/TheBestYouSureRehearsal";
import { THE_BEST_YOU_SURE_REHEARSAL_STORAGE_KEY } from "@/domain/dev/the-best-you-sure-rehearsal-fixture";

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  window.sessionStorage.clear();
});

describe("TheBestYouSureRehearsal prototype B", () => {
  it("uses separate session storage and conversational intro", () => {
    render(<TheBestYouSureRehearsal />);
    expect(THE_BEST_YOU_SURE_REHEARSAL_STORAGE_KEY).toBe(
      "marshmallow-the-best-you-sure-rehearsal",
    );
    expect(screen.getByText(/you sure/i)).toBeTruthy();
    expect(screen.getByRole("button", { name: /^BEGIN$/i })).toBeTruthy();
  });

  it("shows Q1 conversational reaction after first answer", () => {
    render(<TheBestYouSureRehearsal />);
    fireEvent.click(screen.getByRole("button", { name: /^BEGIN$/i }));
    fireEvent.click(screen.getByRole("button", { name: /SAY YES/i }));
    expect(screen.getByText(/YOU SAID YES/i)).toBeTruthy();
    expect(screen.getByText("You sure?")).toBeTruthy();
  });

  it("dev route guards production", () => {
    const page = readFileSync(
      resolve(process.cwd(), "src/app/dev/the-best-you-sure/page.tsx"),
      "utf8",
    );
    expect(page).toContain("isDevEnvironment");
    expect(page).toContain("notFound");
  });

  it("has no supabase or analytics in component", () => {
    const src = readFileSync(
      resolve(process.cwd(), "src/components/dev/TheBestYouSureRehearsal.tsx"),
      "utf8",
    );
    expect(src).not.toMatch(/supabase|server\/actions|trackEvent/);
  });
});
