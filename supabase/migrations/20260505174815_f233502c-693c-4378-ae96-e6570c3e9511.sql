
-- Support chat threads + messages
CREATE TABLE public.support_threads (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE,
  guest_name text,
  guest_contact text,
  subject text,
  status text NOT NULL DEFAULT 'open',
  last_message_at timestamptz NOT NULL DEFAULT now(),
  unread_user integer NOT NULL DEFAULT 0,
  unread_admin integer NOT NULL DEFAULT 0,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE public.support_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id uuid NOT NULL REFERENCES public.support_threads(id) ON DELETE CASCADE,
  sender_kind text NOT NULL CHECK (sender_kind IN ('user','admin')),
  sender_id uuid,
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX idx_support_msg_thread ON public.support_messages(thread_id, created_at);
CREATE INDEX idx_support_threads_last ON public.support_threads(last_message_at DESC);

ALTER TABLE public.support_threads ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_messages ENABLE ROW LEVEL SECURITY;

-- threads policies
CREATE POLICY "users read own threads" ON public.support_threads
  FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "users insert own threads" ON public.support_threads
  FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "users update own threads" ON public.support_threads
  FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "admins manage threads" ON public.support_threads
  FOR ALL USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

-- messages policies
CREATE POLICY "users read own thread messages" ON public.support_messages
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM public.support_threads t WHERE t.id = thread_id AND t.user_id = auth.uid())
  );
CREATE POLICY "users insert into own thread" ON public.support_messages
  FOR INSERT WITH CHECK (
    sender_kind = 'user'
    AND EXISTS (SELECT 1 FROM public.support_threads t WHERE t.id = thread_id AND t.user_id = auth.uid())
  );
CREATE POLICY "admins manage messages" ON public.support_messages
  FOR ALL USING (has_role(auth.uid(), 'admin'))
  WITH CHECK (has_role(auth.uid(), 'admin'));

-- Trigger: on new message, bump thread last_message_at + unread counter
CREATE OR REPLACE FUNCTION public.support_msg_after_insert()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF NEW.sender_kind = 'user' THEN
    UPDATE public.support_threads
       SET last_message_at = NEW.created_at,
           unread_admin = unread_admin + 1,
           status = 'open',
           updated_at = now()
     WHERE id = NEW.thread_id;
  ELSE
    UPDATE public.support_threads
       SET last_message_at = NEW.created_at,
           unread_user = unread_user + 1,
           updated_at = now()
     WHERE id = NEW.thread_id;
  END IF;
  RETURN NEW;
END $$;

CREATE TRIGGER trg_support_msg_insert
AFTER INSERT ON public.support_messages
FOR EACH ROW EXECUTE FUNCTION public.support_msg_after_insert();

-- Mark thread as read
CREATE OR REPLACE FUNCTION public.support_mark_read(p_thread_id uuid, p_as text)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  IF p_as = 'admin' THEN
    IF NOT public.has_role(auth.uid(), 'admin') THEN RAISE EXCEPTION 'Forbidden'; END IF;
    UPDATE public.support_threads SET unread_admin = 0 WHERE id = p_thread_id;
  ELSE
    UPDATE public.support_threads SET unread_user = 0 WHERE id = p_thread_id AND user_id = auth.uid();
  END IF;
END $$;

-- Get-or-create thread for current user
CREATE OR REPLACE FUNCTION public.support_get_or_create_thread()
RETURNS uuid LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE v_id uuid;
BEGIN
  IF auth.uid() IS NULL THEN RAISE EXCEPTION 'Not authenticated'; END IF;
  SELECT id INTO v_id FROM public.support_threads
   WHERE user_id = auth.uid() AND status <> 'closed'
   ORDER BY last_message_at DESC LIMIT 1;
  IF v_id IS NULL THEN
    INSERT INTO public.support_threads (user_id) VALUES (auth.uid()) RETURNING id INTO v_id;
  END IF;
  RETURN v_id;
END $$;

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.support_threads;
ALTER PUBLICATION supabase_realtime ADD TABLE public.support_messages;
ALTER TABLE public.support_threads REPLICA IDENTITY FULL;
ALTER TABLE public.support_messages REPLICA IDENTITY FULL;

-- payment provider settings keys are already allowed in policy (click_enabled, payme_enabled, uzum_enabled)
