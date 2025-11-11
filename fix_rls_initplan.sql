-- Fix RLS Initplan Issues - Replace auth.<function>() with (select auth.<function>())

-- IMPORTANT: Test these changes carefully in a development environment first!
-- RLS policies control data access security - incorrect changes can expose data

-- community_comments - "Authenticated users can create comments"
DROP POLICY IF EXISTS "Authenticated users can create comments" ON public.community_comments;
CREATE POLICY "Authenticated users can create comments" ON public.community_comments
FOR INSERT WITH CHECK (
  (select auth.uid()) = user_id AND
  EXISTS (
    SELECT 1 FROM public.community_posts
    WHERE id = post_id AND status = 'published'
  )
);

-- community_posts - "Authenticated users can create posts"
DROP POLICY IF EXISTS "Authenticated users can create posts" ON public.community_posts;
CREATE POLICY "Authenticated users can create posts" ON public.community_posts
FOR INSERT WITH CHECK ((select auth.uid()) = user_id);

-- speaking_prompts - "Authenticated users can manage speaking prompts"
DROP POLICY IF EXISTS "Authenticated users can manage speaking prompts" ON public.speaking_prompts;
CREATE POLICY "Authenticated users can manage speaking prompts" ON public.speaking_prompts
FOR ALL USING ((select auth.uid()) = created_by);

-- community_comments - "Authenticated users can view comments"
DROP POLICY IF EXISTS "Authenticated users can view comments" ON public.community_comments;
CREATE POLICY "Authenticated users can view comments" ON public.community_comments
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.community_posts
    WHERE id = post_id AND status = 'published'
  )
);

-- community_posts - "Authenticated users can view community posts"
DROP POLICY IF EXISTS "Authenticated users can view community posts" ON public.community_posts;
CREATE POLICY "Authenticated users can view community posts" ON public.community_posts
FOR SELECT USING (status = 'published' OR (select auth.uid()) = user_id);

-- pronunciation_items - "Creators can manage items for own tests"
DROP POLICY IF EXISTS "Creators can manage items for own tests" ON public.pronunciation_items;
CREATE POLICY "Creators can manage items for own tests" ON public.pronunciation_items
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.pronunciation_tests
    WHERE id = test_id AND (select auth.uid()) = created_by
  )
);

-- pronunciation_tests - "Creators can manage their tests"
DROP POLICY IF EXISTS "Creators can manage their tests" ON public.pronunciation_tests;
CREATE POLICY "Creators can manage their tests" ON public.pronunciation_tests
FOR ALL USING ((select auth.uid()) = created_by);

-- user_roles - "Only admins can manage roles"
DROP POLICY IF EXISTS "Only admins can manage roles" ON public.user_roles;
CREATE POLICY "Only admins can manage roles" ON public.user_roles
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM public.user_roles ur
    WHERE ur.user_id = (select auth.uid()) AND ur.role = 'admin'
  )
);

-- admin_audit_log - "Only admins can view audit logs"
DROP POLICY IF EXISTS "Only admins can view audit logs" ON public.admin_audit_log;
CREATE POLICY "Only admins can view audit logs" ON public.admin_audit_log
FOR SELECT USING (
  EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = (select auth.uid()) AND role = 'admin'
  )
);

-- page_content_versions - "Only service role can manage content versions"
DROP POLICY IF EXISTS "Only service role can manage content versions" ON public.page_content_versions;
CREATE POLICY "Only service role can manage content versions" ON public.page_content_versions
FOR ALL USING ((select auth.role()) = 'service_role');

-- page_translations - "Only service role can manage page translations"
DROP POLICY IF EXISTS "Only service role can manage page translations" ON public.page_translations;
CREATE POLICY "Only service role can manage page translations" ON public.page_translations
FOR ALL USING ((select auth.role()) = 'service_role');

-- admin_audit_log - "Service role can insert audit logs"
DROP POLICY IF EXISTS "Service role can insert audit logs" ON public.admin_audit_log;
CREATE POLICY "Service role can insert audit logs" ON public.admin_audit_log
FOR INSERT WITH CHECK ((select auth.role()) = 'service_role');

