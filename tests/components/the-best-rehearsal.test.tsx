import { readFileSync } from "node:fs";
import { resolve } from "node:path";

import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));

vi.mock("@/server/actions/analytics", () => ({
  trackEvent: vi.fn(async () => undefined),
}));

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: vi.fn(), refresh: vi.fn() }),
}));

import { TheBestRehearsal } from "@/components/dev/TheBestRehearsal";
import { THE_BEST_REHEARSAL_STORAGE_KEY } from "@/domain/dev/the-best-rehearsal-fixture";

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  window.sessionStorage.clear();
});

describe("TheBestRehearsal control A", () => {
  it("starts intro and persists session storage key", () => {
    render(<TheBestRehearsal />);
    expect(screen.getByText(/Rehearsal data · dev only/i)).toBeTruthy();
    expect(screen.getByRole("button", { name: /BEGIN EXPERIMENT/i })).toBeTruthy();
    expect(THE_BEST_REHEARSAL_STORAGE_KEY).toBe("marshmallow-the-best-rehearsal");
  });

  it("resets rehearsal without analytics", async () => {
    const { trackEvent } = await import("@/server/actions/analytics");
    render(<TheBestRehearsal />);
    fireEvent.click(screen.getByRole("button", { name: /BEGIN EXPERIMENT/i }));
    fireEvent.click(screen.getByRole("button", { name: /Reset rehearsal/i }));
    expect(screen.getByRole("button", { name: /BEGIN EXPERIMENT/i })).toBeTruthy();
    expect(trackEvent).not.toHaveBeenCalled();
  });

  it("dev route guards production with notFound", () => {
    const page = readFileSync(
      resolve(process.cwd(), "src/app/dev/the-best/page.tsx"),
      "utf8",
    );
    expect(page).toContain("isDevEnvironment");
    expect(page).toContain("notFound");
    expect(page).not.toMatch(/supabase|server\/actions\/play/);
  });

  it("rehearsal component has no supabase imports", () => {
    const src = readFileSync(
      resolve(process.cwd(), "src/components/dev/TheBestRehearsal.tsx"),
      "utf8",
    );
    expect(src).not.toMatch(/supabase|server\/actions/);
    expect(src).not.toMatch(/trackEvent/);
  });
});
