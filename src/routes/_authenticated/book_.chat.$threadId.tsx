import { createFileRoute } from "@tanstack/react-router";
import { BookingForm } from "@/components/BookingForm";
import { pageHead } from "@/lib/page-head";

export const Route = createFileRoute("/_authenticated/book_/chat/$threadId")({
  head: () => pageHead("Tsapo — Booking and live help", "Book your parcel with live help on rates, pickup codes and tracking."),
  component: BookingForm,
});