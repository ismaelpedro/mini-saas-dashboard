import { beforeAll, afterAll, beforeEach, describe, expect, it, vi } from "vitest";
import { NextRequest } from "next/server";

const cookieStore = { set: vi.fn(), delete: vi.fn(), get: vi.fn(() => undefined) };
vi.mock("next/headers", () => ({ cookies: () => Promise.resolve(cookieStore) }));
vi.mock("@/lib/dal", () => ({ getSessionUserId: vi.fn(), getCurrentUser: vi.fn() }));

const TEST_DB = process.env.TEST_DATABASE_URL;
const suite = TEST_DB ? describe : describe.skip;

suite("API integration (real Postgres)", () => {
  let prisma: (typeof import("@/lib/db"))["prisma"];
  let getSessionUserId: (typeof import("@/lib/dal"))["getSessionUserId"];
  let getCurrentUser: (typeof import("@/lib/dal"))["getCurrentUser"];
  let projectsRoute: typeof import("@/app/api/projects/route");
  let idRoute: typeof import("@/app/api/projects/[id]/route");
  let registerRoute: typeof import("@/app/api/auth/register/route");
  let loginRoute: typeof import("@/app/api/auth/login/route");
  let logoutRoute: typeof import("@/app/api/auth/logout/route");
  let meRoute: typeof import("@/app/api/auth/me/route");
  let hashPassword: (typeof import("@/lib/auth"))["hashPassword"];
  let userId: string;
  let otherUserId: string;
  let teamMemberId: string;

  beforeAll(async () => {
    process.env.DATABASE_URL = TEST_DB;
    process.env.JWT_SECRET ||= "test-secret-not-for-production-0123456789";

    ({ getSessionUserId, getCurrentUser } = await import("@/lib/dal"));
    ({ prisma } = await import("@/lib/db"));
    ({ hashPassword } = await import("@/lib/auth"));
    projectsRoute = await import("@/app/api/projects/route");
    idRoute = await import("@/app/api/projects/[id]/route");
    registerRoute = await import("@/app/api/auth/register/route");
    loginRoute = await import("@/app/api/auth/login/route");
    logoutRoute = await import("@/app/api/auth/logout/route");
    meRoute = await import("@/app/api/auth/me/route");

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
    cookieStore.set.mockClear();
    cookieStore.delete.mockClear();
    vi.mocked(getSessionUserId).mockResolvedValue(userId);
  });

  const valid = (over: Record<string, unknown> = {}) => ({
    name: "Apollo",
    status: "ACTIVE",
    deadline: "2026-12-01",
    budget: "1000",
    teamMemberId,
    ...over,
  });

  const jsonPost = (data: unknown) =>
    new NextRequest("http://localhost/api", {
      method: "POST",
      body: JSON.stringify(data),
      headers: { "content-type": "application/json" },
    });

  const list = (qs = "") => new NextRequest(`http://localhost/api/projects${qs}`);
  const byId = (id: string) => new NextRequest(`http://localhost/api/projects/${id}`);
  const params = (id: string) => ({ params: Promise.resolve({ id }) });

  async function create(data = valid()) {
    const res = await projectsRoute.POST(jsonPost(data));
    const json = await res.json();
    return { res, project: json.project };
  }

  describe("projects", () => {
    it("creates a project owned by the current user", async () => {
      const { res, project } = await create();
      expect(res.status).toBe(201);
      expect(project.name).toBe("Apollo");
      const inDb = await prisma.project.findUnique({ where: { id: project.id } });
      expect(inDb?.ownerId).toBe(userId);
    });

    it("rejects an invalid body with 400", async () => {
      const res = await projectsRoute.POST(jsonPost({ name: "" }));
      expect(res.status).toBe(400);
    });

    it("rejects an unknown team member with 422", async () => {
      const res = await projectsRoute.POST(jsonPost(valid({ teamMemberId: "missing" })));
      expect(res.status).toBe(422);
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

    it("caps the result set to the limit", async () => {
      await create();
      await create();
      const res = await (await projectsRoute.GET(list("?limit=1"))).json();
      expect(res.projects).toHaveLength(1);
    });

    it("sorts by budget descending", async () => {
      await create(valid({ budget: "100" }));
      await create(valid({ budget: "5000" }));
      const res = await (await projectsRoute.GET(list("?sort=budget"))).json();
      const budgets = res.projects.map((p: { budget: string }) => Number(p.budget));
      expect(budgets).toEqual([...budgets].sort((a: number, b: number) => b - a));
    });

    it("updates an owned project", async () => {
      const { project } = await create();
      const res = await idRoute.PUT(jsonPost(valid({ status: "COMPLETED", budget: "9999" })), params(project.id));
      expect(res.status).toBe(200);
      const updated = await prisma.project.findUnique({ where: { id: project.id } });
      expect(updated?.status).toBe("COMPLETED");
      expect(Number(updated?.budget)).toBe(9999);
    });

    it("returns 404 updating a missing project", async () => {
      const res = await idRoute.PUT(jsonPost(valid()), params("does-not-exist"));
      expect(res.status).toBe(404);
    });

    it("returns 400 updating with an invalid body", async () => {
      const { project } = await create();
      const res = await idRoute.PUT(jsonPost({ name: "" }), params(project.id));
      expect(res.status).toBe(400);
    });

    it("deletes an owned project", async () => {
      const { project } = await create();
      const res = await idRoute.DELETE(byId(project.id), params(project.id));
      expect(res.status).toBe(200);
      expect(await prisma.project.findUnique({ where: { id: project.id } })).toBeNull();
    });

    it("returns 404 deleting a missing project", async () => {
      const res = await idRoute.DELETE(byId("nope"), params("nope"));
      expect(res.status).toBe(404);
    });

    it("isolates projects by owner for read, update and delete", async () => {
      const { project } = await create();
      vi.mocked(getSessionUserId).mockResolvedValue(otherUserId);

      expect((await (await projectsRoute.GET(list())).json()).projects).toHaveLength(0);
      expect((await idRoute.GET(byId(project.id), params(project.id))).status).toBe(404);
      expect((await idRoute.PUT(jsonPost(valid()), params(project.id))).status).toBe(404);
      expect((await idRoute.DELETE(byId(project.id), params(project.id))).status).toBe(404);
    });

    it("returns 401 when unauthenticated", async () => {
      vi.mocked(getSessionUserId).mockResolvedValue(null);
      expect((await projectsRoute.GET(list())).status).toBe(401);
      expect((await projectsRoute.POST(jsonPost(valid()))).status).toBe(401);
    });
  });

  describe("auth handlers", () => {
    it("register creates a user, hashes the password and sets a cookie", async () => {
      const res = await registerRoute.POST(
        jsonPost({ name: "New", email: "newreg@test.com", password: "password123" }),
      );
      expect(res.status).toBe(201);
      const inDb = await prisma.user.findUnique({ where: { email: "newreg@test.com" } });
      expect(inDb?.password).not.toBe("password123");
      expect(cookieStore.set).toHaveBeenCalledWith("session", expect.any(String), expect.any(Object));
      await prisma.user.delete({ where: { id: inDb!.id } });
    });

    it("register returns 409 on a duplicate email", async () => {
      const res = await registerRoute.POST(
        jsonPost({ name: "Dup", email: "int@test.com", password: "password123" }),
      );
      expect(res.status).toBe(409);
    });

    it("register returns 400 on an invalid body", async () => {
      expect((await registerRoute.POST(jsonPost({ email: "bad" }))).status).toBe(400);
    });

    it("login returns 401 on a wrong password", async () => {
      await prisma.user.create({
        data: { email: "loginh@test.com", name: "L", password: await hashPassword("password123") },
      });
      const res = await loginRoute.POST(jsonPost({ email: "loginh@test.com", password: "wrong" }));
      expect(res.status).toBe(401);
      await prisma.user.deleteMany({ where: { email: "loginh@test.com" } });
    });

    it("login returns 200 and sets a cookie on success", async () => {
      const u = await prisma.user.create({
        data: { email: "logins@test.com", name: "L", password: await hashPassword("password123") },
      });
      const res = await loginRoute.POST(jsonPost({ email: "logins@test.com", password: "password123" }));
      expect(res.status).toBe(200);
      expect(cookieStore.set).toHaveBeenCalled();
      await prisma.user.delete({ where: { id: u.id } });
    });

    it("logout deletes the session cookie", async () => {
      const res = await logoutRoute.POST();
      expect(res.status).toBe(200);
      expect(cookieStore.delete).toHaveBeenCalledWith("session");
    });

    it("me returns 401 when unauthenticated", async () => {
      vi.mocked(getCurrentUser).mockResolvedValue(null);
      expect((await meRoute.GET()).status).toBe(401);
    });

    it("me returns the current user", async () => {
      vi.mocked(getCurrentUser).mockResolvedValue({ id: "u1", name: "X", email: "x@test.com" });
      const res = await meRoute.GET();
      expect(res.status).toBe(200);
      expect((await res.json()).user.email).toBe("x@test.com");
    });

    it("enforces unique emails at the database level", async () => {
      await expect(
        prisma.user.create({ data: { email: "int@test.com", name: "Dup", password: "x" } }),
      ).rejects.toThrow();
    });
  });
});
