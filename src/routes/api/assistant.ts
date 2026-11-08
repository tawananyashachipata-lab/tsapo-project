import { createFileRoute } from "@tanstack/react-router";

const SYSTEM = `You are the Tsapo assistant, a friendly helper for Tsapo, a parcel delivery service in Zimbabwe.
How Tsapo works: senders book online, drop the parcel at an approved Tsapo agent in their town, the parcel travels to a destination agent, and the recipient collects it by showing a 6-digit pickup code.
Statuses: Awaiting drop-off, Received by agent, In transit, Arrived at destination, Ready for collection, Collected, Cancelled.
Payments: EcoCash, OneMoney, bank transfer or cash at the agent. Prices are in USD and depend on weight, category and whether it goes to another town.
Bookings can be cancelled only before an agent receives the parcel. Phone numbers must be Zimbabwean (+263).
Tracking numbers look like TSP-XXXX-123456; users can track at /track. Keep answers short and practical. If you don't know something, suggest contacting support from "My parcels".`;

export const Route = createFileRoute("/api/assistant")({
  server: {
    handlers: {
      POST: async ({ request }) => {
        const key = process.env["LOVABLE_API_KEY"];
        if (!key) return new Response("Assistant is not configured", { status: 500 });
        const body = (await request.json()) as { messages?: { role: string; content: string }[] };
        const messages = (body.messages ?? []).slice(-20).filter((m) => (m.role === "user" || m.role === "assistant") && typeof m.content === "string").map((m) => ({ role: m.role, content: m.content.slice(0, 4000) }));
        const upstream = await fetch("https://ai.gateway.lovable.dev/v1/responses", {
          method: "POST",
          signal: request.signal,
          headers: { "Content-Type": "application/json", "Lovable-API-Key": key, "X-Lovable-AIG-SDK": "fetch" },
          body: JSON.stringify({ model: "openai/gpt-6-astra", instructions: SYSTEM, input: messages, stream: true, store: false, reasoning: { effort: "low" } }),
        });
        if (!upstream.ok || !upstream.body) {
          const msg = upstream.status === 429 ? "The assistant is busy, please try again shortly." : upstream.status === 402 ? "The assistant is temporarily unavailable." : "The assistant could not answer right now.";
          return new Response(msg, { status: upstream.status });
        }
        const reader = upstream.body.getReader();
        const dec = new TextDecoder();
        const enc = new TextEncoder();
        let buf = "";
        const stream = new ReadableStream({
          async pull(ctrl) {
            const { done, value } = await reader.read();
            if (done) return ctrl.close();
            buf += dec.decode(value, { stream: true });
            const lines = buf.split("\n");
            buf = lines.pop() ?? "";
            for (const line of lines) {
              if (!line.startsWith("data:")) continue;
              try {
                const ev = JSON.parse(line.slice(5).trim());
                if (ev.type === "response.output_text.delta" && ev.delta) ctrl.enqueue(enc.encode(ev.delta));
              } catch { /* ignore keepalives */ }
            }
          },
          cancel() { reader.cancel(); },
        });
        return new Response(stream, { headers: { "Content-Type": "text/plain; charset=utf-8" } });
      },
    },
  },
});