-- jobs_vocab_seed - "Service role can manage all seed jobs"
DROP POLICY IF EXISTS "Service role can manage all seed jobs" ON public.jobs_vocab_seed;
CREATE POLICY "Service role can manage all seed jobs" ON public.jobs_vocab_seed
FOR ALL USING ((select auth.role()) = 'service_role');

-- vocab_translation_queue - "Service role can manage all translation jobs"
DROP POLICY IF EXISTS "Service role can manage all translation jobs" ON public.vocab_translation_queue;
CREATE POLICY "Service role can manage all translation jobs" ON public.vocab_translation_queue
FOR ALL USING ((select auth.role()) = 'service_role');

-- vocab_translation_enrichments - "Service role can manage enrichments"
DROP POLICY IF EXISTS "Service role can manage enrichments" ON public.vocab_translation_enrichments;
CREATE POLICY "Service role can manage enrichments" ON public.vocab_translation_enrichments
FOR ALL USING ((select auth.role()) = 'service_role');

-- vocab_translations - "Service role can manage system translations"
DROP POLICY IF EXISTS "Service role can manage system translations" ON public.vocab_translations;
CREATE POLICY "Service role can manage system translations" ON public.vocab_translations
FOR ALL USING ((select auth.role()) = 'service_role');

-- question_bookmarks - "Users can delete their own bookmarks"
DROP POLICY IF EXISTS "Users can delete their own bookmarks" ON public.question_bookmarks;
CREATE POLICY "Users can delete their own bookmarks" ON public.question_bookmarks
FOR DELETE USING ((select auth.uid()) = user_id);

-- translation_cache - "Service role can manage translation cache"
DROP POLICY IF EXISTS "Service role can manage translation cache" ON public.translation_cache;
CREATE POLICY "Service role can manage translation cache" ON public.translation_cache
FOR ALL USING ((select auth.role()) = 'service_role');

-- vocab_srs_state - "Users can create their own SRS state"
DROP POLICY IF EXISTS "Users can create their own SRS state" ON public.vocab_srs_state;
CREATE POLICY "Users can create their own SRS state" ON public.vocab_srs_state
FOR INSERT WITH CHECK ((select auth.uid()) = user_id);

-- question_bookmarks - "Users can create their own bookmarks"
DROP POLICY IF EXISTS "Users can create their own bookmarks" ON public.question_bookmarks;
CREATE POLICY "Users can create their own bookmarks" ON public.question_bookmarks
FOR INSERT WITH CHECK ((select auth.uid()) = user_id);

-- vocab_cards - "Users can create their own cards"
DROP POLICY IF EXISTS "Users can create their own cards" ON public.vocab_cards;
CREATE POLICY "Users can create their own cards" ON public.vocab_cards
FOR INSERT WITH CHECK ((select auth.uid()) = user_id);

-- vocab_decks - "Users can create their own decks"
DROP POLICY IF EXISTS "Users can create their own decks" ON public.vocab_decks;
CREATE POLICY "Users can create their own decks" ON public.vocab_decks
FOR INSERT WITH CHECK ((select auth.uid()) = user_id);

-- vocab_reviews - "Users can create their own reviews"
DROP POLICY IF EXISTS "Users can create their own reviews" ON public.vocab_reviews;
CREATE POLICY "Users can create their own reviews" ON public.vocab_reviews
FOR INSERT WITH CHECK ((select auth.uid()) = user_id);

-- jobs_vocab_seed - "Users can create their own seed jobs"
DROP POLICY IF EXISTS "Users can create their own seed jobs" ON public.jobs_vocab_seed;
CREATE POLICY "Users can create their own seed jobs" ON public.jobs_vocab_seed
FOR INSERT WITH CHECK ((select auth.uid()) = user_id);

-- vocab_cards - "Users can delete their own cards"
DROP POLICY IF EXISTS "Users can delete their own cards" ON public.vocab_cards;
CREATE POLICY "Users can delete their own cards" ON public.vocab_cards
FOR DELETE USING ((select auth.uid()) = user_id);

