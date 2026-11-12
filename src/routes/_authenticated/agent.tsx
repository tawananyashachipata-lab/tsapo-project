import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { STATUS_LABEL, PAYMENT_LABEL, usd, type ParcelStatus } from "@/lib/tsapo";
import { useSession } from "@/lib/auth";
import { agentNextAction, requireData } from "@/lib/operations";
import { QueryError } from "@/components/QueryError";
import { ParcelPhoto } from "@/components/ParcelPhoto";

export const Route = createFileRoute("/_authenticated/agent")({
  head: () => ({ meta: [{ property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }, { title: "Agent desk — Tsapo" }, { name: "description", content: "Receive, dispatch and hand over Tsapo parcels." }, { property: "og:title", content: "Agent desk — Tsapo" }, { property: "og:description", content: "Tsapo agent tools." }] }),
  component: AgentDesk,
});

function AgentDesk() {
  const { user } = useSession();
  const qc = useQueryClient();
  const me = useQuery({ queryKey: ["my-agent", user?.id], enabled: Boolean(user), queryFn: async () => { if (!user) return null; return requireData(await supabase.from("agents").select("id,location_id").eq("user_id",user.id).eq("status","approved").maybeSingle()); } });
  const parcels = useQuery({
    queryKey: ["agent-parcels", user?.id, me.data?.id],
    enabled: Boolean(me.data),
    queryFn: async () => {
      const { data, error } = await supabase.from("parcels")
        .select("id,tracking_number,status,price_usd,payment_method,recipient_name,recipient_phone,sender_name,description,weight_kg,origin_agent_id,destination_agent_id,pickup_location_id,destination_location_id,image_path,dest:locations!parcels_destination_location_id_fkey(name),pickup:locations!parcels_pickup_location_id_fkey(name),payments(id,status,method)")
        .not("status", "in", "(collected,cancelled)").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
  const [code, setCode] = useState({ t: "", c: "" });
  const [busy, setBusy] = useState(false);
  const refresh = () => { void qc.invalidateQueries({ queryKey: ["agent-parcels"] }); void qc.invalidateQueries({ queryKey: ["my-parcels"] }); void qc.invalidateQueries({ queryKey: ["track"] }); void qc.invalidateQueries({ queryKey: ["notes"] }); };

  async function advance(id: string, to: ParcelStatus) {
    const { error } = await supabase.rpc("update_parcel_status", { _parcel: id, _status: to, _note: "" });
    if (error) { toast.error(error.message); return; }
    toast.success(STATUS_LABEL[to]); refresh();
  }
  async function confirmCash(paymentId: string) {
    const ref = prompt("Receipt number for the cash received");
    if (!ref) return;
    const { error } = await supabase.rpc("confirm_payment", { _payment: paymentId, _reference: ref });
    if (error) { toast.error(error.message); return; }
    toast.success("Payment confirmed"); refresh();
  }
  async function verify(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    if (!/^\d{6}$/.test(code.c.trim())) { toast.error("Enter the six-digit pickup code"); return; }
    setBusy(true);
    const { data, error } = await supabase.rpc("verify_pickup", { _tracking: code.t.trim().toUpperCase(), _code: code.c.trim() });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    const r = data as { ok: boolean; message: string };
    if (r.ok) { toast.success(r.message); setCode({ t: "", c: "" }); refresh(); } else toast.error(r.message);
  }

  if (me.isSuccess && !me.data) return <p className="mx-auto max-w-xl px-4 py-16 text-center text-muted-foreground">Your agent account is not approved yet.</p>;

  return (
    <div className="mx-auto max-w-5xl px-4 py-12">
      <h1 className="font-display text-3xl font-bold">Agent desk</h1>
      <QueryError error={me.error || parcels.error} retry={() => { void me.refetch(); void parcels.refetch(); }} />
      <form onSubmit={verify} className="mt-6 flex flex-wrap items-end gap-2 rounded-xl bg-secondary p-5">
        <div className="flex-1"><p className="mb-1 text-sm font-semibold">Hand over a parcel</p><Input required placeholder="Tracking number" value={code.t} onChange={(e) => setCode({ ...code, t: e.target.value })} /></div>
        <Input required className="w-40" placeholder="6-digit code" aria-label="Pickup code" inputMode="numeric" pattern="[0-9]{6}" maxLength={6} value={code.c} onChange={(e) => setCode({ ...code, c: e.target.value })} />
        <Button disabled={busy}>{busy ? "Verifying…" : "Verify & release"}</Button>
      </form>
      <div className="mt-6 space-y-3">
        {(parcels.data ?? []).map((p) => {
          const next = agentNextAction(p, me.data);
          if (!next && p.origin_agent_id !== me.data?.id && p.destination_agent_id !== me.data?.id) return null;
          const cash = p.payments?.find((x) => x.method === "cash_at_agent" && x.status === "pending");
          return (
            <div key={p.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card p-4">
              <div>
                <p className="font-display font-bold">{p.tracking_number}</p>
                <p className="text-sm">{p.pickup?.name} → {p.dest?.name} · {p.description} · {p.weight_kg}kg</p>
                <p className="text-xs text-muted-foreground">From {p.sender_name} to {p.recipient_name} ({p.recipient_phone}) · {usd(p.price_usd)} {PAYMENT_LABEL[p.payment_method ?? ""] ?? ""}</p>
                <ParcelPhoto path={p.image_path} />
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary">{STATUS_LABEL[p.status]}</Badge>
                {cash && p.origin_agent_id === me.data?.id && <Button size="sm" variant="outline" onClick={() => confirmCash(cash.id)}>Confirm cash</Button>}
                {next && <Button size="sm" onClick={() => advance(p.id, next.to)}>{next.label}</Button>}
              </div>
            </div>
          );
        })}
        {!parcels.isLoading && !parcels.data?.length && <p className="text-muted-foreground">No parcels waiting for you.</p>}
      </div>
    </div>
  );
}
