import { NextResponse } from "next/server";
import { cookies } from "next/headers";

import prisma from "@/lib/prisma";
import { getSessionCookieName } from "@/lib/auth";

export async function POST() {
  try {
    const cookieName = getSessionCookieName();
    const cookieStore = await cookies();
    const sessionId = cookieStore.get(cookieName)?.value;

    cookieStore.delete(cookieName);

    if (sessionId) {
      await prisma.session.deleteMany({
        where: { id: sessionId },
      });
    }

    const response = NextResponse.json({ ok: true });
    response.cookies.set(cookieName, "", {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      expires: new Date(0),
      path: "/",
    });

    return response;
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { error: "Something went wrong while logging out" },
      { status: 500 },
    );
  }
}

