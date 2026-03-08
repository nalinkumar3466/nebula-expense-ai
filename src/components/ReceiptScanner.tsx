"use client";

import { useState } from "react";

import { normalizeCurrency } from "@/lib/currency";

type ScanStatus = "idle" | "scanning" | "success" | "error";

function extractFromOcrText(text: string): {
  amount: number | null;
  dateIso: string | null;
  merchant: string | null;
  currency: string;
} {
  const currency =
    text.includes("₹") || /inr/i.test(text)
      ? "INR"
      : text.includes("$") || /usd/i.test(text)
        ? "USD"
        : text.includes("€") || /eur/i.test(text)
          ? "EUR"
          : text.includes("£") || /gbp/i.test(text)
            ? "GBP"
            : "INR";

  const numberMatches = Array.from(
    text.matchAll(/(\d{1,3}(?:[.,]\d{3})*(?:[.,]\d{2})|\d+\.\d{2}|\d+)/g),
  ).map((m) => m[0]);

  let amount: number | null = null;
  if (numberMatches.length) {
    const numeric = numberMatches.map((raw) => {
      const cleaned = raw.replace(/,/g, "");
      return Number(cleaned);
    });
    const max = Math.max(...numeric.filter((n) => !Number.isNaN(n)));
    amount = Number.isFinite(max) ? max : null;
  }

  let dateIso: string | null = null;
  const datePatterns = [
    /(\d{4})[-/](\d{1,2})[-/](\d{1,2})/, // YYYY-MM-DD or YYYY/MM/DD
    /(\d{1,2})[-/](\d{1,2})[-/](\d{2,4})/, // DD/MM/YYYY or MM/DD/YYYY
  ];

  for (const pattern of datePatterns) {
    const match = text.match(pattern);
    if (match) {
      let year: number;
      let month: number;
      let day: number;
      if (pattern === datePatterns[0]) {
        year = Number(match[1]);
        month = Number(match[2]);
        day = Number(match[3]);
      } else {
        const a = Number(match[1]);
        const b = Number(match[2]);
        const c = Number(match[3]);
        if (c > 31) {
          day = a;
          month = b;
          year = c;
        } else {
          month = a;
          day = b;
          year = c < 100 ? 2000 + c : c;
        }
      }
      const jsDate = new Date(year, month - 1, day);
      if (!Number.isNaN(jsDate.getTime())) {
        dateIso = jsDate.toISOString().slice(0, 10);
        break;
      }
    }
  }

  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);

  let merchant: string | null = null;
  for (const line of lines) {
    if (/\d/.test(line)) continue;
    if (/total/i.test(line)) continue;
    merchant = line;
    break;
  }

  return {
    amount,
    dateIso,
    merchant,
    currency: normalizeCurrency(currency),
  };
}

export function ReceiptScanner() {
  const [file, setFile] = useState<File | null>(null);
  const [status, setStatus] = useState<ScanStatus>("idle");
  const [message, setMessage] = useState<string | null>(null);

  async function handleScan(e: React.FormEvent) {
    e.preventDefault();
    if (!file) return;

    setStatus("scanning");
    setMessage(null);

    try {
      const { createWorker } = await import("tesseract.js");
      const worker = await createWorker("eng");
      const ret = await worker.recognize(file);
      await worker.terminate();

      const { amount, dateIso, merchant, currency } = extractFromOcrText(
        ret.data.text ?? "",
      );

      if (!amount) {
        setStatus("error");
        setMessage(
          "I couldn't detect an amount on that receipt. Try a clearer photo or enter it manually.",
        );
        return;
      }

      const res = await fetch("/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount,
          date: dateIso ?? new Date().toISOString().slice(0, 10),
          merchant: merchant ?? null,
          description: merchant ? `Receipt from ${merchant}` : "Scanned receipt",
          paymentMethod: null,
          categoryId: null,
          currency,
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        setStatus("error");
        setMessage(data.error ?? "Failed to save expense from receipt.");
        return;
      }

      setStatus("success");
      setMessage(
        `Created an expense for ${normalizeCurrency(currency)} ${amount.toFixed(
          2,
        )} from the scanned receipt.`,
      );
      setFile(null);
      window.location.reload();
    } catch (err) {
      console.error(err);
      setStatus("error");
      setMessage("Something went wrong while scanning that receipt.");
    }
  }

  return (
    <div className="space-y-3 text-xs">
      <h2 className="text-sm font-medium text-zinc-100">Receipt scanning (OCR)</h2>
      <p className="text-[11px] text-zinc-500">
        Upload a receipt photo and I&apos;ll try to extract the amount, date, and
        merchant to create an expense automatically.
      </p>
      <form
        onSubmit={(e) => { e.preventDefault(); void handleScan(e); }}
        className="flex flex-col gap-3 rounded-md border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900/60"
      >
        <label htmlFor="receipt-file" className="block text-[11px] font-medium text-zinc-700 dark:text-zinc-300">Upload receipt image</label>
        <div className="relative rounded-md border border-dashed border-zinc-300 p-4 text-center hover:border-emerald-400 dark:border-zinc-700">
          <input
            id="receipt-file"
            type="file"
            accept="image/*"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
            className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
          />
          <div className="pointer-events-none select-none text-[11px] text-zinc-500 dark:text-zinc-400">
            {file ? <span className="text-zinc-700 dark:text-zinc-200">{file.name}</span> : "Click to choose an image or drop it here"}
          </div>
        </div>
        <div className="flex items-center justify-between gap-2">
          <button
            type="submit"
            disabled={!file || status === "scanning"}
            className="rounded-md bg-emerald-500 px-3 py-2 text-[11px] font-medium text-white hover:bg-emerald-400 disabled:opacity-60"
          >
            {status === "scanning" ? "Scanning..." : "Scan & add expense"}
          </button>
          {message && (
            <span
              className={`text-[11px] ${
                status === "error" ? "text-red-500" : "text-emerald-500"
              }`}
            >
              {message}
            </span>
          )}
        </div>
      </form>
    </div>
  );
}

