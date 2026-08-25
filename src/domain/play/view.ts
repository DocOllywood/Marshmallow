import type { Database } from "@/lib/supabase/types";

type Status = Database["public"]["Enums"]["marshmallow_status"];

export type PlayScreen =
  | "unavailable"
  | "scheduled"
  | "play"
  | "waiting"
  | "still_cooking"
  | "finishing"
  | "reveal_ready"
  | "revealed"
  | "missed"
  | "cancelled"
  | "revealed_spectator";

export type PlayViewInput = {
  status: Status;
  nowMs: number;
  opensAtMs: number;
  closesAtMs: number;
  revealsAtMs: number;
  hardRevealsAtMs?: number | null;
  sealed: boolean;
  hasDraft: boolean;
  openedReveal: boolean;
};

export function resolvePlayScreen(input: PlayViewInput): PlayScreen {
  if (input.status === "draft" || input.status === "archived") {
    return "unavailable";
  }
  if (input.status === "cancelled") {
    return "cancelled";
  }
  if (input.status === "scheduled" || input.nowMs < input.opensAtMs) {
    return "scheduled";
  }
  if (input.status === "revealed") {
    if (input.sealed && input.openedReveal) {
      return "revealed";
    }
    if (input.sealed) {
      return "reveal_ready";
    }
    return "revealed_spectator";
  }

  const pastClose =
    input.status === "closed" || input.nowMs >= input.closesAtMs;

  if (input.sealed) {
    if (pastClose && input.nowMs >= input.revealsAtMs) {
      const hard = input.hardRevealsAtMs ?? input.revealsAtMs;
      if (input.status === "closed" && input.nowMs < hard) {
        return "still_cooking";
      }
      return "finishing";
    }
    return "waiting";
  }

  if (pastClose) {
    return "missed";
  }

  return "play";
}
