import { z } from "zod";
import type { UIMessage } from "ai";

export const chatMessageSchema = z.object({
  id: z.string().min(1).max(150),
  role: z.enum(["user", "assistant"]),
  parts: z.array(z.object({ type: z.literal("text"), text: z.string().max(8000) })).max(10),
});
export const assistantRequestSchema = z.object({
  threadId: z.string().uuid(),
  messages: z.array(chatMessageSchema).min(1).max(100),
  booking: z.object({
    weight: z.number().positive().max(200),
    category: z.string().uuid(),
    from: z.string().uuid(),
    to: z.string().uuid(),
  }).optional(),
});

export const messageText = (message: UIMessage) => message.parts
  .filter((part) => part.type === "text").map((part) => part.text).join("");

export function savedMessages(values: unknown[]): UIMessage[] {
  return values.flatMap((value) => {
    const parsed = chatMessageSchema.safeParse(value);
    return parsed.success ? [parsed.data] : [];
  });
}

export function trackingNumbers(text: string): string[] {
  return [...new Set(text.toUpperCase().match(/\bTSP-[A-Z0-9]{4}-\d{6}\b/g) ?? [])].slice(0, 3);
}

export type BookingQuoteContext = z.infer<typeof assistantRequestSchema>["booking"];