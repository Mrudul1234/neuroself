ALTER TABLE public.library_items
  ADD COLUMN IF NOT EXISTS storage_path TEXT,
  ADD COLUMN IF NOT EXISTS extracted_text TEXT,
  ADD COLUMN IF NOT EXISTS file_size BIGINT;