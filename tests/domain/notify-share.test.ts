import { describe, expect, it } from "vitest";

import { parseGrowthMetrics } from "@/domain/analytics/growth";
import { REVEAL_READY_BODY, REVEAL_READY_TITLE, revealReadyHref } from "@/domain/notifications/copy";
import { shareCardCopy, shortenQuestion } from "@/domain/share/card";
import { parseServerEnv } from "@/lib/env/schema";
import { safeInternalPath } from "@/lib/http/safe-path";
import { classifyEmailSkip, EMAIL_SKIP_REASON } from "@/server/email/skip-reasons";

describe("share card copy", () => {
  it("uses binary crowd-call layout", () => {
    const copy = shareCardCopy({
      choiceCount: 2,
      predictedPct: 62,
      crowdPct: 61,
      accuracy: 99,
    });
    expect(copy.headline).toBe("☁️ I CALLED THE CROWD");
    expect(copy.lines).toEqual([
      "My prediction: 62%",
      "The crowd: 61%",
      "1 point off",
      "Accuracy 99",
    ]);
    expect(copy.brand).toBe("MARSHMALLOW");
  });

  it("uses compact multi-choice layout", () => {
    const copy = shareCardCopy({
      choiceCount: 3,
      predictedPct: 40,
      crowdPct: 38,
      accuracy: 96,
    });
    expect(copy.headline).toBe("☁️ ACCURACY 96");
    expect(copy.lines).toEqual(["I predicted the crowd."]);
    expect(copy.challenge).toContain("better");
  });

  it("shortens long questions", () => {
    expect(shortenQuestion("short")).toBe("short");
    expect(shortenQuestion("x".repeat(120)).endsWith("…")).toBe(true);
  });
});

describe("reveal-ready copy", () => {
  it("does not include the result", () => {
    expect(REVEAL_READY_TITLE).toContain("ready");
    expect(REVEAL_READY_BODY).toBe("See how close you were.");
    expect(REVEAL_READY_TITLE.toLowerCase()).not.toContain("accuracy");
    expect(revealReadyHref("abc")).toBe("/m/abc?from=notify");
  });
});

describe("growth metrics parse", () => {
  it("computes share rates from jsonb", () => {
    const parsed = parseGrowthMetrics({
      reveal_ready_created: 4,
      reveal_opens_after_notification: 2,
      median_notify_to_open_seconds: 120,
      share_visitors: 10,
      share_play_clicks: 4,
      share_signups: 1,
      share_play_rate: 0.4,
      share_signup_rate: 0.1,
    });
    expect(parsed.sharePlayRate).toBe(0.4);
    expect(parsed.revealReadyCreated).toBe(4);
  });
});

describe("safe internal paths", () => {
  it("rejects open redirects", () => {
    expect(safeInternalPath("//evil.test")).toBe("/home");
    expect(safeInternalPath("https://evil.test")).toBe("/home");
    expect(safeInternalPath("/m/abc")).toBe("/m/abc");
  });
});

describe("email env defaults", () => {
  it("does not enable sending without explicit config", () => {
    const env = parseServerEnv({ NODE_ENV: "test" });
    expect(env.EMAIL_SENDING_ENABLED).toBeUndefined();
    expect(env.RESEND_API_KEY).toBeUndefined();
  });

  it("keeps an explicit false flag off", () => {
    const env = parseServerEnv({
      NODE_ENV: "test",
      EMAIL_SENDING_ENABLED: "false",
      EMAIL_PROVIDER: "noop",
    });
    expect(env.EMAIL_SENDING_ENABLED).toBe(false);
  });
});

describe("email skip reasons", () => {
  it("distinguishes disabled send, opt-out, ineligible, and unconfigured provider", () => {
    expect(
      classifyEmailSkip({
        sendingEnabled: false,
        optedIn: true,
        hasRecipient: true,
        providerName: "noop",
      }),
    ).toBe(EMAIL_SKIP_REASON.sendingDisabled);
    expect(
      classifyEmailSkip({
        sendingEnabled: true,
        optedIn: false,
        hasRecipient: true,
        providerName: "resend",
      }),
    ).toBe(EMAIL_SKIP_REASON.userOptedOut);
    expect(
      classifyEmailSkip({
        sendingEnabled: true,
        optedIn: true,
        hasRecipient: false,
        providerName: "resend",
      }),
    ).toBe(EMAIL_SKIP_REASON.recipientIneligible);
    expect(
      classifyEmailSkip({
        sendingEnabled: true,
        optedIn: true,
        hasRecipient: true,
        providerName: "noop",
      }),
    ).toBe(EMAIL_SKIP_REASON.providerUnconfigured);
    expect(
      classifyEmailSkip({
        sendingEnabled: true,
        optedIn: true,
        hasRecipient: true,
        providerName: "resend",
      }),
    ).toBeNull();
  });
});
