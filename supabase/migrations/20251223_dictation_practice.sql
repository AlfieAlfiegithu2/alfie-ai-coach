-- Dictation Practice Feature Migration
-- Creates tables for levels, topics, sentences, and user progress

-- ========================================
-- DICTATION LEVELS (Beginner, Intermediate, Advanced)
-- ========================================
CREATE TABLE IF NOT EXISTS dictation_levels (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  slug TEXT UNIQUE NOT NULL,
  description TEXT,
  order_index INTEGER NOT NULL DEFAULT 0,
  icon TEXT, -- emoji or icon name
  color TEXT, -- theme color for the level
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ========================================
-- DICTATION TOPICS (30 per level)
-- ========================================
CREATE TABLE IF NOT EXISTS dictation_topics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  level_id UUID REFERENCES dictation_levels(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  slug TEXT NOT NULL,
  description TEXT,
  order_index INTEGER NOT NULL DEFAULT 0,
  icon TEXT, -- emoji for the topic
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(level_id, slug)
);

CREATE INDEX IF NOT EXISTS idx_dictation_topics_level ON dictation_topics(level_id);

-- ========================================
-- DICTATION SENTENCES (20 per topic, with US and UK audio)
-- ========================================
CREATE TABLE IF NOT EXISTS dictation_sentences (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  topic_id UUID REFERENCES dictation_topics(id) ON DELETE CASCADE,
  sentence_text TEXT NOT NULL,
  audio_url_us TEXT, -- American accent audio
  audio_url_uk TEXT, -- British accent audio
  order_index INTEGER NOT NULL DEFAULT 0,
  hints TEXT, -- optional hints for students
  difficulty_notes TEXT, -- admin notes on difficulty
  created_at TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_dictation_sentences_topic ON dictation_sentences(topic_id);

-- ========================================
-- USER DICTATION PROGRESS
-- ========================================
CREATE TABLE IF NOT EXISTS user_dictation_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,
  sentence_id UUID REFERENCES dictation_sentences(id) ON DELETE CASCADE,
  attempts INTEGER DEFAULT 0,
  correct_attempts INTEGER DEFAULT 0,
  last_input TEXT, -- what they typed
  is_correct BOOLEAN DEFAULT false,
  last_attempt_at TIMESTAMPTZ DEFAULT now(),
  created_at TIMESTAMPTZ DEFAULT now(),
  UNIQUE(user_id, sentence_id)
);

CREATE INDEX IF NOT EXISTS idx_user_dictation_progress_user ON user_dictation_progress(user_id);
CREATE INDEX IF NOT EXISTS idx_user_dictation_progress_sentence ON user_dictation_progress(sentence_id);

-- ========================================
-- ROW LEVEL SECURITY
-- ========================================

-- Enable RLS on all tables
ALTER TABLE dictation_levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE dictation_topics ENABLE ROW LEVEL SECURITY;
ALTER TABLE dictation_sentences ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_dictation_progress ENABLE ROW LEVEL SECURITY;

-- Levels: Public read, admin write
CREATE POLICY "dictation_levels_read" ON dictation_levels
  FOR SELECT USING (true);

CREATE POLICY "dictation_levels_admin_all" ON dictation_levels
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Topics: Public read, admin write
CREATE POLICY "dictation_topics_read" ON dictation_topics
  FOR SELECT USING (true);

CREATE POLICY "dictation_topics_admin_all" ON dictation_topics
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- Sentences: Public read, admin write
CREATE POLICY "dictation_sentences_read" ON dictation_sentences
  FOR SELECT USING (true);

CREATE POLICY "dictation_sentences_admin_all" ON dictation_sentences
  FOR ALL USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- User Progress: Users can CRUD their own, admin can read all
CREATE POLICY "user_dictation_progress_own" ON user_dictation_progress
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "user_dictation_progress_admin_read" ON user_dictation_progress
  FOR SELECT USING (
    EXISTS (SELECT 1 FROM profiles WHERE id = auth.uid() AND role = 'admin')
  );

-- ========================================
-- SEED INITIAL LEVELS
-- ========================================
INSERT INTO dictation_levels (name, slug, description, order_index, icon, color) VALUES
  ('Beginner', 'beginner', 'Simple sentences for newcomers to English. Clear pronunciation, basic vocabulary, everyday topics.', 1, '🟢', '#22c55e'),
  ('Intermediate', 'intermediate', 'TOEIC-style business and professional English. Faster speech, workplace vocabulary, formal contexts.', 2, '🟡', '#eab308'),
  ('Advanced', 'advanced', 'IELTS-style academic English. Natural speed, complex vocabulary, academic and scientific topics.', 3, '🔴', '#ef4444')
ON CONFLICT (slug) DO NOTHING;

-- ========================================
-- SEED BEGINNER TOPICS (30)
-- ========================================
INSERT INTO dictation_topics (level_id, title, slug, description, order_index, icon)
SELECT 
  l.id,
  t.title,
  t.slug,
  t.description,
  t.order_index,
  t.icon
FROM dictation_levels l
CROSS JOIN (VALUES
  ('Greetings & Introductions', 'greetings-introductions', 'Basic hello and self-introduction phrases', 1, '👋'),
  ('Numbers & Counting', 'numbers-counting', 'Numbers in everyday contexts', 2, '🔢'),
  ('Colors', 'colors', 'Describing colors of things around us', 3, '🎨'),
  ('Days & Months', 'days-months', 'Days of the week and months of the year', 4, '📅'),
  ('Time & Schedules', 'time-schedules', 'Telling time and talking about schedules', 5, '⏰'),
  ('Family Members', 'family-members', 'Talking about family relationships', 6, '👨‍👩‍👧‍👦'),
  ('Food & Drinks', 'food-drinks', 'Ordering and discussing food', 7, '🍔'),
  ('Weather', 'weather', 'Describing weather conditions', 8, '☀️'),
  ('At the Store', 'at-the-store', 'Shopping conversations', 9, '🛒'),
  ('At Home', 'at-home', 'Common household phrases', 10, '🏠'),
  ('Hobbies', 'hobbies', 'Talking about leisure activities', 11, '🎯'),
  ('In the Classroom', 'in-the-classroom', 'School and classroom language', 12, '📚'),
  ('Feelings & Emotions', 'feelings-emotions', 'Expressing how you feel', 13, '😊'),
  ('Animals', 'animals', 'Describing pets and animals', 14, '🐕'),
  ('Directions', 'directions', 'Asking and giving directions', 15, '🧭'),
  ('Transportation', 'transportation', 'Getting around by car, bus, train', 16, '🚌'),
  ('Body Parts', 'body-parts', 'Naming body parts and health', 17, '🫀'),
  ('Clothing', 'clothing', 'Describing what people wear', 18, '👕'),
  ('Jobs & Occupations', 'jobs-occupations', 'Talking about work and careers', 19, '💼'),
  ('Common Questions', 'common-questions', 'Everyday question patterns', 20, '❓'),
  ('Making Plans', 'making-plans', 'Scheduling and arranging meetings', 21, '📋'),
  ('Phone Conversations', 'phone-conversations', 'Basic telephone language', 22, '📞'),
  ('Restaurant Orders', 'restaurant-orders', 'Ordering food at restaurants', 23, '🍽️'),
  ('Shopping', 'shopping', 'Buying things and asking about prices', 24, '🛍️'),
  ('At the Doctor', 'at-the-doctor', 'Medical appointments and symptoms', 25, '🏥'),
  ('Daily Routines', 'daily-routines', 'Morning, afternoon, evening activities', 26, '🌅'),
  ('Sports & Games', 'sports-games', 'Playing and watching sports', 27, '⚽'),
  ('Birthday & Celebrations', 'birthday-celebrations', 'Party and celebration language', 28, '🎂'),
  ('Seasons', 'seasons', 'Talking about the four seasons', 29, '🍂'),
  ('Simple Stories', 'simple-stories', 'Short narrative sentences', 30, '📖')
) AS t(title, slug, description, order_index, icon)
WHERE l.slug = 'beginner'
ON CONFLICT (level_id, slug) DO NOTHING;

-- ========================================
-- SEED INTERMEDIATE TOPICS (30) - TOEIC Style
-- ========================================
INSERT INTO dictation_topics (level_id, title, slug, description, order_index, icon)
SELECT 
  l.id,
  t.title,
  t.slug,
  t.description,
  t.order_index,
  t.icon
FROM dictation_levels l
CROSS JOIN (VALUES
  ('Office Communications', 'office-communications', 'Workplace emails and announcements', 1, '📧'),
  ('Job Interviews', 'job-interviews', 'Interview questions and answers', 2, '🤝'),
  ('Business Calls', 'business-calls', 'Professional phone conversations', 3, '📱'),
  ('Email Dictation', 'email-dictation', 'Formal email phrases', 4, '✉️'),
  ('Hotel Reservations', 'hotel-reservations', 'Booking and checking in', 5, '🏨'),
  ('Airport Announcements', 'airport-announcements', 'Flight information and boarding', 6, '✈️'),
  ('Conference Calls', 'conference-calls', 'Virtual meeting language', 7, '💻'),
  ('Customer Service', 'customer-service', 'Helping and assisting customers', 8, '🎧'),
  ('Bank Transactions', 'bank-transactions', 'Banking and financial services', 9, '🏦'),
  ('Travel Arrangements', 'travel-arrangements', 'Booking trips and transportation', 10, '🗺️'),
  ('Product Presentations', 'product-presentations', 'Introducing products and features', 11, '📊'),
  ('Workplace Instructions', 'workplace-instructions', 'Giving and following directions', 12, '📝'),
  ('Event Planning', 'event-planning', 'Organizing meetings and events', 13, '🎪'),
  ('Training Sessions', 'training-sessions', 'Learning new skills at work', 14, '🎓'),
  ('Negotiations', 'negotiations', 'Business deals and agreements', 15, '💰'),
  ('Supply Chain', 'supply-chain', 'Shipping and logistics', 16, '📦'),
  ('Marketing Campaigns', 'marketing-campaigns', 'Advertising and promotions', 17, '📢'),
  ('Technical Support', 'technical-support', 'Troubleshooting and help desk', 18, '🔧'),
  ('Real Estate', 'real-estate', 'Property and housing', 19, '🏢'),
  ('Health & Safety', 'health-safety', 'Workplace safety procedures', 20, '⚠️'),
  ('Financial Reports', 'financial-reports', 'Revenue and business metrics', 21, '📈'),
  ('Human Resources', 'human-resources', 'HR policies and benefits', 22, '👥'),
  ('Project Management', 'project-management', 'Deadlines and milestones', 23, '📅'),
  ('Client Meetings', 'client-meetings', 'Working with clients', 24, '🤵'),
  ('Trade Shows', 'trade-shows', 'Exhibition and booth language', 25, '🎪'),
  ('Legal Notices', 'legal-notices', 'Terms and conditions', 26, '⚖️'),
  ('Insurance', 'insurance', 'Coverage and claims', 27, '🛡️'),
  ('Shipping & Logistics', 'shipping-logistics', 'Delivery and tracking', 28, '🚚'),
  ('Academic Lectures', 'academic-lectures', 'Educational presentations', 29, '🎤'),
  ('Scientific Reports', 'scientific-reports', 'Research findings and data', 30, '🔬')
) AS t(title, slug, description, order_index, icon)
WHERE l.slug = 'intermediate'
ON CONFLICT (level_id, slug) DO NOTHING;

-- ========================================
-- SEED ADVANCED TOPICS (30) - IELTS Style
-- ========================================
INSERT INTO dictation_topics (level_id, title, slug, description, order_index, icon)
SELECT 
  l.id,
  t.title,
  t.slug,
  t.description,
  t.order_index,
  t.icon
FROM dictation_levels l
CROSS JOIN (VALUES
  ('University Orientation', 'university-orientation', 'Enrollment and campus services', 1, '🎓'),
  ('Library Services', 'library-services', 'Research resources and databases', 2, '📚'),
  ('Academic Research', 'academic-research', 'Methodology and analysis', 3, '🔍'),
  ('Environmental Science', 'environmental-science', 'Climate and ecology', 4, '🌍'),
  ('Archaeology & History', 'archaeology-history', 'Historical discoveries', 5, '🏛️'),
  ('Urban Planning', 'urban-planning', 'City development and infrastructure', 6, '🏙️'),
  ('Marine Biology', 'marine-biology', 'Ocean ecosystems and wildlife', 7, '🐋'),
  ('Psychology Studies', 'psychology-studies', 'Human behavior and cognition', 8, '🧠'),
  ('Architecture Lectures', 'architecture-lectures', 'Design and sustainable building', 9, '🏗️'),
  ('Economics & Trade', 'economics-trade', 'Global markets and commerce', 10, '💹'),
  ('Museum Tours', 'museum-tours', 'Art and cultural exhibitions', 11, '🖼️'),
  ('Health & Nutrition', 'health-nutrition', 'Diet and wellness research', 12, '🥗'),
  ('Technology & Innovation', 'technology-innovation', 'AI and digital transformation', 13, '🤖'),
  ('Conservation Projects', 'conservation-projects', 'Wildlife and habitat protection', 14, '🦁'),
  ('Anthropology', 'anthropology', 'Cultural studies and societies', 15, '🌏'),
  ('Astronomy', 'astronomy', 'Space exploration and discoveries', 16, '🔭'),
  ('Sociology Studies', 'sociology-studies', 'Social dynamics and mobility', 17, '👥'),
  ('Geography & Maps', 'geography-maps', 'Topography and landforms', 18, '🗺️'),
  ('Agricultural Science', 'agricultural-science', 'Farming and crop research', 19, '🌾'),
  ('Student Support', 'student-support', 'Counseling and academic help', 20, '🤲'),
  ('Medical Facilities', 'medical-facilities', 'Healthcare services and treatments', 21, '🏥'),
  ('Sports Science', 'sports-science', 'Performance and biometrics', 22, '🏃'),
  ('Art & Music History', 'art-music-history', 'Artistic movements and composers', 23, '🎨'),
  ('Linguistics', 'linguistics', 'Language structure and phonology', 24, '🗣️'),
  ('Philosophy Discussions', 'philosophy-discussions', 'Ethics and reasoning', 25, '💭'),
  ('Engineering Projects', 'engineering-projects', 'Structural and mechanical design', 26, '⚙️'),
  ('Public Policy', 'public-policy', 'Government and legislation', 27, '🏛️'),
  ('Tourism & Hospitality', 'tourism-hospitality', 'Heritage sites and travel industry', 28, '🧳'),
  ('Volunteer Programs', 'volunteer-programs', 'Community service initiatives', 29, '🤝'),
  ('Academic Assessments', 'academic-assessments', 'Exams and evaluation criteria', 30, '📝')
) AS t(title, slug, description, order_index, icon)
WHERE l.slug = 'advanced'
ON CONFLICT (level_id, slug) DO NOTHING;
