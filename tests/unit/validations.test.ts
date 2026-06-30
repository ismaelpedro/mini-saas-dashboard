import { describe, expect, it } from "vitest";
import { loginSchema, projectSchema, registerSchema } from "@/lib/validations";

describe("projectSchema", () => {
  const valid = {
    name: "Apollo",
    status: "ACTIVE",
    deadline: "2026-12-01",
    budget: "1000.50",
    teamMemberId: "tm1",
  };

  it("accepts valid input and coerces budget to a number", () => {
    const result = projectSchema.safeParse(valid);
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.budget).toBe(1000.5);
  });

  it("rejects an empty name", () => {
    expect(projectSchema.safeParse({ ...valid, name: "" }).success).toBe(false);
  });

  it("rejects an unknown status", () => {
    expect(projectSchema.safeParse({ ...valid, status: "NOPE" }).success).toBe(false);
  });

  it("rejects a non-positive budget", () => {
    expect(projectSchema.safeParse({ ...valid, budget: "-5" }).success).toBe(false);
  });

  it("rejects an invalid deadline", () => {
    expect(projectSchema.safeParse({ ...valid, deadline: "not-a-date" }).success).toBe(false);
  });

  it("requires a team member", () => {
    expect(projectSchema.safeParse({ ...valid, teamMemberId: "" }).success).toBe(false);
  });
});

describe("registerSchema", () => {
  it("accepts a valid registration", () => {
    expect(
      registerSchema.safeParse({ name: "Al", email: "a@b.com", password: "longenough" })
        .success,
    ).toBe(true);
  });

  it("rejects an invalid email", () => {
    expect(
      registerSchema.safeParse({ name: "Al", email: "bad", password: "longenough" }).success,
    ).toBe(false);
  });

  it("rejects a short password", () => {
    expect(
      registerSchema.safeParse({ name: "Al", email: "a@b.com", password: "short" }).success,
    ).toBe(false);
  });
});

describe("loginSchema", () => {
  it("requires email and password", () => {
    expect(loginSchema.safeParse({ email: "a@b.com", password: "x" }).success).toBe(true);
    expect(loginSchema.safeParse({ email: "a@b.com", password: "" }).success).toBe(false);
  });
});
