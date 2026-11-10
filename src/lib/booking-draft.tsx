import { createContext, useContext, useState, type ReactNode, type Dispatch, type SetStateAction } from "react";

const initialBooking = {
  sender_name: "", sender_phone: "", sender_email: "", recipient_name: "", recipient_phone: "", recipient_email: "",
  pickup: "", destination: "", origin_agent: "none", dest_agent: "none", category: "", description: "", weight: "1",
  dimensions: "", instructions: "", payment: "ecocash",
};
type Draft = typeof initialBooking;
const BookingDraft = createContext<{ f: Draft; setF: Dispatch<SetStateAction<Draft>>; file: File | null; setFile: Dispatch<SetStateAction<File | null>> } | null>(null);

export function BookingDraftProvider({ children }: { children: ReactNode }) {
  const [f, setF] = useState(initialBooking);
  const [file, setFile] = useState<File | null>(null);
  return <BookingDraft.Provider value={{ f, setF, file, setFile }}>{children}</BookingDraft.Provider>;
}

export function useBookingDraft() {
  const draft = useContext(BookingDraft);
  if (!draft) throw new Error("Booking draft provider is missing");
  return draft;
}