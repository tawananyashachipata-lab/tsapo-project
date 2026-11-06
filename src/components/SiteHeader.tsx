import { Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useRoles, useSession } from "@/lib/auth";

export function SiteHeader() {
  const { user } = useSession();
  const { data: roles = [] } = useRoles(user?.id);
  const qc = useQueryClient();
  const navigate = useNavigate();
  const isAgent = roles.includes("agent");
  const isAdmin = roles.includes("admin") || roles.includes("main_admin");

  async function signOut() {
    await qc.cancelQueries();
    qc.clear();
    await supabase.auth.signOut();
    navigate({ to: "/auth", replace: true });
  }

  const link = "text-sm font-medium text-muted-foreground hover:text-primary [&.active]:text-primary";
  return (
    <header className="sticky top-0 z-40 border-b bg-background/90 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center gap-6 px-4">
        <Link to="/" className="flex items-center gap-2 font-display text-xl font-bold text-primary">
          <span className="grid h-9 w-9 place-items-center rounded-lg bg-primary text-primary-foreground">
            <Package className="h-5 w-5" />
          </span>
          Tsapo
        </Link>
        <nav className="hidden flex-1 items-center gap-5 md:flex">
          <Link to="/track" className={link}>Track</Link>
          <Link to="/agents" className={link}>Agents</Link>
          <Link to="/assistant" className={link}>Assistant</Link>
          {user && <Link to="/dashboard" className={link}>My parcels</Link>}
          {isAgent && <Link to="/agent" className={link}>Agent desk</Link>}
          {isAdmin && <Link to="/admin" className={link}>Admin</Link>}
        </nav>
        <div className="ml-auto flex items-center gap-2">
          {user ? (
            <>
              <Button asChild size="sm"><Link to="/book">Send a parcel</Link></Button>
              <Button size="sm" variant="ghost" onClick={signOut}>Sign out</Button>
            </>
          ) : (
            <>
              <Button asChild size="sm" variant="ghost"><Link to="/auth">Sign in</Link></Button>
              <Button asChild size="sm"><Link to="/book">Send a parcel</Link></Button>
            </>
          )}
        </div>
      </div>
      <nav className="flex gap-4 overflow-x-auto border-t px-4 py-2 md:hidden">
        <Link to="/track" className={link}>Track</Link>
        <Link to="/agents" className={link}>Agents</Link>
        <Link to="/assistant" className={link}>Assistant</Link>
        {user && <Link to="/dashboard" className={link}>My parcels</Link>}
        {isAgent && <Link to="/agent" className={link}>Agent</Link>}
        {isAdmin && <Link to="/admin" className={link}>Admin</Link>}
      </nav>
    </header>
  );
}
