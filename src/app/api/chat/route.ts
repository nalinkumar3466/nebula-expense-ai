// @ts-nocheck
import { NextResponse } from "next/server";
import { openai } from "@ai-sdk/openai";
import { generateText, tool } from "ai";
import { z } from "zod";

import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";
import {
  detectRecurringExpense,
  getLearnedMerchantDefaults,
  updateMerchantProfileFromExpense,
} from "@/lib/expense-insights";

function getMonthRange(offsetMonths = 0) {
  const now = new Date();
  const month = now.getMonth() + offsetMonths;
  const year = now.getFullYear();
  const start = new Date(year, month, 1);
  const end = new Date(year, month + 1, 0, 23, 59, 59, 999);
  return { start, end };
}

function getWeekRange(offsetWeeks = 0) {
  const now = new Date();
  const day = now.getDay() || 7;
  const start = new Date(
    now.getFullYear(),
    now.getMonth(),
    now.getDate() - day + 1 + offsetWeeks * 7,
  );
  const end = new Date(
    start.getFullYear(),
    start.getMonth(),
    start.getDate() + 6,
    23,
    59,
    59,
    999,
  );
  return { start, end };
}

export async function POST(request: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { messages } = await request.json();

    if (!messages || messages.length === 0) {
      return NextResponse.json(
        { error: "Messages are required" },
        { status: 400 },
      );
    }

    const systemInstruction = `
      You are Nebula Expense AI, a helpful and conversational personal finance assistant.
      Your job is to help the user manage their expenses, query their spending, and provide insights.
      When users mention expenses, try to extract amount, category, merchant, date, and description.
      Use natural, conversational language. Keep answers concise.
      Current date: ${new Date().toISOString().slice(0, 10)}.
    `;

    // Define tools using the correct AI SDK format with zod schemas
    const tools = {
      add_expenses: tool({
        description: "Add one or more expenses for the user.",
        parameters: z.object({
          expenses: z.array(
            z.object({
              amount: z.number().describe("The cost of the expense"),
              merchant: z.string().optional().describe("Where the expense occurred"),
              description: z.string().describe("What the expense was for"),
              category: z.string().describe("The category like Food, Transport, Bills"),
              dateIso: z.string().describe("YYYY-MM-DD date of the expense"),
              currency: z.enum(["INR", "USD", "EUR", "GBP"]).default("INR"),
            })
          ),
        }),
        execute: async ({ expenses }) => {
          try {
            const results = [];
            let totalAdded = 0;
            
            for (const item of expenses) {
              const categoryName = item.category.charAt(0).toUpperCase() + item.category.slice(1);
              
              let category = await prisma.category.findFirst({
                where: {
                  name: categoryName,
                  OR: [{ userId: user.id }, { userId: null }],
                },
              });

              if (!category) {
                category = await prisma.category.create({
                  data: {
                    name: categoryName,
                    type: "expense",
                    userId: user.id,
                  },
                });
              }

              const learned = await getLearnedMerchantDefaults({
                userId: user.id,
                merchant: item.merchant ?? undefined,
              });

              const baseExpense = await prisma.expense.create({
                data: {
                  userId: user.id,
                  amount: item.amount,
                  date: new Date(item.dateIso),
                  description: item.description,
                  merchant: item.merchant,
                  categoryId: learned.categoryId ?? category.id,
                  currency: item.currency || "INR",
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

              results.push({ id: expense.id, amount: item.amount, description: item.description });
              totalAdded += item.amount;
            }

            return { success: true, addedCount: results.length, totalAmountAdded: totalAdded, expenses: results };
          } catch (error) {
            console.error("Add expenses error:", error);
            return { success: false, error: "Failed to add expenses" };
          }
        },
      }),

      query_expenses: tool({
        description: "Get expenses within a timeframe, filtered by category or keyword.",
        parameters: z.object({
          timeframe: z.enum(["this_week", "last_week", "this_month", "last_month", "all_time"]).default("this_month"),
          categoryOrKeyword: z.string().optional(),
          limit: z.number().default(10),
          returnList: z.boolean().default(false),
        }),
        execute: async ({ timeframe, categoryOrKeyword, limit, returnList }) => {
          try {
            let start: Date;
            let end: Date;

            if (timeframe === "this_month") { ({ start, end } = getMonthRange(0)); }
            else if (timeframe === "last_month") { ({ start, end } = getMonthRange(-1)); }
            else if (timeframe === "this_week") { ({ start, end } = getWeekRange(0)); }
            else if (timeframe === "last_week") { ({ start, end } = getWeekRange(-1)); }
            else {
              start = new Date("2000-01-01");
              end = new Date("2099-12-31");
            }

            let where: any = {
              userId: user.id,
              date: { gte: start, lte: end },
            };

            if (categoryOrKeyword) {
              where = {
                ...where,
                OR: [
                  { description: { contains: categoryOrKeyword } },
                  { merchant: { contains: categoryOrKeyword } },
                  { category: { name: { contains: categoryOrKeyword } } },
                ],
              };
            }

            const totalObj = await prisma.expense.aggregate({
              where,
              _sum: { amount: true },
            });

            const total = totalObj._sum.amount ?? 0;

            if (!returnList) {
              return { success: true, totalSpent: total, currency: "INR" };
            }

            const items = await prisma.expense.findMany({
              where,
              orderBy: { amount: "desc" },
              take: limit,
              include: { category: true },
            });

            const formattedItems = items.map(e => ({
              id: e.id,
              amount: e.amount,
              date: e.date.toISOString().slice(0, 10),
              merchant: e.merchant,
              description: e.description,
              category: e.category?.name ?? "Uncategorized",
            }));

            return { success: true, totalSpent: total, items: formattedItems };
          } catch (error) {
            console.error("Query expenses error:", error);
            return { success: false, error: "Failed to query expenses" };
          }
        },
      }),

      update_expense: tool({
        description: "Update an existing expense.",
        parameters: z.object({
          id: z.string(),
          newAmount: z.number().optional(),
          newCategory: z.string().optional(),
        }),
        execute: async ({ id, newAmount, newCategory }) => {
          try {
            const expense = await prisma.expense.findFirst({
              where: { id, userId: user.id },
            });

            if (!expense) {
              return { success: false, error: "Expense not found." };
            }

            let categoryId = expense.categoryId;

            if (newCategory) {
              const categoryName = newCategory.charAt(0).toUpperCase() + newCategory.slice(1);
              let cat = await prisma.category.findFirst({
                where: { name: categoryName, OR: [{ userId: user.id }, { userId: null }] },
              });
              if (!cat) {
                cat = await prisma.category.create({
                  data: { name: categoryName, type: "expense", userId: user.id },
                });
              }
              categoryId = cat.id;
            }

            const updated = await prisma.expense.update({
              where: { id },
              data: {
                amount: newAmount ?? expense.amount,
                categoryId,
              },
            });

            if (newCategory) {
              await updateMerchantProfileFromExpense({
                userId: user.id,
                merchant: updated.merchant,
                categoryId: updated.categoryId,
                recurringLikely: updated.isRecurring,
              });
            }

            return { success: true, updatedExpense: { id: updated.id, amount: updated.amount, newCategoryId: categoryId } };
          } catch (error) {
            console.error("Update expense error:", error);
            return { success: false, error: "Failed to update expense" };
          }
        },
      }),
    };

    const { text, toolResults, finishReason } = await generateText({
      model: openai("gpt-4o-mini"),
      system: systemInstruction,
      messages,
      tools,
      maxSteps: 5,
    });

    return NextResponse.json({
      reply: text,
      toolResults: toolResults?.map((t: any) => ({
        toolName: t.toolName,
        result: t.result
      })),
      finishReason
    });

  } catch (error) {
    console.error("Chat API Error:", error);
    
    // More detailed error handling
    if (error instanceof Error) {
      return NextResponse.json({
        reply: `I encountered an error: ${error.message}. Please try rephrasing your request.`
      });
    }
    
    return NextResponse.json({
      reply: "I'm having trouble processing your request right now. Please try again."
    }, { status: 500 });
  }
}
