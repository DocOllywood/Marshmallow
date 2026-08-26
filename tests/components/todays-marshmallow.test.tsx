import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { TodaysMarshmallow } from "@/components/daily/TodaysMarshmallow";
import { TodaysReadCard } from "@/components/daily/TodaysReadCard";
import { TODAYS_MARSHMALLOW_FALLBACK } from "@/domain/daily/todays-marshmallow";

vi.mock("@/server/actions/analytics", () => ({
  trackEvent: vi.fn(async () => undefined),
}));

afterEach(() => cleanup());

const read = {
  headline: "You held your ground when the circumstances changed.",
  bodyLines: ["When the consequence became permanent, you shifted toward kindness."],
  lineCopy: "After a month",
  switchCopy: null,
  tomorrowTease: null,
  isLegacy: true,
};

describe("TodaysMarshmallow", () => {
  it("uses courtesy-convenience copy for the everyday-humanity round", () => {
    render(<TodaysMarshmallow tensionSlug="courtesy-convenience" />);
    expect(
      screen.getByText(/Do one small considerate thing for someone you don't know today/i),
    ).toBeTruthy();
  });

  it("uses tension-specific copy when mapped", () => {
    render(<TodaysMarshmallow tensionSlug="honesty-kindness" />);
    expect(screen.getByText(/Today's Marshmallow/i)).toBeTruthy();
    expect(screen.getByText(/Make someone's day 1% better/i)).toBeTruthy();
    expect(screen.getByText(/Say one kind thing today that you genuinely mean/i)).toBeTruthy();
    expect(screen.getByText(/No points\. No proof\. Nobody needs to know/i)).toBeTruthy();
    expect(screen.queryByRole("button")).toBeNull();
  });

  it("uses fallback copy for legacy or unknown tension", () => {
    render(<TodaysMarshmallow />);
    expect(screen.getByText(TODAYS_MARSHMALLOW_FALLBACK)).toBeTruthy();
  });
});

describe("TodaysReadCard with Today's Marshmallow", () => {
  it("renders Today's Marshmallow after Today's Read and before locked copy", () => {
    render(<TodaysReadCard read={read} showHomeButton={false} tensionSlug="honesty-kindness" />);

    const headline = screen.getByText(/You held your ground/i);
    const marshmallow = screen.getByText(/Today's Marshmallow/i);
    const locked = screen.getByText(/Your calls are locked/i);

    expect(
      headline.compareDocumentPosition(marshmallow) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
    expect(
      marshmallow.compareDocumentPosition(locked) & Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });

  it("does not require an action or submit control", () => {
    render(<TodaysReadCard read={read} showHomeButton={false} />);
    expect(screen.queryByRole("button")).toBeNull();
    expect(screen.queryByRole("checkbox")).toBeNull();
  });

  it("constrains width for narrow viewports", () => {
    render(<TodaysMarshmallow tensionSlug="honesty-kindness" />);
    const invitation = screen.getByText(/Say one kind thing today/i);
    expect(invitation.className).toMatch(/break-words/);
    expect(invitation.className).toMatch(/max-w-\[22rem\]|text-sm/);
    expect(invitation.closest(".max-w-\\[22rem\\]")).toBeTruthy();
  });
});
