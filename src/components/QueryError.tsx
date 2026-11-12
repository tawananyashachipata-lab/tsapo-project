import { Button } from "@/components/ui/button";

export function QueryError({ error, retry }: { error: unknown; retry?: () => unknown }) {
  if (!error) return null;
  return (
    <div role="alert" className="my-4 flex flex-wrap items-center gap-3 text-sm text-destructive">
      <p>{error instanceof Error ? error.message : "This information could not be loaded."}</p>
      {retry && <Button type="button" size="sm" variant="outline" onClick={() => void retry()}>Try again</Button>}
    </div>
  );
}