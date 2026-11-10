import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { supabase } from "@/integrations/supabase/client";
import { isZimPhone, normalizeZimPhone } from "@/lib/tsapo";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Sign in — Tsapo" },
      { name: "description", content: "Sign in or create your Tsapo account to send and receive parcels." },
      { property: "og:title", content: "Sign in — Tsapo" },
      { property: "og:description", content: "Sign in or create your Tsapo account." },
    ],
  }),
  component: AuthPage,
});

function AuthPage() {
  const navigate = useNavigate();
  const [busy, setBusy] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [isBusiness, setIsBusiness] = useState(false);
  const [business, setBusiness] = useState("");
  const [sent, setSent] = useState(false);

  async function signIn(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    navigate({ to: "/dashboard" });
  }

  async function signUp(e: React.FormEvent) {
    e.preventDefault();
    if (!isZimPhone(phone)) { toast.error("Enter a Zimbabwean phone number, e.g. 0771 234 567"); return; }
    setBusy(true);
    const { error } = await supabase.auth.signUp({
      email, password,
      options: {
        emailRedirectTo: window.location.origin,
        data: { full_name: name, phone: normalizeZimPhone(phone), is_business: isBusiness, business_name: isBusiness ? business : null },
      },
    });
    setBusy(false);
    if (error) { toast.error(error.message); return; }
    setSent(true);
  }

  async function forgot() {
    if (!email) { toast.error("Enter your email first"); return; }
    const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo: `${window.location.origin}/reset-password` });
    if (error) toast.error(error.message); else toast.success("Check your email for a reset link");
  }

  if (sent) return (
    <div className="mx-auto max-w-md px-4 py-20 text-center">
      <h1 className="font-display text-2xl font-bold">Check your email</h1>
      <p className="mt-2 text-muted-foreground">We sent a confirmation link to {email}. Click it, then sign in.</p>
    </div>
  );

  return (
    <div className="mx-auto max-w-md px-4 py-16">
      <h1 className="font-display text-3xl font-bold">Welcome to Tsapo</h1>
      <Tabs defaultValue="in" className="mt-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="in">Sign in</TabsTrigger>
          <TabsTrigger value="up">Create account</TabsTrigger>
        </TabsList>
        <TabsContent value="in">
          <form onSubmit={signIn} className="space-y-4 rounded-xl border bg-card p-6">
            <div><Label htmlFor="e1">Email</Label><Input id="e1" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></div>
            <div><Label htmlFor="p1">Password</Label><Input id="p1" type="password" required value={password} onChange={(e) => setPassword(e.target.value)} /></div>
            <Button className="w-full" disabled={busy}>Sign in</Button>
            <button type="button" onClick={forgot} className="w-full text-sm text-primary hover:underline">Forgot password?</button>
          </form>
        </TabsContent>
        <TabsContent value="up">
          <form onSubmit={signUp} className="space-y-4 rounded-xl border bg-card p-6">
            <div><Label htmlFor="n">Full name</Label><Input id="n" required value={name} onChange={(e) => setName(e.target.value)} /></div>
            <div><Label htmlFor="ph">Phone</Label><Input id="ph" required placeholder="0771 234 567" value={phone} onChange={(e) => setPhone(e.target.value)} /></div>
            <div><Label htmlFor="e2">Email</Label><Input id="e2" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} /></div>
            <div><Label htmlFor="p2">Password</Label><Input id="p2" type="password" minLength={8} required value={password} onChange={(e) => setPassword(e.target.value)} /></div>
            <label className="flex items-center gap-2 text-sm"><Checkbox checked={isBusiness} onCheckedChange={(v) => setIsBusiness(!!v)} /> I'm sending for a business</label>
            {isBusiness && <div><Label htmlFor="b">Business name</Label><Input id="b" required value={business} onChange={(e) => setBusiness(e.target.value)} /></div>}
            <Button className="w-full" disabled={busy}>Create account</Button>
          </form>
        </TabsContent>
      </Tabs>
    </div>
  );
}
