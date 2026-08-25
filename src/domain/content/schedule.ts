import { addMinutes } from "@/lib/datetime/local";

export type StaggeredSlot = {
  opensAt: Date;
  closesAt: Date;
  revealsAt: Date;
  hardRevealsAt: Date;
};

export function staggerQuickSet(baseOpen: Date, count: number): StaggeredSlot[] {
  const safe = Math.max(0, Math.floor(count));
  return Array.from({ length: safe }, (_, index) => {
    const opensAt = addMinutes(baseOpen, Math.max(0, index - 1));
    const closesAt = addMinutes(baseOpen, 3 + index);
    const revealsAt = addMinutes(baseOpen, 4 + index);
    return {
      opensAt,
      closesAt,
      revealsAt,
      hardRevealsAt: addMinutes(revealsAt, 6),
    };
  });
}

export function isDiscoverable(input: {
  nowMs: number;
  expiresAtMs: number | null;
  sealed: boolean;
}): boolean {
  if (input.expiresAtMs == null) return true;
  if (input.nowMs < input.expiresAtMs) return true;
  return input.sealed;
}

/** Live should only feel Live when editorial context marks it as timely. */
export function isProminentLive(card: {
  entityLabel: string | null;
  spoilerContext: string | null;
}): boolean {
  return Boolean(card.entityLabel?.trim() || card.spoilerContext?.trim());
}

export const INVENTORY_QUICK_WARN = 5;