-- community_comments - "Users can delete their own comments"
DROP POLICY IF EXISTS "Users can delete their own comments" ON public.community_comments;
CREATE POLICY "Users can delete their own comments" ON public.community_comments
FOR DELETE USING ((select auth.uid()) = user_id);

-- vocab_decks - "Users can delete their own decks"
DROP POLICY IF EXISTS "Users can delete their own decks" ON public.vocab_decks;
CREATE POLICY "Users can delete their own decks" ON public.vocab_decks
FOR DELETE USING ((select auth.uid()) = user_id);

-- community_posts - "Users can delete their own posts"
DROP POLICY IF EXISTS "Users can delete their own posts" ON public.community_posts;
CREATE POLICY "Users can delete their own posts" ON public.community_posts
FOR DELETE USING ((select auth.uid()) = user_id);

-- user_vocabulary - "Users can delete their own vocabulary"
DROP POLICY IF EXISTS "Users can delete their own vocabulary" ON public.user_vocabulary;
CREATE POLICY "Users can delete their own vocabulary" ON public.user_vocabulary
FOR DELETE USING ((select auth.uid()) = user_id);

-- vocab_translation_queue - "Users can enqueue own translation jobs"
DROP POLICY IF EXISTS "Users can enqueue own translation jobs" ON public.vocab_translation_queue;
CREATE POLICY "Users can enqueue own translation jobs" ON public.vocab_translation_queue
FOR INSERT WITH CHECK ((select auth.uid()) = user_id);

-- user_analytics - "Users can insert own analytics"
DROP POLICY IF EXISTS "Users can insert own analytics" ON public.user_analytics;
CREATE POLICY "Users can insert own analytics" ON public.user_analytics
FOR INSERT WITH CHECK ((select auth.uid()) = user_id);

-- earthworm_user_progress - "Users can insert own progress"
DROP POLICY IF EXISTS "Users can insert own progress" ON public.earthworm_user_progress;
CREATE POLICY "Users can insert own progress" ON public.earthworm_user_progress
FOR INSERT WITH CHECK ((select auth.uid()) = user_id);

-- earthworm_user_stats - "Users can insert own stats"
DROP POLICY IF EXISTS "Users can insert own stats" ON public.earthworm_user_stats;
CREATE POLICY "Users can insert own stats" ON public.earthworm_user_stats
FOR INSERT WITH CHECK ((select auth.uid()) = user_id);

-- test_results - "Users can insert own test results"
DROP POLICY IF EXISTS "Users can insert own test results" ON public.test_results;
CREATE POLICY "Users can insert own test results" ON public.test_results
FOR INSERT WITH CHECK ((select auth.uid()) = user_id);

-- user_assessments - "Users can insert their own assessments"
DROP POLICY IF EXISTS "Users can insert their own assessments" ON public.user_assessments;
CREATE POLICY "Users can insert their own assessments" ON public.user_assessments
FOR INSERT WITH CHECK ((select auth.uid()) = user_id);

-- user_challenge_progress - "Users can insert their own challenge progress"
DROP POLICY IF EXISTS "Users can insert their own challenge progress" ON public.user_challenge_progress;
CREATE POLICY "Users can insert their own challenge progress" ON public.user_challenge_progress
FOR INSERT WITH CHECK ((select auth.uid()) = user_id);

-- listening_test_results - "Users can insert their own listening results"
DROP POLICY IF EXISTS "Users can insert their own listening results" ON public.listening_test_results;
CREATE POLICY "Users can insert their own listening results" ON public.listening_test_results
FOR INSERT WITH CHECK ((select auth.uid()) = user_id);

-- user_preferences - "Users can insert their own preferences"
DROP POLICY IF EXISTS "Users can insert their own preferences" ON public.user_preferences;
CREATE POLICY "Users can insert their own preferences" ON public.user_preferences
FOR INSERT WITH CHECK ((select auth.uid()) = user_id);

-- reading_test_results - "Users can insert their own reading results"
DROP POLICY IF EXISTS "Users can insert their own reading results" ON public.reading_test_results;
CREATE POLICY "Users can insert their own reading results" ON public.reading_test_results
FOR INSERT WITH CHECK ((select auth.uid()) = user_id);

