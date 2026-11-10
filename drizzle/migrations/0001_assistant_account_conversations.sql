CREATE TABLE public.assistant_threads (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 user_id uuid NOT NULL,
 title text NOT NULL DEFAULT 'New conversation',
 created_at timestamptz NOT NULL DEFAULT now(),
 updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.assistant_threads TO authenticated;
GRANT ALL ON public.assistant_threads TO service_role;
ALTER TABLE public.assistant_threads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "own assistant threads" ON public.assistant_threads FOR ALL TO authenticated USING (user_id = auth.uid()) WITH CHECK (user_id = auth.uid());
CREATE INDEX assistant_threads_owner ON public.assistant_threads (user_id, updated_at DESC);
CREATE TABLE public.assistant_messages (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 thread_id uuid NOT NULL REFERENCES public.assistant_threads(id) ON DELETE CASCADE,
 user_id uuid NOT NULL,
 sdk_id text NOT NULL,
 message jsonb NOT NULL,
 created_at timestamptz NOT NULL DEFAULT now(),
 UNIQUE (thread_id, sdk_id)
);
GRANT SELECT, INSERT ON public.assistant_messages TO authenticated;
GRANT ALL ON public.assistant_messages TO service_role;
ALTER TABLE public.assistant_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "read own assistant messages" ON public.assistant_messages FOR SELECT TO authenticated USING (user_id = auth.uid() AND EXISTS (SELECT 1 FROM public.assistant_threads t WHERE t.id = thread_id AND t.user_id = auth.uid()));
CREATE POLICY "save own assistant messages" ON public.assistant_messages FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid() AND EXISTS (SELECT 1 FROM public.assistant_threads t WHERE t.id = thread_id AND t.user_id = auth.uid()));
CREATE INDEX assistant_messages_thread ON public.assistant_messages (thread_id, created_at);
CREATE TABLE public.assistant_access_state (
 key text PRIMARY KEY,
 reason text NOT NULL,
 status integer NOT NULL,
 updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT ALL ON public.assistant_access_state TO service_role;
ALTER TABLE public.assistant_access_state ENABLE ROW LEVEL SECURITY;