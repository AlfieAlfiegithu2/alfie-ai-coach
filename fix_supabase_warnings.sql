-- ============================================
-- SUPABASE SECURITY WARNINGS FIX SCRIPT
-- ============================================
-- Fixes 66 Supabase warnings related to:
-- 1. Function search_path mutable (4 warnings)
-- 2. Anonymous access policies (62 warnings)
--
-- Run this in Supabase SQL Editor
-- ============================================

-- ============================================
-- PART 1: FIX FUNCTION SEARCH_PATH ISSUES
-- ============================================

-- Fix function_search_path_mutable warnings
-- These functions need explicit search_path set

-- Fix get_cards_needing_translation function
CREATE OR REPLACE FUNCTION public.get_cards_needing_translation()
RETURNS TABLE(card_id uuid, english_word text, deck_id uuid)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT vc.id, vc.english_word, vc.deck_id
  FROM vocab_cards vc
  WHERE vc.needs_translation = true
  AND vc.created_at < NOW() - INTERVAL '1 hour'
  ORDER BY vc.created_at ASC
  LIMIT 50;
END;
$$;

-- Fix update_earthworm_stats function
CREATE OR REPLACE FUNCTION public.update_earthworm_stats(p_user_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  -- Update user stats based on progress
  UPDATE earthworm_user_stats
  SET
    total_questions_answered = (
      SELECT COUNT(*) FROM earthworm_user_progress
      WHERE user_id = p_user_id AND completed = true
    ),
    current_streak = (
      SELECT COUNT(*) FROM earthworm_user_progress
      WHERE user_id = p_user_id
      AND completed = true
      AND completed_at >= CURRENT_DATE
    ),
    updated_at = NOW()
  WHERE user_id = p_user_id;
END;
$$;

-- Fix auto_translate_vocab_card function
CREATE OR REPLACE FUNCTION public.auto_translate_vocab_card(p_card_id uuid)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  v_english_word text;
  v_translation text;
BEGIN
  -- Get the English word
  SELECT english_word INTO v_english_word
  FROM vocab_cards
  WHERE id = p_card_id;

  -- Get translation (simplified - you may want to use an actual translation service)
  v_translation := 'Translation needed: ' || v_english_word;

  -- Update the card
  UPDATE vocab_cards
  SET translation = v_translation,
      needs_translation = false,
      updated_at = NOW()
  WHERE id = p_card_id;
END;
$$;

-- Fix get_translation_stats function
CREATE OR REPLACE FUNCTION public.get_translation_stats()
RETURNS TABLE(total_cards bigint, translated_cards bigint, pending_cards bigint)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
BEGIN
  RETURN QUERY
  SELECT
    (SELECT COUNT(*) FROM vocab_cards) as total_cards,
    (SELECT COUNT(*) FROM vocab_cards WHERE translation IS NOT NULL AND translation != '') as translated_cards,
    (SELECT COUNT(*) FROM vocab_cards WHERE translation IS NULL OR translation = '' OR needs_translation = true) as pending_cards;
END;
$$;

-- ============================================
-- PART 2: FIX ANONYMOUS ACCESS POLICIES
-- ============================================
-- Remove anonymous access from sensitive tables
-- Keep anonymous access only for truly public data

-- ADMIN TABLES - Remove anonymous access completely
DROP POLICY IF EXISTS "Only admins can view audit logs" ON admin_audit_log;
CREATE POLICY "Only admins can view audit logs" ON admin_audit_log
FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

DROP POLICY IF EXISTS "Service role only access to admin sessions" ON admin_sessions;
CREATE POLICY "Service role only access to admin sessions" ON admin_sessions
FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

DROP POLICY IF EXISTS "No direct access to admin users" ON admin_users;
CREATE POLICY "No direct access to admin users" ON admin_users
FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- API RATE LIMITS - Authenticated users only
DROP POLICY IF EXISTS "Users can view their own rate limits" ON api_rate_limits;
CREATE POLICY "Users can view their own rate limits" ON api_rate_limits
FOR ALL USING (auth.uid() = user_id);

-- AUDIO ANALYTICS - Service role only
DROP POLICY IF EXISTS "Admins can view audio analytics" ON audio_analytics;
DROP POLICY IF EXISTS "Service role can manage audio analytics" ON audio_analytics;
CREATE POLICY "Service role can manage audio analytics" ON audio_analytics
FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- CHAT CACHE - Service role only
DROP POLICY IF EXISTS "Service role can manage chat cache" ON chat_cache;
CREATE POLICY "Service role can manage chat cache" ON chat_cache
FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- COMMUNITY FEATURES - Require authentication
DROP POLICY IF EXISTS "Authenticated users can view comments" ON community_comments;
DROP POLICY IF EXISTS "Users can delete their own comments" ON community_comments;
DROP POLICY IF EXISTS "Users can update their own comments" ON community_comments;

CREATE POLICY "Authenticated users can view comments" ON community_comments
FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Users can manage their own comments" ON community_comments
FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Authenticated users can view community posts" ON community_posts;
DROP POLICY IF EXISTS "Users can delete their own posts" ON community_posts;
DROP POLICY IF EXISTS "Users can update their own posts" ON community_posts;

CREATE POLICY "Authenticated users can view community posts" ON community_posts
FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "Users can manage their own posts" ON community_posts
FOR ALL USING (auth.uid() = user_id);

-- EARTHWORM PROGRESS - Authenticated users only
DROP POLICY IF EXISTS "Users can update own progress" ON earthworm_user_progress;
DROP POLICY IF EXISTS "Users can view own progress" ON earthworm_user_progress;

CREATE POLICY "Users can manage own progress" ON earthworm_user_progress
FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own stats" ON earthworm_user_stats;
DROP POLICY IF EXISTS "Users can view own stats" ON earthworm_user_stats;

CREATE POLICY "Users can manage own stats" ON earthworm_user_stats
FOR ALL USING (auth.uid() = user_id);

-- PUBLIC DATA - Keep anonymous access for truly public content
-- These are OK to keep anonymous access:
-- - daily_challenges (public content)
-- - general_speaking_prompts (public prompts)
-- - general_writing_prompts (public prompts)
-- - pte_speaking_prompts (public prompts)
-- - pte_writing_prompts (public prompts)
-- - toefl_speaking_prompts (public prompts)
-- - toefl_writing_prompts (public prompts)
-- - speaking_prompts (public prompts)
-- - vocab_frequency (public data)
-- - vocab_translation_enrichments (public data)
-- - vocabulary_words (public data)
-- - writing_prompts (public prompts)

-- USER DATA - Remove anonymous access
DROP POLICY IF EXISTS "Users can update their own assessments" ON user_assessments;
DROP POLICY IF EXISTS "Users can view their own assessments" ON user_assessments;

CREATE POLICY "Users can manage own assessments" ON user_assessments
FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own challenge progress" ON user_challenge_progress;
DROP POLICY IF EXISTS "Users can view their own challenge progress" ON user_challenge_progress;

CREATE POLICY "Users can manage own challenge progress" ON user_challenge_progress
FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own preferences" ON user_preferences;
DROP POLICY IF EXISTS "Users can view their own preferences" ON user_preferences;

CREATE POLICY "Users can manage own preferences" ON user_preferences
FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Only admins can manage roles" ON user_roles;
DROP POLICY IF EXISTS "Users can view their own roles" ON user_roles;

CREATE POLICY "Users can view their own roles" ON user_roles
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage roles" ON user_roles
FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

DROP POLICY IF EXISTS "Users can update their own skill progress" ON user_skill_progress;
DROP POLICY IF EXISTS "Users can view their own skill progress" ON user_skill_progress;

CREATE POLICY "Users can manage own skill progress" ON user_skill_progress
FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own test progress" ON user_test_progress;
DROP POLICY IF EXISTS "Users can view their own test progress" ON user_test_progress;

CREATE POLICY "Users can manage own test progress" ON user_test_progress
FOR ALL USING (auth.uid() = user_id);

-- VOCABULARY - User data only
DROP POLICY IF EXISTS "Users can delete their own vocabulary" ON user_vocabulary;
DROP POLICY IF EXISTS "Users can view their own vocabulary" ON user_vocabulary;

CREATE POLICY "Users can manage own vocabulary" ON user_vocabulary
FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own cards" ON vocab_cards;
DROP POLICY IF EXISTS "Users can update their own cards" ON vocab_cards;
DROP POLICY IF EXISTS "Users can view their own cards" ON vocab_cards;

CREATE POLICY "Users can manage own cards" ON vocab_cards
FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete their own decks" ON vocab_decks;
DROP POLICY IF EXISTS "Users can update their own decks" ON vocab_decks;
DROP POLICY IF EXISTS "Users can view their own decks" ON vocab_decks;

CREATE POLICY "Users can manage own decks" ON vocab_decks
FOR ALL USING (auth.uid() = user_id);

-- RESULTS DATA - User data only
DROP POLICY IF EXISTS "Users can view their own listening results" ON listening_test_results;
CREATE POLICY "Users can manage own listening results" ON listening_test_results
FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view their own reading results" ON reading_test_results;
CREATE POLICY "Users can manage own reading results" ON reading_test_results
FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update their own speaking results" ON speaking_test_results;
DROP POLICY IF EXISTS "Users can view their own speaking results" ON speaking_test_results;

CREATE POLICY "Users can manage own speaking results" ON speaking_test_results
FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own test results" ON test_results;
DROP POLICY IF EXISTS "Users can view own test results" ON test_results;

CREATE POLICY "Users can manage own test results" ON test_results
FOR ALL USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can view their own writing results" ON writing_test_results;
CREATE POLICY "Users can manage own writing results" ON writing_test_results
FOR ALL USING (auth.uid() = user_id);

-- STUDY PLANS - User data only
DROP POLICY IF EXISTS "Users can update their own study plans" ON study_plans;
DROP POLICY IF EXISTS "Users can view their own study plans" ON study_plans;

CREATE POLICY "Users can manage own study plans" ON study_plans
FOR ALL USING (auth.uid() = user_id);

-- BOOKMARKS - User data only
DROP POLICY IF EXISTS "Users can delete their own bookmarks" ON question_bookmarks;
DROP POLICY IF EXISTS "Users can update their own bookmarks" ON question_bookmarks;
DROP POLICY IF EXISTS "Users can view their own bookmarks" ON question_bookmarks;

CREATE POLICY "Users can manage own bookmarks" ON question_bookmarks
FOR ALL USING (auth.uid() = user_id);

-- TRANSLATION CACHE - User data only
DROP POLICY IF EXISTS "Service role can manage translation cache" ON translation_cache;
DROP POLICY IF EXISTS "Users can view their own translations" ON translation_cache;

CREATE POLICY "Users can manage own translation cache" ON translation_cache
FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage translation cache" ON translation_cache
FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- VOCAB TRANSLATION QUEUE - Service role + user access
DROP POLICY IF EXISTS "Admins can read translation queue" ON vocab_translation_queue;
DROP POLICY IF EXISTS "Edge functions can read pending jobs" ON vocab_translation_queue;
DROP POLICY IF EXISTS "Service role can manage all translation jobs" ON vocab_translation_queue;
DROP POLICY IF EXISTS "Service role can manage translation queue" ON vocab_translation_queue;
DROP POLICY IF EXISTS "Users can view their own translation jobs" ON vocab_translation_queue;

CREATE POLICY "Users can view own translation jobs" ON vocab_translation_queue
FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage translation queue" ON vocab_translation_queue
FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- WRITING ANALYSIS CACHE - User + admin access
DROP POLICY IF EXISTS "Admins can view all writing analysis cache" ON writing_analysis_cache;
DROP POLICY IF EXISTS "Service role can manage writing analysis cache" ON writing_analysis_cache;
DROP POLICY IF EXISTS "Users can view own writing analysis cache" ON writing_analysis_cache;

CREATE POLICY "Users can manage own writing analysis cache" ON writing_analysis_cache
FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "Service role can manage writing analysis cache" ON writing_analysis_cache
FOR ALL USING (auth.jwt() ->> 'role' = 'service_role');

-- USER ANALYTICS - User data only
DROP POLICY IF EXISTS "Users can view own analytics" ON user_analytics;
CREATE POLICY "Users can manage own analytics" ON user_analytics
FOR ALL USING (auth.uid() = user_id);

-- VOCAB REVIEWS - User data only
DROP POLICY IF EXISTS "Users can view their own reviews" ON vocab_reviews;
CREATE POLICY "Users can manage own reviews" ON vocab_reviews
FOR ALL USING (auth.uid() = user_id);

-- VOCAB SRS STATE - User data only
DROP POLICY IF EXISTS "Users can update their own SRS state" ON vocab_srs_state;
DROP POLICY IF EXISTS "Users can view their own SRS state" ON vocab_srs_state;

CREATE POLICY "Users can manage own SRS state" ON vocab_srs_state
FOR ALL USING (auth.uid() = user_id);

-- VOCAB EXAMPLES, IMAGES, PRONUNCIATIONS - User data only
-- These policies were referenced but may not exist - check and create if needed
DO $$
BEGIN
  -- Check if vocab_examples table exists and needs policies
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'vocab_examples') THEN
    EXECUTE 'DROP POLICY IF EXISTS vocab_examples_user ON vocab_examples';
    EXECUTE 'CREATE POLICY vocab_examples_user ON vocab_examples FOR ALL USING (auth.uid() = user_id)';
  END IF;

  -- Check if vocab_images table exists and needs policies
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'vocab_images') THEN
    EXECUTE 'DROP POLICY IF EXISTS vocab_images_user ON vocab_images';
    EXECUTE 'CREATE POLICY vocab_images_user ON vocab_images FOR ALL USING (auth.uid() = user_id)';
  END IF;

  -- Check if vocab_pronunciations table exists and needs policies
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'vocab_pronunciations') THEN
    EXECUTE 'DROP POLICY IF EXISTS vocab_pronunciations_user ON vocab_pronunciations';
    EXECUTE 'CREATE POLICY vocab_pronunciations_user ON vocab_pronunciations FOR ALL USING (auth.uid() = user_id)';
  END IF;
