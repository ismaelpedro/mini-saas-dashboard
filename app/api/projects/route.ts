import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { getSessionUserId } from "@/lib/dal";
import { ProjectStatusEnum, projectSchema } from "@/lib/validations";

const memberSelect = { select: { id: true, name: true, email: true } };

function orderByFor(sort: string | null) {
  switch (sort) {
    case "name":
      return { name: "asc" as const };
    case "budget":
      return { budget: "desc" as const };
    case "deadline":
      return { deadline: "asc" as const };
    default:
      return { createdAt: "desc" as const };
  }
}

export async function GET(request: NextRequest) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { searchParams } = request.nextUrl;
  const status = ProjectStatusEnum.safeParse(searchParams.get("status"));
  const q = searchParams.get("q")?.trim();

  const projects = await prisma.project.findMany({
    where: {
      ownerId: userId,
      ...(status.success ? { status: status.data } : {}),
      ...(q ? { name: { contains: q, mode: "insensitive" } } : {}),
    },
    orderBy: orderByFor(searchParams.get("sort")),
    include: { teamMember: memberSelect },
  });

  return NextResponse.json({ projects });
}

export async function POST(request: NextRequest) {
  const userId = await getSessionUserId();
  if (!userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

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

  const project = await prisma.project.create({
    data: { name, status, deadline: new Date(deadline), budget, teamMemberId, ownerId: userId },
    include: { teamMember: memberSelect },
  });

  return NextResponse.json({ project }, { status: 201 });
}
