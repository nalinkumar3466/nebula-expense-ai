import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { Dashboard } from "@/components/Dashboard";
import { AuthPanel } from "@/components/AuthPanel";

export default async function Home() {
  const user = await getCurrentUser();

  if (!user) {
    return (
      <div className="mx-auto max-w-md">
        <section className="rounded-2xl border border-zinc-200 bg-white p-6 shadow-sm dark:border-zinc-800 dark:bg-zinc-900/60">
          <h1 className="mb-4 text-xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-100">Sign in to continue</h1>
          <AuthPanel />
        </section>
      </div>
    );
  }

  const now = new Date();
  const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const startOfLastMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const endOfLastMonth = new Date(now.getFullYear(), now.getMonth(), 0);

  const [expenses, totalThisMonth, totalLastMonth, categoryTotals, budgets] =
    await Promise.all([
      prisma.expense.findMany({
        where: { userId: user.id },
        include: { category: true },
        orderBy: { date: "desc" },
        take: 50,
      }),
      prisma.expense.aggregate({
        where: {
          userId: user.id,
          date: { gte: startOfThisMonth },
        },
        _sum: { amount: true },
      }),
      prisma.expense.aggregate({
        where: {
          userId: user.id,
          date: { gte: startOfLastMonth, lte: endOfLastMonth },
        },
        _sum: { amount: true },
      }),
      prisma.expense.groupBy({
        by: ["categoryId"],
        where: {
          userId: user.id,
          date: { gte: startOfThisMonth },
        },
        _sum: { amount: true },
      }),
      prisma.budget.findMany({
        where: { userId: user.id },
        include: { category: true },
      }),
    ]);

  const categories = await prisma.category.findMany({
    where: {
      OR: [{ userId: user.id }, { userId: null }],
    },
    orderBy: { name: "asc" },
  });

  return (
    <Dashboard
      user={user}
      expenses={expenses}
      totalThisMonth={totalThisMonth._sum.amount ?? 0}
      totalLastMonth={totalLastMonth._sum.amount ?? 0}
      categoryTotals={categoryTotals}
      categories={categories}
      budgets={budgets}
    />
  );
}
