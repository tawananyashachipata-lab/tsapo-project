import { describe, expect, it } from "vitest";
import { assistantRequestSchema, savedMessages, trackingNumbers } from "./assistant";

describe("Assistant conversations", () => {
  it("restores separate message records without mixing them", () => {
    const first = savedMessages([
      { id: "msg_rates", role: "user", parts: [{ type: "text", text: "Rates" }] },
    ]);
    const second = savedMessages([
      { id: "msg_codes", role: "user", parts: [{ type: "text", text: "Pickup codes" }] },
    ]);
    expect(first.map((m) => m.id)).toEqual(["msg_rates"]);
    expect(second.map((m) => m.id)).toEqual(["msg_codes"]);
  });
  it("requires a concrete thread for account-saved chat", () => {
    expect(
      assistantRequestSchema.safeParse({
        messages: [{ id: "msg_1", role: "user", parts: [{ type: "text", text: "Hello" }] }],
      }).success,
    ).toBe(false);
    expect(
      assistantRequestSchema.safeParse({
        threadId: "11111111-1111-4111-8111-111111111111",
        messages: [{ id: "msg_1", role: "user", parts: [{ type: "text", text: "Hello" }] }],
      }).success,
    ).toBe(true);
  });
  it("does not treat six-digit pickup codes as tracking numbers", () => {
    expect(trackingNumbers("My code is 123456; track tsp-ab12-345678")).toEqual([
      "TSP-AB12-345678",
    ]);
  });
});
