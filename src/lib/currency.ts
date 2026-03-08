const SYMBOLS: Record<string, string> = {
  INR: "₹",
  USD: "$",
  EUR: "€",
  GBP: "£",
};

export function normalizeCurrency(code: string | null | undefined): string {
  if (!code) return "INR";
  const upper = code.toUpperCase();
  return SYMBOLS[upper] ? upper : "INR";
}

export function formatAmount(amount: number, currencyCode: string | null | undefined): string {
  const code = normalizeCurrency(currencyCode);
  const symbol = SYMBOLS[code] ?? "";
  const formatted = amount.toFixed(2);
  return symbol ? `${symbol}${formatted} ${code}` : `${formatted} ${code}`;
}

