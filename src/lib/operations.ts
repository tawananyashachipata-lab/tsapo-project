import type { User } from "@supabase/supabase-js";
import type { ParcelStatus } from "./tsapo";

export const SUPPORT_CATEGORIES = {
  question: "Question",
  missing: "Missing parcel",
  damaged: "Damaged parcel",
  other: "Other",
} as const;
export type SupportCategory = keyof typeof SUPPORT_CATEGORIES;

export function requireData<T>(result: { data: T; error: { message: string } | null }): T {
  if (result.error) throw new Error(result.error.message);
  return result.data;
}

export function isIncomingParcel(
  parcel: { sender_id: string; recipient_email: string | null; recipient_phone: string },
  user: User | null,
) {
  if (!user || parcel.sender_id === user.id) return false;
  return Boolean(
    (user.email_confirmed_at && user.email && parcel.recipient_email?.toLowerCase() === user.email.toLowerCase()) ||
      (user.phone_confirmed_at && user.phone && parcel.recipient_phone === `+${user.phone.replace(/^\+/, "")}`),
  );
}

export function agentNextAction(
  parcel: {
    status: ParcelStatus;
    origin_agent_id: string | null;
    destination_agent_id: string | null;
    pickup_location_id: string;
    destination_location_id: string;
  },
  agent: { id: string; location_id: string } | null | undefined,
): { to: ParcelStatus; label: string } | undefined {
  if (!agent) return;
  if (parcel.status === "awaiting_agent" && parcel.pickup_location_id === agent.location_id && (!parcel.origin_agent_id || parcel.origin_agent_id === agent.id))
    return { to: "received_by_agent", label: "Mark received" };
  if (parcel.status === "received_by_agent" && parcel.origin_agent_id === agent.id)
    return { to: "in_transit", label: "Dispatch" };
  if (parcel.status === "in_transit" && parcel.destination_location_id === agent.location_id && (!parcel.destination_agent_id || parcel.destination_agent_id === agent.id))
    return { to: "arrived_destination", label: "Mark arrived" };
  if (parcel.status === "arrived_destination" && parcel.destination_agent_id === agent.id)
    return { to: "ready_for_collection", label: "Ready for collection" };
}

export function validateParcelPhoto(file: Pick<File, "type" | "size">) {
  if (!["image/jpeg", "image/png", "image/webp"].includes(file.type))
    throw new Error("Choose a JPG, PNG or WebP photo.");
  if (file.size > 5 * 1024 * 1024) throw new Error("The photo must be 5 MB or smaller.");
}