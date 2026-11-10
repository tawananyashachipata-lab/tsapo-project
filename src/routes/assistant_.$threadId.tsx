import { createFileRoute } from "@tanstack/react-router";
import { AssistantPanel } from "@/components/TsapoAssistant";
import { pageHead } from "@/lib/page-head";

export const Route = createFileRoute("/assistant_/$threadId")({
  head: () => pageHead("Tsapo — Your parcel conversation", "Your Tsapo conversation about sending, tracking and collecting parcels."),
  component: ThreadPage,
});
function ThreadPage() {
  return <div className="mx-auto max-w-3xl px-4 py-8"><div className="flex h-[min(760px,calc(100dvh-10rem))] min-h-96 flex-col overflow-hidden rounded-lg border bg-card"><AssistantPanel /></div></div>;
}