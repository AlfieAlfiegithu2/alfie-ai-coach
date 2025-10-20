-- Earthworm Integration Migration
-- Create tables to track user progress in Earthworm learning system

-- Table for Earthworm user progress
CREATE TABLE IF NOT EXISTS public.earthworm_user_progress (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  lesson_id text NOT NULL,
  course_id text,
  completed_at timestamptz DEFAULT now(),
  score integer,
  time_spent_seconds integer,
  accuracy_percentage decimal(5,2),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, lesson_id)
);

-- Table for Earthworm user statistics
CREATE TABLE IF NOT EXISTS public.earthworm_user_stats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  total_lessons_completed integer DEFAULT 0,
  total_time_spent_seconds integer DEFAULT 0,
  average_score decimal(5,2),
  current_streak_days integer DEFAULT 0,
  longest_streak_days integer DEFAULT 0,
  last_activity_date timestamptz,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable Row Level Security
ALTER TABLE public.earthworm_user_progress ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.earthworm_user_stats ENABLE ROW LEVEL SECURITY;

-- RLS Policies for earthworm_user_progress
CREATE POLICY "Users can view own progress"
  ON public.earthworm_user_progress FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own progress"
  ON public.earthworm_user_progress FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own progress"
  ON public.earthworm_user_progress FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- RLS Policies for earthworm_user_stats
CREATE POLICY "Users can view own stats"
  ON public.earthworm_user_stats FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own stats"
  ON public.earthworm_user_stats FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own stats"
  ON public.earthworm_user_stats FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_earthworm_progress_user_id 
  ON public.earthworm_user_progress(user_id);

CREATE INDEX IF NOT EXISTS idx_earthworm_progress_lesson_id 
  ON public.earthworm_user_progress(lesson_id);

CREATE INDEX IF NOT EXISTS idx_earthworm_progress_completed_at 
  ON public.earthworm_user_progress(completed_at DESC);

CREATE INDEX IF NOT EXISTS idx_earthworm_stats_user_id 
  ON public.earthworm_user_stats(user_id);

-- Function to update user stats after progress insert/update
CREATE OR REPLACE FUNCTION update_earthworm_stats()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.earthworm_user_stats (
    user_id,
    total_lessons_completed,
    total_time_spent_seconds,
    average_score,
    last_activity_date
  )
  VALUES (
    NEW.user_id,
    1,
    COALESCE(NEW.time_spent_seconds, 0),
    COALESCE(NEW.score, 0),
    NEW.completed_at
  )
  ON CONFLICT (user_id) 
  DO UPDATE SET
    total_lessons_completed = earthworm_user_stats.total_lessons_completed + 1,
    total_time_spent_seconds = earthworm_user_stats.total_time_spent_seconds + COALESCE(NEW.time_spent_seconds, 0),
    average_score = (
      (earthworm_user_stats.average_score * earthworm_user_stats.total_lessons_completed + COALESCE(NEW.score, 0)) 
      / (earthworm_user_stats.total_lessons_completed + 1)
    ),
    last_activity_date = NEW.completed_at,
    updated_at = NOW();
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger to update stats on progress insert
CREATE TRIGGER trigger_update_earthworm_stats
  AFTER INSERT ON public.earthworm_user_progress
  FOR EACH ROW
  EXECUTE FUNCTION update_earthworm_stats();

-- Comment documentation
COMMENT ON TABLE public.earthworm_user_progress IS 'Tracks individual lesson progress for Earthworm learning system';
COMMENT ON TABLE public.earthworm_user_stats IS 'Aggregated statistics for Earthworm users';

