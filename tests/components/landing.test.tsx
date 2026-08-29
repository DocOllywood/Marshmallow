import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

const getLandingPlayContext = vi.hoisted(() =>
  vi.fn(async () => ({
    ctaLabel: "START AN EXPERIMENT",
    hasPlayableDaily: false,
    hasContinuousInventory: true,
  })),
);

vi.mock("@/server/dal/continuous-experiment", () => ({
  getLandingPlayContext,
}));

vi.mock("@/components/auth/PlayMarshmallowButton", () => ({
  PlayMarshmallowButton: ({ label }: { label: string }) => (
    <a href="/home" className="bg-money text-money-foreground">
      {label}
    </a>
  ),
}));

import LandingPage from "@/app/(marketing)/page";

afterEach(() => cleanup());

describe("LandingPage", () => {
  it("uses START AN EXPERIMENT when Daily is not playable but continuous inventory exists", async () => {
    getLandingPlayContext.mockResolvedValueOnce({
      ctaLabel: "START AN EXPERIMENT",
      hasPlayableDaily: false,
      hasContinuousInventory: true,
    });

    render(await LandingPage());

    expect(screen.getByRole("link", { name: "START AN EXPERIMENT" })).toBeTruthy();
  });

  it("uses PLAY TODAY'S EXPERIMENT when Daily is playable", async () => {
    getLandingPlayContext.mockResolvedValueOnce({
      ctaLabel: "PLAY TODAY'S EXPERIMENT",
      hasPlayableDaily: true,
      hasContinuousInventory: false,
    });

    render(await LandingPage());

    expect(screen.getByRole("link", { name: "PLAY TODAY'S EXPERIMENT" })).toBeTruthy();
  });

  it("leads with money-era positioning", async () => {
    getLandingPlayContext.mockResolvedValueOnce({
      ctaLabel: "START AN EXPERIMENT",
      hasPlayableDaily: false,
      hasContinuousInventory: true,
    });

    render(await LandingPage());

    expect(screen.getAllByText("Marshmallow").length).toBeGreaterThan(0);
    expect(screen.getByRole("heading", { name: /What's your price/i })).toBeTruthy();
    expect(screen.getByText(/Money changes people/i)).toBeTruthy();
    expect(screen.getByRole("link", { name: "START AN EXPERIMENT" }).className).toMatch(/bg-money/);
  });
});
