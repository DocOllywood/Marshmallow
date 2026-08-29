import { isMonetaryCostLabel } from "@/domain/daily/price";

export function ExperimentCostDisplay({
  costType,
  costLabel,
  prominent = false,
}: {
  costType: string | null;
  costLabel: string | null;
  prominent?: boolean;
}) {
  if (!costLabel?.trim()) {
    return null;
  }

  const monetary = isMonetaryCostLabel(costType, costLabel);
  const label = costLabel.trim();

  if (monetary) {
    return (
      <p
        className={
          prominent
            ? "font-display text-[clamp(2rem,10vw,2.75rem)] font-semibold leading-none tracking-tight text-money tabular-nums"
            : "font-display text-2xl font-semibold tabular-nums text-money"
        }
      >
        {label}
      </p>
    );
  }

  return (
    <p
      className={
        prominent
          ? "font-display text-[clamp(1.35rem,6vw,1.85rem)] font-semibold leading-snug tracking-tight text-money uppercase"
          : "font-display text-lg font-semibold uppercase tracking-tight text-money"
      }
    >
      {label}
    </p>
  );
}
