/** ROUNDUP with float-safety so exact integers are not pushed into the next integer. */
export function roundUp(value: number): number {
  if (!Number.isFinite(value)) {
    throw new Error("Cannot round a non-finite value");
  }
  if (value <= 0) return 0;
  return Math.ceil(value - 1e-10);
}

export function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

export function round2(value: number): number {
  return Math.round(value * 100) / 100;
}

export function round4(value: number): number {
  return Math.round(value * 10000) / 10000;
}
