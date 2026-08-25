/** Curated beta consumer inventory prefix (see supabase beta content migrations). */
export const BETA_INVENTORY_PREFIX = "30000000-0000-4000-8000-";

const QA_DISCOVERY_BLOCK_PATTERNS = [
  /snack disappears first at the reunion/i,
  /Who does America think won the argument/i,
] as const;

const LEGACY_SEED_PREFIX = "10000000-0000-4000-8000-";

/** Open discovery (Quick/Live) — only intentional beta inventory. */
export function isConsumerPlayableInventory(card: { id: string; question: string }): boolean {
  if (card.id.startsWith(BETA_INVENTORY_PREFIX)) {
    return true;
  }
  if (card.id.startsWith(LEGACY_SEED_PREFIX)) {
    return false;
  }
  if (QA_DISCOVERY_BLOCK_PATTERNS.some((pattern) => pattern.test(card.question))) {
    return false;
  }
  return false;
}
