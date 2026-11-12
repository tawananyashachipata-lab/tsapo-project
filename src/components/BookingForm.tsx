import { Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { useLocations } from "@/routes/agents";
import { isZimPhone, normalizeZimPhone, PAYMENT_LABEL, usd } from "@/lib/tsapo";
import { useBookingDraft } from "@/lib/booking-draft";

const NONE = "none";

export function BookingForm() {
  const { data: locations = [] } = useLocations();
  const cats = useQuery({
    queryKey: ["cats"],
    queryFn: async () =>
      (await supabase.from("parcel_categories").select("id,name").order("name")).data ?? [],
  });
  const agents = useQuery({
    queryKey: ["agents-approved"],
    queryFn: async () =>
      (
        await supabase
          .from("agents")
          .select("id,business_name,location_id")
          .eq("status", "approved")
      ).data ?? [],
  });
  const profile = useQuery({
    queryKey: ["me"],
    queryFn: async () => {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) return null;
      return (await supabase.from("profiles").select("*").eq("id", u.user.id).maybeSingle()).data;
    },
  });

  const { f, setF, file, setFile } = useBookingDraft();
  const set = (k: keyof typeof f) => (v: string) => setF((p) => ({ ...p, [k]: v }));
  useEffect(() => {
    const data = profile.data;
    if (data)
      setF((p) => ({
        ...p,
        sender_name: p.sender_name || data.full_name || "",
        sender_phone: p.sender_phone || data.phone || "",
        sender_email: p.sender_email || data.email || "",
      }));
  }, [profile.data, setF]);

  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState<{ tracking_number: string; price_usd: number } | null>(null);

  const quote = useQuery({
    queryKey: ["quote", f.weight, f.category, f.pickup, f.destination],
    enabled: !!(f.pickup && f.destination && f.category && Number(f.weight) > 0),
    queryFn: async () =>
      (
        await supabase.rpc("quote_price", {
          _weight: Number(f.weight),
          _category: f.category,
          _from: f.pickup,
          _to: f.destination,
        })
      ).data,
  });

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!isZimPhone(f.sender_phone) || !isZimPhone(f.recipient_phone)) {
      toast.error("Phone numbers must be Zimbabwean (+263)");
      return;
    }
    if (!f.pickup || !f.destination || !f.category) {
      toast.error("Choose towns and a category");
      return;
    }
    setBusy(true);
    let image_path = "";
    if (file) {
      const { data: u } = await supabase.auth.getUser();
      if (!u.user) {
        setBusy(false);
        toast.error("Sign in to send a parcel");
        return;
      }
      const path = `${u.user.id}/${crypto.randomUUID()}-${file.name}`;
      const up = await supabase.storage.from("parcel-images").upload(path, file);
      if (up.error) {
        setBusy(false);
        {
          toast.error(up.error.message);
          return;
        }
      }
      image_path = path;
    }
    const { data, error } = await supabase.rpc("create_booking", {
      _sender_name: f.sender_name,
      _sender_phone: normalizeZimPhone(f.sender_phone),
      _sender_email: f.sender_email,
      _recipient_name: f.recipient_name,
      _recipient_phone: normalizeZimPhone(f.recipient_phone),
      _recipient_email: f.recipient_email,
      _pickup: f.pickup,
      _destination: f.destination,
      _origin_agent: (f.origin_agent === NONE ? null : f.origin_agent) as string,
      _dest_agent: (f.dest_agent === NONE ? null : f.dest_agent) as string,
      _category: f.category,
      _description: f.description,
      _weight: Number(f.weight),
      _dimensions: f.dimensions,
      _instructions: f.instructions,
      _image_path: (image_path || null) as string,
      _payment_method: f.payment,
    });
    setBusy(false);
    if (error) {
      toast.error(error.message);
      return;
    }
    setDone(data as { tracking_number: string; price_usd: number });
  }

  if (done)
    return (
      <div className="mx-auto max-w-lg px-4 py-16 text-center">
        <h1 className="font-display text-3xl font-bold text-primary">Booking confirmed</h1>
        <p className="mt-4 text-muted-foreground">Your tracking number</p>
        <p className="font-display text-3xl font-extrabold">{done.tracking_number}</p>
        <p className="mt-2">
          Amount due: <b>{usd(done.price_usd)}</b> via {PAYMENT_LABEL[f.payment]}
        </p>
        <p className="mt-4 text-sm text-muted-foreground">
          Take the parcel to your drop-off agent. The recipient's pickup code is in your parcel
          details — share it only with them.
        </p>
        <div className="mt-6 flex justify-center gap-3">
          <Button asChild>
            <Link to="/dashboard">My parcels</Link>
          </Button>
          <Button variant="outline" onClick={() => setDone(null)}>
            Send another
          </Button>
        </div>
      </div>
    );

  const agentsIn = (loc: string) => (agents.data ?? []).filter((a) => a.location_id === loc);
  const Sel = ({
    v,
    on,
    items,
    ph,
  }: {
    v: string;
    on: (v: string) => void;
    items: { id: string; name: string }[];
    ph: string;
  }) => (
    <Select value={v} onValueChange={on}>
      <SelectTrigger>
        <SelectValue placeholder={ph} />
      </SelectTrigger>
      <SelectContent>
        {items.map((i) => (
          <SelectItem key={i.id} value={i.id}>
            {i.name}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );

  return (
    <form onSubmit={submit} className="mx-auto max-w-3xl space-y-8 px-4 py-12">
      <h1 className="font-display text-3xl font-bold">Send a parcel</h1>
      <section className="grid gap-4 rounded-xl border bg-card p-6 sm:grid-cols-2">
        <h2 className="font-semibold sm:col-span-2">Sender</h2>
        <div>
          <Label>Name</Label>
          <Input
            required
            value={f.sender_name}
            onChange={(e) => set("sender_name")(e.target.value)}
          />
        </div>
        <div>
          <Label>Phone</Label>
          <Input
            required
            placeholder="0771 234 567"
            value={f.sender_phone}
            onChange={(e) => set("sender_phone")(e.target.value)}
          />
        </div>
        <div className="sm:col-span-2">
          <Label>Email</Label>
          <Input
            type="email"
            value={f.sender_email}
            onChange={(e) => set("sender_email")(e.target.value)}
          />
        </div>
      </section>
      <section className="grid gap-4 rounded-xl border bg-card p-6 sm:grid-cols-2">
        <h2 className="font-semibold sm:col-span-2">Recipient</h2>
        <div>
          <Label>Name</Label>
          <Input
            required
            value={f.recipient_name}
            onChange={(e) => set("recipient_name")(e.target.value)}
          />
        </div>
        <div>
          <Label>Phone</Label>
          <Input
            required
            placeholder="0771 234 567"
            value={f.recipient_phone}
            onChange={(e) => set("recipient_phone")(e.target.value)}
          />
        </div>
        <div className="sm:col-span-2">
          <Label>Email (optional)</Label>
          <Input
            type="email"
            value={f.recipient_email}
            onChange={(e) => set("recipient_email")(e.target.value)}
          />
        </div>
      </section>
      <section className="grid gap-4 rounded-xl border bg-card p-6 sm:grid-cols-2">
        <h2 className="font-semibold sm:col-span-2">Route</h2>
        <div>
          <Label>From town</Label>
          <Sel
            v={f.pickup}
            on={(v) => setF((p) => ({ ...p, pickup: v, origin_agent: NONE }))}
            items={locations}
            ph="Choose town"
          />
        </div>
        <div>
          <Label>To town</Label>
          <Sel
            v={f.destination}
            on={(v) => setF((p) => ({ ...p, destination: v, dest_agent: NONE }))}
            items={locations}
            ph="Choose town"
          />
        </div>
        <div>
          <Label>Drop-off agent</Label>
          <Sel
            v={f.origin_agent}
            on={set("origin_agent")}
            items={[
              { id: NONE, name: "Any agent" },
              ...agentsIn(f.pickup).map((a) => ({ id: a.id, name: a.business_name })),
            ]}
            ph="Any agent"
          />
        </div>
        <div>
          <Label>Collection agent</Label>
          <Sel
            v={f.dest_agent}
            on={set("dest_agent")}
            items={[
              { id: NONE, name: "Any agent" },
              ...agentsIn(f.destination).map((a) => ({ id: a.id, name: a.business_name })),
            ]}
            ph="Any agent"
          />
        </div>
      </section>
      <section className="grid gap-4 rounded-xl border bg-card p-6 sm:grid-cols-2">
        <h2 className="font-semibold sm:col-span-2">Parcel</h2>
        <div>
          <Label>Category</Label>
          <Sel v={f.category} on={set("category")} items={cats.data ?? []} ph="Choose category" />
        </div>
        <div>
          <Label>Weight (kg)</Label>
          <Input
            type="number"
            min="0.1"
            max="200"
            step="0.1"
            required
            value={f.weight}
            onChange={(e) => set("weight")(e.target.value)}
          />
        </div>
        <div className="sm:col-span-2">
          <Label>What's inside</Label>
          <Input
            required
            value={f.description}
            onChange={(e) => set("description")(e.target.value)}
          />
        </div>
        <div>
          <Label>Size (optional)</Label>
          <Input
            placeholder="40×30×20 cm"
            value={f.dimensions}
            onChange={(e) => set("dimensions")(e.target.value)}
          />
        </div>
        <div>
          <Label>Photo (optional)</Label>
          <Input
            type="file"
            accept="image/*"
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
        </div>
        <div className="sm:col-span-2">
          <Label>Special instructions</Label>
          <Textarea value={f.instructions} onChange={(e) => set("instructions")(e.target.value)} />
        </div>
      </section>
      <section className="flex flex-wrap items-end justify-between gap-4 rounded-xl bg-secondary p-6">
        <div className="w-56">
          <Label>Payment</Label>
          <Sel
            v={f.payment}
            on={set("payment")}
            items={Object.entries(PAYMENT_LABEL).map(([id, name]) => ({ id, name }))}
            ph=""
          />
        </div>
        <div className="text-right">
          <p className="text-sm text-muted-foreground">Price</p>
          <p className="font-display text-3xl font-extrabold">
            {quote.data != null ? usd(quote.data) : "—"}
          </p>
        </div>
        <Button size="lg" disabled={busy} className="w-full sm:w-auto">
          {busy ? "Booking…" : "Confirm booking"}
        </Button>
      </section>
    </form>
  );
}
