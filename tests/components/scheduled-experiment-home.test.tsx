import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import { ScheduledExperimentHomeSection } from "@/components/home/ScheduledExperimentHomeSection";
import { LAUNCH_MONEY_DAILY_BETA_OPENS_AT, LAUNCH_MONEY_DAILY_ROUND_ID } from "@/domain/content/launch-money-daily";

afterEach(() => cleanup());

describe("ScheduledExperimentHomeSection", () => {
  it("shows anticipation copy without editorial leakage", () => {
    render(
      <ScheduledExperimentHomeSection
        preview={{
          roundId: LAUNCH_MONEY_DAILY_ROUND_ID,
          opensAt: LAUNCH_MONEY_DAILY_BETA_OPENS_AT,
          archetype: "price",
        }}
      />,
    );

    expect(screen.getByText(/The next experiment/i)).toBeTruthy();
    expect(screen.getByText(/What's your price/i)).toBeTruthy();
    expect(screen.getByText(/A new experiment opens/i)).toBeTruthy();
    expect(screen.getByText(/SEP 2 · 8:00 AM ET/i)).toBeTruthy();
    expect(screen.getByText(/Come back then/i)).toBeTruthy();
    expect(screen.queryByText(/dream job/i)).toBeNull();
    expect(screen.queryByText(/BELONGING/i)).toBeNull();
    expect(screen.queryByText(/move with them/i)).toBeNull();
  });
});
