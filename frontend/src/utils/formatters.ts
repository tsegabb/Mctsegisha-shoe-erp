export function formatNumber(val: number | string | undefined | null): string {
  if (val === undefined || val === null || val === '') return '0';
  const num = Number(val);
  if (isNaN(num)) return '0';
  return num.toLocaleString('en-US');
}

export function formatPrice(val: number | string | undefined | null, forceDecimals = false): string {
  if (val === undefined || val === null || val === '') return '0';
  const num = Number(val);
  if (isNaN(num)) return '0';
  if (forceDecimals) {
    return num.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }
  return num.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 });
}
