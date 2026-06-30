import { NextResponse } from "next/server";
import { route, unauthorized } from "@/lib/api";
import { getCurrentUser } from "@/lib/dal";

export const GET = route(async () => {
  const user = await getCurrentUser();
  if (!user) return unauthorized();
  return NextResponse.json({ user });
});
