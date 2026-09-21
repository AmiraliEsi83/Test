import { describe, expect, it } from "vitest";
import { money } from "./api";

describe("money", () => {
  it("formats usd", () => {
    expect(money(12.5)).toBe("$12.50");
    expect(money(-3)).toBe("-$3.00");
  });
});
