CREATE POLICY "Public read library files" ON storage.objects FOR SELECT USING (bucket_id = 'library-files');
CREATE POLICY "Public upload library files" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'library-files');
CREATE POLICY "Public update library files" ON storage.objects FOR UPDATE USING (bucket_id = 'library-files');
CREATE POLICY "Public delete library files" ON storage.objects FOR DELETE USING (bucket_id = 'library-files');