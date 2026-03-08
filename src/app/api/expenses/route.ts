// @ts-nocheck
import { NextResponse } from "next/server";

import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import {
  detectRecurringExpense,
  getLearnedMerchantDefaults,
  updateMerchantProfileFromExpense,
} from "@/lib/expense-insights";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const {
      amount,
      categoryId,
      date,
      description,
      merchant,
      paymentMethod,
      currency,
    } = body as {
      amount?: number;
      categoryId?: string | null;
      date?: string;
      description?: string | null;
      merchant?: string | null;
      paymentMethod?: string | null;
      currency?: string | null;
    };

    if (!amount || !date) {
      return NextResponse.json(
        { error: "Amount and date are required" },
        { status: 400 },
      );
    }

    const learned = await getLearnedMerchantDefaults({
      userId: user.id,
      merchant: merchant ?? undefined,
    });

    const effectiveCategoryId = categoryId ?? learned.categoryId ?? undefined;

    const baseExpense = await prisma.expense.create({
      data: {
        amount,
        date: new Date(date),
        description: description ?? undefined,
        merchant: merchant ?? undefined,
        paymentMethod: paymentMethod ?? undefined,
        userId: user.id,
        categoryId: effectiveCategoryId,
        currency: (currency ?? "INR").toUpperCase(),
      },
    });

    const recurringInfo = await detectRecurringExpense({
      userId: user.id,
      merchant: baseExpense.merchant,
      amount: baseExpense.amount,
      date: baseExpense.date,
    });

    const expense = await prisma.expense.update({
      where: { id: baseExpense.id },
      data: {
        isRecurring: recurringInfo.isRecurring,
        recurringRule: recurringInfo.recurringRule ?? undefined,
      },
    });

    await updateMerchantProfileFromExpense({
      userId: user.id,
      merchant: expense.merchant,
      categoryId: expense.categoryId,
      recurringLikely: recurringInfo.isRecurring || learned.recurringLikely,
    });

    return NextResponse.json({ expense });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to create expense" },
      { status: 500 },
    );
  }
}

