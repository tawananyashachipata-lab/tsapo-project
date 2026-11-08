import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";
import { STATUS_LABEL, PAYMENT_LABEL, usd, type ParcelStatus } from "@/lib/tsapo";

export const Route = createFileRoute("/_authenticated/agent")({
  head: () => ({ meta: [{ title: "Agent desk — Tsapo" }, { name: "description", content: "Receive, dispatch and hand over Tsapo parcels." }, { property: "og:title", content: "Agent desk — Tsapo" }, { property: "og:description", content: "Tsapo agent tools." }] }),
  component: AgentDesk,
});

const NEXT: Partial<Record<ParcelStatus, { to: ParcelStatus; label: string }>> = {
  awaiting_agent: { to: "received_by_agent", label: "Mark received" },
  received_by_agent: { to: "in_transit", label: "Dispatch" },
  in_transit: { to: "arrived_destination", label: "Mark arrived" },
  arrived_destination: { to: "ready_for_collection", label: "Ready for collection" },
};

function AgentDesk() {
  const qc = useQueryClient();
  const me = useQuery({ queryKey: ["my-agent"], queryFn: async () => (await supabase.rpc("my_agent_id")).data });
  const parcels = useQuery({
    queryKey: ["agent-parcels"],
    queryFn: async () => {
      const { data, error } = await supabase.from("parcels")
        .select("id,tracking_number,status,price_usd,payment_method,recipient_name,recipient_phone,sender_name,description,weight_kg,origin_agent_id,dest:locations!parcels_destination_location_id_fkey(name),pickup:locations!parcels_pickup_location_id_fkey(name),payments(id,status,method)")
        .not("status", "in", "(collected,cancelled)").order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });
  const [code, setCode] = useState({ t: "", c: "" });
  const refresh = () => qc.invalidateQueries({ queryKey: ["agent-parcels"] });

  async function advance(id: string, to: ParcelStatus) {
    const { error } = await supabase.rpc("update_parcel_status", { _parcel: id, _status: to, _note: "" });
    if (error) return toast.error(error.message);
    toast.success(STATUS_LABEL[to]); refresh();
  }
  async function confirmCash(paymentId: string) {
    const ref = prompt("Receipt number for the cash received");
    if (!ref) return;
    const { error } = await supabase.rpc("confirm_payment", { _payment: paymentId, _reference: ref });
    if (error) return toast.error(error.message);
    toast.success("Payment confirmed"); refresh();
  }
  async function verify(e: React.FormEvent) {
    e.preventDefault();
    const { data, error } = await supabase.rpc("verify_pickup", { _tracking: code.t.trim().toUpperCase(), _code: code.c.trim() });
    if (error) return toast.error(error.message);
    const r = data as { ok: boolean; message: string };
    if (r.ok) { toast.success(r.message); setCode({ t: "", c: "" }); refresh(); } else toast.error(r.message);
  }

  if (me.isSuccess && !me.data) return <p className="mx-auto max-w-xl px-4 py-16 text-center text-muted-foreground">Your agent account is not approved yet.</p>;

  return (
    <div className="mx-auto max-w-5xl px-4 py-12">
      <h1 className="font-display text-3xl font-bold">Agent desk</h1>
      <form onSubmit={verify} className="mt-6 flex flex-wrap items-end gap-2 rounded-xl bg-secondary p-5">
        <div className="flex-1"><p className="mb-1 text-sm font-semibold">Hand over a parcel</p><Input required placeholder="Tracking number" value={code.t} onChange={(e) => setCode({ ...code, t: e.target.value })} /></div>
        <Input required className="w-40" placeholder="6-digit code" inputMode="numeric" maxLength={6} value={code.c} onChange={(e) => setCode({ ...code, c: e.target.value })} />
        <Button>Verify & release</Button>
      </form>
      <div className="mt-6 space-y-3">
        {(parcels.data ?? []).map((p) => {
          const next = NEXT[p.status];
          const cash = p.payments?.find((x) => x.method === "cash_at_agent" && x.status === "pending");
          return (
            <div key={p.id} className="flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card p-4">
              <div>
                <p className="font-display font-bold">{p.tracking_number}</p>
                <p className="text-sm">{p.pickup?.name} → {p.dest?.name} · {p.description} · {p.weight_kg}kg</p>
                <p className="text-xs text-muted-foreground">From {p.sender_name} to {p.recipient_name} ({p.recipient_phone}) · {usd(p.price_usd)} {PAYMENT_LABEL[p.payment_method ?? ""] ?? ""}</p>
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary">{STATUS_LABEL[p.status]}</Badge>
                {cash && p.origin_agent_id === me.data && <Button size="sm" variant="outline" onClick={() => confirmCash(cash.id)}>Confirm cash</Button>}
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
