import { createFileRoute } from "@tanstack/react-router";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

export const Route = createFileRoute("/api/assistant")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const key = process.env["LOVABLE_API_KEY"];
        if (!key) return new Response("Assistant is not configured", { status: 500 });
        const url = process.env["SUPABASE_URL"];
        const publicKey = process.env["SUPABASE_PUBLISHABLE_KEY"];
        if (!url || !publicKey) return new Response("Assistant account access is not configured.", { status: 503 });
        const token = request.headers.get("Authorization")?.replace(/^Bearer /, "");
        if (!token || token.split(".").length !== 3) return new Response("Sign in to chat with Tsapo.", { status: 401 });
        if (request.headers.get("Origin") && request.headers.get("Origin") !== new URL(request.url).origin) return new Response("Request not allowed.", { status: 403 });
        const client = createClient<Database>(url, publicKey, { auth: { persistSession: false, autoRefreshToken: false }, global: { headers: { Authorization: `Bearer ${token}` }, fetch: (input, init) => { const headers = new Headers(init?.headers); headers.set("apikey", publicKey); return fetch(input, { ...init, headers }); } } });
        const { data, error } = await client.auth.getUser(token);
        if (error || !data.user) return new Response("Sign in to chat with Tsapo.", { status: 401 });
        try {
          const { handleAssistant } = await import("@/lib/server/assistant-response");
          return await handleAssistant(request, client, data.user.id, key);
        } catch (error) {
          if (request.signal.aborted) return new Response(null, { status: 499 });
          console.error("Tsapo assistant request failed", error instanceof Error ? error.name : "Unknown error");
          return new Response("The assistant could not connect. Please try again later.", { status: 503 });
        }
      },
    },
  },
});
