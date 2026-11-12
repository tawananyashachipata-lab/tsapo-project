import { describe, expect, it } from "vitest";
import type { User } from "@supabase/supabase-js";
import { agentNextAction, isIncomingParcel, SUPPORT_CATEGORIES, validateParcelPhoto } from "./operations";

const agent = { id: "agent-a", location_id: "harare" };
const parcel = { status: "awaiting_agent" as const, origin_agent_id: null, destination_agent_id: null, pickup_location_id: "harare", destination_location_id: "bulawayo" };
describe("Shipment permissions", () => {
  it("offers receipt only to the pickup-town agent", () => {
    expect(agentNextAction(parcel, agent)?.to).toBe("received_by_agent");
    expect(agentNextAction(parcel, { ...agent, location_id: "bulawayo" })).toBeUndefined();
  });
  it("does not offer dispatch to the destination agent", () => {
    expect(agentNextAction({ ...parcel, status: "received_by_agent", origin_agent_id: "other-agent" }, agent)).toBeUndefined();
  });
  it("offers arrival only to the destination town and chosen agent", () => {
    expect(agentNextAction({ ...parcel, status: "in_transit" }, agent)).toBeUndefined();
    expect(agentNextAction({ ...parcel, status: "in_transit" }, { ...agent, location_id: "bulawayo" })?.to).toBe("arrived_destination");
  });
  it("uses verified identity, not admin-visible rows, for incoming parcels", () => {
    const user = { id: "recipient", email: "recipient@example.test", email_confirmed_at: "2026-11-12" } as User;
    const incoming = { sender_id: "sender", recipient_email: "recipient@example.test", recipient_phone: "+263771234567" };
    expect(isIncomingParcel(incoming, user)).toBe(true);
    expect(isIncomingParcel({ ...incoming, recipient_email: "other@example.test" }, user)).toBe(false);
    expect(isIncomingParcel(incoming, { ...user, email_confirmed_at: undefined })).toBe(false);
  });
});
describe("Submission validation", () => {
  it("uses categories the existing support database accepts", () => {
    expect(Object.keys(SUPPORT_CATEGORIES)).toEqual(["question", "missing", "damaged", "other"]);
  });
  it("accepts photos up to the existing 5 MB limit", () => {
    expect(() => validateParcelPhoto({ type: "image/png", size: 5 * 1024 * 1024 })).not.toThrow();
    expect(() => validateParcelPhoto({ type: "image/png", size: 5 * 1024 * 1024 + 1 })).toThrow();
  });
  it("rejects non-image and SVG uploads", () => {
    expect(() => validateParcelPhoto({ type: "image/svg+xml", size: 100 })).toThrow();
    expect(() => validateParcelPhoto({ type: "text/html", size: 100 })).toThrow();
  });
});