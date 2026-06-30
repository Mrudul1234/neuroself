CREATE TABLE public.library_items (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  thumbnail_url TEXT,
  type TEXT NOT NULL CHECK (type IN ('paper','article','video')),
  domain TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.library_items TO anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.library_items TO authenticated;
GRANT ALL ON public.library_items TO service_role;

ALTER TABLE public.library_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Public read access" ON public.library_items FOR SELECT USING (true);
CREATE POLICY "Public insert access" ON public.library_items FOR INSERT WITH CHECK (true);
CREATE POLICY "Public update access" ON public.library_items FOR UPDATE USING (true);
CREATE POLICY "Public delete access" ON public.library_items FOR DELETE USING (true);

CREATE INDEX library_items_type_created_idx ON public.library_items (type, created_at DESC);