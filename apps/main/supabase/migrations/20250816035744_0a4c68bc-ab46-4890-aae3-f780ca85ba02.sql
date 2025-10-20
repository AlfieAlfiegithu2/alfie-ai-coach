-- Add search_path security to existing functions
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  -- This now correctly checks the 'role' column in the 'profiles' table.
  RETURN EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
  );
END;
$function$;

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = 'public'
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.cleanup_expired_admin_sessions()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  DELETE FROM public.admin_sessions 
  WHERE expires_at < now();
END;
$function$;

CREATE OR REPLACE FUNCTION public.initialize_user_vocabulary_progress()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  -- When a new user is created, unlock the first vocabulary test
  INSERT INTO public.user_test_progress (user_id, test_id, status)
  SELECT 
    NEW.id,
    st.id,
    'unlocked'
  FROM public.skill_tests st
  WHERE st.skill_slug = 'vocabulary-builder'
    AND st.test_order = 1
  ON CONFLICT (user_id, test_id) DO NOTHING;
  
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_question_numbering()
RETURNS void
LANGUAGE plpgsql
SET search_path = 'public'
AS $function$
DECLARE
    rec RECORD;
    question_rec RECORD;
    current_number INTEGER;
BEGIN
    -- For each unique cambridge_book and section_number combination
    FOR rec IN 
        SELECT DISTINCT cambridge_book, section_number 
        FROM reading_questions 
        WHERE cambridge_book IS NOT NULL AND section_number IS NOT NULL
        ORDER BY cambridge_book, section_number
    LOOP
        current_number := 1;
        
        -- Update questions in order of part_number and original question_number
        FOR question_rec IN
            SELECT id 
            FROM reading_questions 
            WHERE cambridge_book = rec.cambridge_book 
            AND section_number = rec.section_number
            ORDER BY part_number, question_number
        LOOP
            UPDATE reading_questions 
            SET question_number = current_number 
            WHERE id = question_rec.id;
            
            current_number := current_number + 1;
        END LOOP;
        
        RAISE NOTICE 'Updated numbering for % Section %', rec.cambridge_book, rec.section_number;
    END LOOP;
END;
$function$;

CREATE OR REPLACE FUNCTION public.cleanup_expired_audio()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
    expired_record RECORD;
    audio_url text;
BEGIN
    -- Find expired audio records
    FOR expired_record IN 
        SELECT id, audio_urls 
        FROM test_results 
        WHERE audio_retention_expires_at < NOW() 
        AND audio_urls IS NOT NULL 
        AND array_length(audio_urls, 1) > 0
    LOOP
        -- Delete each audio file from storage
        IF expired_record.audio_urls IS NOT NULL THEN
            FOREACH audio_url IN ARRAY expired_record.audio_urls
            LOOP
                -- Extract filename from URL for deletion
                PERFORM storage.delete('audio-files', split_part(audio_url, '/', -1));
            END LOOP;
        END IF;
        
        -- Clear audio URLs and expiration date
        UPDATE test_results 
        SET audio_urls = NULL, 
            audio_retention_expires_at = NULL 
        WHERE id = expired_record.id;
        
        RAISE LOG 'Cleaned up audio for test result: %', expired_record.id;
    END LOOP;
END;
$function$;

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  INSERT INTO public.profiles (id, full_name, role)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email), 'user');
  RETURN NEW;
END;
$function$;

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$function$;

-- Add rate limiting table for API usage tracking
CREATE TABLE IF NOT EXISTS public.api_rate_limits (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  endpoint TEXT NOT NULL,
  request_count INTEGER DEFAULT 1,
  window_start TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Enable RLS on rate limits table
ALTER TABLE public.api_rate_limits ENABLE ROW LEVEL SECURITY;

-- Create policy for rate limits (users can only see their own)
CREATE POLICY "Users can view their own rate limits" 
ON public.api_rate_limits 
FOR ALL 
USING (auth.uid() = user_id);

-- Create index for efficient rate limit queries
CREATE INDEX IF NOT EXISTS idx_api_rate_limits_user_endpoint_window 
ON public.api_rate_limits (user_id, endpoint, window_start);

-- Add function to check rate limits
CREATE OR REPLACE FUNCTION public.check_rate_limit(
  p_user_id UUID,
  p_endpoint TEXT,
  p_max_requests INTEGER DEFAULT 100,
  p_window_minutes INTEGER DEFAULT 60
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
DECLARE
  current_count INTEGER;
  window_start TIMESTAMP WITH TIME ZONE;
BEGIN
  window_start := now() - (p_window_minutes || ' minutes')::INTERVAL;
  
  -- Count requests in current window
  SELECT COALESCE(SUM(request_count), 0)
  INTO current_count
  FROM public.api_rate_limits
  WHERE user_id = p_user_id
    AND endpoint = p_endpoint
    AND window_start > window_start;
  
  -- If under limit, record this request
  IF current_count < p_max_requests THEN
    INSERT INTO public.api_rate_limits (user_id, endpoint, request_count, window_start)
    VALUES (p_user_id, p_endpoint, 1, now())
    ON CONFLICT (user_id, endpoint, window_start) 
    DO UPDATE SET request_count = api_rate_limits.request_count + 1;
    
    RETURN TRUE;
  ELSE
    RETURN FALSE;
  END IF;
END;
$function$;

-- Clean up old rate limit records (keep last 24 hours)
CREATE OR REPLACE FUNCTION public.cleanup_old_rate_limits()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $function$
BEGIN
  DELETE FROM public.api_rate_limits 
  WHERE window_start < now() - INTERVAL '24 hours';
END;
$function$;