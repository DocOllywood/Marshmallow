import { describe, expect, it } from "vitest";

import {
  LAUNCH_MONEY_DAILY_PRINCIPLE_SLUG,
  LAUNCH_MONEY_DAILY_ROUND_ID,
  LAUNCH_MONEY_DAILY_STAGES,
  LAUNCH_MONEY_DAILY_TITLE,
} from "@/domain/content/launch-money-daily";
import {
  buildRehearsalRevealPayload,
  initialMoneyDay1RehearsalState,
  MONEY_DAY1_REHEARSAL_STORAGE_KEY,
} from "@/domain/dev/money-day-1-rehearsal-fixture";

describe("money day 1 rehearsal fixture", () => {
  it("uses canonical Day 1 editorial from launch-money-daily", () => {
    expect(LAUNCH_MONEY_DAILY_ROUND_ID).toBe("40000000-0000-4000-8000-000000000009");
    expect(LAUNCH_MONEY_DAILY_PRINCIPLE_SLUG).toBe("partnership-vs-independence");
    expect(LAUNCH_MONEY_DAILY_STAGES).toHaveLength(5);
    expect(LAUNCH_MONEY_DAILY_STAGES[0]?.stage).toBe("instinct");
    expect(LAUNCH_MONEY_DAILY_TITLE).toMatch(/dream job/i);
  });

  it("builds reveal payload with mixed crowd trajectory for visual rehearsal", () => {
    const state = {
      ...initialMoneyDay1RehearsalState(),
      choices: {
        1: LAUNCH_MONEY_DAILY_STAGES[0]!.choices[0]!.id,
        2: LAUNCH_MONEY_DAILY_STAGES[1]!.choices[0]!.id,
        3: LAUNCH_MONEY_DAILY_STAGES[2]!.choices[1]!.id,
        4: LAUNCH_MONEY_DAILY_STAGES[3]!.choices[0]!.id,
      },
      lineChoiceId: LAUNCH_MONEY_DAILY_STAGES[4]!.choices[2]!.id,
      flipPrediction: [55, 45] as [number, number],
    };

    const payload = buildRehearsalRevealPayload(state);
    expect(payload.roundId).toBe(LAUNCH_MONEY_DAILY_ROUND_ID);
    expect(payload.reveals).toHaveLength(5);
    expect(payload.crowdTrajectory?.points.length).toBeGreaterThan(0);
    expect(payload.priceCrowdHeldTrajectory?.points.length).toBe(4);

    const instinctCrowd = payload.reveals.find((row) => row.position === 1)?.crowdPct;
    const consequenceCrowd = payload.reveals.find((row) => row.position === 3)?.crowdPct;
    expect(instinctCrowd).not.toBe(consequenceCrowd);
  });

  it("uses session storage key for local-only rehearsal state", () => {
    expect(MONEY_DAY1_REHEARSAL_STORAGE_KEY).toBe("marshmallow-money-day-1-rehearsal");
    expect(initialMoneyDay1RehearsalState().phase).toBe("intro");
  });
});
