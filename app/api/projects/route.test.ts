// @vitest-environment node
import { describe, expect, it, vi, beforeEach } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/dal", () => ({ getSessionUserId: vi.fn() }));
vi.mock("@/lib/db", () => ({
  prisma: {
    project: { findMany: vi.fn(), create: vi.fn() },
    teamMember: { findUnique: vi.fn() },
  },
}));

import { GET, POST } from "@/app/api/projects/route";
import { getSessionUserId } from "@/lib/dal";
import { prisma } from "@/lib/db";

const userId = vi.mocked(getSessionUserId);
const findMany = vi.mocked(prisma.project.findMany);

function jsonRequest(body: unknown) {
  return new NextRequest("http://localhost/api/projects", {
    method: "POST",
    body: JSON.stringify(body),
    headers: { "content-type": "application/json" },
  });
}

beforeEach(() => vi.clearAllMocks());

describe("GET /api/projects", () => {
  it("returns 401 when unauthenticated", async () => {
    userId.mockResolvedValue(null);
    const res = await GET(new NextRequest("http://localhost/api/projects"));
    expect(res.status).toBe(401);
  });

  it("returns the current user's projects, scoped by ownerId", async () => {
    userId.mockResolvedValue("u1");
    findMany.mockResolvedValue([{ id: "p1", name: "Apollo" }] as never);

    const res = await GET(new NextRequest("http://localhost/api/projects?status=ACTIVE"));
    expect(res.status).toBe(200);

    const body = await res.json();
    expect(body.projects).toHaveLength(1);
    const where = findMany.mock.calls[0][0]?.where as { ownerId: string; status: string };
    expect(where.ownerId).toBe("u1");
    expect(where.status).toBe("ACTIVE");
  });
});

describe("POST /api/projects", () => {
  it("returns 401 when unauthenticated", async () => {
    userId.mockResolvedValue(null);
    const res = await POST(jsonRequest({}));
    expect(res.status).toBe(401);
  });

  it("returns 400 on an invalid body", async () => {
    userId.mockResolvedValue("u1");
    const res = await POST(jsonRequest({ name: "" }));
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.error).toBe("Validation failed");
  });
});
