import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/auth";
import { STATUS_LABEL, usd } from "@/lib/tsapo";
import { isIncomingParcel, requireData, SUPPORT_CATEGORIES, type SupportCategory } from "@/lib/operations";
import { QueryError } from "@/components/QueryError";
import { ParcelPhoto } from "@/components/ParcelPhoto";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/dashboard")({
  head: () => ({ meta: [{ property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }, { title: "My parcels — Tsapo" }, { name: "description", content: "Your sent and incoming Tsapo parcels." }, { property: "og:title", content: "My parcels — Tsapo" }, { property: "og:description", content: "Your sent and incoming Tsapo parcels." }] }),
  component: Dashboard,
});

function Dashboard() {
  const { user } = useSession();
  const qc = useQueryClient();
  const parcels = useQuery({
    queryKey: ["my-parcels", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.from("parcels")
        .select("id,tracking_number,status,price_usd,sender_id,recipient_name,recipient_email,recipient_phone,sender_name,created_at,payment_method,image_path,pickup:locations!parcels_pickup_location_id_fkey(name),dest:locations!parcels_destination_location_id_fkey(name),pickup_codes(code),payments(status)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
  const notes = useQuery({ queryKey: ["notes", user?.id], enabled: !!user, queryFn: async () => requireData(await supabase.from("notifications").select("*").order("created_at", { ascending: false }).limit(30)) ?? [] });
  const support = useQuery({ queryKey: ["support", user?.id], enabled: !!user, queryFn: async () => { if (!user) return []; return requireData(await supabase.from("support_requests").select("*").eq("user_id", user.id).order("created_at", { ascending: false })) ?? []; } });

  const sent = (parcels.data ?? []).filter((p) => p.sender_id === user?.id);
  const incoming = (parcels.data ?? []).filter((p) => isIncomingParcel(p, user));
  const unread = (notes.data ?? []).filter((n) => !n.read).length;

  async function cancel(id: string) {
    const { error } = await supabase.rpc("cancel_booking", { _parcel: id });
    if (error) { toast.error(error.message); return; }
    toast.success("Booking cancelled");
    qc.invalidateQueries({ queryKey: ["my-parcels"] });
    qc.invalidateQueries({ queryKey: ["notes"] });
  }

  const [s, setS] = useState({ subject: "", message: "", parcel: "", category: "question" as SupportCategory });
  const [sending, setSending] = useState(false);
  async function sendSupport(e: React.FormEvent) {
    e.preventDefault();
    if (!user || sending) return;
    setSending(true);
    const { error } = await supabase.from("support_requests").insert({ user_id: user.id, subject: s.subject.trim(), message: s.message.trim(), category: s.category, parcel_tracking: s.parcel.trim() || null });
    setSending(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Request sent");
    setS({ subject: "", message: "", parcel: "", category: "question" });
    qc.invalidateQueries({ queryKey: ["support"] });
  }

  const Row = ({ p, mine }: { p: (typeof sent)[number]; mine: boolean }) => (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card p-4">
      <div>
        <Link to="/track" search={{ n: p.tracking_number }} className="font-display font-bold text-primary hover:underline">{p.tracking_number}</Link>
        <p className="text-sm">{p.pickup?.name} → {p.dest?.name} · {mine ? `to ${p.recipient_name}` : `from ${p.sender_name}`}</p>
        <p className="text-xs text-muted-foreground">{new Date(p.created_at).toLocaleDateString("en-ZW")} · {usd(p.price_usd)}</p>
        <p className="text-xs text-muted-foreground">Payment: {p.payments?.[0]?.status ?? "Unavailable"}</p>
        <ParcelPhoto path={p.image_path} />
      </div>
      <div className="flex items-center gap-2">
        {p.pickup_codes?.code && p.status !== "collected" && <span className="rounded-md bg-accent px-2 py-1 font-mono text-sm font-bold text-accent-foreground">Code {p.pickup_codes.code}</span>}
        <Badge variant={p.status === "cancelled" ? "destructive" : "secondary"}>{STATUS_LABEL[p.status]}</Badge>
        {mine && (p.status === "awaiting_agent" || p.status === "booking_received") && <Button size="sm" variant="outline" onClick={() => cancel(p.id)}>Cancel</Button>}
      </div>
    </div>
  );

  return (
    <div className="mx-auto max-w-5xl px-4 py-12">
      <div className="flex items-center justify-between">
        <h1 className="font-display text-3xl font-bold">My parcels</h1>
        <Button asChild><Link to="/book">Send a parcel</Link></Button>
      </div>
      <QueryError error={parcels.error || notes.error || support.error} retry={() => { void parcels.refetch(); void notes.refetch(); void support.refetch(); }} />
      <Tabs defaultValue="sent" className="mt-6">
        <TabsList>
          <TabsTrigger value="sent">Sent ({sent.length})</TabsTrigger>
          <TabsTrigger value="incoming">Incoming ({incoming.length})</TabsTrigger>
          <TabsTrigger value="notes">Updates{unread ? ` (${unread})` : ""}</TabsTrigger>
          <TabsTrigger value="help">Help</TabsTrigger>
        </TabsList>
        <TabsContent value="sent" className="space-y-3">
          {sent.map((p) => <Row key={p.id} p={p} mine />)}
          {parcels.isLoading && <p className="text-muted-foreground">Loading parcels…</p>}
          {parcels.isSuccess && !sent.length && <p className="text-muted-foreground">You haven't sent any parcels yet.</p>}
        </TabsContent>
        <TabsContent value="incoming" className="space-y-3">
          {incoming.map((p) => <Row key={p.id} p={p} mine={false} />)}
          {parcels.isSuccess && !incoming.length && <p className="text-muted-foreground">No parcels addressed to your verified email or phone yet.</p>}
        </TabsContent>
        <TabsContent value="notes" className="space-y-2">
          {(notes.data ?? []).map((n) => (
            <div key={n.id} className={`rounded-lg border p-3 ${n.read ? "" : "border-primary bg-secondary"}`}
              >
              <p className="font-semibold">{n.title}</p><p className="text-sm text-muted-foreground">{n.body}</p>
              <p className="text-xs text-muted-foreground">{new Date(n.created_at).toLocaleString("en-ZW")}</p>
              {!n.read && <Button type="button" size="sm" variant="ghost" onClick={async () => { const { error } = await supabase.from("notifications").update({ read: true }).eq("id", n.id); if (error) { toast.error(error.message); return; } void qc.invalidateQueries({ queryKey: ["notes"] }); }}>Mark read</Button>}
            </div>
          ))}
          {!notes.data?.length && <p className="text-muted-foreground">No updates yet.</p>}
        </TabsContent>
        <TabsContent value="help" className="grid gap-6 md:grid-cols-2">
          <form onSubmit={sendSupport} className="space-y-3 rounded-xl border bg-card p-5">
            <h2 className="font-semibold">Contact support</h2>
            <Select value={s.category} onValueChange={(v) => setS({ ...s, category: v as SupportCategory })}><SelectTrigger aria-label="Support category"><SelectValue /></SelectTrigger><SelectContent>{Object.entries(SUPPORT_CATEGORIES).map(([id, name]) => <SelectItem key={id} value={id}>{name}</SelectItem>)}</SelectContent></Select>
            <Input required placeholder="Subject" value={s.subject} onChange={(e) => setS({ ...s, subject: e.target.value })} />
            <Input placeholder="Tracking number (optional)" value={s.parcel} onChange={(e) => setS({ ...s, parcel: e.target.value })} />
            <Textarea required placeholder="How can we help?" value={s.message} onChange={(e) => setS({ ...s, message: e.target.value })} />
            <Button disabled={sending}>{sending ? "Sending…" : "Send"}</Button>
          </form>
          <div className="space-y-2">
            {(support.data ?? []).map((r) => (
              <div key={r.id} className="rounded-lg border p-3">
                <p className="font-semibold">{r.subject} <Badge variant="outline">{r.status}</Badge></p>
                <p className="text-sm text-muted-foreground">{r.message}</p>
                {r.admin_response && <p className="mt-2 rounded bg-secondary p-2 text-sm">Reply: {r.admin_response}</p>}
              </div>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}
