-- Pet Villa: Supabase Host Panel Migration
-- 202606070002_create_supabase_host_panel.sql

DROP POLICY IF EXISTS "profiles_select_own_or_host" ON public.profiles;
CREATE POLICY "profiles_select_own_or_host"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id OR public.current_user_is_host());

DROP POLICY IF EXISTS "pets_select_own_or_host" ON public.pets;
CREATE POLICY "pets_select_own_or_host"
  ON public.pets FOR SELECT
  USING (auth.uid() = owner_id OR public.current_user_is_host());

CREATE TABLE IF NOT EXISTS public.host_off_days (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  day date NOT NULL UNIQUE,
  reason text NOT NULL DEFAULT '',
  created_by uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS host_off_days_day_idx
  ON public.host_off_days(day);

ALTER TABLE public.host_off_days ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "host_off_days_select_public" ON public.host_off_days;
CREATE POLICY "host_off_days_select_public"
  ON public.host_off_days FOR SELECT
  TO anon, authenticated
  USING (true);

DROP POLICY IF EXISTS "host_off_days_insert_host" ON public.host_off_days;
CREATE POLICY "host_off_days_insert_host"
  ON public.host_off_days FOR INSERT
  TO authenticated
  WITH CHECK (public.current_user_is_host());

DROP POLICY IF EXISTS "host_off_days_update_host" ON public.host_off_days;
CREATE POLICY "host_off_days_update_host"
  ON public.host_off_days FOR UPDATE
  TO authenticated
  USING (public.current_user_is_host())
  WITH CHECK (public.current_user_is_host());

DROP POLICY IF EXISTS "host_off_days_delete_host" ON public.host_off_days;
CREATE POLICY "host_off_days_delete_host"
  ON public.host_off_days FOR DELETE
  TO authenticated
  USING (public.current_user_is_host());

DROP TRIGGER IF EXISTS set_host_off_days_updated_at ON public.host_off_days;
CREATE TRIGGER set_host_off_days_updated_at
  BEFORE UPDATE ON public.host_off_days
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE TABLE IF NOT EXISTS public.chat_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  thread_id text NOT NULL,
  owner_id uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  owner_name text NOT NULL DEFAULT 'Pet Owner',
  owner_phone text NOT NULL DEFAULT '',
  sender_role text NOT NULL CHECK (sender_role IN ('owner', 'host')),
  body text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS chat_messages_thread_created_idx
  ON public.chat_messages(thread_id, created_at);

CREATE INDEX IF NOT EXISTS chat_messages_owner_created_idx
  ON public.chat_messages(owner_id, created_at DESC);

ALTER TABLE public.chat_messages ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "chat_messages_select_own_or_host" ON public.chat_messages;
CREATE POLICY "chat_messages_select_own_or_host"
  ON public.chat_messages FOR SELECT
  TO authenticated
  USING (auth.uid() = owner_id OR public.current_user_is_host());

DROP POLICY IF EXISTS "chat_messages_insert_own_or_host" ON public.chat_messages;
CREATE POLICY "chat_messages_insert_own_or_host"
  ON public.chat_messages FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = owner_id OR public.current_user_is_host());

DROP POLICY IF EXISTS "chat_messages_update_host" ON public.chat_messages;
CREATE POLICY "chat_messages_update_host"
  ON public.chat_messages FOR UPDATE
  TO authenticated
  USING (public.current_user_is_host())
  WITH CHECK (public.current_user_is_host());

DROP POLICY IF EXISTS "chat_messages_delete_host" ON public.chat_messages;
CREATE POLICY "chat_messages_delete_host"
  ON public.chat_messages FOR DELETE
  TO authenticated
  USING (public.current_user_is_host());
