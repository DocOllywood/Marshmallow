import { render, screen, cleanup } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { GapDisplay } from "@/components/daily/GapDisplay";
import { computeGap } from "@/domain/scoring/gap";

afterEach(() => cleanup());

describe("GapDisplay", () => {
  it("shows predicted vs Marshmallow player share and gap tier", () => {
    render(<GapDisplay gap={computeGap(68, 43)} />);

    expect(screen.getByText(/You predicted/i)).toBeTruthy();
    expect(screen.getByText("68%")).toBeTruthy();
    expect(screen.getAllByText(/Marshmallow players/i).length).toBeGreaterThan(0);
    expect(screen.getByText("43%")).toBeTruthy();
    expect(screen.getByText(/25 points/i)).toBeTruthy();
    expect(screen.getByText(/THE CROWD LEANED DIFFERENTLY/i)).toBeTruthy();
  });

  it("shows read-the-room tier for small gaps", () => {
    render(<GapDisplay gap={computeGap(51, 50)} />);
    expect(screen.getByText(/YOU READ THE ROOM/i)).toBeTruthy();
  });
});
