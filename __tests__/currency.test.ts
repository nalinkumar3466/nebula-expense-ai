import { formatAmount, normalizeCurrency } from "@/lib/currency";

describe("currency helpers", () => {
  test("normalizeCurrency falls back to INR", () => {
    expect(normalizeCurrency(null)).toBe("INR");
    expect(normalizeCurrency("inr")).toBe("INR");
    expect(normalizeCurrency("usd")).toBe("USD");
    expect(normalizeCurrency("unknown")).toBe("INR");
  });

  test("formatAmount uses symbol and code", () => {
    expect(formatAmount(123.45, "INR")).toBe("₹123.45 INR");
    expect(formatAmount(10, "USD")).toBe("$10.00 USD");
  });
});