-- pronunciation_results - "Users can insert their own results"
DROP POLICY IF EXISTS "Users can insert their own results" ON public.pronunciation_results;
CREATE POLICY "Users can insert their own results" ON public.pronunciation_results
FOR INSERT WITH CHECK ((select auth.uid()) = user_id);

-- user_skill_progress - "Users can insert their own skill progress"
DROP POLICY IF EXISTS "Users can insert their own skill progress" ON public.user_skill_progress;
CREATE POLICY "Users can insert their own skill progress" ON public.user_skill_progress
FOR INSERT WITH CHECK ((select auth.uid()) = user_id);

-- speaking_test_results - "Users can insert their own speaking results"
DROP POLICY IF EXISTS "Users can insert their own speaking results" ON public.speaking_test_results;
CREATE POLICY "Users can insert their own speaking results" ON public.speaking_test_results
FOR INSERT WITH CHECK ((select auth.uid()) = user_id);

-- study_plans - "Users can insert their own study plans"
DROP POLICY IF EXISTS "Users can insert their own study plans" ON public.study_plans;
CREATE POLICY "Users can insert their own study plans" ON public.study_plans
FOR INSERT WITH CHECK ((select auth.uid()) = user_id);

-- user_test_progress - "Users can insert their own test progress"
DROP POLICY IF EXISTS "Users can insert their own test progress" ON public.user_test_progress;
CREATE POLICY "Users can insert their own test progress" ON public.user_test_progress
FOR INSERT WITH CHECK ((select auth.uid()) = user_id);

-- user_vocabulary - "Users can insert their own vocabulary"
DROP POLICY IF EXISTS "Users can insert their own vocabulary" ON public.user_vocabulary;
CREATE POLICY "Users can insert their own vocabulary" ON public.user_vocabulary
FOR INSERT WITH CHECK ((select auth.uid()) = user_id);

-- writing_test_results - "Users can insert their own writing results"
DROP POLICY IF EXISTS "Users can insert their own writing results" ON public.writing_test_results;
CREATE POLICY "Users can insert their own writing results" ON public.writing_test_results
FOR INSERT WITH CHECK ((select auth.uid()) = user_id);

-- vocab_translations - "Users can insert translations"
DROP POLICY IF EXISTS "Users can insert translations" ON public.vocab_translations;
CREATE POLICY "Users can insert translations" ON public.vocab_translations
FOR INSERT WITH CHECK ((select auth.uid()) = user_id);

-- vocab_examples - "vocab_examples_user"
DROP POLICY IF EXISTS "vocab_examples_user" ON public.vocab_examples;
CREATE POLICY "vocab_examples_user" ON public.vocab_examples
FOR ALL USING ((select auth.uid()) = user_id);

-- vocab_images - "vocab_images_user"
DROP POLICY IF EXISTS "vocab_images_user" ON public.vocab_images;
CREATE POLICY "vocab_images_user" ON public.vocab_images
FOR ALL USING ((select auth.uid()) = user_id);

-- vocab_pronunciations - "vocab_pronunciations_user"
DROP POLICY IF EXISTS "vocab_pronunciations_user" ON public.vocab_pronunciations;
CREATE POLICY "vocab_pronunciations_user" ON public.vocab_pronunciations
FOR ALL USING ((select auth.uid()) = user_id);

-- vocab_translations - "vocab_translations_read_system"
DROP POLICY IF EXISTS "vocab_translations_read_system" ON public.vocab_translations;
CREATE POLICY "vocab_translations_read_system" ON public.vocab_translations
FOR SELECT USING (is_system = true);

-- vocab_translations - "vocab_translations_service"
DROP POLICY IF EXISTS "vocab_translations_service" ON public.vocab_translations;
CREATE POLICY "vocab_translations_service" ON public.vocab_translations
FOR ALL USING ((select auth.role()) = 'service_role');

-- vocab_translations - "vocab_translations_user_own"
DROP POLICY IF EXISTS "vocab_translations_user_own" ON public.vocab_translations;
CREATE POLICY "vocab_translations_user_own" ON public.vocab_translations
FOR ALL USING ((select auth.uid()) = user_id);

