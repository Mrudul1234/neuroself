-- Single-user app without auth: allow public (anon) writes to library_items.
DROP POLICY IF EXISTS "Authenticated users can insert library items" ON public.library_items;
DROP POLICY IF EXISTS "Authenticated users can update library items" ON public.library_items;
DROP POLICY IF EXISTS "Authenticated users can delete library items" ON public.library_items;

CREATE POLICY "Public insert library items" ON public.library_items FOR INSERT TO anon, authenticated WITH CHECK (true);
CREATE POLICY "Public update library items" ON public.library_items FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);
CREATE POLICY "Public delete library items" ON public.library_items FOR DELETE TO anon, authenticated USING (true);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.library_items TO anon, authenticated;
GRANT ALL ON public.library_items TO service_role;