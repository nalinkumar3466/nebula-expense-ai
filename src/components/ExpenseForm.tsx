"use client";

import { useState } from "react";

import type { Category } from "@/generated/client";

interface ExpenseFormProps {
  categories: Category[];
}

export function ExpenseForm({ categories }: ExpenseFormProps) {
  const [amount, setAmount] = useState("");
  const [categoryId, setCategoryId] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [description, setDescription] = useState("");
  const [merchant, setMerchant] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("");
  const [currency, setCurrency] = useState<"INR" | "USD" | "EUR" | "GBP">("INR");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: parseFloat(amount),
          categoryId: categoryId || null,
          date,
          description: description || null,
          merchant: merchant || null,
          paymentMethod: paymentMethod || null,
          currency,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Failed to save expense");
        return;
      }

      setAmount("");
      setDescription("");
      setMerchant("");
      setPaymentMethod("");
      setCurrency("INR");

      window.location.reload();
    } catch (err) {
      console.error(err);
      setError("Network error, please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-3">
      <h2 className="text-sm font-medium text-zinc-100">Quick add expense</h2>
      <form onSubmit={handleSubmit} className="grid gap-3 text-xs md:grid-cols-2">
        <div className="space-y-1 md:col-span-1">
          <label className="text-zinc-300" htmlFor="amount">
            Amount
          </label>
          <input
            id="amount"
            type="number"
            step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
            className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-xs text-zinc-50 outline-none focus:border-zinc-400"
          />
        </div>
        <div className="space-y-1 md:col-span-1">
          <label className="text-zinc-300" htmlFor="currency">
            Currency
          </label>
          <select
            id="currency"
            value={currency}
            onChange={(e) =>
              setCurrency(e.target.value as "INR" | "USD" | "EUR" | "GBP")
            }
            className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-xs text-zinc-50 outline-none focus:border-zinc-400"
          >
            <option value="INR">₹ INR</option>
            <option value="USD">$ USD</option>
            <option value="EUR">€ EUR</option>
            <option value="GBP">£ GBP</option>
          </select>
        </div>
        <div className="space-y-1 md:col-span-1">
          <label className="text-zinc-300" htmlFor="category">
            Category
          </label>
          <select
            id="category"
            value={categoryId}
            onChange={(e) => setCategoryId(e.target.value)}
            className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-xs text-zinc-50 outline-none focus:border-zinc-400"
          >
            <option value="">Uncategorized</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1 md:col-span-1">
          <label className="text-zinc-300" htmlFor="date">
            Date
          </label>
          <input
            id="date"
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
            className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-xs text-zinc-50 outline-none focus:border-zinc-400"
          />
        </div>
        <div className="space-y-1 md:col-span-1">
          <label className="text-zinc-300" htmlFor="merchant">
            Merchant
          </label>
          <input
            id="merchant"
            type="text"
            value={merchant}
            onChange={(e) => setMerchant(e.target.value)}
            className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-xs text-zinc-50 outline-none focus:border-zinc-400"
            placeholder="Optional"
          />
        </div>
        <div className="space-y-1 md:col-span-1">
          <label className="text-zinc-300" htmlFor="payment">
            Payment method
          </label>
          <input
            id="payment"
            type="text"
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value)}
            className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-xs text-zinc-50 outline-none focus:border-zinc-400"
            placeholder="UPI, card, cash..."
          />
        </div>
        <div className="space-y-1 md:col-span-1">
          <label className="text-zinc-300" htmlFor="description">
            Note
          </label>
          <input
            id="description"
            type="text"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-xs text-zinc-50 outline-none focus:border-zinc-400"
            placeholder="Optional description"
          />
        </div>
        {error && (
          <p className="md:col-span-2 text-[11px] text-red-400" role="alert">
            {error}
          </p>
        )}
        <div className="md:col-span-2 flex justify-end">
          <button
            type="submit"
            disabled={loading}
            className="rounded-md bg-blue-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-blue-400 disabled:opacity-60"
          >
            {loading ? "Saving..." : "Add expense"}
          </button>
        </div>
      </form>
      <p className="text-[11px] text-zinc-500">
        Tip: you can also say{" "}
        <span className="rounded-full bg-zinc-800 px-2 py-0.5 font-mono">
          I spent ₹250 on groceries yesterday
        </span>{" "}
        in the chatbot instead of filling this form.
      </p>
    </div>
  );
}

