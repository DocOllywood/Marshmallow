import { render, screen, cleanup } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { TensionDisplay } from "@/components/daily/TensionDisplay";

afterEach(() => cleanup());

describe("TensionDisplay", () => {
  it("renders today's tension prominently", () => {
    render(
      <TensionDisplay
        tension={{
          id: "50000000-0000-4000-8000-000000000001",
          slug: "honesty-kindness",
          leftLabel: "HONESTY",
          rightLabel: "KINDNESS",
          displayLabel: "HONESTY vs. KINDNESS",
        }}
      />,
    );

    expect(screen.getByText(/Today's tension/i)).toBeTruthy();
    expect(screen.getByText("HONESTY")).toBeTruthy();
    expect(screen.getByText("KINDNESS")).toBeTruthy();
  });
});
