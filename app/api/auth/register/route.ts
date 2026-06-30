import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { hashPassword } from "@/lib/auth";
import { jsonError, route, validationError } from "@/lib/api";
import { registerSchema } from "@/lib/validations";
import { SESSION_COOKIE, sessionCookieOptions, signSession } from "@/lib/session";

export const POST = route(async (request: Request) => {
  const body = await request.json().catch(() => null);
  const parsed = registerSchema.safeParse(body);
  if (!parsed.success) return validationError(parsed.error);

  const { name, email, password } = parsed.data;
  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) return jsonError("Email already registered", 409);

  const user = await prisma.user.create({
    data: { name, email, password: await hashPassword(password) },
    select: { id: true, name: true, email: true },
  });

  const token = await signSession({ userId: user.id });
  (await cookies()).set(SESSION_COOKIE, token, sessionCookieOptions);

  return NextResponse.json({ user }, { status: 201 });
});
