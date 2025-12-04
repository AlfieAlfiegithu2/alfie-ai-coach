-- Grammar Learning Center Database Schema
-- Created: 2024-12-04
-- Description: Tables for grammar topics, lessons, exercises with multi-language support

-- ============================================
-- GRAMMAR TOPICS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS grammar_topics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug VARCHAR(100) UNIQUE NOT NULL,
  level VARCHAR(20) NOT NULL CHECK (level IN ('beginner', 'intermediate', 'advanced')),
  topic_order INTEGER NOT NULL DEFAULT 1,
  icon VARCHAR(50) DEFAULT 'book',
  color VARCHAR(20) DEFAULT 'blue',
  is_published BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- GRAMMAR TOPIC TRANSLATIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS grammar_topic_translations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_id UUID NOT NULL REFERENCES grammar_topics(id) ON DELETE CASCADE,
  language_code VARCHAR(10) NOT NULL,
  title VARCHAR(200) NOT NULL,
  description TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(topic_id, language_code)
);

-- ============================================
-- GRAMMAR LESSONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS grammar_lessons (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_id UUID NOT NULL REFERENCES grammar_topics(id) ON DELETE CASCADE,
  lesson_order INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- GRAMMAR LESSON TRANSLATIONS TABLE
-- Contains theory, examples, rules for each language
-- ============================================
CREATE TABLE IF NOT EXISTS grammar_lesson_translations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  lesson_id UUID NOT NULL REFERENCES grammar_lessons(id) ON DELETE CASCADE,
  language_code VARCHAR(10) NOT NULL,
  
  -- Theory Section
  theory_title VARCHAR(200),
  theory_definition TEXT,
  theory_formation TEXT,
  theory_usage TEXT,
  theory_common_mistakes TEXT,
  
  -- Formula/Rules (JSON array of rule objects)
  rules JSONB DEFAULT '[]',
  
  -- Examples (JSON array of example objects with sentence, translation, highlight)
  examples JSONB DEFAULT '[]',
  
  -- Tips specific to speakers of this language
  localized_tips TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(lesson_id, language_code)
);

-- ============================================
-- GRAMMAR EXERCISES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS grammar_exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_id UUID NOT NULL REFERENCES grammar_topics(id) ON DELETE CASCADE,
  exercise_type VARCHAR(30) NOT NULL CHECK (exercise_type IN (
    'multiple_choice',
    'fill_in_blank',
    'error_correction',
    'sentence_transformation',
    'drag_drop_reorder'
  )),
  difficulty INTEGER DEFAULT 1 CHECK (difficulty BETWEEN 1 AND 3),
  exercise_order INTEGER NOT NULL DEFAULT 1,
  
  -- For drag_drop_reorder: correct word order (JSON array)
  correct_order JSONB,
  
  -- For sentence_transformation: transformation type
  transformation_type VARCHAR(50),
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- GRAMMAR EXERCISE TRANSLATIONS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS grammar_exercise_translations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exercise_id UUID NOT NULL REFERENCES grammar_exercises(id) ON DELETE CASCADE,
  language_code VARCHAR(10) NOT NULL,
  
  -- Question content
  question TEXT NOT NULL,
  instruction TEXT,
  
  -- For fill_in_blank: the sentence with ___ for blank
  sentence_with_blank TEXT,
  
  -- Answers
  correct_answer TEXT NOT NULL,
  incorrect_answers JSONB DEFAULT '[]',
  
  -- Explanation shown after answering
  explanation TEXT,
  
  -- For error_correction: the incorrect sentence
  incorrect_sentence TEXT,
  
  -- For sentence_transformation: original sentence to transform
  original_sentence TEXT,
  
  -- Hint (optional)
  hint TEXT,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(exercise_id, language_code)
);

-- ============================================
-- USER GRAMMAR PROGRESS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS user_grammar_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  topic_id UUID NOT NULL REFERENCES grammar_topics(id) ON DELETE CASCADE,
  
  -- Progress tracking
  theory_completed BOOLEAN DEFAULT false,
  exercises_completed INTEGER DEFAULT 0,
  total_exercises INTEGER DEFAULT 0,
  best_score INTEGER DEFAULT 0,
  attempts INTEGER DEFAULT 0,
  
  -- Mastery level (0-100)
  mastery_level INTEGER DEFAULT 0,
  
  -- Last activity
  last_practiced_at TIMESTAMPTZ,
  
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, topic_id)
);

-- ============================================
-- USER EXERCISE ATTEMPTS TABLE
-- For spaced repetition and detailed analytics
-- ============================================
CREATE TABLE IF NOT EXISTS user_grammar_exercise_attempts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  exercise_id UUID NOT NULL REFERENCES grammar_exercises(id) ON DELETE CASCADE,
  
  -- Attempt details
  user_answer TEXT,
  is_correct BOOLEAN NOT NULL,
  time_spent_seconds INTEGER,
  
  -- For spaced repetition
  next_review_at TIMESTAMPTZ,
  review_count INTEGER DEFAULT 0,
  
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- INDEXES
-- ============================================
CREATE INDEX IF NOT EXISTS idx_grammar_topics_level ON grammar_topics(level);
CREATE INDEX IF NOT EXISTS idx_grammar_topics_published ON grammar_topics(is_published);
CREATE INDEX IF NOT EXISTS idx_grammar_topic_trans_lang ON grammar_topic_translations(language_code);
CREATE INDEX IF NOT EXISTS idx_grammar_lesson_trans_lang ON grammar_lesson_translations(language_code);
CREATE INDEX IF NOT EXISTS idx_grammar_exercises_topic ON grammar_exercises(topic_id);
CREATE INDEX IF NOT EXISTS idx_grammar_exercise_trans_lang ON grammar_exercise_translations(language_code);
CREATE INDEX IF NOT EXISTS idx_user_grammar_progress_user ON user_grammar_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_user_grammar_attempts_user ON user_grammar_exercise_attempts(user_id);
CREATE INDEX IF NOT EXISTS idx_user_grammar_attempts_exercise ON user_grammar_exercise_attempts(exercise_id);

