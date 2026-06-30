import { SignJWT, jwtVerify } from "jose";

// Edge-safe session helpers (jose / Web Crypto only). No next/headers or Node
// APIs here, so this module is importable from both the Edge proxy and Node
// route handlers.

export const SESSION_COOKIE = "session";
const MAX_AGE = 60 * 60 * 24 * 7; // 7 days

export const sessionCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: MAX_AGE,
};

function secret() {
  const value = process.env.JWT_SECRET;
  if (!value) throw new Error("JWT_SECRET environment variable is not set");
  return new TextEncoder().encode(value);
}

export type SessionPayload = { userId: string };

export async function signSession(payload: SessionPayload): Promise<string> {
  return new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secret());
}

export async function verifySession(
  token: string | undefined,
): Promise<SessionPayload | null> {
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    if (typeof payload.userId !== "string") return null;
    return { userId: payload.userId };
  } catch {
    return null;
  }
}
