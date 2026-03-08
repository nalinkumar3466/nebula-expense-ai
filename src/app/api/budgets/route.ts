import { NextResponse } from "next/server";

import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await request.json();
    const { amount, month, categoryId } = body as {
      amount?: number;
      month?: string;
      categoryId?: string | null;
    };

    if (!amount || !month) {
      return NextResponse.json(
        { error: "Month and amount are required" },
        { status: 400 },
      );
    }

    const existing = await prisma.budget.findFirst({
      where: {
        userId: user.id,
        month,
        categoryId: categoryId ?? null,
      },
    });

    const budget = existing
      ? await prisma.budget.update({
          where: { id: existing.id },
          data: { amount },
        })
      : await prisma.budget.create({
          data: {
            amount,
            month,
            userId: user.id,
            categoryId: categoryId ?? null,
          },
        });

    return NextResponse.json({ budget });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Failed to save budget" },
      { status: 500 },
    );
  }
}

