export const MARSHMALLOW_STATUSES = [
  "draft",
  "scheduled",
  "open",
  "closed",
  "cancelled",
  "revealed",
  "archived",
] as const;

export type MarshmallowStatus = (typeof MARSHMALLOW_STATUSES)[number];
