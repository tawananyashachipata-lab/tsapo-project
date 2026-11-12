import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/auth";
import { QueryError } from "./QueryError";

export function ParcelPhoto({ path }: { path: string | null }) {
  const { user } = useSession();
  const photo = useQuery({
    queryKey: ["parcel-photo", user?.id, path],
    enabled: Boolean(user && path),
    staleTime: 240_000,
    queryFn: async () => {
      if (!path) return null;
      const { data, error } = await supabase.storage.from("parcel-images").createSignedUrl(path, 300);
      if (error) throw error;
      return data.signedUrl;
    },
  });
  if (!path) return null;
  return <><QueryError error={photo.error} retry={photo.refetch} />{photo.data && <a href={photo.data} target="_blank" rel="noreferrer" aria-label="View parcel photo"><img src={photo.data} alt="Parcel photo" className="mt-2 size-20 rounded-md border object-cover" /></a>}</>;
}