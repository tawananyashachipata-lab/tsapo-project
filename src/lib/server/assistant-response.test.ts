import { describe, expect, it, vi } from "vitest";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";
import { handleAssistant } from "./assistant-response";

describe("Private assistant conversation access", () => {
  it("rejects a conversation that is not owned by the authenticated sender before calling AI", async () => {
    const eq = vi.fn().mockReturnThis();
    const maybeSingle = vi.fn().mockResolvedValue({ data: null, error: null });
    const select = vi.fn(() => ({ eq, maybeSingle }));
    const client = { from: vi.fn(() => ({ select })) } as unknown as SupabaseClient<Database>;
    const response = await handleAssistant(
      new Request("http://localhost/api/assistant", {
        method: "POST",
        body: JSON.stringify({
          threadId: "11111111-1111-4111-8111-111111111111",
          messages: [
            {
              id: "msg_private",
              role: "user",
              parts: [{ type: "text", text: "Show this conversation" }],
            },
          ],
        }),
      }),
      client,
      "22222222-2222-4222-8222-222222222222",
      "unused-test-key",
    );
    expect(response.status).toBe(404);
    expect(eq).toHaveBeenCalledWith("user_id", "22222222-2222-4222-8222-222222222222");
    expect(client.from).toHaveBeenCalledTimes(1);
  });
});
