import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";

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
  it("leads with money-era positioning", () => {
    render(<LandingPage />);

    expect(screen.getAllByText("Marshmallow").length).toBeGreaterThan(0);
    expect(screen.getByRole("heading", { name: /What's your price/i })).toBeTruthy();
    expect(screen.getByText(/Money changes people/i)).toBeTruthy();
    expect(screen.getByText(/Find out where it changes you/i)).toBeTruthy();
    expect(screen.getByText(/One uncomfortable money experiment every day/i)).toBeTruthy();
    expect(screen.getByRole("link", { name: "PLAY TODAY'S EXPERIMENT" })).toBeTruthy();
    expect(screen.getByRole("link", { name: "PLAY TODAY'S EXPERIMENT" }).className).toMatch(/bg-money/);
    expect(screen.getAllByLabelText(/Fluffy marshmallow/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/One situation/i)).toBeTruthy();
    expect(screen.getByText(/The price changes/i)).toBeTruthy();
    expect(screen.getByText(/\$1,000/)).toBeTruthy();
    expect(screen.getByText(/Money is only the beginning/i)).toBeTruthy();
  });
});
