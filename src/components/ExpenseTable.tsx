// @ts-nocheck
"use client";

import { useMemo, useState } from "react";

import type { Category, Expense } from "@/generated/client";
import { formatAmount } from "@/lib/currency";

interface ExpenseTableProps {
  initialExpenses: (Expense & { category: Category | null })[];
  categories: Category[];
}

type SortKey = "date" | "amount";
type SortDir = "asc" | "desc";

export function ExpenseTable({
  initialExpenses,
  categories,
}: ExpenseTableProps) {
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [sortKey, setSortKey] = useState<SortKey>("date");
  const [sortDir, setSortDir] = useState<SortDir>("desc");

  const expenses = useMemo(() => {
    let data = [...initialExpenses];
    if (categoryFilter !== "all") {
      data = data.filter((e) => e.categoryId === categoryFilter);
    }
    data.sort((a, b) => {
      if (sortKey === "date") {
        const da = new Date(a.date).getTime();
        const db = new Date(b.date).getTime();
        return sortDir === "asc" ? da - db : db - da;
      }
      const aa = a.amount;
      const ab = b.amount;
      return sortDir === "asc" ? aa - ab : ab - aa;
    });
    return data;
  }, [initialExpenses, categoryFilter, sortKey, sortDir]);

  function toggleSort(key: SortKey) {
    if (key === sortKey) {
      setSortDir((prev) => (prev === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  }

  async function handleToggleRecurring(id: string, current: boolean) {
    try {
      await fetch(`/api/expenses/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isRecurring: !current }),
      });
      window.location.reload();
    } catch (error) {
      console.error(error);
    }
  }

  async function handleQuickEdit(expense: Expense & { category: Category | null }) {
    const newAmountRaw = window.prompt(
      "New amount (leave blank to keep current)",
      String(expense.amount),
    );
    const newDescription = window.prompt(
      "New note/description (leave blank to keep current)",
      expense.description ?? "",
    );

    const payload: { amount?: number; description?: string | null } = {};
    if (newAmountRaw && !Number.isNaN(Number(newAmountRaw))) {
      payload.amount = Number(newAmountRaw);
    }
    if (newDescription !== null) {
      payload.description = newDescription || null;
    }

    if (!payload.amount && payload.description === undefined) {
      return;
    }

    await fetch(`/api/expenses/${expense.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    window.location.reload();
  }

  function exportCsv() {
    if (expenses.length === 0) return;
    const header = [
      "Date",
      "Category",
      "Description",
      "Merchant",
      "Amount",
      "Currency",
      "Recurring",
    ];
    const rows = expenses.map((e) => [
      new Date(e.date).toISOString().slice(0, 10),
      e.category?.name ?? "Uncategorized",
      e.description ?? "",
      e.merchant ?? "",
      e.amount.toFixed(2),
      e.currency ?? "INR",
      e.isRecurring ? "yes" : "no",
    ]);
    const csv = [header, ...rows]
      .map((r) => r.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
      .join("\n");

    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "expenses.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  async function exportPdf() {
    if (expenses.length === 0) return;
    const { jsPDF } = await import("jspdf");
    const doc = new jsPDF();

    doc.setFontSize(12);
    doc.text("Expenses report", 14, 16);
    doc.setFontSize(9);

    let y = 24;
    const lineHeight = 5;

    expenses.forEach((e) => {
      if (y > 280) {
        doc.addPage();
        y = 20;
      }
      const line = [
        new Date(e.date).toISOString().slice(0, 10),
        e.category?.name ?? "Uncategorized",
        e.merchant ?? "",
        formatAmount(e.amount, e.currency),
        e.isRecurring ? "(recurring)" : "",
      ]
        .filter(Boolean)
        .join("  |  ");
      doc.text(line, 14, y);
      y += lineHeight;
    });

    doc.save("expenses.pdf");
  }

  async function handleDelete(id: string) {
    const ok = window.confirm("Delete this expense?");
    if (!ok) return;

    await fetch(`/api/expenses/${id}`, { method: "DELETE" });
    window.location.reload();
  }

  return (
    <div className="space-y-3 text-xs">
      <div className="flex items-center justify-between gap-3">
        <h2 className="text-sm font-medium text-zinc-100">
          Recent expenses
        </h2>
        <div className="flex items-center gap-2">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1 text-xs text-zinc-50 outline-none"
          >
            <option value="all">All categories</option>
            {categories.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={exportCsv}
            className="rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1 text-[11px] text-zinc-200 hover:border-zinc-500"
          >
            Export CSV
          </button>
          <button
            type="button"
            onClick={exportPdf}
            className="rounded-md border border-zinc-700 bg-zinc-900 px-2 py-1 text-[11px] text-zinc-200 hover:border-zinc-500"
          >
            Export PDF
          </button>
        </div>
      </div>
      <div className="max-h-72 overflow-auto rounded-lg border border-zinc-800">
        <table className="min-w-full border-separate border-spacing-0 text-xs">
          <thead className="bg-zinc-900">
            <tr className="text-[11px] text-zinc-400">
              <th className="sticky top-0 border-b border-zinc-800 px-3 py-2 text-left">
                Category
              </th>
              <th
                className="sticky top-0 cursor-pointer border-b border-zinc-800 px-3 py-2 text-left"
                onClick={() => toggleSort("date")}
              >
                Date{" "}
                <span className="text-[9px]">
                  {sortKey === "date" ? (sortDir === "asc" ? "↑" : "↓") : ""}
                </span>
              </th>
              <th className="sticky top-0 border-b border-zinc-800 px-3 py-2 text-left">
                Description
              </th>
              <th className="sticky top-0 border-b border-zinc-800 px-3 py-2 text-left">
                Merchant
              </th>
              <th className="sticky top-0 border-b border-zinc-800 px-3 py-2 text-left">
                Recurring
              </th>
              <th
                className="sticky top-0 cursor-pointer border-b border-zinc-800 px-3 py-2 text-right"
                onClick={() => toggleSort("amount")}
              >
                Amount{" "}
                <span className="text-[9px]">
                  {sortKey === "amount" ? (sortDir === "asc" ? "↑" : "↓") : ""}
                </span>
              </th>
              <th className="sticky top-0 border-b border-zinc-800 px-3 py-2 text-right">
                &nbsp;
              </th>
            </tr>
          </thead>
          <tbody>
            {expenses.length === 0 ? (
              <tr>
                <td
                  colSpan={6}
                  className="px-3 py-4 text-center text-[11px] text-zinc-500"
                >
                  No expenses yet.
                </td>
              </tr>
            ) : (
              expenses.map((expense) => (
                <tr
                  key={expense.id}
                  className="border-t border-zinc-800 text-[11px] text-zinc-300"
                >
                  <td className="px-3 py-1.5">
                    {expense.category?.name ?? "Uncategorized"}
                  </td>
                  <td className="px-3 py-1.5">
                    {new Date(expense.date).toLocaleDateString()}
                  </td>
                  <td className="px-3 py-1.5">
                    {expense.description ?? "—"}
                  </td>
                  <td className="px-3 py-1.5">
                    {expense.merchant ?? "—"}
                  </td>
                  <td className="px-3 py-1.5">
                    <button
                      type="button"
                      onClick={() =>
                        handleToggleRecurring(expense.id, expense.isRecurring)
                      }
                      className={`rounded-full px-2 py-0.5 text-[10px] ${
                        expense.isRecurring
                          ? "border border-emerald-500 text-emerald-300"
                          : "border border-zinc-700 text-zinc-400"
                      }`}
                    >
                      {expense.isRecurring ? "Recurring" : "One-off"}
                    </button>
                  </td>
                  <td className="px-3 py-1.5 text-right font-mono text-zinc-100">
                    {formatAmount(expense.amount, expense.currency)}
                  </td>
                  <td className="px-3 py-1.5 text-right">
                    <button
                      type="button"
                      onClick={() => handleQuickEdit(expense)}
                      className="mr-1 rounded-full border border-zinc-700 px-2 py-0.5 text-[10px] text-zinc-400 hover:border-blue-500 hover:text-blue-300"
                    >
                      Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(expense.id)}
                      className="rounded-full border border-zinc-700 px-2 py-0.5 text-[10px] text-zinc-400 hover:border-red-500 hover:text-red-400"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

