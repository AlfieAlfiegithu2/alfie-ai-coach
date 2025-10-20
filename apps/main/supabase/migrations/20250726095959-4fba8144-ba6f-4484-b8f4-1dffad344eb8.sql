-- Fix the difficulty level constraint and add reading passages with correct values
-- First, check what values are allowed
SELECT constraint_name, check_clause FROM information_schema.check_constraints WHERE table_name = 'reading_passages';

-- Update the constraint to allow 'intermediate' level
ALTER TABLE reading_passages DROP CONSTRAINT IF EXISTS reading_passages_difficulty_level_check;
ALTER TABLE reading_passages ADD CONSTRAINT reading_passages_difficulty_level_check 
CHECK (difficulty_level = ANY (ARRAY['beginner'::text, 'intermediate'::text, 'advanced'::text]));

-- Now insert the reading passages with correct difficulty levels
INSERT INTO reading_passages (title, content, difficulty_level, passage_type) VALUES
('Climate Change and Arctic Wildlife', 'The Arctic region is experiencing unprecedented changes due to global warming, with temperatures rising at twice the global average. This phenomenon, known as Arctic amplification, has profound implications for the region''s wildlife. Polar bears, perhaps the most iconic Arctic species, are facing severe challenges as sea ice, their primary hunting ground, continues to diminish.

Recent studies indicate that the Arctic sea ice extent has declined by approximately 13% per decade since the late 1970s. This reduction directly affects polar bears'' ability to hunt seals, their primary food source. Bears must now travel greater distances to find suitable hunting grounds, often expending more energy than they can replenish through their catches.

The walrus population is also experiencing significant stress. These massive marine mammals traditionally use sea ice as a platform for resting between dives for clams and other benthic organisms. As ice becomes scarce, walruses are forced to crowd onto beaches in unprecedented numbers, leading to dangerous stampedes and increased mortality rates among young animals.', 'intermediate', 'academic'),

('The History of Chocolate', 'Chocolate has a rich and complex history that spans over 3,000 years, beginning with ancient Mesoamerican civilizations. The cacao tree (Theobroma cacao), whose name literally means "food of the gods," was first cultivated by the Olmecs around 1500 BCE in what is now Mexico and Central America.

The Maya civilization elevated cacao to sacred status, incorporating it into religious ceremonies and using cacao beans as currency. They prepared a bitter drink called "chocolatl" by grinding cacao beans with spices like chili peppers and vanilla.', 'intermediate', 'general'),

('Artificial Intelligence in Healthcare', 'Artificial intelligence (AI) is revolutionizing healthcare delivery, diagnosis, and treatment across multiple medical disciplines. From machine learning algorithms that can detect cancer in medical images to natural language processing systems that analyze patient records, AI technologies are enhancing the precision and efficiency of medical care.', 'advanced', 'academic');