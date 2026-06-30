import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { requireUser, route } from "@/lib/api";
import { memberSelect, parseProjectInput, projectListArgs } from "@/lib/projects";

export const GET = route(async (request: NextRequest) => {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;

  const projects = await prisma.project.findMany(
    projectListArgs(request.nextUrl.searchParams, auth.userId),
  );
  return NextResponse.json({ projects });
});

export const POST = route(async (request: NextRequest) => {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;

  const input = await parseProjectInput(request);
  if ("error" in input) return input.error;

  const { name, status, deadline, budget, teamMemberId } = input.data;
  const project = await prisma.project.create({
    data: { name, status, deadline: new Date(deadline), budget, teamMemberId, ownerId: auth.userId },
    include: { teamMember: memberSelect },
  });
  return NextResponse.json({ project }, { status: 201 });
});
