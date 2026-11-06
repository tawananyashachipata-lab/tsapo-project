import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/auth";
import { isZimPhone, normalizeZimPhone } from "@/lib/tsapo";

export const Route = createFileRoute("/agents")({
  head: () => ({
    meta: [
      { title: "Tsapo agents near you" },
      { name: "description", content: "Find an approved Tsapo drop-off and collection agent in your town, or apply to become one." },
      { property: "og:title", content: "Tsapo agents near you" },
      { property: "og:description", content: "Find an approved Tsapo agent or apply to become one." },
    ],
  }),
  component: AgentsPage,
});

export function useLocations() {
  return useQuery({
    queryKey: ["locations"],
    queryFn: async () => {
      const { data, error } = await supabase.from("locations").select("id,name,province").eq("is_active", true).order("name");
      if (error) throw error;
      return data;
    },
  });
}

function AgentsPage() {
  const { user } = useSession();
  const qc = useQueryClient();
  const { data: locations = [] } = useLocations();
  const [town, setTown] = useState<string>("all");
  const agents = useQuery({
    queryKey: ["agents-public"],
    queryFn: async () => {
      const { data, error } = await supabase.from("agents").select("id,business_name,address,phone,status,user_id,location_id,locations(name)").order("business_name");
      if (error) throw error;
      return data;
    },
  });
  const approved = (agents.data ?? []).filter((a) => a.status === "approved" && (town === "all" || a.location_id === town));
  const mine = (agents.data ?? []).find((a) => a.user_id === user?.id);

  const [f, setF] = useState({ business_name: "", contact_name: "", phone: "", address: "", location_id: "" });
  async function apply(e: React.FormEvent) {
    e.preventDefault();
    if (!isZimPhone(f.phone)) return toast.error("Enter a Zimbabwean phone number");
    if (!f.location_id) return toast.error("Choose your town");
    const { error } = await supabase.from("agents").insert({ ...f, phone: normalizeZimPhone(f.phone), user_id: user!.id, email: user!.email, status: "pending" });
    if (error) return toast.error(error.message);
    toast.success("Application sent. An administrator will review it.");
    qc.invalidateQueries({ queryKey: ["agents-public"] });
  }

  return (
    <div className="mx-auto grid max-w-6xl gap-10 px-4 py-12 lg:grid-cols-[1fr_380px]">
      <div>
        <h1 className="font-display text-3xl font-bold">Tsapo agents</h1>
        <div className="mt-4 max-w-xs">
          <Select value={town} onValueChange={setTown}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All towns</SelectItem>
              {locations.map((l) => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div className="mt-6 grid gap-4 sm:grid-cols-2">
          {approved.map((a) => (
            <div key={a.id} className="rounded-xl border bg-card p-4">
              <p className="font-semibold">{a.business_name}</p>
              <p className="text-sm text-primary">{a.locations?.name}</p>
              <p className="text-sm text-muted-foreground">{a.address}</p>
              <p className="text-sm text-muted-foreground">{a.phone}</p>
            </div>
          ))}
          {!agents.isLoading && approved.length === 0 && <p className="text-muted-foreground">No approved agents here yet.</p>}
        </div>
      </div>
      <aside className="h-fit rounded-xl border bg-card p-6">
        <h2 className="font-display text-xl font-bold">Become an agent</h2>
        {!user ? (
          <p className="mt-2 text-sm text-muted-foreground"><Link to="/auth" className="text-primary underline">Sign in</Link> to apply.</p>
        ) : mine ? (
          <p className="mt-2 text-sm">Your application for <b>{mine.business_name}</b> is <b>{mine.status}</b>.</p>
        ) : (
          <form onSubmit={apply} className="mt-4 space-y-3">
            <div><Label>Business name</Label><Input required value={f.business_name} onChange={(e) => setF({ ...f, business_name: e.target.value })} /></div>
            <div><Label>Contact person</Label><Input required value={f.contact_name} onChange={(e) => setF({ ...f, contact_name: e.target.value })} /></div>
            <div><Label>Phone</Label><Input required placeholder="0771 234 567" value={f.phone} onChange={(e) => setF({ ...f, phone: e.target.value })} /></div>
            <div><Label>Town</Label>
              <Select value={f.location_id} onValueChange={(v) => setF({ ...f, location_id: v })}>
                <SelectTrigger><SelectValue placeholder="Choose town" /></SelectTrigger>
                <SelectContent>{locations.map((l) => <SelectItem key={l.id} value={l.id}>{l.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div><Label>Shop address</Label><Input required value={f.address} onChange={(e) => setF({ ...f, address: e.target.value })} /></div>
            <Button className="w-full">Submit application</Button>
          </form>
        )}
      </aside>
    </div>
  );
}
