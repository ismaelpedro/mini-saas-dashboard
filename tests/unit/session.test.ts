import { describe, expect, it } from "vitest";
import { signSession, verifySession } from "@/lib/session";

process.env.JWT_SECRET ||= "test-secret-not-for-production";

describe("session", () => {
  it("signs and verifies a session token", async () => {
    const token = await signSession({ userId: "user-123" });
    expect(typeof token).toBe("string");
    expect(await verifySession(token)).toEqual({ userId: "user-123" });
  });

  it("returns null for a missing token", async () => {
    expect(await verifySession(undefined)).toBeNull();
  });

  it("returns null for a malformed token", async () => {
    expect(await verifySession("not.a.jwt")).toBeNull();
  });

  it("rejects a token signed with a different secret", async () => {
    const original = process.env.JWT_SECRET;
    const token = await signSession({ userId: "u" });
    process.env.JWT_SECRET = "a-completely-different-secret-value";
    const payload = await verifySession(token);
    process.env.JWT_SECRET = original;
    expect(payload).toBeNull();
  });
});
