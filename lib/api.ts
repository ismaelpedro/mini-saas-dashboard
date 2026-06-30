import { NextResponse } from "next/server";
import type { z } from "zod";
import { getSessionUserId } from "@/lib/dal";

export function jsonError(error: string, status: number, details?: unknown) {
  return NextResponse.json(details === undefined ? { error } : { error, details }, {
    status,
  });
}

export const unauthorized = () => jsonError("Unauthorized", 401);
export const notFound = () => jsonError("Not found", 404);

export function validationError(error: z.ZodError) {
  return jsonError("Validation failed", 400, error.flatten().fieldErrors);
}

export async function requireUser(): Promise<
  { userId: string } | { error: NextResponse }
> {
  const userId = await getSessionUserId();
  return userId ? { userId } : { error: unauthorized() };
}

function prismaErrorCode(err: unknown): string | null {
  if (typeof err === "object" && err !== null && "code" in err) {
    const code = (err as { code: unknown }).code;
    if (typeof code === "string" && /^P\d{4}$/.test(code)) return code;
  }
  return null;
}

function mapError(err: unknown): NextResponse {
  switch (prismaErrorCode(err)) {
    case "P2002":
      return jsonError("Resource already exists", 409);
    case "P2025":
      return notFound();
    case "P2003":
      return jsonError("Related resource not found", 422);
  }
  console.error(err);
  return jsonError("Internal server error", 500);
}

export function route<T extends unknown[]>(
  handler: (...args: T) => Promise<NextResponse>,
) {
  return async (...args: T): Promise<NextResponse> => {
    try {
      return await handler(...args);
    } catch (err) {
      return mapError(err);
    }
  };
}
