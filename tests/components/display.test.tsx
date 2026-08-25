import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { MarshmallowMascot } from "@/components/MarshmallowMascot";
import { ScoreDisplay } from "@/components/ScoreDisplay";

describe("ScoreDisplay", () => {
  it("shows predicted crowd, actual crowd, and accuracy without Brier copy", () => {
    render(
      <ScoreDisplay accuracy={98} predictedPercent={64} crowdPercent={61} />,
    );

    expect(screen.getByText("You predicted 64%.")).toBeTruthy();
    expect(screen.getByText("The crowd landed at 61%.")).toBeTruthy();
    expect(screen.getByText("Only 3 points off")).toBeTruthy();
    expect(screen.getByText("98")).toBeTruthy();
    expect(screen.queryByText(/brier/i)).toBeNull();
  });
});

describe("MarshmallowMascot", () => {
  it("exposes visual state without business logic", () => {
    const { rerender, container } = render(<MarshmallowMascot state="cooking" />);
    expect(container.querySelector("[data-state]")?.getAttribute("data-state")).toBe("cooking");

    rerender(<MarshmallowMascot state="waiting" />);
    expect(container.querySelector("[data-state]")?.getAttribute("data-state")).toBe("cooking");

    rerender(<MarshmallowMascot state="thinking" />);
    expect(container.querySelector("[data-state]")?.getAttribute("data-state")).toBe("thinking");

    rerender(<MarshmallowMascot state="toasted" />);
    expect(container.querySelector("[data-state]")?.getAttribute("data-state")).toBe("toasted");
  });

  it("keeps one character across the lifecycle states", () => {
    const { rerender, container } = render(<MarshmallowMascot state="fluffy" size="sm" />);
    for (const state of ["fluffy", "thinking", "sealed", "cooking", "toasted", "celebrating"] as const) {
      rerender(<MarshmallowMascot state={state} size="md" />);
      const node = container.querySelector("[data-state]");
      expect(node?.getAttribute("data-state")).toBe(state);
      expect(node?.getAttribute("aria-label")?.toLowerCase()).toContain("marshmallow");
    }
  });
});
