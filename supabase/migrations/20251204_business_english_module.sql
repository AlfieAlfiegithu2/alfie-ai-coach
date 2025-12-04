-- Business English Module Tables
-- Migration for resume builder, email practice, and interview preparation features

-- =====================================================
-- 1. Business Profiles Table
-- Stores user occupation and industry preferences
-- =====================================================
CREATE TABLE IF NOT EXISTS business_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  occupation TEXT NOT NULL,
  industry TEXT,
  years_of_experience INTEGER,
  target_role TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE business_profiles ENABLE ROW LEVEL SECURITY;

-- Users can read/write their own business profile
CREATE POLICY "Users can view own business profile"
  ON business_profiles FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own business profile"
  ON business_profiles FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own business profile"
  ON business_profiles FOR UPDATE
  USING (auth.uid() = user_id);

-- =====================================================
-- 2. Resumes Table
-- Stores user resumes with template and content
-- =====================================================
CREATE TABLE IF NOT EXISTS resumes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL DEFAULT 'My Resume',
  template_id TEXT NOT NULL DEFAULT 'harvard-classic',
  
  -- Personal Information
  full_name TEXT,
  email TEXT,
  phone TEXT,
  location TEXT,
  linkedin_url TEXT,
  portfolio_url TEXT,
  
  -- Resume Sections (stored as JSONB for flexibility)
  summary TEXT,
  experience JSONB DEFAULT '[]'::jsonb,
  education JSONB DEFAULT '[]'::jsonb,
  skills JSONB DEFAULT '[]'::jsonb,
  certifications JSONB DEFAULT '[]'::jsonb,
  projects JSONB DEFAULT '[]'::jsonb,
  languages JSONB DEFAULT '[]'::jsonb,
  
  -- Job Post Analysis
  target_job_post TEXT,
  extracted_keywords JSONB DEFAULT '[]'::jsonb,
  ats_score INTEGER,
  ats_suggestions JSONB DEFAULT '[]'::jsonb,
  
  -- Metadata
  is_primary BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE resumes ENABLE ROW LEVEL SECURITY;

-- Users can read/write their own resumes
CREATE POLICY "Users can view own resumes"
  ON resumes FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own resumes"
  ON resumes FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own resumes"
  ON resumes FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own resumes"
  ON resumes FOR DELETE
  USING (auth.uid() = user_id);

