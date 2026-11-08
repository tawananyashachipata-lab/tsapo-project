import { createFileRoute } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { useRoles, useSession } from "@/lib/auth";
import { PAYMENT_LABEL, STATUS_LABEL, usd } from "@/lib/tsapo";

export const Route = createFileRoute("/_authenticated/admin")({
  head: () => ({ meta: [{ title: "Admin — Tsapo" }, { name: "description", content: "Manage Tsapo agents, payments and support." }, { property: "og:title", content: "Admin — Tsapo" }, { property: "og:description", content: "Tsapo administration." }] }),
  component: Admin,
});

function Admin() {
  const { user } = useSession();
  const { data: roles = [], isSuccess } = useRoles(user?.id);
  const qc = useQueryClient();
  const isAdmin = roles.includes("admin") || roles.includes("main_admin");
  const isMain = roles.includes("main_admin");

  const agents = useQuery({ queryKey: ["adm-agents"], enabled: isAdmin, queryFn: async () => (await supabase.from("agents").select("*,locations(name)").order("created_at", { ascending: false })).data ?? [] });
  const payments = useQuery({ queryKey: ["adm-pay"], enabled: isAdmin, queryFn: async () => (await supabase.from("payments").select("*,parcels(tracking_number)").eq("status", "pending").order("created_at", { ascending: false })).data ?? [] });
  const parcels = useQuery({ queryKey: ["adm-parcels"], enabled: isAdmin, queryFn: async () => (await supabase.from("parcels").select("id,tracking_number,status,price_usd,created_at").order("created_at", { ascending: false }).limit(100)).data ?? [] });
  const support = useQuery({ queryKey: ["adm-support"], enabled: isAdmin, queryFn: async () => (await supabase.from("support_requests").select("*").order("created_at", { ascending: false })).data ?? [] });
  const users = useQuery({ queryKey: ["adm-users"], enabled: isMain, queryFn: async () => {
    const [p, r] = await Promise.all([supabase.from("profiles").select("id,full_name,email"), supabase.from("user_roles").select("user_id,role")]);
    return (p.data ?? []).map((u) => ({ ...u, roles: (r.data ?? []).filter((x) => x.user_id === u.id).map((x) => x.role) }));
  } });

  if (isSuccess && !isAdmin) return <p className="py-16 text-center text-muted-foreground">Administrators only.</p>;
  const inv = (k: string) => qc.invalidateQueries({ queryKey: [k] });

  async function setAgent(id: string, status: string) {
    const { error } = await supabase.from("agents").update({ status }).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success(`Agent ${status}`); inv("adm-agents");
  }
  async function confirmPay(id: string) {
    const ref = prompt("Payment reference (EcoCash/OneMoney/bank ref)");
    if (!ref) return;
    const { error } = await supabase.rpc("confirm_payment", { _payment: id, _reference: ref });
    if (error) return toast.error(error.message);
    toast.success("Payment confirmed"); inv("adm-pay");
  }
  async function reply(id: string) {
    const text = prompt("Your reply");
    if (!text) return;
    const { error } = await supabase.from("support_requests").update({ admin_response: text, status: "resolved", responded_by: user!.id }).eq("id", id);
    if (error) return toast.error(error.message);
    inv("adm-support");
  }
  async function toggleAdmin(id: string, grant: boolean) {
    const { error } = await supabase.rpc("set_admin_role", { _user: id, _grant: grant });
    if (error) return toast.error(error.message);
    inv("adm-users");
  }

  const card = "flex flex-wrap items-center justify-between gap-3 rounded-xl border bg-card p-4";
  return (
    <div className="mx-auto max-w-5xl px-4 py-12">
      <h1 className="font-display text-3xl font-bold">Admin</h1>
      <Tabs defaultValue="agents" className="mt-6">
        <TabsList className="flex-wrap">
          <TabsTrigger value="agents">Agents</TabsTrigger>
          <TabsTrigger value="payments">Payments ({payments.data?.length ?? 0})</TabsTrigger>
          <TabsTrigger value="parcels">Parcels</TabsTrigger>
          <TabsTrigger value="support">Support</TabsTrigger>
          {isMain && <TabsTrigger value="users">Admins</TabsTrigger>}
        </TabsList>
        <TabsContent value="agents" className="space-y-3">
          {(agents.data ?? []).map((a) => (
            <div key={a.id} className={card}>
              <div><p className="font-semibold">{a.business_name} <Badge variant="outline">{a.status}</Badge></p>
                <p className="text-sm text-muted-foreground">{a.locations?.name} · {a.address} · {a.contact_name} {a.phone}</p></div>
              <div className="flex gap-2">
                {a.status !== "approved" && <Button size="sm" onClick={() => setAgent(a.id, "approved")}>Approve</Button>}
                {a.status !== "suspended" && <Button size="sm" variant="outline" onClick={() => setAgent(a.id, "suspended")}>Suspend</Button>}
              </div>
            </div>
          ))}
        </TabsContent>
        <TabsContent value="payments" className="space-y-3">
          {(payments.data ?? []).map((p) => (
            <div key={p.id} className={card}>
              <p>{p.parcels?.tracking_number} · {usd(p.amount_usd)} · {PAYMENT_LABEL[p.method]}</p>
              <Button size="sm" onClick={() => confirmPay(p.id)}>Confirm</Button>
            </div>
          ))}
          {!payments.data?.length && <p className="text-muted-foreground">No pending payments.</p>}
        </TabsContent>
        <TabsContent value="parcels" className="space-y-2">
          {(parcels.data ?? []).map((p) => (
            <div key={p.id} className={card}><p className="font-mono">{p.tracking_number}</p><p>{usd(p.price_usd)}</p><Badge variant="secondary">{STATUS_LABEL[p.status]}</Badge></div>
          ))}
        </TabsContent>
        <TabsContent value="support" className="space-y-3">
          {(support.data ?? []).map((r) => (
            <div key={r.id} className={card}>
              <div><p className="font-semibold">{r.subject} <Badge variant="outline">{r.status}</Badge></p><p className="text-sm text-muted-foreground">{r.message}</p>
                {r.admin_response && <p className="text-sm">Reply: {r.admin_response}</p>}</div>
              {!r.admin_response && <Button size="sm" onClick={() => reply(r.id)}>Reply</Button>}
            </div>
          ))}
        </TabsContent>
        {isMain && (
          <TabsContent value="users" className="space-y-2">
            {(users.data ?? []).map((u) => {
              const adm = u.roles.includes("admin");
              return (
                <div key={u.id} className={card}>
                  <p>{u.full_name || "—"} · {u.email} <span className="text-xs text-muted-foreground">{u.roles.join(", ")}</span></p>
                  {u.id !== user?.id && <Button size="sm" variant={adm ? "outline" : "default"} onClick={() => toggleAdmin(u.id, !adm)}>{adm ? "Remove admin" : "Make admin"}</Button>}
                </div>
              );
            })}
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
