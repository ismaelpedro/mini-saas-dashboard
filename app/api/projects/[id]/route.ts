import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUserId } from "@/lib/dal";
import { projectSchema } from "@/lib/validations";

const memberSelect = { select: { id: true, name: true, email: true } };

type Params = { params: Promise<{ id: string }> };

// GET /api/projects/:id — fetch one owned project.
export async function GET(_request: NextRequest, { params }: Params) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const project = await prisma.project.findFirst({
    where: { id, ownerId: userId },
    include: { teamMember: memberSelect },
  });
  if (!project) return NextResponse.json({ error: "Not found" }, { status: 404 });

  return NextResponse.json({ project });
}

// PUT /api/projects/:id — replace an owned project.
export async function PUT(request: NextRequest, { params }: Params) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const existing = await prisma.project.findFirst({ where: { id, ownerId: userId } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await request.json().catch(() => null);
  const parsed = projectSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "Validation failed", details: parsed.error.flatten().fieldErrors },
      { status: 400 },
    );
  }

  const { name, status, deadline, budget, teamMemberId } = parsed.data;
  const member = await prisma.teamMember.findUnique({ where: { id: teamMemberId } });
  if (!member) {
    return NextResponse.json({ error: "Team member not found" }, { status: 400 });
  }

  const project = await prisma.project.update({
    where: { id },
    data: { name, status, deadline: new Date(deadline), budget, teamMemberId },
    include: { teamMember: memberSelect },
  });

  return NextResponse.json({ project });
}

// DELETE /api/projects/:id — delete an owned project.
export async function DELETE(_request: NextRequest, { params }: Params) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const existing = await prisma.project.findFirst({ where: { id, ownerId: userId } });
  if (!existing) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await prisma.project.delete({ where: { id } });
  return NextResponse.json({ ok: true });
}
