// @ts-nocheck
import prisma from "@/lib/prisma";

/**
 * Simple recurring expense detection based on past expenses for the same user + merchant.
 *
 * Heuristics:
 * - Look at the last 6 expenses for this merchant.
 * - If we find at least 2 previous expenses with similar amount (within 10%)
 *   and the date gaps are roughly weekly or monthly, we flag as recurring.
 */
export async function detectRecurringExpense(options: {
  userId: string;
  merchant?: string | null;
  amount: number;
  date: Date;
}): Promise<{ isRecurring: boolean; recurringRule: string | null }> {
  const { userId, merchant, amount, date } = options;

  if (!merchant) {
    return { isRecurring: false, recurringRule: null };
  }

  const recent = await prisma.expense.findMany({
    where: { userId, merchant },
    orderBy: { date: "desc" },
    take: 6,
  });

  if (recent.length < 2) {
    return { isRecurring: false, recurringRule: null };
  }

  const similarAmount = recent.filter((e) => {
    const diff = Math.abs(e.amount - amount);
    return diff / Math.max(e.amount, amount) <= 0.1;
  });

  if (similarAmount.length < 2) {
    return { isRecurring: false, recurringRule: null };
  }

  const gapsInDays: number[] = [];
  const allDates = [date, ...similarAmount.map((e) => e.date)].sort(
    (a, b) => a.getTime() - b.getTime(),
  );

  for (let i = 1; i < allDates.length; i++) {
    const gapMs = allDates[i].getTime() - allDates[i - 1].getTime();
    gapsInDays.push(gapMs / (1000 * 60 * 60 * 24));
  }

  const avgGap = gapsInDays.reduce((sum, g) => sum + g, 0) / gapsInDays.length;

  if (avgGap > 25 && avgGap < 40) {
    return { isRecurring: true, recurringRule: "monthly" };
  }

  if (avgGap > 5 && avgGap < 10) {
    return { isRecurring: true, recurringRule: "weekly" };
  }

  return { isRecurring: false, recurringRule: null };
}

/**
 * Update or create a MerchantProfile after we create or update an expense.
 * This is how the system "learns" from user corrections over time.
 */
export async function updateMerchantProfileFromExpense(options: {
  userId: string;
  merchant?: string | null;
  categoryId?: string | null;
  recurringLikely?: boolean;
}) {
  const { userId, merchant, categoryId, recurringLikely } = options;

  if (!merchant) return;

  const normalized = merchant.trim().toLowerCase();
  if (!normalized) return;

  const existing = await prisma.merchantProfile.findFirst({
    where: { userId, merchant: normalized },
  });

  if (!existing) {
    await prisma.merchantProfile.create({
      data: {
        userId,
        merchant: normalized,
        suggestedCategoryId: categoryId ?? undefined,
        recurringLikely: recurringLikely ?? false,
      },
    });
    return;
  }

  await prisma.merchantProfile.update({
    where: { id: existing.id },
    data: {
      suggestedCategoryId: categoryId ?? existing.suggestedCategoryId,
      recurringLikely:
        recurringLikely === undefined ? existing.recurringLikely : recurringLikely,
    },
  });
}

/**
 * Get the best-guess category and recurring flag for a new expense for a merchant,
 * using the learned MerchantProfile if present.
 */
export async function getLearnedMerchantDefaults(options: {
  userId: string;
  merchant?: string | null;
}): Promise<{ categoryId: string | null; recurringLikely: boolean }> {
  const { userId, merchant } = options;

  if (!merchant) {
    return { categoryId: null, recurringLikely: false };
  }

  const normalized = merchant.trim().toLowerCase();
  if (!normalized) {
    return { categoryId: null, recurringLikely: false };
  }

  const profile = await prisma.merchantProfile.findFirst({
    where: { userId, merchant: normalized },
  });

  if (!profile) {
    return { categoryId: null, recurringLikely: false };
  }

  return {
    categoryId: profile.suggestedCategoryId ?? null,
    recurringLikely: profile.recurringLikely,
  };
}

