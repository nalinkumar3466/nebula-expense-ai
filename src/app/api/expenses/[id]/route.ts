// @ts-nocheck
import { NextResponse } from "next/server";

import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import { updateMerchantProfileFromExpense } from "@/lib/expense-insights";

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const body = await request.json();
    const { amount, categoryId, description, isRecurring } = body as {
      amount?: number;
      categoryId?: string | null;
      description?: string | null;
      isRecurring?: boolean;
    };

    const existing = await prisma.expense.findFirst({
      where: { id: id, userId: user.id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    const updated = await prisma.expense.update({
      where: { id: id },
      data: {
        amount: amount ?? existing.amount,
        categoryId: categoryId ?? existing.categoryId,
        description: description ?? existing.description,
        isRecurring:
          typeof isRecurring === "boolean" ? isRecurring : existing.isRecurring,
      },
    });

    await updateMerchantProfileFromExpense({
      userId: user.id,
      merchant: updated.merchant,
      categoryId: updated.categoryId,
      recurringLikely: updated.isRecurring,
    });

    return NextResponse.json({ expense: updated });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to update expense" },
      { status: 500 },
    );
  }
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;

  try {
    const existing = await prisma.expense.findFirst({
      where: { id: id, userId: user.id },
    });

    if (!existing) {
      return NextResponse.json({ error: "Not found" }, { status: 404 });
    }

    await prisma.expense.delete({
      where: { id: id },
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to delete expense" },
      { status: 500 },
    );
  }
}

