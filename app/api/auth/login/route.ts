import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { prisma } from "@/lib/db";
import { verifyPassword } from "@/lib/auth";
import { jsonError, route, validationError } from "@/lib/api";
import { loginSchema } from "@/lib/validations";
import { SESSION_COOKIE, sessionCookieOptions, signSession } from "@/lib/session";

export const POST = route(async (request: Request) => {
  const body = await request.json().catch(() => null);
  const parsed = loginSchema.safeParse(body);
  if (!parsed.success) return validationError(parsed.error);

  const { email, password } = parsed.data;
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user || !(await verifyPassword(password, user.password))) {
    return jsonError("Invalid email or password", 401);
  }

  const token = await signSession({ userId: user.id });
  (await cookies()).set(SESSION_COOKIE, token, sessionCookieOptions);

  return NextResponse.json({
    user: { id: user.id, name: user.name, email: user.email },
  });
});
