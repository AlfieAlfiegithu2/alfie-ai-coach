-- Seed pronunciation tests with PTE-difficulty sentences
-- Run this after the dual_audio migration

-- Create Test 1: Academic Topics
INSERT INTO pronunciation_tests (id, title, description, is_published, created_at)
VALUES (
  'pte-academic-001',
  'PTE Academic Set 1',
  'Academic topic sentences for PTE Repeat Sentence practice',
  true,
  NOW()
) ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title, is_published = true;

-- Insert sentences for Test 1
INSERT INTO pronunciation_items (test_id, reference_text, order_index, created_at)
VALUES
  ('pte-academic-001', 'The university has implemented new policies to enhance student engagement in research activities.', 1, NOW()),
  ('pte-academic-001', 'Climate change poses significant challenges to agricultural productivity worldwide.', 2, NOW()),
  ('pte-academic-001', 'Archaeological discoveries have revealed previously unknown aspects of ancient civilizations.', 3, NOW()),
  ('pte-academic-001', 'The pharmaceutical industry continues to develop innovative treatments for chronic diseases.', 4, NOW()),
  ('pte-academic-001', 'Economic fluctuations often result from complex interactions between global markets.', 5, NOW()),
  ('pte-academic-001', 'Sustainable development requires balancing environmental protection with economic growth.', 6, NOW()),
  ('pte-academic-001', 'The digital transformation has fundamentally changed how businesses operate globally.', 7, NOW()),
  ('pte-academic-001', 'Scientific collaboration across borders accelerates the pace of technological advancement.', 8, NOW()),
  ('pte-academic-001', 'Educational institutions must adapt their curricula to meet evolving workforce demands.', 9, NOW()),
  ('pte-academic-001', 'Infrastructure investment plays a crucial role in supporting long-term economic development.', 10, NOW())
ON CONFLICT DO NOTHING;

-- Create Test 2: Professional Topics
INSERT INTO pronunciation_tests (id, title, description, is_published, created_at)
VALUES (
  'pte-professional-001',
  'PTE Professional Set 1',
  'Professional topic sentences for PTE Repeat Sentence practice',
  true,
  NOW()
) ON CONFLICT (id) DO UPDATE SET title = EXCLUDED.title, is_published = true;

-- Insert sentences for Test 2
INSERT INTO pronunciation_items (test_id, reference_text, order_index, created_at)
VALUES
  ('pte-professional-001', 'Effective communication skills are essential for success in any professional environment.', 1, NOW()),
  ('pte-professional-001', 'The implementation of artificial intelligence is transforming multiple industry sectors.', 2, NOW()),
  ('pte-professional-001', 'Quality assurance processes ensure products meet established standards and specifications.', 3, NOW()),
  ('pte-professional-001', 'Strategic planning enables organizations to navigate uncertain business environments effectively.', 4, NOW()),
  ('pte-professional-001', 'Renewable energy sources are becoming increasingly cost-competitive with traditional fuels.', 5, NOW()),
  ('pte-professional-001', 'Corporate governance frameworks establish accountability structures within organizations.', 6, NOW()),
  ('pte-professional-001', 'Consumer behavior analysis provides valuable insights for marketing strategy development.', 7, NOW()),
  ('pte-professional-001', 'International trade agreements facilitate economic cooperation between participating nations.', 8, NOW()),
  ('pte-professional-001', 'Healthcare systems worldwide are adapting to address emerging public health challenges.', 9, NOW()),
  ('pte-professional-001', 'Professional development opportunities contribute to employee retention and satisfaction.', 10, NOW())
ON CONFLICT DO NOTHING;

