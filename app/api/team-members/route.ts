import { NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser, route } from "@/lib/api";

export const GET = route(async () => {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;

  const teamMembers = await prisma.teamMember.findMany({
    orderBy: { name: "asc" },
    select: { id: true, name: true, email: true },
  });
  return NextResponse.json({ teamMembers });
});
