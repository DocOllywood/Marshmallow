import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { OnboardingFlow } from "@/components/onboarding/OnboardingFlow";
import { BETA_ONBOARDING_DEFAULT_TOPIC_ID } from "@/domain/onboarding/beta";

const trackEvent = vi.fn(async () => undefined);

vi.mock("@/server/actions/analytics", () => ({
  trackEvent: () => trackEvent(),
}));

vi.mock("@/server/actions/onboarding", () => ({
  completeOnboardingAction: vi.fn(),
}));

afterEach(() => {
  cleanup();
  trackEvent.mockClear();
});

describe("OnboardingFlow", () => {
  it("tracks start from welcome and skips the world-preference step in Beta 1", async () => {
    render(<OnboardingFlow username="tester" displayName="Tester" />);
    expect(trackEvent).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: /^Continue$/i }));
    expect(trackEvent).toHaveBeenCalledTimes(1);
    expect(screen.getByText("How Marshmallow works")).toBeTruthy();
    expect(screen.queryByText("Pick what fascinates you.")).toBeNull();
  });

  it("shows three onboarding progress steps", () => {
    render(<OnboardingFlow username="tester" displayName="Tester" />);
    const dots = document.querySelector('[aria-hidden="true"]')?.querySelectorAll("span");
    expect(dots?.length).toBe(3);
  });

  it("submits the silent Beta default world on finish", async () => {
    render(<OnboardingFlow username="tester" displayName="Tester" />);
    fireEvent.click(screen.getByRole("button", { name: /^Continue$/i }));
    fireEvent.click(screen.getByRole("button", { name: /^Got it$/i }));

    const hidden = screen.getByDisplayValue(BETA_ONBOARDING_DEFAULT_TOPIC_ID);
    expect(hidden).toBeTruthy();
    expect(screen.getByRole("button", { name: /PLAY MY FIRST MARSHMALLOW/i })).toBeTruthy();
  });
});
