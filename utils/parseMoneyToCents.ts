export function parseMoneyToCents(money: string): number {
  const n = Number(money);
  if (!Number.isFinite(n)) {
    throw new Error(`Invalid money value: "${money}"`);
  }
  return Math.round(n * 100);
}

