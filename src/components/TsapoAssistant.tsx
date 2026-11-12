import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams, useRouterState } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useChat } from "@ai-sdk/react";
import { TextStreamChatTransport, type UIMessage } from "ai";
import { ArrowUpRight, History, MessageCircle, Plus, Trash2, X } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import { Message, MessageContent, MessageResponse } from "@/components/ai-elements/message";
import {
  PromptInput,
  PromptInputTextarea,
  PromptInputFooter,
  PromptInputSubmit,
} from "@/components/ai-elements/prompt-input";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { supabase } from "@/integrations/supabase/client";
import { useSession } from "@/lib/auth";
import { useBookingDraft } from "@/lib/booking-draft";
import { savedMessages, type BookingQuoteContext } from "@/lib/assistant";
import { decodeAssistantStream } from "@/lib/assistant-stream";
import assistantLogo from "@/assets/tsapo-assistant.jpg";

type Surface = "home" | "book" | "assistant";

export function AssistantWidget() {
  const path = useRouterState({ select: (state) => state.location.pathname });
  const eligible =
    path === "/" ||
    path.startsWith("/home-chat/") ||
    path === "/book" ||
    path.startsWith("/book/chat/");
  const params = useParams({ strict: false });
  const [open, setOpen] = useState(false);
  useEffect(() => {
    if (params.threadId) setOpen(true);
  }, [params.threadId]);
  if (!eligible) return null;
  const surface = path.startsWith("/book") ? "book" : "home";
  return open ? (
    <aside
      role="dialog"
      aria-label="Tsapo live chat"
      className="fixed bottom-4 right-4 z-50 flex h-[min(640px,calc(100dvh-2rem))] w-[min(410px,calc(100vw-2rem))] flex-col overflow-hidden rounded-lg border bg-card shadow-xl"
    >
      <AssistantPanel surface={surface} onClose={() => setOpen(false)} />
    </aside>
  ) : (
    <Button
      type="button"
      onClick={() => setOpen(true)}
      aria-label="Open Tsapo live chat"
      className="fixed bottom-5 right-5 z-50 h-12 gap-3 rounded-lg px-4 shadow-lg"
    >
      <MessageCircle className="size-5" />
      Ask Tsapo
    </Button>
  );
}

