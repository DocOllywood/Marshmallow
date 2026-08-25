import { addMinutes } from "@/lib/datetime/local";
import type { PlayMode } from "@/domain/play/mode";
import {
  QUICK_CLOSE_MINUTES,
  QUICK_HARD_MINUTES,
  QUICK_REVEAL_MINUTES,
} from "@/domain/play/sample";

export type SchedulePreset = {
  opensAt: Date;
  closesAt: Date;
  revealsAt: Date;
  hardRevealsAt: Date;
};

export function schedulePreset(mode: PlayMode, now = new Date()): SchedulePreset {
  if (mode === "quick") {
    return {
      opensAt: now,
      closesAt: addMinutes(now, QUICK_CLOSE_MINUTES),
      revealsAt: addMinutes(now, QUICK_REVEAL_MINUTES),
      hardRevealsAt: addMinutes(now, QUICK_HARD_MINUTES),
    };
  }
  if (mode === "live") {
    return {
      opensAt: now,
      closesAt: addMinutes(now, 30),
      revealsAt: addMinutes(now, 45),
      hardRevealsAt: addMinutes(now, 45),
    };
  }
  return {
    opensAt: now,
    closesAt: addMinutes(now, 12 * 60),
    revealsAt: addMinutes(now, 18 * 60),
    hardRevealsAt: addMinutes(now, 18 * 60),
  };
}

export function dailyOnFromOpensAt(opensAtIso: string): string {
  return new Date(opensAtIso).toISOString().slice(0, 10);
}