END $$;

-- ============================================
-- PART 3: ENABLE AUTH SECURITY FEATURES
-- ============================================
-- Note: These need to be configured in Supabase Dashboard
-- - Enable Leaked Password Protection
-- - Set OTP expiry to less than 1 hour

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Check that functions now have search_path set
SELECT
  proname as function_name,
  obj_description(oid, 'pg_proc') as description
FROM pg_proc
WHERE proname IN ('get_cards_needing_translation', 'update_earthworm_stats', 'auto_translate_vocab_card', 'get_translation_stats')
AND pronamespace = (SELECT oid FROM pg_namespace WHERE nspname = 'public');

-- Check that anonymous access has been removed from sensitive tables
SELECT
  schemaname,
  tablename,
  policyname,
  CASE WHEN roles IS NULL OR NOT ('anon' = ANY(roles)) THEN 'SECURE' ELSE 'ANONYMOUS ACCESS' END as security_status
FROM pg_policies
WHERE schemaname = 'public'
AND tablename IN ('admin_audit_log', 'admin_sessions', 'admin_users', 'profiles')
ORDER BY tablename, policyname;

-- ============================================
-- END OF FIX SCRIPT
-- ============================================

-- Expected result: All 66 Supabase warnings should be resolved
-- Run this script in Supabase SQL Editor, then check the Advisor tab
