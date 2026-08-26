import { render, screen, cleanup } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { TodaysReadCard } from "@/components/daily/TodaysReadCard";

afterEach(() => cleanup());

describe("TodaysReadCard", () => {
  it("shows the immediate behavioral summary", () => {
    render(
      <TodaysReadCard
        read={{
          headline: "You held your ground when the circumstances changed.",
          lineCopy: "A month before you'd consider it a betrayal.",
          heldCount: 4,
          shiftedCount: 1,
        }}
        showHomeButton={false}
      />,
    );

    expect(screen.getByText(/Today's read/i)).toBeTruthy();
    expect(screen.getByText(/You held your ground when the circumstances changed/i)).toBeTruthy();
    expect(screen.getByText(/A month before you'd consider it a betrayal/i)).toBeTruthy();
    expect(screen.getByText(/4 answers held/i)).toBeTruthy();
    expect(screen.getByText(/1 answer shifted/i)).toBeTruthy();
    expect(screen.getByText(/Your calls are locked/i)).toBeTruthy();
    expect(screen.getByText(/Crowd results will reveal separately/i)).toBeTruthy();
  });
});
