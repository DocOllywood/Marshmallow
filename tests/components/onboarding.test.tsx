import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

import { OnboardingFlow } from "@/components/onboarding/OnboardingFlow";
import type { TopicRow } from "@/domain/onboarding/topics";

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

const worlds: TopicRow[] = [
  {
    id: "world-1",
    name: "Reality TV",
    slug: "reality-tv",
    kind: "category",
    parent_id: null,
    image_url: null,
    active: true,
    metadata: {},
    created_at: "",
    updated_at: "",
  },
];

describe("OnboardingFlow analytics", () => {
  it("does not track during render; tracks start and world pick from clicks", async () => {
    render(
      <OnboardingFlow
        topics={worlds}
        username="tester"
        displayName="Tester"
        initialTopicIds={[]}
      />,
    );
    expect(trackEvent).not.toHaveBeenCalled();

    fireEvent.click(screen.getByRole("button", { name: /let's play/i }));
    expect(trackEvent).toHaveBeenCalledTimes(1);

    fireEvent.click(await screen.findByRole("button", { name: "Reality TV" }));
    expect(trackEvent).toHaveBeenCalledTimes(2);

    fireEvent.click(screen.getByRole("button", { name: "Reality TV" }));
    expect(trackEvent).toHaveBeenCalledTimes(2);
  });
});
