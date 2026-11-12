import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { StatusTimeline } from "@/components/StatusTimeline";
import { supabase } from "@/integrations/supabase/client";
import { STATUS_LABEL, type ParcelStatus } from "@/lib/tsapo";

export const Route = createFileRoute("/track")({
  validateSearch: z.object({ n: z.string().optional() }),
  head: () => ({
    meta: [{ property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }, 
      { title: "Track a parcel — Tsapo" },
      { name: "description", content: "Follow your Tsapo parcel from drop-off to collection." },
      { property: "og:title", content: "Track a parcel — Tsapo" },
      { property: "og:description", content: "Follow your Tsapo parcel from drop-off to collection." },
    ],
  }),
  component: TrackPage,
});

type Tracked = {
  tracking_number: string; status: ParcelStatus; expected_delivery: string | null; from: string; to: string;
  collection_point: { name: string; address: string; phone: string } | null;
  events: { status: ParcelStatus; location: string | null; description: string; created_at: string }[];
};

function TrackPage() {
  const { n } = Route.useSearch();
  const navigate = useNavigate({ from: "/track" });
  const [value, setValue] = useState(n ?? "");
  const q = useQuery({
    queryKey: ["track", n],
    enabled: !!n,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("track_parcel", { _tracking: n! });
      if (error) throw error;
      return data as unknown as Tracked | null;
    },
  });

  return (
    <div className="mx-auto max-w-2xl px-4 py-12">
      <h1 className="font-display text-3xl font-bold">Track a parcel</h1>
      <form className="mt-6 flex gap-2" onSubmit={(e) => { e.preventDefault(); navigate({ search: { n: value.trim().toUpperCase() } }); }}>
        <Input value={value} onChange={(e) => setValue(e.target.value)} placeholder="TSP-XXXX-XXXXXX" aria-label="Tracking number" />
        <Button type="submit">Track</Button>
      </form>
      {q.isLoading && <p className="mt-8 text-muted-foreground">Looking up…</p>}
      {q.error && <p className="mt-8 text-destructive">{(q.error as Error).message}</p>}
      {n && q.isSuccess && !q.data && <p className="mt-8 text-muted-foreground">No parcel found with tracking number {n}.</p>}
      {q.data && (
        <div className="mt-8 rounded-2xl border bg-card p-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-sm text-muted-foreground">Tracking number</p>
              <p className="font-display text-xl font-bold">{q.data.tracking_number}</p>
            </div>
            <Badge className="text-sm">{STATUS_LABEL[q.data.status]}</Badge>
          </div>
          <p className="mt-4 text-lg font-semibold">{q.data.from} → {q.data.to}</p>
          {q.data.expected_delivery && <p className="text-sm text-muted-foreground">Expected by {new Date(q.data.expected_delivery).toLocaleDateString("en-ZW")}</p>}
          {q.data.collection_point && (
            <div className="mt-4 rounded-lg bg-secondary p-3 text-sm">
              <p className="font-semibold">Collect at {q.data.collection_point.name}</p>
              <p>{q.data.collection_point.address} · {q.data.collection_point.phone}</p>
            </div>
          )}
          <div className="mt-6"><StatusTimeline events={q.data.events} /></div>
        </div>
      )}
    </div>
  );
}
