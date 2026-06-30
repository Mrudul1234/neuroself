DROP POLICY IF EXISTS "Public insert access" ON public.library_items;
DROP POLICY IF EXISTS "Public update access" ON public.library_items;
DROP POLICY IF EXISTS "Public delete access" ON public.library_items;

CREATE POLICY "Authenticated users can insert library items"
  ON public.library_items
  FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Authenticated users can update library items"
  ON public.library_items
  FOR UPDATE
  TO authenticated
  USING (true)
  WITH CHECK (true);

CREATE POLICY "Authenticated users can delete library items"
  ON public.library_items
  FOR DELETE
  TO authenticated
  USING (true);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.library_items TO authenticated;
GRANT SELECT ON public.library_items TO anon;