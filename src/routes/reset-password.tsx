import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useState } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { supabase } from "@/integrations/supabase/client";

export const Route = createFileRoute("/reset-password")({
  head: () => ({ meta: [{ property: "og:type", content: "website" }, { name: "twitter:card", content: "summary_large_image" }, { title: "Reset password — Tsapo" }, { name: "description", content: "Set a new Tsapo password." }, { property: "og:title", content: "Reset password — Tsapo" }, { property: "og:description", content: "Set a new Tsapo password." }] }),
  component: Reset,
});

function Reset() {
  const [pw, setPw] = useState("");
  const navigate = useNavigate();
  return (
    <form className="mx-auto max-w-md space-y-4 px-4 py-16" onSubmit={async (e) => {
      e.preventDefault();
      const { error } = await supabase.auth.updateUser({ password: pw });
      if (error) { toast.error(error.message); return; }
      toast.success("Password updated");
      navigate({ to: "/dashboard" });
    }}>
      <h1 className="font-display text-2xl font-bold">Choose a new password</h1>
      <Input type="password" minLength={8} required value={pw} onChange={(e) => setPw(e.target.value)} aria-label="New password" />
      <Button className="w-full">Save password</Button>
    </form>
  );
}
