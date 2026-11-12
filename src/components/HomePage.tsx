import { Link, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { MapPin, PackageCheck, ShieldCheck, Smartphone, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

export function HomePage() {
  const [code, setCode] = useState("");
  const navigate = useNavigate();
  return (
    <div>
      <section className="bg-hero text-primary-foreground">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-20 md:grid-cols-2 md:items-center">
          <div>
            <p className="mb-4 inline-block rounded-full bg-accent px-3 py-1 text-xs font-bold uppercase tracking-wide text-accent-foreground">
              Harare · Bulawayo · Mutare · and more
            </p>
            <h1 className="font-display text-4xl font-extrabold leading-tight md:text-6xl">
              Your parcel, from town to town.
            </h1>
            <p className="mt-5 max-w-md text-lg opacity-90">
              Drop it at a Tsapo agent, follow every step, and your recipient collects it with a
              secure pickup code.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg" variant="secondary">
                <Link to="/book">Send a parcel</Link>
              </Button>
              <Button
                asChild
                size="lg"
                variant="outline"
                className="border-primary-foreground/40 bg-transparent text-primary-foreground hover:bg-primary-foreground/10 hover:text-primary-foreground"
              >
                <Link to="/agents">Find an agent</Link>
              </Button>
            </div>
          </div>
          <form
            className="rounded-2xl bg-card p-6 text-card-foreground shadow-2xl"
            onSubmit={(e) => {
              e.preventDefault();
              if (code.trim()) navigate({ to: "/track", search: { n: code.trim().toUpperCase() } });
            }}
          >
            <h2 className="font-display text-xl font-bold">Track a parcel</h2>
            <p className="mt-1 text-sm text-muted-foreground">
              Enter the tracking number, e.g. TSP-AB12-345678
            </p>
            <div className="mt-4 flex gap-2">
              <Input
                value={code}
                onChange={(e) => setCode(e.target.value)}
                placeholder="TSP-XXXX-XXXXXX"
                aria-label="Tracking number"
              />
              <Button type="submit">
                <Search className="mr-1 h-4 w-4" />
                Track
              </Button>
            </div>
          </form>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-4 py-16">
        <h2 className="font-display text-3xl font-bold">How Tsapo works</h2>
        <div className="mt-8 grid gap-6 md:grid-cols-4">
          {[
            {
              icon: Smartphone,
              t: "Book online",
              d: "Enter sender, recipient and parcel details. See the price instantly.",
            },
            {
              icon: MapPin,
              t: "Drop off",
              d: "Take the parcel to your chosen Tsapo agent in your town.",
            },
            {
              icon: PackageCheck,
              t: "Track it",
              d: "Every hand-over is logged. Sender and recipient get updates.",
            },
            {
              icon: ShieldCheck,
              t: "Collect safely",
              d: "The recipient shows a 6-digit pickup code to collect.",
            },
          ].map((s, i) => (
            <div key={s.t} className="rounded-xl border bg-card p-6">
              <div className="flex items-center gap-3">
                <span className="font-display text-3xl font-extrabold text-accent">{i + 1}</span>
                <s.icon className="h-6 w-6 text-primary" />
              </div>
              <h3 className="mt-3 font-semibold">{s.t}</h3>
              <p className="mt-1 text-sm text-muted-foreground">{s.d}</p>
            </div>
          ))}
        </div>
      </section>

      <section className="bg-secondary">
        <div className="mx-auto flex max-w-6xl flex-col items-start gap-4 px-4 py-12 md:flex-row md:items-center md:justify-between">
          <div>
            <h2 className="font-display text-2xl font-bold text-secondary-foreground">
              Run a shop? Become a Tsapo agent.
            </h2>
            <p className="text-muted-foreground">
              Earn by receiving and handing over parcels in your town.
            </p>
          </div>
          <Button asChild>
            <Link to="/agents">Apply as an agent</Link>
          </Button>
        </div>
      </section>
    </div>
  );
}
