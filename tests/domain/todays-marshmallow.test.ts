import { describe, expect, it } from "vitest";

import {
  TODAYS_MARSHMALLOW_FALLBACK,
  todaysMarshmallowInvitation,
} from "@/domain/daily/todays-marshmallow";

describe("todaysMarshmallowInvitation", () => {
  it("maps known editorial tensions", () => {
    expect(todaysMarshmallowInvitation("honesty-kindness")).toBe(
      "Say one kind thing today that you genuinely mean.",
    );
    expect(todaysMarshmallowInvitation("courtesy-convenience")).toBe(
      "Do one small considerate thing for someone you don't know today.",
    );
    expect(todaysMarshmallowInvitation("loyalty-justice")).toBe(
      "Notice one split today — money, effort, or credit — that wouldn't feel equal to everyone involved.",
    );
    expect(todaysMarshmallowInvitation("self-stranger")).toBe(
      "Make one stranger's day 1% easier.",
    );
  });

  it("falls back for legacy rounds and unknown slugs", () => {
    expect(todaysMarshmallowInvitation(null)).toBe(TODAYS_MARSHMALLOW_FALLBACK);
    expect(todaysMarshmallowInvitation(undefined)).toBe(TODAYS_MARSHMALLOW_FALLBACK);
    expect(todaysMarshmallowInvitation("not-a-real-tension")).toBe(TODAYS_MARSHMALLOW_FALLBACK);
  });
});
