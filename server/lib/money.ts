export function formatMoney(cents: number, currency = 'EUR'): string {
  return new Intl.NumberFormat('en-IE', { style: 'currency', currency }).format(cents / 100);
}

export function percentOf(cents: number, rate: number): number {
  return Math.round(cents * rate);
}
