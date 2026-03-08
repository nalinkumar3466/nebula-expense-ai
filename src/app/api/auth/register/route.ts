import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";

import prisma from "@/lib/prisma";
import { getSessionCookieName } from "@/lib/auth";

const SESSION_TTL_DAYS = 7;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { email, password, name } = body as {
      email?: string;
      password?: string;
      name?: string;
    };

    if (!email || !password) {
      return NextResponse.json(
        { error: "Email and password are required" },
        { status: 400 },
      );
    }

    const existing = await prisma.user.findUnique({
      where: { email: email.toLowerCase() },
    });

    if (existing) {
      return NextResponse.json(
        { error: "User with this email already exists" },
        { status: 400 },
      );
    }

    const passwordHash = await bcrypt.hash(password, 10);

    const user = await prisma.user.create({
      data: {
        email: email.toLowerCase(),
        name,
        passwordHash,
      },
    });

    // Create default categories
    await prisma.category.createMany({
      data: [
        { name: "Food", type: "expense", userId: user.id },
        { name: "Transport", type: "expense", userId: user.id },
        { name: "Entertainment", type: "expense", userId: user.id },
        { name: "Bills", type: "expense", userId: user.id },
        { name: "Shopping", type: "expense", userId: user.id },
        { name: "Healthcare", type: "expense", userId: user.id },
      ],
    });

    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + SESSION_TTL_DAYS);

    const session = await prisma.session.create({
      data: {
        userId: user.id,
        expiresAt,
      },
    });

    const response = NextResponse.json({ user: { id: user.id, email: user.email, name: user.name } });

    response.cookies.set(getSessionCookieName(), session.id, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      expires: expiresAt,
      path: "/",
    });

    return response;
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Something went wrong while registering" },
      { status: 500 },
    );
  }
}

