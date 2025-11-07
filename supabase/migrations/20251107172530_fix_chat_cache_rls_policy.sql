-- Grant SELECT and INSERT permissions to authenticated users on chat_cache
CREATE POLICY "Authenticated users can select chat_cache"
ON public.chat_cache FOR SELECT
TO authenticated
USING (true);

CREATE POLICY "Authenticated users can insert chat_cache"
ON public.chat_cache FOR INSERT
TO authenticated
WITH CHECK (true);
