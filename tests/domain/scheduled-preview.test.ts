import { describe, expect, it } from "vitest";

import { LAUNCH_MONEY_DAILY_BETA_OPENS_AT } from "@/domain/content/launch-money-daily";
import {
  formatScheduledExperimentOpen,
  scheduledExperimentHeadline,
} from "@/domain/daily/scheduled-preview";

describe("scheduled experiment preview", () => {
  it("formats open time in Eastern without hardcoded calendar copy", () => {
    const formatted = formatScheduledExperimentOpen(LAUNCH_MONEY_DAILY_BETA_OPENS_AT);

    expect(formatted.weekdayLine).toMatch(/^A new experiment opens \w+\.$/);
    expect(formatted.weekdayLine.toLowerCase()).toContain("wednesday");
    expect(formatted.dateTimeLine).toMatch(/SEP 2 · 8:00 AM ET/);
  });

  it("uses price-era headline without scenario leakage", () => {
    expect(scheduledExperimentHeadline("price")).toBe("What's your price?");
    expect(scheduledExperimentHeadline("default")).toBe("The daily experiment");
  });
});
