// @ts-nocheck
import { NextResponse } from "next/server";
import OpenAI from "openai";
import { z } from "zod";
import { zodToJsonSchema } from "zod-to-json-schema";

import prisma from "@/lib/prisma";
import { getCurrentUser } from "@/lib/auth";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Helper functions for expense operations
async function addExpenses(user: any, expenses: any[]) {
  try {
    const results = [];
    let totalAdded = 0;
    
    for (const item of expenses) {
      // Simple category creation/retrieval
      let category = await prisma.category.findFirst({
        where: {
          name: item.category,
          OR: [{ userId: user.id }, { userId: null }],
        },
      });

      if (!category) {
        category = await prisma.category.create({
          data: {
            name: item.category,
            type: "expense",
            userId: user.id,
          },
        });
      }

      const expense = await prisma.expense.create({
        data: {
          userId: user.id,
          amount: item.amount,
          date: new Date(item.dateIso),
          description: item.description,
          merchant: item.merchant || null,
          categoryId: category.id,
          currency: item.currency || "INR",
        },
      });

      results.push({ 
        id: expense.id, 
        amount: expense.amount, 
        description: expense.description,
        date: expense.date.toISOString().split('T')[0]
      });
      totalAdded += expense.amount;
    }

    return { 
      success: true, 
      message: `Successfully added ${results.length} expense(s) totaling ₹${totalAdded.toFixed(2)}`,
      expenses: results
    };
  } catch (error) {
    console.error("Add expenses error:", error);
    return { success: false, message: "Failed to add expenses" };
  }
}

async function queryExpenses(user: any, timeframe: string = "this_month") {
  try {
    const now = new Date();
    let startDate, endDate;

    if (timeframe === "this_month") {
      startDate = new Date(now.getFullYear(), now.getMonth(), 1);
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
    } else if (timeframe === "last_month") {
      startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      endDate = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59);
    } else if (timeframe === "this_week") {
      const day = now.getDay() || 7;
      startDate = new Date(now);
      startDate.setDate(now.getDate() - day + 1);
      endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + 6);
      endDate.setHours(23, 59, 59);
    } else if (timeframe === "last_week") {
      const day = now.getDay() || 7;
      endDate = new Date(now);
      endDate.setDate(now.getDate() - day);
      startDate = new Date(endDate);
      startDate.setDate(endDate.getDate() - 6);
    } else {
      startDate = new Date("2000-01-01");
      endDate = new Date("2099-12-31");
    }

    const expenses = await prisma.expense.findMany({
      where: {
        userId: user.id,
        date: {
          gte: startDate,
          lte: endDate,
        },
      },
      include: { category: true },
      orderBy: { date: "desc" },
    });

    const total = expenses.reduce((sum, exp) => sum + exp.amount, 0);
    
    return { 
      success: true, 
      total,
      count: expenses.length,
      message: `Found ${expenses.length} expenses totaling ₹${total.toFixed(2)} for ${timeframe.replace('_', ' ')}`
    };
  } catch (error) {
    console.error("Query expenses error:", error);
    return { success: false, message: "Failed to query expenses" };
  }
}

// Function to extract expense data from user message
async function extractExpenseData(message: string, user: any) {
  try {
    // Define schema for expense extraction
    const expenseSchema = z.object({
      expenses: z.array(z.object({
        amount: z.number(),
        merchant: z.string().optional(),
        description: z.string(),
        category: z.string(),
        dateIso: z.string(),
      }))
    });

    const currentDate = new Date().toISOString().split('T')[0];
    
    const prompt = `Extract expense information from this message: "${message}"
    
Current date: ${currentDate}

Respond ONLY with valid JSON in this exact format:
{
  "expenses": [
    {
      "amount": 50.0,
      "merchant": "Store Name",
      "description": "What was bought",
      "category": "Food",
      "dateIso": "2024-01-15"
    }
  ]
}

Common categories: Food, Transport, Entertainment, Bills, Shopping, Healthcare
For dates: "today" = ${currentDate}, "yesterday" = ${new Date(Date.now() - 86400000).toISOString().split('T')[0]}`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [
        { role: "system", content: "You extract structured data from natural language." },
        { role: "user", content: prompt }
      ],
      temperature: 0,
    });

    const response = completion.choices[0]?.message?.content || "";
    
    // Try to parse the JSON response
    try {
      const jsonData = JSON.parse(response);
      return jsonData;
    } catch (parseError) {
      console.error("JSON Parse Error:", parseError);
      return null;
    }
    
  } catch (error) {
    console.error("Expense extraction error:", error);
    return null;
  }
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

    const lastUserMessage = messages.filter((m: any) => m.role === "user").pop();
    if (!lastUserMessage) {
      throw new Error("No user message found");
    }

    const userMessage = lastUserMessage.content.toLowerCase();

    // Check if this is an expense-related message
    const expenseKeywords = ["spent", "expense", "cost", "paid", "bought", "purchase"];
    const queryKeywords = ["how much", "total", "spent on", "expenses", "show me", "list"];
    
    let reply = "";
    let shouldRefresh = false;

    if (expenseKeywords.some(keyword => userMessage.includes(keyword))) {
      // Try to extract expense data
      const extractedData = await extractExpenseData(lastUserMessage.content, user);
      
      if (extractedData?.expenses?.length > 0) {
        // Add expenses to database
        const result = await addExpenses(user, extractedData.expenses);
        reply = result.message;
        shouldRefresh = result.success;
      } else {
        reply = "I understood you mentioned an expense. Could you provide more details like amount and what it was for?";
      }
    } else if (queryKeywords.some(keyword => userMessage.includes(keyword))) {
      // Handle query requests
      let timeframe = "this_month";
      if (userMessage.includes("week")) timeframe = "this_week";
      if (userMessage.includes("month")) timeframe = "this_month";
      
      const result = await queryExpenses(user, timeframe);
      reply = result.message;
    } else {
      // General conversation - use OpenAI
      const systemMessage = {
        role: "system",
        content: `You are Nebula Expense AI, a helpful finance assistant. 
        Help users track expenses through conversation.
        When they mention spending money, acknowledge it and be helpful.
        Current date: ${new Date().toISOString().split('T')[0]}.
        
        Examples of valid requests:
        - "I spent $50 on groceries yesterday" 
        - "Show me my expenses this month"
        - "How much did I spend on food?"
        
        Always respond in a helpful, conversational way.`
      };

      const allMessages = [systemMessage, ...messages];

      const completion = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        messages: allMessages.map(msg => ({
          role: msg.role,
          content: msg.content
        })),
        temperature: 0.7,
      });

      reply = completion.choices[0]?.message?.content || "I'm here to help you track your expenses!";
    }

    // Trigger dashboard refresh if needed
    if (shouldRefresh) {
      // This will be handled by the frontend
    }

    return NextResponse.json({ 
      reply,
      shouldRefresh 
    });

  } catch (error) {
    console.error("Chat API Error:", error);
    
    let errorMessage = "I'm having trouble processing your request right now.";
    if (error instanceof Error) {
      errorMessage = error.message;
    }
    
    return NextResponse.json({
      reply: `I encountered an error: ${errorMessage}. Please try rephrasing your request.`
    }, { status: 500 });
  }
}
