import { type NextResponse } from "next/server";
import type { $Enums } from "@/app/generated/prisma/client";
import { prisma } from "@/lib/db";
import { jsonError, validationError } from "@/lib/api";
import {
  ProjectStatusEnum,
  projectSchema,
  type ProjectPayload,
  type ProjectStatusValue,
} from "@/lib/validations";

type AssertEqual<A, B> = [A] extends [B] ? ([B] extends [A] ? true : never) : never;
export const STATUS_ENUM_IN_SYNC: AssertEqual<ProjectStatusValue, $Enums.ProjectStatus> = true;

export const memberSelect = { select: { id: true, name: true, email: true } } as const;

const MAX_LIMIT = 100;

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

export function projectListArgs(searchParams: URLSearchParams, ownerId: string) {
  const status = ProjectStatusEnum.safeParse(searchParams.get("status"));
  const q = searchParams.get("q")?.trim();
  const take = Math.min(Number(searchParams.get("limit")) || MAX_LIMIT, MAX_LIMIT);
  const skip = Math.max(Number(searchParams.get("offset")) || 0, 0);

  return {
    where: {
      ownerId,
      ...(status.success ? { status: status.data } : {}),
      ...(q ? { name: { contains: q, mode: "insensitive" as const } } : {}),
    },
    orderBy: orderByFor(searchParams.get("sort")),
    include: { teamMember: memberSelect },
    take,
    skip,
  };
}

export async function parseProjectInput(
  request: Request,
): Promise<{ data: ProjectPayload } | { error: NextResponse }> {
  const body = await request.json().catch(() => null);
  const parsed = projectSchema.safeParse(body);
  if (!parsed.success) return { error: validationError(parsed.error) };

  const member = await prisma.teamMember.findUnique({
    where: { id: parsed.data.teamMemberId },
  });
  if (!member) return { error: jsonError("Team member not found", 422) };

  return { data: parsed.data };
}
