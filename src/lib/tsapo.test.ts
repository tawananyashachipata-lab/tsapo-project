import { describe, expect, it } from "vitest";
import { isZimPhone, normalizeZimPhone } from "./tsapo";

describe("Zimbabwe phone numbers", () => {
  it("turns a local 07 number into +263", () => {
    expect(normalizeZimPhone("0771 234 567")).toBe("+263771234567");
  });
  it("accepts +263 numbers with 9 digits", () => {
    expect(isZimPhone("+263771234567")).toBe(true);
  });
  it("rejects non-Zimbabwe numbers", () => {
    expect(isZimPhone("+27821234567")).toBe(false);
  });
});
