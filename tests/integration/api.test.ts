// @vitest-environment node
import { beforeAll, afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

vi.mock("@/lib/dal", () => ({ getSessionUserId: vi.fn() }));

const TEST_DB = process.env.TEST_DATABASE_URL;

// Skip gracefully when no dedicated test database is configured (see .env.test.example).
const suite = TEST_DB ? describe : describe.skip;

suite("API integration (real Postgres)", () => {
  // Imported after DATABASE_URL is pointed at the test database.
  /* eslint-disable @typescript-eslint/no-explicit-any */
  let prisma: any;
  let getSessionUserId: any;
  let projectsRoute: any;
  let idRoute: any;
  /* eslint-enable @typescript-eslint/no-explicit-any */
  let userId: string;
  let otherUserId: string;
  let teamMemberId: string;

  beforeAll(async () => {
    process.env.DATABASE_URL = TEST_DB;
    process.env.JWT_SECRET ||= "test-secret-not-for-production";

    ({ getSessionUserId } = await import("@/lib/dal"));
    ({ prisma } = await import("@/lib/db"));
    projectsRoute = await import("@/app/api/projects/route");
    idRoute = await import("@/app/api/projects/[id]/route");

    await prisma.project.deleteMany();
    await prisma.user.deleteMany();
    await prisma.teamMember.deleteMany();

    const [owner, other, member] = await Promise.all([
      prisma.user.create({ data: { email: "int@test.com", name: "Int User", password: "hash" } }),
      prisma.user.create({ data: { email: "other@test.com", name: "Other User", password: "hash" } }),
      prisma.teamMember.create({ data: { name: "Ada", email: "ada-int@test.com" } }),
    ]);
    userId = owner.id;
    otherUserId = other.id;
    teamMemberId = member.id;
  });

  afterAll(async () => {
    await prisma.project.deleteMany();
    await prisma.user.deleteMany();
    await prisma.teamMember.deleteMany();
    await prisma.$disconnect();
  });

  beforeEach(async () => {
    await prisma.project.deleteMany();
    getSessionUserId.mockResolvedValue(userId);
  });

  const valid = (over: Record<string, unknown> = {}) => ({
    name: "Apollo",
    status: "ACTIVE",
    deadline: "2026-12-01",
    budget: "1000",
    teamMemberId,
    ...over,
  });

  const post = (data: unknown) =>
    new NextRequest("http://localhost/api/projects", {
      method: "POST",
      body: JSON.stringify(data),
      headers: { "content-type": "application/json" },
    });

  const list = (qs = "") => new NextRequest(`http://localhost/api/projects${qs}`);
  const byId = (id: string) => new NextRequest(`http://localhost/api/projects/${id}`);
  const params = (id: string) => ({ params: Promise.resolve({ id }) });

  async function create(data = valid()) {
    const res = await projectsRoute.POST(post(data));
    const json = await res.json();
    return { res, project: json.project };
  }

  it("creates a project owned by the current user", async () => {
    const { res, project } = await create();
    expect(res.status).toBe(201);
    expect(project.name).toBe("Apollo");
    const inDb = await prisma.project.findUnique({ where: { id: project.id } });
    expect(inDb.ownerId).toBe(userId);
  });

  it("rejects an invalid body with 400", async () => {
    const res = await projectsRoute.POST(post({ name: "" }));
    expect(res.status).toBe(400);
  });

  it("rejects an unknown team member with 400", async () => {
    const res = await projectsRoute.POST(post(valid({ teamMemberId: "missing" })));
    expect(res.status).toBe(400);
  });

  it("lists, filters by status and searches by name", async () => {
    await create(valid({ name: "Apollo", status: "ACTIVE" }));
    await create(valid({ name: "Zephyr", status: "COMPLETED" }));

    const all = await (await projectsRoute.GET(list())).json();
    expect(all.projects).toHaveLength(2);

    const active = await (await projectsRoute.GET(list("?status=ACTIVE"))).json();
    expect(active.projects).toHaveLength(1);
    expect(active.projects[0].name).toBe("Apollo");

    const search = await (await projectsRoute.GET(list("?q=zep"))).json();
    expect(search.projects).toHaveLength(1);
    expect(search.projects[0].name).toBe("Zephyr");
  });

  it("sorts by budget descending", async () => {
    await create(valid({ budget: "100" }));
    await create(valid({ budget: "5000" }));
    const res = await (await projectsRoute.GET(list("?sort=budget"))).json();
    const budgets = res.projects.map((p: { budget: string }) => Number(p.budget));
    expect(budgets).toEqual([...budgets].sort((a, b) => b - a));
  });

  it("updates an owned project", async () => {
    const { project } = await create();
    const res = await idRoute.PUT(
      post(valid({ status: "COMPLETED", budget: "9999" })),
      params(project.id),
    );
    expect(res.status).toBe(200);
    const updated = await prisma.project.findUnique({ where: { id: project.id } });
    expect(updated.status).toBe("COMPLETED");
    expect(Number(updated.budget)).toBe(9999);
  });

  it("deletes an owned project", async () => {
    const { project } = await create();
    const res = await idRoute.DELETE(byId(project.id), params(project.id));
    expect(res.status).toBe(200);
    expect(await prisma.project.findUnique({ where: { id: project.id } })).toBeNull();
  });

  it("isolates projects by owner", async () => {
    const { project } = await create();

    getSessionUserId.mockResolvedValue(otherUserId);
    const otherList = await (await projectsRoute.GET(list())).json();
    expect(otherList.projects).toHaveLength(0);

    const res = await idRoute.GET(byId(project.id), params(project.id));
    expect(res.status).toBe(404);
  });

  it("returns 401 when unauthenticated", async () => {
    getSessionUserId.mockResolvedValue(null);
    expect((await projectsRoute.GET(list())).status).toBe(401);
    expect((await projectsRoute.POST(post(valid()))).status).toBe(401);
  });

  describe("auth (db + bcrypt)", () => {
    it("stores a hashed password and verifies it on login", async () => {
      const { hashPassword, verifyPassword } = await import("@/lib/auth");
      const created = await prisma.user.create({
        data: { email: "login@test.com", name: "Login", password: await hashPassword("password123") },
      });

      const found = await prisma.user.findUnique({ where: { email: "login@test.com" } });
      expect(found.password).not.toBe("password123");
      expect(await verifyPassword("password123", found.password)).toBe(true);
      expect(await verifyPassword("wrong", found.password)).toBe(false);

      await prisma.user.delete({ where: { id: created.id } });
    });

    it("enforces unique emails", async () => {
      await expect(
        prisma.user.create({ data: { email: "int@test.com", name: "Dup", password: "x" } }),
      ).rejects.toThrow();
    });
  });
});
