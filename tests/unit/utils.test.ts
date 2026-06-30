import { describe, expect, it } from "vitest";
import { formatCurrency, formatDate } from "@/lib/utils";

describe("formatCurrency", () => {
  it("formats numbers and numeric strings as USD without decimals", () => {
    expect(formatCurrency("1000")).toBe("$1,000");
    expect(formatCurrency(250000)).toBe("$250,000");
  });
});

describe("formatDate", () => {
  it("renders a readable date", () => {
    const formatted = formatDate("2026-12-01T12:00:00.000Z");
    expect(formatted).toContain("2026");
    expect(formatted).toContain("Dec");
  });
});
