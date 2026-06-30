import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/auth";
import { registerSchema } from "@/lib/validations";
import { SESSION_COOKIE, sessionCookieOptions, signSession } from "@/lib/session";

export async function POST(request: Request) {
  const body = await request.json().catch(() => null);
  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const { name, email, password } = parsed.data;
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: "Email already registered" }, { status: 409 });
  }

  const user = await prisma.user.create({
    data: { name, email, password: await hashPassword(password) },
    select: { id: true, name: true, email: true },
  });

  const token = await signSession({ userId: user.id });
  (await cookies()).set(SESSION_COOKIE, token, sessionCookieOptions);

  return NextResponse.json({ user }, { status: 201 });
}