export function AssistantPanel({
  surface = "assistant",
  onClose,
}: {
  surface?: Surface;
  onClose?: () => void;
}) {
  const { user, ready } = useSession();
  const params = useParams({ strict: false });
  const threadId = params.threadId;
  const navigate = useNavigate();
  const qc = useQueryClient();
  const [showHistory, setShowHistory] = useState(false);
  const [creating, setCreating] = useState(false);
  const { f } = useBookingDraft();
  const booking: BookingQuoteContext =
    surface === "book" && f.pickup && f.destination && f.category && Number(f.weight) > 0
      ? { from: f.pickup, to: f.destination, category: f.category, weight: Number(f.weight) }
      : undefined;
  const threads = useQuery({
    queryKey: ["assistant-threads", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("assistant_threads")
        .select("id,title,updated_at")
        .eq("user_id", user?.id ?? "")
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
  const selected = useQuery({
    queryKey: ["assistant-thread", user?.id, threadId],
    enabled: !!user && !!threadId,
    queryFn: async () => {
      const owner = await supabase
        .from("assistant_threads")
        .select("id")
        .eq("id", threadId ?? "")
        .eq("user_id", user?.id ?? "")
        .maybeSingle();
      if (owner.error) throw owner.error;
      if (!owner.data) throw new Error("Conversation not found.");
      const { data, error } = await supabase
        .from("assistant_messages")
        .select("message")
        .eq("thread_id", threadId ?? "")
        .eq("user_id", user?.id ?? "")
        .order("created_at");
      if (error) throw error;
      return savedMessages((data ?? []).map((row) => row.message));
    },
  });
  const go = (id: string) => {
    setShowHistory(false);
    if (surface === "book") void navigate({ to: "/book/chat/$threadId", params: { threadId: id } });
    else if (surface === "home")
      void navigate({ to: "/home-chat/$threadId", params: { threadId: id } });
    else void navigate({ to: "/assistant/$threadId", params: { threadId: id } });
  };
  async function createThread() {
    if (!user || creating) return;
    setCreating(true);
    try {
      const { data, error } = await supabase
        .from("assistant_threads")
        .insert({ user_id: user.id })
        .select("id")
        .single();
      if (error) throw error;
      await qc.invalidateQueries({ queryKey: ["assistant-threads", user.id] });
      go(data.id);
    } catch {
      toast.error("Your conversation could not be created. Please try again.");
    } finally {
      setCreating(false);
    }
  }
  async function deleteThread(id: string) {
    if (!user || !window.confirm("Delete this conversation?")) return;
    const { error } = await supabase
      .from("assistant_threads")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);
    if (error) {
      toast.error("Your conversation could not be deleted.");
      return;
    }
    await qc.invalidateQueries({ queryKey: ["assistant-threads", user.id] });
    if (id === threadId) {
      if (surface === "home") void navigate({ to: "/" });
      else if (surface === "book") void navigate({ to: "/book" });
      else void navigate({ to: "/assistant" });
    }
  }
  return (
    <>
      <header className="flex shrink-0 flex-wrap items-center gap-2 border-b bg-secondary px-3 py-3">
        <img
          src={assistantLogo}
          alt=""
          loading="lazy"
          width={40}
          height={40}
          className="size-10 shrink-0 rounded-lg"
        />
        <div className="min-w-24 flex-1">
          <h2 className="font-display text-sm font-bold">Tsapo assistant</h2>
          <p className="text-xs text-muted-foreground">Parcel help</p>
        </div>
        <Button
          variant="ghost"
          size="icon-sm"
          type="button"
          aria-label="Conversations"
          title="Conversations"
          onClick={() => setShowHistory((value) => !value)}
        >
          <History />
        </Button>
        <Button
          variant="ghost"
          size="icon-sm"
          type="button"
          aria-label="New conversation"
          title="New conversation"
          disabled={!user || creating}
          onClick={createThread}
        >
          <Plus />
        </Button>
        {threadId && surface !== "assistant" && (
          <Button asChild variant="ghost" size="icon-sm" title="Open full chat">
            <Link to="/assistant/$threadId" params={{ threadId }} aria-label="Open full chat">
              <ArrowUpRight />
            </Link>
          </Button>
        )}
        {onClose && (
          <Button
            variant="ghost"
            size="icon-sm"
            type="button"
            aria-label="Close chat"
            title="Close chat"
            onClick={onClose}
          >
            <X />
          </Button>
        )}
      </header>
      {!ready ? (
        <p className="p-6 text-sm text-muted-foreground">Connecting…</p>
      ) : !user ? (
        <div className="flex flex-1 flex-col items-start justify-center gap-5 p-6">
          <p className="font-display text-xl font-bold">Mhoro! Let’s talk parcels.</p>
          <Button asChild>
            <Link to="/auth">Sign in to chat</Link>
          </Button>
        </div>
      ) : showHistory || !threadId ? (
        <div className="flex min-h-0 flex-1 flex-col">
          <div className="flex items-center justify-between border-b px-4 py-3">
            <h3 className="text-sm font-semibold">Your conversations</h3>
            <Button size="sm" type="button" onClick={createThread} disabled={creating}>
              <Plus />
              New
            </Button>
          </div>
          <div className="flex-1 space-y-1 overflow-y-auto p-3">
            {threads.isPending && (
              <p className="p-3 text-sm text-muted-foreground">Loading conversations…</p>
            )}
            {threads.error && (
              <p role="alert" className="p-3 text-sm text-destructive">
                Conversations could not be loaded.
              </p>
            )}
            {threads.data?.length === 0 && (
              <p className="p-3 font-display text-lg">Mhoro! What’s on your mind?</p>
            )}
            {threads.data?.map((thread) => (
              <div key={thread.id} className="flex items-center gap-1 rounded-md border-b">
                <Button
                  type="button"
                  variant={thread.id === threadId ? "secondary" : "ghost"}
                  onClick={() => go(thread.id)}
                  className="h-auto min-w-0 flex-1 justify-start whitespace-normal px-3 py-3 text-left"
                >
                  <MessageCircle className="shrink-0" />
                  <span className="min-w-0 break-words">{thread.title}</span>
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon-sm"
                  title="Delete conversation"
                  aria-label={`Delete ${thread.title}`}
                  onClick={() => deleteThread(thread.id)}
                >
                  <Trash2 />
                </Button>
              </div>
            ))}
          </div>
        </div>
      ) : selected.isPending ? (
        <p className="p-6 text-sm text-muted-foreground">Loading conversation…</p>
      ) : selected.error ? (
        <p role="alert" className="p-6 text-sm text-destructive">
          Conversation not found or unavailable.
        </p>
      ) : (
        <ChatWindow
          key={`${user.id}:${threadId}`}
          threadId={threadId}
          initialMessages={selected.data ?? []}
          booking={booking}
        />
      )}
    </>
  );
}

function ChatWindow({
  threadId,
  initialMessages,
  booking,
}: {
  threadId: string;
  initialMessages: UIMessage[];
  booking: BookingQuoteContext;
}) {
  const qc = useQueryClient();
  const textarea = useRef<HTMLTextAreaElement>(null);
  const bookingRef = useRef(booking);
  bookingRef.current = booking;
  const [text, setText] = useState("");
  const [failure, setFailure] = useState("");
  const transport = useMemo(
    () =>
      new TextStreamChatTransport({
        api: "/api/assistant",
        prepareSendMessagesRequest: async ({ messages }) => {
          const { data } = await supabase.auth.getSession();
          if (!data.session) throw new Error("Sign in to chat with Tsapo.");
          return {
            headers: { Authorization: `Bearer ${data.session.access_token}` },
            body: {
              threadId,
              messages,
              ...(bookingRef.current ? { booking: bookingRef.current } : {}),
            },
          };
        },
        fetch: async (input, init) => {
          const response = await fetch(input, init);
          if (!response.ok) throw new Error(await response.text());
          if (!response.body) throw new Error("The assistant returned no answer.");
          const body = decodeAssistantStream(response.body);
          return new Response(body, { headers: response.headers });
        },
      }),
    [threadId],
  );
  const { messages, sendMessage, status, stop, clearError } = useChat({
    id: threadId,
    messages: initialMessages,
    transport,
    onError: (error) => {
      setFailure(error.message);
    },
    onFinish: () => {
      void qc.invalidateQueries({ queryKey: ["assistant-threads"] });
      void qc.invalidateQueries({ queryKey: ["assistant-thread"] });
      textarea.current?.focus();
    },
  });
  const busy = status === "submitted" || status === "streaming";
  useEffect(() => {
    if (!busy) textarea.current?.focus();
  }, [busy]);
  async function send(question: string) {
    if (!question.trim() || busy) return;
    setFailure("");
    clearError();
    setText("");
    textarea.current?.focus();
    await sendMessage({ text: question.trim() });
  }
  return (
    <>
      <Conversation className="min-h-0" aria-label="Chat messages">
        <ConversationContent className="gap-5 p-5">
          {messages.length === 0 && (
            <div className="space-y-5 pt-2">
              <p className="font-display text-xl font-bold">Mhoro! How can I help?</p>
              <div className="flex flex-col items-start gap-2">
                {[
                  "How much will my parcel cost?",
                  "Where do I find the pickup code?",
                  "How do I track my parcel?",
                ].map((question) => (
                  <Button
                    key={question}
                    type="button"
                    variant="outline"
                    className="h-auto max-w-full whitespace-normal py-2 text-left"
                    onClick={() => void send(question)}
                  >
                    {question}
                  </Button>
                ))}
              </div>
            </div>
          )}
          {messages.map((message) => (
            <Message key={message.id} from={message.role}>
              <MessageContent
                className={
                  message.role === "user"
                    ? "group-[.is-user]:bg-primary group-[.is-user]:text-primary-foreground"
                    : ""
                }
              >
                {message.parts.map((part, index) =>
                  part.type === "text" ? (
                    <MessageResponse key={index} isAnimating={busy && message === messages.at(-1)}>
                      {part.text}
                    </MessageResponse>
                  ) : null,
                )}
              </MessageContent>
            </Message>
          ))}
          {status === "submitted" && <Shimmer>Thinking…</Shimmer>}
        </ConversationContent>
        <ConversationScrollButton aria-label="Latest message" />
      </Conversation>
      {failure && (
        <p role="alert" className="shrink-0 border-t px-4 py-3 text-sm text-destructive">
          {failure}
        </p>
      )}
      <div className="shrink-0 border-t bg-card p-3">
        <PromptInput onSubmit={({ text: question }) => send(question)}>
          <PromptInputTextarea
            ref={textarea}
            aria-label="Message Tsapo"
            placeholder="Ask about your parcel…"
            value={text}
            onChange={(event) => setText(event.target.value)}
            maxLength={8000}
            className="min-h-16 max-h-32"
          />
          <PromptInputFooter className="justify-end">
            <PromptInputSubmit
              status={status}
              onStop={stop}
              disabled={!busy && !text.trim()}
              aria-label={busy ? "Stop" : "Send message"}
            />
          </PromptInputFooter>
        </PromptInput>
      </div>
    </>
  );
}