-- pronunciation_results - "Users can read their own results"
DROP POLICY IF EXISTS "Users can read their own results" ON public.pronunciation_results;
CREATE POLICY "Users can read their own results" ON public.pronunciation_results
FOR SELECT USING ((select auth.uid()) = user_id);

-- earthworm_user_progress - "Users can update own progress"
DROP POLICY IF EXISTS "Users can update own progress" ON public.earthworm_user_progress;
CREATE POLICY "Users can update own progress" ON public.earthworm_user_progress
FOR UPDATE USING ((select auth.uid()) = user_id);

-- earthworm_user_stats - "Users can update own stats"
DROP POLICY IF EXISTS "Users can update own stats" ON public.earthworm_user_stats;
CREATE POLICY "Users can update own stats" ON public.earthworm_user_stats
FOR UPDATE USING ((select auth.uid()) = user_id);

-- test_results - "Users can update own test results"
DROP POLICY IF EXISTS "Users can update own test results" ON public.test_results;
CREATE POLICY "Users can update own test results" ON public.test_results
FOR UPDATE USING ((select auth.uid()) = user_id);

-- vocab_srs_state - "Users can update their own SRS state"
DROP POLICY IF EXISTS "Users can update their own SRS state" ON public.vocab_srs_state;
CREATE POLICY "Users can update their own SRS state" ON public.vocab_srs_state
FOR UPDATE USING ((select auth.uid()) = user_id);

-- user_assessments - "Users can update their own assessments"
DROP POLICY IF EXISTS "Users can update their own assessments" ON public.user_assessments;
CREATE POLICY "Users can update their own assessments" ON public.user_assessments
FOR UPDATE USING ((select auth.uid()) = user_id);

-- question_bookmarks - "Users can update their own bookmarks"
DROP POLICY IF EXISTS "Users can update their own bookmarks" ON public.question_bookmarks;
CREATE POLICY "Users can update their own bookmarks" ON public.question_bookmarks
FOR UPDATE USING ((select auth.uid()) = user_id);

-- vocab_cards - "Users can update their own cards"
DROP POLICY IF EXISTS "Users can update their own cards" ON public.vocab_cards;
CREATE POLICY "Users can update their own cards" ON public.vocab_cards
FOR UPDATE USING ((select auth.uid()) = user_id);

-- user_challenge_progress - "Users can update their own challenge progress"
DROP POLICY IF EXISTS "Users can update their own challenge progress" ON public.user_challenge_progress;
CREATE POLICY "Users can update their own challenge progress" ON public.user_challenge_progress
FOR UPDATE USING ((select auth.uid()) = user_id);

-- community_comments - "Users can update their own comments"
DROP POLICY IF EXISTS "Users can update their own comments" ON public.community_comments;
CREATE POLICY "Users can update their own comments" ON public.community_comments
FOR UPDATE USING ((select auth.uid()) = user_id);

-- vocab_decks - "Users can update their own decks"
DROP POLICY IF EXISTS "Users can update their own decks" ON public.vocab_decks;
CREATE POLICY "Users can update their own decks" ON public.vocab_decks
FOR UPDATE USING ((select auth.uid()) = user_id);

-- user_assessments - "Users can view their own assessments"
DROP POLICY IF EXISTS "Users can view their own assessments" ON public.user_assessments;
CREATE POLICY "Users can view their own assessments" ON public.user_assessments
FOR SELECT USING ((select auth.uid()) = user_id);

-- community_posts - "Users can update their own posts"
DROP POLICY IF EXISTS "Users can update their own posts" ON public.community_posts;
CREATE POLICY "Users can update their own posts" ON public.community_posts
FOR UPDATE USING ((select auth.uid()) = user_id);

-- user_preferences - "Users can update their own preferences"
DROP POLICY IF EXISTS "Users can update their own preferences" ON public.user_preferences;
CREATE POLICY "Users can update their own preferences" ON public.user_preferences
FOR UPDATE USING ((select auth.uid()) = user_id);

-- user_skill_progress - "Users can update their own skill progress"
DROP POLICY IF EXISTS "Users can update their own skill progress" ON public.user_skill_progress;
CREATE POLICY "Users can update their own skill progress" ON public.user_skill_progress
FOR UPDATE USING ((select auth.uid()) = user_id);

