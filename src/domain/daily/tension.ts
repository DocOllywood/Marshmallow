export type HumanTension = {
  id: string;
  slug: string;
  leftLabel: string;
  rightLabel: string;
  displayLabel: string;
};

export type TensionSide = "left" | "right" | "neutral";

export function parseTensionSide(metadata: unknown): TensionSide | null {
  if (!metadata || typeof metadata !== "object") {
    return null;
  }
  const side = (metadata as { tension_side?: unknown }).tension_side;
  if (side === "left" || side === "right" || side === "neutral") {
    return side;
  }
  return null;
}

export function mapHumanTension(row: {
  id: string;
  slug: string;
  left_label: string;
  right_label: string;
  display_label: string;
}): HumanTension {
  return {
    id: row.id,
    slug: row.slug,
    leftLabel: row.left_label,
    rightLabel: row.right_label,
    displayLabel: row.display_label,
  };
}
