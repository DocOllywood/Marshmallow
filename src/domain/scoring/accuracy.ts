/**
 * Official accuracy from multinomial Brier, displayed 0–100.
 * Consumer UI must never mention Brier.
 *
 * predicted and actual are length-k vectors that sum to 1.
 * BS = Σ (pᵢ − aᵢ)² ∈ [0, 2]
 * accuracy = round(100 × (1 − BS / 2))
 */
export function brierAccuracy(
  predicted: readonly number[],
  actual: readonly number[],
): number {
  if (predicted.length === 0 || predicted.length !== actual.length) {
    throw new Error("predicted and actual must be the same non-empty length");
  }

  let brier = 0;
  for (let i = 0; i < predicted.length; i += 1) {
    const p = predicted[i];
    const a = actual[i];
    if (p === undefined || a === undefined) {
      throw new Error("predicted and actual must be dense");
    }
    const delta = p - a;
    brier += delta * delta;
  }

  return Math.round(100 * (1 - brier / 2));
}
