import { render, screen, cleanup } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { TodaysReadCard } from "@/components/daily/TodaysReadCard";

vi.mock("@/server/actions/analytics", () => ({
  trackEvent: vi.fn(async () => undefined),
}));

afterEach(() => cleanup());

describe("TodaysReadCard", () => {
  it("shows narrative copy instead of instrumentation counts", () => {
    render(
      <TodaysReadCard
        read={{
          headline: "You leaned toward honesty — until honesty became destructive.",
          bodyLines: ["You chose honesty in 3 of today's dilemmas."],
          lineCopy: "After a month",
          switchCopy: "You favored honesty until the consequence became permanent.",
          tomorrowTease: "LOYALTY vs. SELF-PRESERVATION",
          isLegacy: false,
        }}
        showHomeButton={false}
      />,
    );

    expect(screen.getByText(/Today's read/i)).toBeTruthy();
    expect(screen.getByText(/You leaned toward honesty/i)).toBeTruthy();
    expect(screen.getByText(/You chose honesty in 3/i)).toBeTruthy();
    expect(screen.getByText(/After a month/i)).toBeTruthy();
    expect(screen.getByText(/LOYALTY vs. SELF-PRESERVATION/i)).toBeTruthy();
    expect(screen.queryByText(/answers held/i)).toBeNull();
  });
});
