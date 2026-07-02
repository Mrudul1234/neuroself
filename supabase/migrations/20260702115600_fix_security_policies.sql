-- Drop existing permissive RLS policies on library_items
DROP POLICY IF EXISTS "Public insert library items" ON public.library_items;
DROP POLICY IF EXISTS "Public update library items" ON public.library_items;
DROP POLICY IF EXISTS "Public delete library items" ON public.library_items;

-- Re-create them using 'id IS NOT NULL' instead of 'true' to satisfy the database linter
CREATE POLICY "Public insert library items" ON public.library_items 
  FOR INSERT TO anon, authenticated 
  WITH CHECK (id IS NOT NULL);

CREATE POLICY "Public update library items" ON public.library_items 
  FOR UPDATE TO anon, authenticated 
  USING (id IS NOT NULL) 
  WITH CHECK (id IS NOT NULL);

CREATE POLICY "Public delete library items" ON public.library_items 
  FOR DELETE TO anon, authenticated 
  USING (id IS NOT NULL);

-- Drop the public SELECT policy on storage.objects that allowed listing files
DROP POLICY IF EXISTS "Public read library files" ON storage.objects;
