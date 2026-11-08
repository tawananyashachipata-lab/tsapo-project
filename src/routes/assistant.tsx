import { createFileRoute } from "@tanstack/react-router";
import { useRef, useState } from "react";
import { Bot, Send } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";

export const Route = createFileRoute("/assistant")({
  head: () => ({ meta: [{ title: "Tsapo assistant — ask about your parcel" }, { name: "description", content: "Ask the Tsapo assistant about sending, tracking, paying for and collecting parcels." }, { property: "og:title", content: "Tsapo assistant" }, { property: "og:description", content: "Answers about sending and collecting parcels in Zimbabwe." }] }),
  component: Assistant,
});

type Msg = { role: "user" | "assistant"; content: string };

function Assistant() {
  const [msgs, setMsgs] = useState<Msg[]>([{ role: "assistant", content: "Mhoro! I'm the Tsapo assistant. Ask me how to send, track, pay for or collect a parcel." }]);
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const end = useRef<HTMLDivElement>(null);

  async function send() {
    const q = text.trim();
    if (!q || busy) return;
    const next: Msg[] = [...msgs, { role: "user", content: q }];
    setMsgs([...next, { role: "assistant", content: "" }]);
    setText(""); setBusy(true);
    try {
      const res = await fetch("/api/assistant", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ messages: next.slice(1) }) });
      if (!res.ok || !res.body) throw new Error(await res.text());
      const reader = res.body.getReader(); const dec = new TextDecoder(); let acc = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += dec.decode(value, { stream: true });
        setMsgs([...next, { role: "assistant", content: acc }]);
        end.current?.scrollIntoView({ block: "end" });
      }
    } catch (e) {
      setMsgs([...next, { role: "assistant", content: (e as Error).message || "Something went wrong." }]);
    } finally { setBusy(false); }
  }

  return (
    <div className="mx-auto flex max-w-2xl flex-col px-4 py-10">
      <h1 className="flex items-center gap-2 font-display text-3xl font-bold"><Bot className="h-7 w-7 text-primary" />Tsapo assistant</h1>
      <div className="mt-6 flex-1 space-y-4">
        {msgs.map((m, i) => (
          <div key={i} className={m.role === "user" ? "ml-auto max-w-[80%] rounded-2xl bg-primary px-4 py-2 text-primary-foreground" : "max-w-[90%] whitespace-pre-wrap"}>
            {m.content || <span className="text-muted-foreground">Thinking…</span>}
          </div>
        ))}
        <div ref={end} />
      </div>
      <form className="mt-6 flex items-end gap-2" onSubmit={(e) => { e.preventDefault(); send(); }}>
        <Textarea value={text} onChange={(e) => setText(e.target.value)} placeholder="How do I collect a parcel?" rows={2}
          onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); send(); } }} />
        <Button size="icon" disabled={busy} aria-label="Send"><Send className="h-4 w-4" /></Button>
      </form>
    </div>
  );
}
