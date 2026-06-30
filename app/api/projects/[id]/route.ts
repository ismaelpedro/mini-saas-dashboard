import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { notFound, requireUser, route } from "@/lib/api";
import { memberSelect, parseProjectInput } from "@/lib/projects";

type Params = { params: Promise<{ id: string }> };

function ownedProject(id: string, ownerId: string) {
  return prisma.project.findFirst({ where: { id, ownerId } });
}

export const GET = route(async (_request: NextRequest, { params }: Params) => {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;

  const { id } = await params;
  const project = await prisma.project.findFirst({
    where: { id, ownerId: auth.userId },
    include: { teamMember: memberSelect },
  });
  if (!project) return notFound();
  return NextResponse.json({ project });
});

export const PUT = route(async (request: NextRequest, { params }: Params) => {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;

  const { id } = await params;
  if (!(await ownedProject(id, auth.userId))) return notFound();

  const input = await parseProjectInput(request);
  if ("error" in input) return input.error;

  const { name, status, deadline, budget, teamMemberId } = input.data;
  const project = await prisma.project.update({
    where: { id },
    data: { name, status, deadline: new Date(deadline), budget, teamMemberId },
    include: { teamMember: memberSelect },
  });
  return NextResponse.json({ project });
});

export const DELETE = route(async (_request: NextRequest, { params }: Params) => {
  const auth = await requireUser();
  if ("error" in auth) return auth.error;

  const { id } = await params;
  if (!(await ownedProject(id, auth.userId))) return notFound();

  await prisma.project.delete({ where: { id } });
  return NextResponse.json({ ok: true });
});
