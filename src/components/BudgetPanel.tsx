"use client";

import { useState } from "react";

import type { Budget, Category } from "@/generated/client";

interface BudgetPanelProps {
  categories: Category[];
  budgets: (Budget & { category: Category | null })[];
}

export function BudgetPanel({ categories, budgets }: BudgetPanelProps) {
  const [categoryId, setCategoryId] = useState<string>("overall");
  const [amount, setAmount] = useState<string>("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const now = new Date();
  const monthKey = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(
    2,
    "0",
  )}`;

  const currentBudgets = budgets.filter((b) => b.month === monthKey);

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSaving(true);

    try {
      const res = await fetch("/api/budgets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: parseFloat(amount),
          month: monthKey,
          categoryId: categoryId === "overall" ? null : categoryId,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error ?? "Failed to save budget");
        return;
      }

      setAmount("");
      window.location.reload();
    } catch (err) {
      console.error(err);
      setError("Network error while saving budget");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-3 text-xs">
      <h2 className="text-sm font-medium text-zinc-100">Monthly budgets</h2>
      <form
        onSubmit={handleSave}
        className="grid gap-2 md:grid-cols-[minmax(0,1.3fr)_minmax(0,1fr)_auto]"
      >
        <select
          value={categoryId}
          onChange={(e) => setCategoryId(e.target.value)}
          className="rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-xs text-zinc-50 outline-none"
        >
          <option value="overall">Overall</option>
          {categories.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
        <input
          type="number"
          step="0.01"
          placeholder="Budget amount"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1.5 text-xs text-zinc-50 outline-none"
        />
        <button
          type="submit"
          disabled={saving}
          className="rounded-md bg-emerald-500 px-3 py-1.5 text-xs font-medium text-white hover:bg-emerald-400 disabled:opacity-60"
        >
          {saving ? "Saving..." : "Save"}
        </button>
      </form>
      {error && (
        <p className="text-[11px] text-red-400" role="alert">
          {error}
        </p>
      )}
      <div className="space-y-1">
        <p className="text-[11px] text-zinc-400">
          Current month ({monthKey}) budgets:
        </p>
        {currentBudgets.length === 0 ? (
          <p className="text-[11px] text-zinc-500">No budgets set yet.</p>
        ) : (
          <ul className="space-y-1 text-[11px]">
            {currentBudgets.map((b) => (
              <li
                key={b.id}
                className="flex items-center justify-between rounded-md border border-zinc-800 bg-zinc-900 px-2 py-1"
              >
                <span className="text-zinc-300">
                  {b.category?.name ?? "Overall"}
                </span>
                <span className="font-mono text-zinc-100">
                  ₹{b.amount.toFixed(2)}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

