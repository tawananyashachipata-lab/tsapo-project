import { createFileRoute } from "@tanstack/react-router";
import { HomePage } from "@/components/HomePage";
import { pageHead } from "@/lib/page-head";

export const Route = createFileRoute("/")({
  head: () =>
    pageHead(
      "Tsapo — Send parcels anywhere in Zimbabwe",
      "Book, track and collect parcels between Zimbabwean towns, with live help on rates and pickup codes.",
    ),
  component: HomePage,
});
