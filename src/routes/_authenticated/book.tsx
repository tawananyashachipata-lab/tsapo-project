import { createFileRoute } from "@tanstack/react-router";
import { BookingForm } from "@/components/BookingForm";
import { pageHead } from "@/lib/page-head";

export const Route = createFileRoute("/_authenticated/book")({
  head: () =>
    pageHead(
      "Send a parcel — Tsapo",
      "Book a Tsapo parcel delivery with live assistance on rates, pickup codes and tracking.",
    ),
  component: BookingForm,
});