-- speaking_test_results - "Users can update their own speaking results"
DROP POLICY IF EXISTS "Users can update their own speaking results" ON public.speaking_test_results;
CREATE POLICY "Users can update their own speaking results" ON public.speaking_test_results
FOR UPDATE USING ((select auth.uid()) = user_id);

-- study_plans - "Users can update their own study plans"
DROP POLICY IF EXISTS "Users can update their own study plans" ON public.study_plans;
CREATE POLICY "Users can update their own study plans" ON public.study_plans
FOR UPDATE USING ((select auth.uid()) = user_id);

-- user_test_progress - "Users can update their own test progress"
DROP POLICY IF EXISTS "Users can update their own test progress" ON public.user_test_progress;
CREATE POLICY "Users can update their own test progress" ON public.user_test_progress
FOR UPDATE USING ((select auth.uid()) = user_id);

-- user_analytics - "Users can view own analytics"
DROP POLICY IF EXISTS "Users can view own analytics" ON public.user_analytics;
CREATE POLICY "Users can view own analytics" ON public.user_analytics
FOR SELECT USING ((select auth.uid()) = user_id);

-- earthworm_user_progress - "Users can view own progress"
DROP POLICY IF EXISTS "Users can view own progress" ON public.earthworm_user_progress;
CREATE POLICY "Users can view own progress" ON public.earthworm_user_progress
FOR SELECT USING ((select auth.uid()) = user_id);

-- earthworm_user_stats - "Users can view own stats"
DROP POLICY IF EXISTS "Users can view own stats" ON public.earthworm_user_stats;
CREATE POLICY "Users can view own stats" ON public.earthworm_user_stats
FOR SELECT USING ((select auth.uid()) = user_id);

-- test_results - "Users can view own test results"
DROP POLICY IF EXISTS "Users can view own test results" ON public.test_results;
CREATE POLICY "Users can view own test results" ON public.test_results
FOR SELECT USING ((select auth.uid()) = user_id);

-- writing_analysis_cache - "Users can view own writing analysis cache"
DROP POLICY IF EXISTS "Users can view own writing analysis cache" ON public.writing_analysis_cache;
CREATE POLICY "Users can view own writing analysis cache" ON public.writing_analysis_cache
FOR SELECT USING ((select auth.uid()) = user_id);

-- vocab_srs_state - "Users can view their own SRS state"
DROP POLICY IF EXISTS "Users can view their own SRS state" ON public.vocab_srs_state;
CREATE POLICY "Users can view their own SRS state" ON public.vocab_srs_state
FOR SELECT USING ((select auth.uid()) = user_id);

-- question_bookmarks - "Users can view their own bookmarks"
DROP POLICY IF EXISTS "Users can view their own bookmarks" ON public.question_bookmarks;
CREATE POLICY "Users can view their own bookmarks" ON public.question_bookmarks
FOR SELECT USING ((select auth.uid()) = user_id);

-- vocab_cards - "Users can view their own cards"
DROP POLICY IF EXISTS "Users can view their own cards" ON public.vocab_cards;
CREATE POLICY "Users can view their own cards" ON public.vocab_cards
FOR SELECT USING ((select auth.uid()) = user_id);

-- user_challenge_progress - "Users can view their own challenge progress"
DROP POLICY IF EXISTS "Users can view their own challenge progress" ON public.user_challenge_progress;
CREATE POLICY "Users can view their own challenge progress" ON public.user_challenge_progress
FOR SELECT USING ((select auth.uid()) = user_id);

-- vocab_decks - "Users can view their own decks"
DROP POLICY IF EXISTS "Users can view their own decks" ON public.vocab_decks;
CREATE POLICY "Users can view their own decks" ON public.vocab_decks
FOR SELECT USING ((select auth.uid()) = user_id);

-- listening_test_results - "Users can view their own listening results"
DROP POLICY IF EXISTS "Users can view their own listening results" ON public.listening_test_results;
CREATE POLICY "Users can view their own listening results" ON public.listening_test_results
FOR SELECT USING ((select auth.uid()) = user_id);

