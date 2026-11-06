import type { Database } from "@/integrations/supabase/types";

export type ParcelStatus = Database["public"]["Enums"]["parcel_status"];
export type AppRole = Database["public"]["Enums"]["app_role"];

export const STATUS_LABEL: Record<ParcelStatus, string> = {
  booking_received: "Booking received",
  awaiting_agent: "Awaiting drop-off",
  received_by_agent: "Received by agent",
  in_transit: "In transit",
  arrived_destination: "Arrived at destination",
  ready_for_collection: "Ready for collection",
  collected: "Collected",
  cancelled: "Cancelled",
};

export const STATUS_FLOW: ParcelStatus[] = [
  "awaiting_agent",
  "received_by_agent",
  "in_transit",
  "arrived_destination",
  "ready_for_collection",
  "collected",
];

export const PAYMENT_LABEL: Record<string, string> = {
  ecocash: "EcoCash",
  onemoney: "OneMoney",
  bank_transfer: "Bank transfer",
  cash_at_agent: "Cash at agent",
};

/** Normalise Zimbabwe phone input (07..., 7..., 263..., +263...) to +263XXXXXXXXX. */
export function normalizeZimPhone(input: string): string {
  const d = input.replace(/[^\d+]/g, "");
  if (d.startsWith("+263")) return d;
  if (d.startsWith("263")) return "+" + d;
  if (d.startsWith("0")) return "+263" + d.slice(1);
  return "+263" + d;
}

export function isZimPhone(input: string): boolean {
  return /^\+263[0-9]{9}$/.test(normalizeZimPhone(input));
}

export const usd = (n: number | null | undefined) => `$${Number(n ?? 0).toFixed(2)}`;
