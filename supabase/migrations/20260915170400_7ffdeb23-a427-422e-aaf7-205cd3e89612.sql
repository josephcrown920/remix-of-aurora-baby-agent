CREATE TABLE public.studio_projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_key text NOT NULL,
  title text NOT NULL DEFAULT 'Untitled project',
  brief text NOT NULL DEFAULT '',
  rules text NOT NULL DEFAULT '',
  project_type text NOT NULL DEFAULT 'Film',
  world jsonb NOT NULL DEFAULT '[]'::jsonb,
  image_model text NOT NULL DEFAULT 'google/gemini-3-pro-image',
  video_model text NOT NULL DEFAULT 'google/gemini-omni-1.1-flash',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.studio_projects TO anon, authenticated;
GRANT ALL ON public.studio_projects TO service_role;
ALTER TABLE public.studio_projects ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Open access to studio_projects" ON public.studio_projects FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE INDEX studio_projects_owner_key_idx ON public.studio_projects (owner_key, updated_at DESC);
CREATE TRIGGER set_updated_at_studio_projects BEFORE UPDATE ON public.studio_projects FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TABLE public.studio_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.studio_projects(id) ON DELETE CASCADE,
  role text NOT NULL,
  text text NOT NULL,
  meta text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.studio_messages TO anon, authenticated;
GRANT ALL ON public.studio_messages TO service_role;
ALTER TABLE public.studio_messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Open access to studio_messages" ON public.studio_messages FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE INDEX studio_messages_project_idx ON public.studio_messages (project_id, created_at);
CREATE TRIGGER set_updated_at_studio_messages BEFORE UPDATE ON public.studio_messages FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();

CREATE TABLE public.studio_shots (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.studio_projects(id) ON DELETE CASCADE,
  position integer NOT NULL DEFAULT 0,
  title text NOT NULL DEFAULT '',
  summary text NOT NULL DEFAULT '',
  duration_seconds numeric NOT NULL DEFAULT 6,
  image_prompt text NOT NULL DEFAULT '',
  video_prompt text NOT NULL DEFAULT '',
  image_url text,
  video_url text,
  tone text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.studio_shots TO anon, authenticated;
GRANT ALL ON public.studio_shots TO service_role;
ALTER TABLE public.studio_shots ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Open access to studio_shots" ON public.studio_shots FOR ALL TO anon, authenticated USING (true) WITH CHECK (true);
CREATE INDEX studio_shots_project_idx ON public.studio_shots (project_id, position);
CREATE TRIGGER set_updated_at_studio_shots BEFORE UPDATE ON public.studio_shots FOR EACH ROW EXECUTE FUNCTION public.update_updated_at();