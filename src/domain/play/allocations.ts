export function evenSplit(count: number): number[] {
  if (count < 1) {
    return [];
  }
  const base = Math.floor(100 / count);
  const remainder = 100 - base * count;
  return Array.from({ length: count }, (_, index) => base + (index < remainder ? 1 : 0));
}

export function allocationsSum(values: readonly number[]): number {
  return values.reduce((total, value) => total + value, 0);
}

export function applyAllocation(
  current: readonly number[],
  index: number,
  next: number,
): number[] {
  const count = current.length;
  if (count === 0) {
    return [];
  }
  const clamped = Math.max(0, Math.min(100, Math.round(next)));
  if (count === 1) {
    return [100];
  }

  const result = current.map((value, i) => (i === index ? clamped : value));
  const rest = 100 - clamped;
  const others = current
    .map((value, i) => ({ value, i }))
    .filter((item) => item.i !== index);
  const otherSum = others.reduce((total, item) => total + item.value, 0);

  if (otherSum <= 0) {
    const share = Math.floor(rest / others.length);
    let leftover = rest - share * others.length;
    for (const item of others) {
      result[item.i] = share + (leftover > 0 ? 1 : 0);
      leftover -= leftover > 0 ? 1 : 0;
    }
    return result;
  }

  let allocated = 0;
  others.forEach((item, order) => {
    if (order === others.length - 1) {
      result[item.i] = rest - allocated;
      return;
    }
    const share = Math.round((rest * item.value) / otherSum);
    result[item.i] = share;
    allocated += share;
  });

  return result.map((value) => Math.max(0, value));
}

export function isValidSealDistribution(values: readonly number[]): boolean {
  return (
    values.length >= 2 &&
    values.length <= 4 &&
    values.every((value) => Number.isInteger(value) && value >= 0 && value <= 100) &&
    allocationsSum(values) === 100
  );
}
