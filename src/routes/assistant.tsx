import { createFileRoute } from "@tanstack/react-router";
import { AssistantPanel } from "@/components/TsapoAssistant";
import { pageHead } from "@/lib/page-head";

export const Route = createFileRoute("/assistant")({
  head: () =>
    pageHead(
      "Tsapo assistant — Parcel conversations",
      "Your saved conversations about parcel rates, pickup codes and tracking in Zimbabwe.",
    ),
  component: Assistant,
});
function Assistant() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8">
      <div className="flex h-[min(760px,calc(100dvh-10rem))] min-h-96 flex-col overflow-hidden rounded-lg border bg-card">
        <AssistantPanel />
      </div>
    </div>
  );
}
