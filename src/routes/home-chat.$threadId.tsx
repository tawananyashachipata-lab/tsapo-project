import { createFileRoute } from "@tanstack/react-router";
import { HomePage } from "@/components/HomePage";
import { pageHead } from "@/lib/page-head";

export const Route = createFileRoute("/home-chat/$threadId")({
  head: () => pageHead("Tsapo — Live parcel help", "Chat with Tsapo about rates, tracking and pickup while arranging a parcel delivery."),
  component: HomePage,
});