import { describe, expect, it } from "vitest";

import {
  EXPERIMENT_STAGE_ACCENT_VARS,
  experimentStageAccentVar,
} from "@/domain/daily/experiment-stage-accent";

function hexToRgb(hex: string): [number, number, number] {
  const normalized = hex.replace("#", "");
  return [
    parseInt(normalized.slice(0, 2), 16),
    parseInt(normalized.slice(2, 4), 16),
    parseInt(normalized.slice(4, 6), 16),
  ];
}

function relativeLuminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex).map((channel) => {
    const srgb = channel / 255;
    return srgb <= 0.03928 ? srgb / 12.92 : ((srgb + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * r! + 0.7152 * g! + 0.0722 * b!;
}

function contrastRatio(foreground: string, background: string): number {
  const l1 = relativeLuminance(foreground);
  const l2 = relativeLuminance(background);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

/** Part 13 lighter sage tokens (before → after documented in report). */
const MONEY_TOKENS = {
  money: "#4a7c66",
  moneyForeground: "#fffef9",
  moneyMuted: "#4a6359",
  canvas: "#f4ebe0",
  ink: "#1c1410",
  stage1: "#b8d4c6",
  stage5: "#4a7c66",
} as const;

const STAGE_HEX: Record<string, string> = {
  "1": "#b8d4c6",
  "2": "#8fbaa4",
  "3": "#6fa089",
  "4": "#588a72",
  "5": "#4a7c66",
};

describe("money visual system tokens", () => {
  it("keeps WCAG AA contrast for money button label on money fill", () => {
    expect(contrastRatio(MONEY_TOKENS.moneyForeground, MONEY_TOKENS.money)).toBeGreaterThanOrEqual(4.5);
  });

  it("keeps WCAG AA contrast for money muted text on cream canvas", () => {
    expect(contrastRatio(MONEY_TOKENS.moneyMuted, MONEY_TOKENS.canvas)).toBeGreaterThanOrEqual(4.5);
  });

  it("keeps WCAG AA contrast for money accent labels on cream canvas (large text)", () => {
    expect(contrastRatio(MONEY_TOKENS.money, MONEY_TOKENS.canvas)).toBeGreaterThanOrEqual(3);
  });

  it("maps progressive experiment stages lightest → deepest in one family", () => {
    expect(experimentStageAccentVar("instinct")).toBe("--money-stage-1");
    expect(experimentStageAccentVar("pressure")).toBe("--money-stage-2");
    expect(experimentStageAccentVar("consequence")).toBe("--money-stage-3");
    expect(experimentStageAccentVar("flip")).toBe("--money-stage-4");
    expect(experimentStageAccentVar("line")).toBe("--money-stage-5");

    const stageOrder = ["instinct", "pressure", "consequence", "flip", "line"] as const;
    const luminance = stageOrder.map((stage) => {
      const token = EXPERIMENT_STAGE_ACCENT_VARS[stage].replace("--money-stage-", "");
      return relativeLuminance(STAGE_HEX[token]!);
    });

    for (let i = 1; i < luminance.length; i++) {
      expect(luminance[i]!).toBeLessThan(luminance[i - 1]!);
    }
  });
});