-- user_preferences - "Users can view their own preferences"
DROP POLICY IF EXISTS "Users can view their own preferences" ON public.user_preferences;
CREATE POLICY "Users can view their own preferences" ON public.user_preferences
FOR SELECT USING ((select auth.uid()) = user_id);

-- api_rate_limits - "Users can view their own rate limits"
DROP POLICY IF EXISTS "Users can view their own rate limits" ON public.api_rate_limits;
CREATE POLICY "Users can view their own rate limits" ON public.api_rate_limits
FOR SELECT USING ((select auth.uid()) = user_id);

-- reading_test_results - "Users can view their own reading results"
DROP POLICY IF EXISTS "Users can view their own reading results" ON public.reading_test_results;
CREATE POLICY "Users can view their own reading results" ON public.reading_test_results
FOR SELECT USING ((select auth.uid()) = user_id);

-- user_roles - "Users can view their own roles"
DROP POLICY IF EXISTS "Users can view their own roles" ON public.user_roles;
CREATE POLICY "Users can view their own roles" ON public.user_roles
FOR SELECT USING ((select auth.uid()) = user_id);

-- jobs_vocab_seed - "Users can view their own seed jobs"
DROP POLICY IF EXISTS "Users can view their own seed jobs" ON public.jobs_vocab_seed;
CREATE POLICY "Users can view their own seed jobs" ON public.jobs_vocab_seed
FOR SELECT USING ((select auth.uid()) = user_id);

-- user_skill_progress - "Users can view their own skill progress"
DROP POLICY IF EXISTS "Users can view their own skill progress" ON public.user_skill_progress;
CREATE POLICY "Users can view their own skill progress" ON public.user_skill_progress
FOR SELECT USING ((select auth.uid()) = user_id);

-- speaking_test_results - "Users can view their own speaking results"
DROP POLICY IF EXISTS "Users can view their own speaking results" ON public.speaking_test_results;
CREATE POLICY "Users can view their own speaking results" ON public.speaking_test_results
FOR SELECT USING ((select auth.uid()) = user_id);

-- study_plans - "Users can view their own study plans"
DROP POLICY IF EXISTS "Users can view their own study plans" ON public.study_plans;
CREATE POLICY "Users can view their own study plans" ON public.study_plans
FOR SELECT USING ((select auth.uid()) = user_id);

-- user_test_progress - "Users can view their own test progress"
DROP POLICY IF EXISTS "Users can view their own test progress" ON public.user_test_progress;
CREATE POLICY "Users can view their own test progress" ON public.user_test_progress
FOR SELECT USING ((select auth.uid()) = user_id);

-- vocab_translation_queue - "Users can view their own translation jobs"
DROP POLICY IF EXISTS "Users can view their own translation jobs" ON public.vocab_translation_queue;
CREATE POLICY "Users can view their own translation jobs" ON public.vocab_translation_queue
FOR SELECT USING ((select auth.uid()) = user_id);

-- translation_cache - "Users can view their own translations"
DROP POLICY IF EXISTS "Users can view their own translations" ON public.translation_cache;
CREATE POLICY "Users can view their own translations" ON public.translation_cache
FOR SELECT USING ((select auth.uid()) = user_id);

-- user_vocabulary - "Users can view their own vocabulary"
DROP POLICY IF EXISTS "Users can view their own vocabulary" ON public.user_vocabulary;
CREATE POLICY "Users can view their own vocabulary" ON public.user_vocabulary
FOR SELECT USING ((select auth.uid()) = user_id);

-- writing_test_results - "Users can view their own writing results"
DROP POLICY IF EXISTS "Users can view their own writing results" ON public.writing_test_results;
CREATE POLICY "Users can view their own writing results" ON public.writing_test_results
FOR SELECT USING ((select auth.uid()) = user_id);

-- vocab_reviews - "Users can view their own reviews"
DROP POLICY IF EXISTS "Users can view their own reviews" ON public.vocab_reviews;
CREATE POLICY "Users can view their own reviews" ON public.vocab_reviews
FOR SELECT USING ((select auth.uid()) = user_id);
