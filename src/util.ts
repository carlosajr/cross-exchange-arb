export const now = () => Date.now();

export const bpToPct = (bp: number) => bp / 10000;

export function pct(n: number) {
  return (n * 100).toFixed(4) + '%';
}

export function roundDownToStep(x: number, step: number) {
  if (step <= 0) return x;
  return Math.floor(x / step) * step;
}

export function roundToPrecision(x: number, precision: number) {
  const p = Math.pow(10, precision);
  return Math.round(x * p) / p;
}