-- ============================================
-- ROW LEVEL SECURITY
-- ============================================

-- Enable RLS
ALTER TABLE grammar_topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE grammar_topic_translations ENABLE ROW LEVEL SECURITY;
ALTER TABLE grammar_lessons ENABLE ROW LEVEL SECURITY;
ALTER TABLE grammar_lesson_translations ENABLE ROW LEVEL SECURITY;
ALTER TABLE grammar_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE grammar_exercise_translations ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_grammar_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_grammar_exercise_attempts ENABLE ROW LEVEL SECURITY;

-- Public read for published content
CREATE POLICY "Public can view published topics" ON grammar_topics
  FOR SELECT USING (is_published = true);

CREATE POLICY "Public can view topic translations" ON grammar_topic_translations
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM grammar_topics WHERE id = topic_id AND is_published = true
  ));

CREATE POLICY "Public can view lessons" ON grammar_lessons
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM grammar_topics WHERE id = topic_id AND is_published = true
  ));

CREATE POLICY "Public can view lesson translations" ON grammar_lesson_translations
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM grammar_lessons gl
    JOIN grammar_topics gt ON gl.topic_id = gt.id
    WHERE gl.id = lesson_id AND gt.is_published = true
  ));

CREATE POLICY "Public can view exercises" ON grammar_exercises
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM grammar_topics WHERE id = topic_id AND is_published = true
  ));

CREATE POLICY "Public can view exercise translations" ON grammar_exercise_translations
  FOR SELECT USING (EXISTS (
    SELECT 1 FROM grammar_exercises ge
    JOIN grammar_topics gt ON ge.topic_id = gt.id
    WHERE ge.id = exercise_id AND gt.is_published = true
  ));

-- User progress policies
CREATE POLICY "Users can view own progress" ON user_grammar_progress
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own progress" ON user_grammar_progress
  FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own progress" ON user_grammar_progress
  FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own attempts" ON user_grammar_exercise_attempts
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own attempts" ON user_grammar_exercise_attempts
  FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Admin policies (using service role for admin operations)
CREATE POLICY "Service role full access topics" ON grammar_topics
  FOR ALL USING (auth.jwt()->>'role' = 'service_role');

CREATE POLICY "Service role full access topic_trans" ON grammar_topic_translations
  FOR ALL USING (auth.jwt()->>'role' = 'service_role');

CREATE POLICY "Service role full access lessons" ON grammar_lessons
  FOR ALL USING (auth.jwt()->>'role' = 'service_role');

CREATE POLICY "Service role full access lesson_trans" ON grammar_lesson_translations
  FOR ALL USING (auth.jwt()->>'role' = 'service_role');

CREATE POLICY "Service role full access exercises" ON grammar_exercises
  FOR ALL USING (auth.jwt()->>'role' = 'service_role');

CREATE POLICY "Service role full access exercise_trans" ON grammar_exercise_translations
  FOR ALL USING (auth.jwt()->>'role' = 'service_role');

-- ============================================
-- TRIGGER FOR UPDATED_AT
-- ============================================
CREATE OR REPLACE FUNCTION update_grammar_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER grammar_topics_updated_at
  BEFORE UPDATE ON grammar_topics
  FOR EACH ROW EXECUTE FUNCTION update_grammar_updated_at();

CREATE TRIGGER grammar_topic_translations_updated_at
  BEFORE UPDATE ON grammar_topic_translations
  FOR EACH ROW EXECUTE FUNCTION update_grammar_updated_at();

CREATE TRIGGER grammar_lessons_updated_at
  BEFORE UPDATE ON grammar_lessons
  FOR EACH ROW EXECUTE FUNCTION update_grammar_updated_at();

CREATE TRIGGER grammar_lesson_translations_updated_at
  BEFORE UPDATE ON grammar_lesson_translations
  FOR EACH ROW EXECUTE FUNCTION update_grammar_updated_at();

CREATE TRIGGER grammar_exercises_updated_at
  BEFORE UPDATE ON grammar_exercises
  FOR EACH ROW EXECUTE FUNCTION update_grammar_updated_at();

CREATE TRIGGER grammar_exercise_translations_updated_at
  BEFORE UPDATE ON grammar_exercise_translations
  FOR EACH ROW EXECUTE FUNCTION update_grammar_updated_at();

CREATE TRIGGER user_grammar_progress_updated_at
  BEFORE UPDATE ON user_grammar_progress
  FOR EACH ROW EXECUTE FUNCTION update_grammar_updated_at();

