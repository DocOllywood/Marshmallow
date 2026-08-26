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
          headline: "You chose honesty — until the cost changed your call.",
          bodyLines: [
            "As today's dilemmas became more complicated, you still preferred honesty over kindness.",
            "When the consequence became permanent, you shifted toward kindness.",
          ],
          lineCopy: "After a month",
          switchCopy: null,
          tomorrowTease: "LOYALTY vs. SELF-PRESERVATION",
          isLegacy: false,
        }}
        showHomeButton={false}
      />,
    );

    expect(screen.getByText(/Today's read/i)).toBeTruthy();
    expect(screen.getByText(/You chose honesty/i)).toBeTruthy();
    expect(screen.getByText(/As today's dilemmas became more complicated/i)).toBeTruthy();
    expect(screen.getByText(/After a month/i)).toBeTruthy();
    expect(screen.getByText(/Your calls are locked/i)).toBeTruthy();
    expect(screen.getByText(/The crowd is still deciding/i)).toBeTruthy();
    expect(screen.getByText(/Come back tonight/i)).toBeTruthy();
    expect(screen.getByText(/LOYALTY vs. SELF-PRESERVATION/i)).toBeTruthy();
    expect(screen.queryByText(/answers held/i)).toBeNull();
  });
});
