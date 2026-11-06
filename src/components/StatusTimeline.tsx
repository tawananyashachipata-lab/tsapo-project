import { CheckCircle2, Circle } from "lucide-react";
import { STATUS_LABEL, type ParcelStatus } from "@/lib/tsapo";

type Ev = { status: ParcelStatus; location?: string | null; description: string; created_at: string };

export function StatusTimeline({ events }: { events: Ev[] }) {
  if (!events.length) return <p className="text-sm text-muted-foreground">No updates yet.</p>;
  return (
    <ol className="space-y-4">
      {[...events].reverse().map((e, i) => (
        <li key={i} className="flex gap-3">
          {i === 0 ? (
            <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-primary" />
          ) : (
            <Circle className="mt-0.5 h-5 w-5 shrink-0 text-muted-foreground" />
          )}
          <div>
            <p className="font-semibold">{STATUS_LABEL[e.status]}</p>
            <p className="text-sm text-muted-foreground">{e.description}</p>
            <p className="text-xs text-muted-foreground">
              {e.location ? `${e.location} · ` : ""}
              {new Date(e.created_at).toLocaleString("en-ZW")}
            </p>
          </div>
        </li>
      ))}
    </ol>
  );
}