-- =====================================================
-- 3. Cover Letters Table
-- Stores generated cover letters
-- =====================================================
CREATE TABLE IF NOT EXISTS cover_letters (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  resume_id UUID REFERENCES resumes(id) ON DELETE SET NULL,
  title TEXT NOT NULL DEFAULT 'My Cover Letter',
  
  -- Cover Letter Content
  recipient_name TEXT,
  company_name TEXT,
  job_title TEXT,
  content TEXT NOT NULL,
  
  -- Source Information
  job_post TEXT,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE cover_letters ENABLE ROW LEVEL SECURITY;

-- Users can read/write their own cover letters
CREATE POLICY "Users can view own cover letters"
  ON cover_letters FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own cover letters"
  ON cover_letters FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own cover letters"
  ON cover_letters FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own cover letters"
  ON cover_letters FOR DELETE
  USING (auth.uid() = user_id);

-- =====================================================
-- 4. Email Practice Sessions Table
-- Stores email scenarios and student responses
-- =====================================================
CREATE TABLE IF NOT EXISTS email_practice_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Scenario Information
  scenario_type TEXT NOT NULL, -- 'meeting_request', 'project_update', 'complaint', etc.
  scenario_category TEXT NOT NULL, -- 'business', 'tech', 'healthcare', 'general'
  difficulty_level TEXT NOT NULL DEFAULT 'intermediate', -- 'basic', 'intermediate', 'advanced'
  
  -- Email Context
  context_subject TEXT NOT NULL,
  context_from TEXT NOT NULL,
  context_body TEXT NOT NULL,
  context_instructions TEXT,
  
  -- Student Response
  student_response TEXT,
  response_submitted_at TIMESTAMPTZ,
  
  -- AI Feedback
  feedback JSONB, -- Contains tone, grammar, vocabulary, structure scores and feedback
  overall_score INTEGER, -- 1-100
  improved_version TEXT, -- AI-suggested improved email
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE email_practice_sessions ENABLE ROW LEVEL SECURITY;

-- Users can read/write their own email practice sessions
CREATE POLICY "Users can view own email sessions"
  ON email_practice_sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own email sessions"
  ON email_practice_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own email sessions"
  ON email_practice_sessions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own email sessions"
  ON email_practice_sessions FOR DELETE
  USING (auth.uid() = user_id);

-- =====================================================
-- 5. Interview Sessions Table
-- Stores interview practice sessions with questions and grades
-- =====================================================
CREATE TABLE IF NOT EXISTS interview_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  
  -- Session Configuration
  occupation TEXT NOT NULL,
  industry TEXT,
  grading_mode TEXT NOT NULL DEFAULT 'quality_only', -- 'quality_only' or 'quality_and_english'
  
  -- Questions and Answers (stored as JSONB array)
  questions JSONB NOT NULL DEFAULT '[]'::jsonb,
  -- Each question object: { question, answer_text, answer_audio_url, quality_score, english_score, feedback }
  
  -- Overall Grades
  overall_quality_score NUMERIC(4,2), -- 1-10 scale
  overall_english_score NUMERIC(4,2), -- 1-10 scale (null if quality_only mode)
  
  -- AI Summary Feedback
  summary_feedback TEXT,
  strengths JSONB DEFAULT '[]'::jsonb,
  areas_to_improve JSONB DEFAULT '[]'::jsonb,
  
  -- Session Status
  status TEXT NOT NULL DEFAULT 'in_progress', -- 'in_progress', 'completed', 'abandoned'
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE interview_sessions ENABLE ROW LEVEL SECURITY;

-- Users can read/write their own interview sessions
CREATE POLICY "Users can view own interview sessions"
  ON interview_sessions FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own interview sessions"
  ON interview_sessions FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own interview sessions"
  ON interview_sessions FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own interview sessions"
  ON interview_sessions FOR DELETE
  USING (auth.uid() = user_id);

-- =====================================================
-- 6. Email Scenario Templates Table
-- Preset email scenarios for practice
-- =====================================================
CREATE TABLE IF NOT EXISTS email_scenario_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  scenario_type TEXT NOT NULL,
  scenario_category TEXT NOT NULL,
  difficulty_level TEXT NOT NULL DEFAULT 'intermediate',
  
  -- Template Content
  subject_template TEXT NOT NULL,
  from_template TEXT NOT NULL,
  body_template TEXT NOT NULL,
  instructions TEXT,
  
  -- Occupation targeting
  target_occupations TEXT[], -- Empty means all occupations
  
  -- Metadata
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE email_scenario_templates ENABLE ROW LEVEL SECURITY;

-- Everyone can read scenario templates
CREATE POLICY "Anyone can view email scenario templates"
  ON email_scenario_templates FOR SELECT
  USING (true);

-- =====================================================
-- 7. Indexes for Performance
-- =====================================================
CREATE INDEX IF NOT EXISTS idx_business_profiles_user_id ON business_profiles(user_id);
CREATE INDEX IF NOT EXISTS idx_resumes_user_id ON resumes(user_id);
CREATE INDEX IF NOT EXISTS idx_cover_letters_user_id ON cover_letters(user_id);
CREATE INDEX IF NOT EXISTS idx_email_practice_user_id ON email_practice_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_interview_sessions_user_id ON interview_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_interview_sessions_status ON interview_sessions(status);

-- =====================================================
-- 8. Seed Email Scenario Templates
-- =====================================================
INSERT INTO email_scenario_templates (scenario_type, scenario_category, difficulty_level, subject_template, from_template, body_template, instructions) VALUES
-- Business scenarios
('meeting_request', 'business', 'basic', 'Meeting Request: Q4 Budget Review', 'Sarah Johnson <sarah.johnson@company.com>', 'Hi,

I hope this email finds you well. I would like to schedule a meeting to discuss the Q4 budget review. Could you please let me know your availability next week?

Looking forward to hearing from you.

Best regards,
Sarah Johnson
Finance Manager', 'Reply professionally to confirm your availability or suggest alternative times.'),

('project_update', 'business', 'intermediate', 'RE: Project Phoenix - Status Update Required', 'Michael Chen <michael.chen@company.com>', 'Hi Team,

The steering committee has requested an urgent status update on Project Phoenix. We need to present our progress at tomorrow''s board meeting.

Please provide:
1. Current milestone status
2. Any blockers or risks
3. Estimated completion date

I need this by EOD today.

Thanks,
Michael', 'Provide a professional update addressing all three requested items. Be concise but thorough.'),

('client_followup', 'business', 'advanced', 'Following Up: Partnership Proposal', 'Jennifer Williams <jwilliams@partnercorp.com>', 'Dear [Your Name],

Thank you for presenting your partnership proposal last week. Our team has reviewed it and we have some concerns about the implementation timeline and cost structure.

We''re particularly interested in:
- How you plan to handle the integration challenges we discussed
- Whether the pricing can be more flexible for a multi-year commitment
- References from similar partnerships

We remain interested but need these clarifications before proceeding.

Best regards,
Jennifer Williams
VP of Strategic Partnerships', 'Address each concern professionally. Show confidence while being open to negotiation.'),

-- Tech scenarios
('bug_report', 'tech', 'basic', 'Bug Report: Login Page Issue', 'QA Team <qa@company.com>', 'Hi Developer,

We''ve identified a critical bug on the login page:

Issue: Users cannot log in using Google SSO
Environment: Production
Steps to reproduce:
1. Go to login page
2. Click "Sign in with Google"
3. Page shows error 500

Priority: High
Affected users: ~30% of user base

Please investigate and provide an ETA for the fix.

Thanks,
QA Team', 'Acknowledge the bug report and provide a professional response with your investigation plan.'),

('feature_request', 'tech', 'intermediate', 'Feature Request: Dark Mode Implementation', 'Product Manager <pm@company.com>', 'Hi Development Team,

Based on recent user feedback surveys, we want to prioritize implementing dark mode for our mobile app.

Requirements:
- Toggle in settings
- System preference detection
- Smooth transition animation
- All screens supported

Can you provide a technical assessment and time estimate? We''re targeting the v3.0 release.

Thanks,
Alex
Product Manager', 'Provide a technical response discussing feasibility, potential challenges, and a rough estimate.'),

-- General scenarios
('leave_request', 'general', 'basic', 'Leave Request: Annual Leave', 'HR Department <hr@company.com>', 'Dear Employee,

We received your leave request but need additional information:

- Dates requested: [Not specified]
- Type of leave: Annual leave
- Emergency contact during absence: [Required]

Please reply with the missing details to process your request.

HR Department', 'Provide the requested information clearly and professionally.'),

('complaint_response', 'general', 'advanced', 'RE: Service Complaint #12345', 'Customer Service <support@company.com>', 'Dear Valued Customer,

Thank you for bringing this matter to our attention. We sincerely apologize for the inconvenience you experienced with your recent order.

After investigating, we found that the shipping delay was due to an unexpected supplier issue. We understand this is not acceptable and would like to offer you:

1. Full refund of shipping costs
2. 20% discount on your next order
3. Priority shipping on any future orders

Please let us know how you would like us to proceed.

Best regards,
Customer Service Team', 'As a manager, respond to this customer service email deciding on the best resolution approach.');

-- Insert more templates for healthcare, general categories as needed

