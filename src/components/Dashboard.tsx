import type { Category, Expense, Budget, User } from "@/generated/client";

import { ExpenseForm } from "./ExpenseForm";
import { ExpenseTable } from "./ExpenseTable";
import { ChatPanel } from "./ChatPanel";
import { BudgetPanel } from "./BudgetPanel";
import { ReceiptScanner } from "./ReceiptScanner";
import { CategoryChart } from "./CategoryChart";

type CategoryTotals = {
  categoryId: string | null;
  _sum: { amount: number | null };
}[];

interface DashboardProps {
  user: User;
  expenses: (Expense & { category: Category | null })[];
  totalThisMonth: number;
  totalLastMonth: number;
  categoryTotals: CategoryTotals;
  categories: Category[];
  budgets: (Budget & { category: Category | null })[];
}

export function Dashboard({
  user,
  expenses,
  totalThisMonth,
  totalLastMonth,
  categoryTotals,
  categories,
  budgets,
}: DashboardProps) {
  const diff = totalLastMonth === 0 ? null : ((totalThisMonth - totalLastMonth) / totalLastMonth) * 100;

  const maxCategory = Math.max(
    1,
    ...categoryTotals.map((c) => (c._sum.amount ?? 0)),
  );

  const totalsByCategory = categoryTotals.map((row) => {
    const category =
      categories.find((c) => c.id === row.categoryId) ?? ({
        id: "uncategorized",
        name: "Uncategorized",
      } as Category);
    return {
      id: category.id,
      name: category.name,
      amount: row._sum.amount ?? 0,
    };
  });

  return (
    <div className="space-y-6">
      <section className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs text-zinc-400">Signed in as</p>
          <p className="text-sm font-medium text-zinc-100">
            {user.name || user.email}
          </p>
        </div>
        <form
          action="/api/auth/logout"
          method="post"
          className="text-right"
        >
          <button
            type="submit"
            className="rounded-full border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-xs text-zinc-300 hover:border-zinc-500"
          >
            Log out
          </button>
        </form>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4">
          <p className="text-xs text-zinc-400">This month</p>
          <p className="mt-2 text-2xl font-semibold text-zinc-50">
            ₹{totalThisMonth.toFixed(2)}
          </p>
          <p className="mt-1 text-[11px] text-zinc-400">
            Total tracked expenses since the 1st.
          </p>
        </div>
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4">
          <p className="text-xs text-zinc-400">Last month</p>
          <p className="mt-2 text-2xl font-semibold text-zinc-50">
            ₹{totalLastMonth.toFixed(2)}
          </p>
          <p className="mt-1 text-[11px] text-zinc-400">
            Baseline to compare against this month.
          </p>
        </div>
        <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4">
          <p className="text-xs text-zinc-400">Change vs last month</p>
          <p className="mt-2 text-2xl font-semibold">
            {diff === null ? (
              <span className="text-zinc-400">–</span>
            ) : (
              <span className={diff >= 0 ? "text-red-400" : "text-emerald-400"}>
                {diff >= 0 ? "+" : ""}
                {diff.toFixed(1)}%
              </span>
            )}
          </p>
          <p className="mt-1 text-[11px] text-zinc-400">
            Positive = you are spending more than last month.
          </p>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
        <div className="space-y-4">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4 min-h-[300px]">
            <h2 className="text-sm font-medium text-zinc-100">
              Category breakdown (this month)
            </h2>
            {totalsByCategory.length === 0 ? (
              <p className="mt-3 text-xs text-zinc-500">
                No expenses yet. Add one below or via the chatbot.
              </p>
            ) : (
               <CategoryChart data={totalsByCategory} />
            )}
          </div>
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4">
            <ExpenseForm categories={categories} />
          </div>
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4">
            <BudgetPanel categories={categories} budgets={budgets} />
          </div>
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4">
            <ReceiptScanner />
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4">
            <ChatPanel />
          </div>
          <div className="rounded-2xl border border-zinc-800 bg-zinc-900/60 p-4">
            <ExpenseTable categories={categories} initialExpenses={expenses} />
          </div>
        </div>
      </section>
    </div>
  );
}

