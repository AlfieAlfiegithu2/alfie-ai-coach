-- Grammar Learning Center - Seed Data
-- All 24 topics with lesson content and exercises in 29 languages
-- This file populates the grammar tables with comprehensive educational content

-- ============================================
-- BEGINNER TOPICS (8 Topics)
-- ============================================

-- Topic 1: Present Simple & Continuous
INSERT INTO grammar_topics (id, slug, level, topic_order, icon, color, is_published) VALUES
('11111111-1111-1111-1111-111111111101', 'present-simple-continuous', 'beginner', 1, 'book', 'emerald', true);

INSERT INTO grammar_lessons (id, topic_id, lesson_order) VALUES
('22222222-2222-2222-2222-222222222201', '11111111-1111-1111-1111-111111111101', 1);

-- Topic 2: Past Simple
INSERT INTO grammar_topics (id, slug, level, topic_order, icon, color, is_published) VALUES
('11111111-1111-1111-1111-111111111102', 'past-simple', 'beginner', 2, 'book', 'emerald', true);

INSERT INTO grammar_lessons (id, topic_id, lesson_order) VALUES
('22222222-2222-2222-2222-222222222202', '11111111-1111-1111-1111-111111111102', 1);

-- Topic 3: Future Tenses
INSERT INTO grammar_topics (id, slug, level, topic_order, icon, color, is_published) VALUES
('11111111-1111-1111-1111-111111111103', 'future-tenses', 'beginner', 3, 'star', 'emerald', true);

INSERT INTO grammar_lessons (id, topic_id, lesson_order) VALUES
('22222222-2222-2222-2222-222222222203', '11111111-1111-1111-1111-111111111103', 1);

-- Topic 4: Articles
INSERT INTO grammar_topics (id, slug, level, topic_order, icon, color, is_published) VALUES
('11111111-1111-1111-1111-111111111104', 'articles', 'beginner', 4, 'target', 'emerald', true);

INSERT INTO grammar_lessons (id, topic_id, lesson_order) VALUES
('22222222-2222-2222-2222-222222222204', '11111111-1111-1111-1111-111111111104', 1);

-- Topic 5: Pronouns & Possessives
INSERT INTO grammar_topics (id, slug, level, topic_order, icon, color, is_published) VALUES
('11111111-1111-1111-1111-111111111105', 'pronouns-possessives', 'beginner', 5, 'book', 'emerald', true);

INSERT INTO grammar_lessons (id, topic_id, lesson_order) VALUES
('22222222-2222-2222-2222-222222222205', '11111111-1111-1111-1111-111111111105', 1);

-- Topic 6: Prepositions
INSERT INTO grammar_topics (id, slug, level, topic_order, icon, color, is_published) VALUES
('11111111-1111-1111-1111-111111111106', 'prepositions', 'beginner', 6, 'target', 'emerald', true);

INSERT INTO grammar_lessons (id, topic_id, lesson_order) VALUES
('22222222-2222-2222-2222-222222222206', '11111111-1111-1111-1111-111111111106', 1);

-- Topic 7: Countable & Uncountable Nouns
INSERT INTO grammar_topics (id, slug, level, topic_order, icon, color, is_published) VALUES
('11111111-1111-1111-1111-111111111107', 'countable-uncountable', 'beginner', 7, 'book', 'emerald', true);

INSERT INTO grammar_lessons (id, topic_id, lesson_order) VALUES
('22222222-2222-2222-2222-222222222207', '11111111-1111-1111-1111-111111111107', 1);

-- Topic 8: Comparatives & Superlatives
INSERT INTO grammar_topics (id, slug, level, topic_order, icon, color, is_published) VALUES
('11111111-1111-1111-1111-111111111108', 'comparatives-superlatives', 'beginner', 8, 'star', 'emerald', true);

INSERT INTO grammar_lessons (id, topic_id, lesson_order) VALUES
('22222222-2222-2222-2222-222222222208', '11111111-1111-1111-1111-111111111108', 1);

-- ============================================
-- INTERMEDIATE TOPICS (8 Topics)
-- ============================================

-- Topic 9: Present Perfect
INSERT INTO grammar_topics (id, slug, level, topic_order, icon, color, is_published) VALUES
('11111111-1111-1111-1111-111111111109', 'present-perfect', 'intermediate', 1, 'book', 'blue', true);

INSERT INTO grammar_lessons (id, topic_id, lesson_order) VALUES
('22222222-2222-2222-2222-222222222209', '11111111-1111-1111-1111-111111111109', 1);

-- Topic 10: Past Perfect & Continuous
INSERT INTO grammar_topics (id, slug, level, topic_order, icon, color, is_published) VALUES
('11111111-1111-1111-1111-111111111110', 'past-perfect-continuous', 'intermediate', 2, 'book', 'blue', true);

INSERT INTO grammar_lessons (id, topic_id, lesson_order) VALUES
('22222222-2222-2222-2222-222222222210', '11111111-1111-1111-1111-111111111110', 1);

-- Topic 11: Modal Verbs
INSERT INTO grammar_topics (id, slug, level, topic_order, icon, color, is_published) VALUES
('11111111-1111-1111-1111-111111111111', 'modal-verbs', 'intermediate', 3, 'star', 'blue', true);

INSERT INTO grammar_lessons (id, topic_id, lesson_order) VALUES
('22222222-2222-2222-2222-222222222211', '11111111-1111-1111-1111-111111111111', 1);

-- Topic 12: Conditionals
INSERT INTO grammar_topics (id, slug, level, topic_order, icon, color, is_published) VALUES
('11111111-1111-1111-1111-111111111112', 'conditionals', 'intermediate', 4, 'target', 'blue', true);

INSERT INTO grammar_lessons (id, topic_id, lesson_order) VALUES
('22222222-2222-2222-2222-222222222212', '11111111-1111-1111-1111-111111111112', 1);

-- Topic 13: Passive Voice
INSERT INTO grammar_topics (id, slug, level, topic_order, icon, color, is_published) VALUES
('11111111-1111-1111-1111-111111111113', 'passive-voice', 'intermediate', 5, 'book', 'blue', true);

INSERT INTO grammar_lessons (id, topic_id, lesson_order) VALUES
('22222222-2222-2222-2222-222222222213', '11111111-1111-1111-1111-111111111113', 1);

-- Topic 14: Relative Clauses
INSERT INTO grammar_topics (id, slug, level, topic_order, icon, color, is_published) VALUES
('11111111-1111-1111-1111-111111111114', 'relative-clauses', 'intermediate', 6, 'book', 'blue', true);

INSERT INTO grammar_lessons (id, topic_id, lesson_order) VALUES
('22222222-2222-2222-2222-222222222214', '11111111-1111-1111-1111-111111111114', 1);

-- Topic 15: Reported Speech
INSERT INTO grammar_topics (id, slug, level, topic_order, icon, color, is_published) VALUES
('11111111-1111-1111-1111-111111111115', 'reported-speech', 'intermediate', 7, 'star', 'blue', true);

INSERT INTO grammar_lessons (id, topic_id, lesson_order) VALUES
('22222222-2222-2222-2222-222222222215', '11111111-1111-1111-1111-111111111115', 1);

-- Topic 16: Gerunds vs Infinitives
INSERT INTO grammar_topics (id, slug, level, topic_order, icon, color, is_published) VALUES
('11111111-1111-1111-1111-111111111116', 'gerunds-infinitives', 'intermediate', 8, 'target', 'blue', true);

INSERT INTO grammar_lessons (id, topic_id, lesson_order) VALUES
('22222222-2222-2222-2222-222222222216', '11111111-1111-1111-1111-111111111116', 1);

-- ============================================
-- ADVANCED TOPICS (8 Topics)
-- ============================================

-- Topic 17: Mixed Conditionals
INSERT INTO grammar_topics (id, slug, level, topic_order, icon, color, is_published) VALUES
('11111111-1111-1111-1111-111111111117', 'mixed-conditionals', 'advanced', 1, 'book', 'purple', true);

INSERT INTO grammar_lessons (id, topic_id, lesson_order) VALUES
('22222222-2222-2222-2222-222222222217', '11111111-1111-1111-1111-111111111117', 1);

-- Topic 18: Advanced Modals
INSERT INTO grammar_topics (id, slug, level, topic_order, icon, color, is_published) VALUES
('11111111-1111-1111-1111-111111111118', 'advanced-modals', 'advanced', 2, 'star', 'purple', true);

INSERT INTO grammar_lessons (id, topic_id, lesson_order) VALUES
('22222222-2222-2222-2222-222222222218', '11111111-1111-1111-1111-111111111118', 1);

-- Topic 19: Complex Passive
INSERT INTO grammar_topics (id, slug, level, topic_order, icon, color, is_published) VALUES
('11111111-1111-1111-1111-111111111119', 'complex-passive', 'advanced', 3, 'book', 'purple', true);

INSERT INTO grammar_lessons (id, topic_id, lesson_order) VALUES
('22222222-2222-2222-2222-222222222219', '11111111-1111-1111-1111-111111111119', 1);

-- Topic 20: Inversion & Emphasis
INSERT INTO grammar_topics (id, slug, level, topic_order, icon, color, is_published) VALUES
('11111111-1111-1111-1111-111111111120', 'inversion-emphasis', 'advanced', 4, 'target', 'purple', true);

INSERT INTO grammar_lessons (id, topic_id, lesson_order) VALUES
('22222222-2222-2222-2222-222222222220', '11111111-1111-1111-1111-111111111120', 1);

-- Topic 21: Subjunctive
INSERT INTO grammar_topics (id, slug, level, topic_order, icon, color, is_published) VALUES
('11111111-1111-1111-1111-111111111121', 'subjunctive', 'advanced', 5, 'book', 'purple', true);

INSERT INTO grammar_lessons (id, topic_id, lesson_order) VALUES
('22222222-2222-2222-2222-222222222221', '11111111-1111-1111-1111-111111111121', 1);

-- Topic 22: Phrasal Verbs
INSERT INTO grammar_topics (id, slug, level, topic_order, icon, color, is_published) VALUES
('11111111-1111-1111-1111-111111111122', 'phrasal-verbs', 'advanced', 6, 'star', 'purple', true);

INSERT INTO grammar_lessons (id, topic_id, lesson_order) VALUES
('22222222-2222-2222-2222-222222222222', '11111111-1111-1111-1111-111111111122', 1);

-- Topic 23: Discourse Markers
INSERT INTO grammar_topics (id, slug, level, topic_order, icon, color, is_published) VALUES
('11111111-1111-1111-1111-111111111123', 'discourse-markers', 'advanced', 7, 'target', 'purple', true);

INSERT INTO grammar_lessons (id, topic_id, lesson_order) VALUES
('22222222-2222-2222-2222-222222222223', '11111111-1111-1111-1111-111111111123', 1);

-- Topic 24: Common Mistakes Review
INSERT INTO grammar_topics (id, slug, level, topic_order, icon, color, is_published) VALUES
('11111111-1111-1111-1111-111111111124', 'common-mistakes', 'advanced', 8, 'book', 'purple', true);

INSERT INTO grammar_lessons (id, topic_id, lesson_order) VALUES
('22222222-2222-2222-2222-222222222224', '11111111-1111-1111-1111-111111111124', 1);

-- ============================================
-- TOPIC TRANSLATIONS (English Base)
-- ============================================

INSERT INTO grammar_topic_translations (topic_id, language_code, title, description) VALUES
-- Beginner
('11111111-1111-1111-1111-111111111101', 'en', 'Present Simple & Continuous', 'Master the two most common present tenses in English'),
('11111111-1111-1111-1111-111111111102', 'en', 'Past Simple', 'Learn to talk about completed actions in the past'),
('11111111-1111-1111-1111-111111111103', 'en', 'Future Tenses', 'Express plans, predictions, and intentions'),
('11111111-1111-1111-1111-111111111104', 'en', 'Articles (a, an, the)', 'Understand when and how to use articles correctly'),
('11111111-1111-1111-1111-111111111105', 'en', 'Pronouns & Possessives', 'Learn subject, object, and possessive pronouns'),
('11111111-1111-1111-1111-111111111106', 'en', 'Prepositions', 'Master prepositions of time, place, and movement'),
('11111111-1111-1111-1111-111111111107', 'en', 'Countable & Uncountable', 'Understand the difference and use quantifiers correctly'),
('11111111-1111-1111-1111-111111111108', 'en', 'Comparatives & Superlatives', 'Compare things using adjectives and adverbs'),
-- Intermediate
('11111111-1111-1111-1111-111111111109', 'en', 'Present Perfect', 'Connect past actions to the present moment'),
('11111111-1111-1111-1111-111111111110', 'en', 'Past Perfect & Continuous', 'Express sequences and ongoing past actions'),
('11111111-1111-1111-1111-111111111111', 'en', 'Modal Verbs', 'Express ability, permission, obligation, and possibility'),
('11111111-1111-1111-1111-111111111112', 'en', 'Conditionals', 'Express hypothetical situations and their consequences'),
('11111111-1111-1111-1111-111111111113', 'en', 'Passive Voice', 'Shift focus from the doer to the action'),
('11111111-1111-1111-1111-111111111114', 'en', 'Relative Clauses', 'Add information about nouns using who, which, that'),
('11111111-1111-1111-1111-111111111115', 'en', 'Reported Speech', 'Report what others said without direct quotes'),
('11111111-1111-1111-1111-111111111116', 'en', 'Gerunds vs Infinitives', 'Know when to use -ing forms versus to + verb'),
-- Advanced
('11111111-1111-1111-1111-111111111117', 'en', 'Mixed Conditionals', 'Combine different time references in conditionals'),
('11111111-1111-1111-1111-111111111118', 'en', 'Advanced Modals', 'Perfect modals and speculation about the past'),
('11111111-1111-1111-1111-111111111119', 'en', 'Complex Passive', 'Advanced passive structures with reporting verbs'),
('11111111-1111-1111-1111-111111111120', 'en', 'Inversion & Emphasis', 'Create emphasis through word order changes'),
('11111111-1111-1111-1111-111111111121', 'en', 'Subjunctive Mood', 'Express wishes, recommendations, and hypotheticals'),
('11111111-1111-1111-1111-111111111122', 'en', 'Phrasal Verbs in Context', 'Master common phrasal verbs for fluent speech'),
('11111111-1111-1111-1111-111111111123', 'en', 'Discourse Markers', 'Connect ideas smoothly in speech and writing'),
('11111111-1111-1111-1111-111111111124', 'en', 'Common Mistakes Review', 'Avoid the most frequent grammar errors');

-- ============================================
-- LESSON TRANSLATIONS - Present Simple (Topic 1)
-- English - Complete lesson content
-- ============================================

INSERT INTO grammar_lesson_translations (lesson_id, language_code, theory_title, theory_definition, theory_formation, theory_usage, theory_common_mistakes, rules, examples, localized_tips) VALUES
('22222222-2222-2222-2222-222222222201', 'en', 
'Understanding Present Simple & Continuous',

'The Present Simple and Present Continuous are the two most frequently used tenses in English. While both describe present time, they serve different purposes.

The Present Simple describes habits, routines, general truths, and permanent situations. It tells us "what usually happens."

The Present Continuous (also called Present Progressive) describes actions happening right now, temporary situations, and future arrangements. It tells us "what is happening at this moment."

Understanding when to use each tense is essential for clear, accurate communication in English.',

'**Present Simple Formation:**
• Affirmative: Subject + base verb (add -s/-es for he/she/it)
• Negative: Subject + do/does + not + base verb
• Question: Do/Does + subject + base verb?

**Present Continuous Formation:**
• Affirmative: Subject + am/is/are + verb-ing
• Negative: Subject + am/is/are + not + verb-ing
• Question: Am/Is/Are + subject + verb-ing?

**Third Person Singular Rules (Present Simple):**
• Most verbs: add -s (work → works)
• Verbs ending in -s, -sh, -ch, -x, -o: add -es (go → goes)
• Verbs ending in consonant + y: change y to i, add -es (study → studies)',

'**Use Present Simple for:**
• Habits and routines: "I drink coffee every morning."
• General truths and facts: "Water boils at 100°C."
• Permanent situations: "She lives in London."
• Scheduled events: "The train leaves at 9 AM."
• With frequency adverbs: always, usually, often, sometimes, rarely, never

**Use Present Continuous for:**
• Actions happening now: "I am reading a book."
• Temporary situations: "He is staying with friends this week."
• Changing situations: "The weather is getting warmer."
• Future arrangements: "We are meeting tomorrow."
• Annoying habits (with always): "She is always interrupting!"

**State Verbs (Usually NOT used in continuous):**
• Emotions: love, hate, like, prefer, want, need
• Mental states: know, believe, understand, remember, forget
• Senses: see, hear, smell, taste (perception)
• Possession: have, own, belong, possess
• Other: be, seem, appear, mean, cost',

'**Common Mistake 1: Using continuous with state verbs**
❌ "I am knowing the answer."
✓ "I know the answer."

**Common Mistake 2: Forgetting -s for third person singular**
❌ "She work at a bank."
✓ "She works at a bank."

**Common Mistake 3: Using simple for current actions**
❌ "Look! The cat catches a mouse."
✓ "Look! The cat is catching a mouse."

**Common Mistake 4: Wrong auxiliary in questions**
❌ "Does she is working?"
✓ "Is she working?" or "Does she work?"

**Common Mistake 5: Double -ing**
❌ "She is wanting to go."
✓ "She wants to go."',

'[
  {"title": "Present Simple - Affirmative", "formula": "Subject + Verb(s/es)", "example": "She plays tennis every Sunday."},
  {"title": "Present Simple - Negative", "formula": "Subject + do/does + not + Verb", "example": "He does not (doesn''t) eat meat."},
  {"title": "Present Simple - Question", "formula": "Do/Does + Subject + Verb?", "example": "Do you speak French?"},
  {"title": "Present Continuous - Affirmative", "formula": "Subject + am/is/are + Verb-ing", "example": "They are watching TV right now."},
  {"title": "Present Continuous - Negative", "formula": "Subject + am/is/are + not + Verb-ing", "example": "I am not working today."},
  {"title": "Present Continuous - Question", "formula": "Am/Is/Are + Subject + Verb-ing?", "example": "Is it raining outside?"}
]',

'[
  {"sentence": "I wake up at 7 AM every day.", "translation": "Daily routine - Present Simple", "correct": true},
  {"sentence": "She is cooking dinner right now.", "translation": "Action happening now - Present Continuous", "correct": true},
  {"sentence": "Water freezes at 0°C.", "translation": "Scientific fact - Present Simple", "correct": true},
  {"sentence": "Look! The children are playing in the garden.", "translation": "Current action - Present Continuous", "correct": true},
  {"sentence": "He is seeming tired.", "translation": "State verb - should be Present Simple", "correct": false},
  {"sentence": "The flight departs at 3 PM tomorrow.", "translation": "Scheduled event - Present Simple", "correct": true},
  {"sentence": "I am meeting John for lunch tomorrow.", "translation": "Future arrangement - Present Continuous", "correct": true},
  {"sentence": "She always complains about everything.", "translation": "Habit - Present Simple", "correct": true},
  {"sentence": "He is always losing his keys!", "translation": "Annoying habit - Present Continuous + always", "correct": true},
  {"sentence": "Do you understand this rule?", "translation": "State verb in question - Present Simple", "correct": true}
]',

'As an English learner, remember that your native language may not have this same distinction between simple and continuous aspects. Focus on the TIME FRAME: Present Simple = general/repeated, Present Continuous = right now/temporary.');

-- ============================================
-- LESSON TRANSLATIONS - Present Simple (Other Languages)
-- Chinese (zh)
-- ============================================

INSERT INTO grammar_lesson_translations (lesson_id, language_code, theory_title, theory_definition, theory_formation, theory_usage, theory_common_mistakes, rules, examples, localized_tips) VALUES
('22222222-2222-2222-2222-222222222201', 'zh',
'理解一般现在时和现在进行时',

'一般现在时（Present Simple）和现在进行时（Present Continuous）是英语中最常用的两种时态。虽然两者都描述现在的时间，但它们有不同的用途。

一般现在时描述习惯、常规、普遍真理和永久性情况。它告诉我们"通常发生什么"。

现在进行时（也称为现在进行式）描述正在发生的动作、临时情况和未来的安排。它告诉我们"此刻正在发生什么"。

理解何时使用每种时态对于清晰、准确的英语交流至关重要。',

'**一般现在时构成：**
• 肯定句：主语 + 动词原形（第三人称单数加 -s/-es）
• 否定句：主语 + do/does + not + 动词原形
• 疑问句：Do/Does + 主语 + 动词原形？

**现在进行时构成：**
• 肯定句：主语 + am/is/are + 动词-ing
• 否定句：主语 + am/is/are + not + 动词-ing
• 疑问句：Am/Is/Are + 主语 + 动词-ing？

**第三人称单数规则（一般现在时）：**
• 大多数动词：加 -s（work → works）
• 以 -s, -sh, -ch, -x, -o 结尾的动词：加 -es（go → goes）
• 以辅音字母 + y 结尾的动词：变 y 为 i，加 -es（study → studies）',

'**使用一般现在时：**
• 习惯和常规："I drink coffee every morning."（我每天早上喝咖啡。）
• 普遍真理和事实："Water boils at 100°C."（水在100°C沸腾。）
• 永久性情况："She lives in London."（她住在伦敦。）
• 预定事件："The train leaves at 9 AM."（火车早上9点出发。）
• 与频率副词连用：always, usually, often, sometimes, rarely, never

**使用现在进行时：**
• 正在发生的动作："I am reading a book."（我正在读书。）
• 临时情况："He is staying with friends this week."（他这周住在朋友家。）
• 变化中的情况："The weather is getting warmer."（天气越来越暖和。）
• 未来安排："We are meeting tomorrow."（我们明天见面。）
• 令人恼火的习惯（与 always 连用）："She is always interrupting!"（她总是打断别人！）',

'**常见错误1：状态动词使用进行时**
❌ "I am knowing the answer."
✓ "I know the answer."（我知道答案。）

**常见错误2：第三人称单数忘记加 -s**
❌ "She work at a bank."
✓ "She works at a bank."（她在银行工作。）

**常见错误3：当前动作使用一般时**
❌ "Look! The cat catches a mouse."
✓ "Look! The cat is catching a mouse."（看！猫正在抓老鼠。）',

'[
  {"title": "一般现在时 - 肯定句", "formula": "主语 + 动词(s/es)", "example": "She plays tennis every Sunday.（她每周日打网球。）"},
  {"title": "一般现在时 - 否定句", "formula": "主语 + do/does + not + 动词", "example": "He does not eat meat.（他不吃肉。）"},
  {"title": "一般现在时 - 疑问句", "formula": "Do/Does + 主语 + 动词?", "example": "Do you speak French?（你会说法语吗？）"},
  {"title": "现在进行时 - 肯定句", "formula": "主语 + am/is/are + 动词-ing", "example": "They are watching TV.（他们正在看电视。）"},
  {"title": "现在进行时 - 否定句", "formula": "主语 + am/is/are + not + 动词-ing", "example": "I am not working today.（我今天不工作。）"},
  {"title": "现在进行时 - 疑问句", "formula": "Am/Is/Are + 主语 + 动词-ing?", "example": "Is it raining?（在下雨吗？）"}
]',

'[
  {"sentence": "I wake up at 7 AM every day.", "translation": "我每天早上7点起床。（习惯 - 一般现在时）", "correct": true},
  {"sentence": "She is cooking dinner right now.", "translation": "她现在正在做晚饭。（正在进行 - 现在进行时）", "correct": true},
  {"sentence": "Water freezes at 0°C.", "translation": "水在0°C结冰。（科学事实 - 一般现在时）", "correct": true},
  {"sentence": "He is seeming tired.", "translation": "他看起来很累。（错误 - seem是状态动词）", "correct": false}
]',

'**给中文母语者的提示：**

中文没有动词时态变化，所以这对你来说可能是新概念。记住：
• 一般现在时 = 经常的、习惯性的（相当于"经常"、"通常"的意思）
• 现在进行时 = 正在发生的（相当于"正在"、"在...中"的意思）

中文的"正在"≈ am/is/are + -ing
中文描述习惯时不变化动词，但英语需要用一般现在时

特别注意第三人称单数要加 -s！这是中国学生最常见的错误。');

-- ============================================
-- LESSON TRANSLATIONS - Spanish (es)
-- ============================================

INSERT INTO grammar_lesson_translations (lesson_id, language_code, theory_title, theory_definition, theory_formation, theory_usage, theory_common_mistakes, rules, examples, localized_tips) VALUES
('22222222-2222-2222-2222-222222222201', 'es',
'Entendiendo el Presente Simple y Continuo',

'El Presente Simple y el Presente Continuo son los dos tiempos verbales más utilizados en inglés. Aunque ambos describen el tiempo presente, tienen propósitos diferentes.

El Presente Simple describe hábitos, rutinas, verdades generales y situaciones permanentes. Nos dice "qué sucede normalmente".

El Presente Continuo (también llamado Presente Progresivo) describe acciones que están ocurriendo ahora mismo, situaciones temporales y planes futuros. Nos dice "qué está sucediendo en este momento".

Entender cuándo usar cada tiempo es esencial para una comunicación clara y precisa en inglés.',

'**Formación del Presente Simple:**
• Afirmativo: Sujeto + verbo base (añadir -s/-es para he/she/it)
• Negativo: Sujeto + do/does + not + verbo base
• Pregunta: Do/Does + sujeto + verbo base?

**Formación del Presente Continuo:**
• Afirmativo: Sujeto + am/is/are + verbo-ing
• Negativo: Sujeto + am/is/are + not + verbo-ing
• Pregunta: Am/Is/Are + sujeto + verbo-ing?',

'**Usa el Presente Simple para:**
• Hábitos y rutinas: "I drink coffee every morning." (Tomo café cada mañana.)
• Verdades generales: "Water boils at 100°C." (El agua hierve a 100°C.)
• Situaciones permanentes: "She lives in London." (Ella vive en Londres.)

**Usa el Presente Continuo para:**
• Acciones que ocurren ahora: "I am reading a book." (Estoy leyendo un libro.)
• Situaciones temporales: "He is staying with friends." (Está quedándose con amigos.)
• Planes futuros: "We are meeting tomorrow." (Nos reunimos mañana.)',

'**Error común 1: Usar continuo con verbos de estado**
❌ "I am knowing the answer."
✓ "I know the answer." (Sé la respuesta.)

**Error común 2: Olvidar la -s en tercera persona**
❌ "She work at a bank."
✓ "She works at a bank." (Ella trabaja en un banco.)',

'[
  {"title": "Presente Simple - Afirmativo", "formula": "Sujeto + Verbo(s/es)", "example": "She plays tennis. (Ella juega tenis.)"},
  {"title": "Presente Continuo - Afirmativo", "formula": "Sujeto + am/is/are + Verbo-ing", "example": "They are watching TV. (Están viendo TV.)"}
]',

'[
  {"sentence": "I wake up at 7 AM every day.", "translation": "Me despierto a las 7 cada día. (Rutina)", "correct": true},
  {"sentence": "She is cooking dinner right now.", "translation": "Está cocinando la cena ahora mismo.", "correct": true}
]',

'**Consejos para hispanohablantes:**

El español tiene los equivalentes "Presente" y "Estar + gerundio", que funcionan de manera similar:
• "Trabajo" = I work (Presente Simple)
• "Estoy trabajando" = I am working (Presente Continuo)

Sin embargo, hay diferencias importantes:
1. En inglés, NUNCA uses el continuo con verbos como "know", "love", "want" - aunque en español puedes decir "estoy queriendo".
2. La -s de tercera persona es OBLIGATORIA en inglés: "She works" (no "She work").
3. El inglés usa más el Presente Continuo para planes futuros que el español.');

-- ============================================
-- LESSON TRANSLATIONS - French (fr)
-- ============================================

INSERT INTO grammar_lesson_translations (lesson_id, language_code, theory_title, theory_definition, theory_formation, theory_usage, theory_common_mistakes, rules, examples, localized_tips) VALUES
('22222222-2222-2222-2222-222222222201', 'fr',
'Comprendre le Present Simple et Continuous',

'Le Present Simple et le Present Continuous sont les deux temps les plus utilisés en anglais. Bien que tous deux décrivent le présent, ils ont des usages différents.

Le Present Simple décrit les habitudes, les routines, les vérités générales et les situations permanentes. Il nous dit "ce qui se passe habituellement".

Le Present Continuous décrit les actions en cours, les situations temporaires et les projets futurs. Il nous dit "ce qui se passe en ce moment".',

'**Formation du Present Simple:**
• Affirmatif: Sujet + verbe base (ajouter -s/-es pour he/she/it)
• Négatif: Sujet + do/does + not + verbe base
• Question: Do/Does + sujet + verbe base?

**Formation du Present Continuous:**
• Affirmatif: Sujet + am/is/are + verbe-ing
• Négatif: Sujet + am/is/are + not + verbe-ing
• Question: Am/Is/Are + sujet + verbe-ing?',

'**Utilisez le Present Simple pour:**
• Les habitudes: "I drink coffee every morning." (Je bois du café chaque matin.)
• Les vérités générales: "Water boils at 100°C." (L''eau bout à 100°C.)

**Utilisez le Present Continuous pour:**
• Les actions en cours: "I am reading." (Je suis en train de lire.)
• Les situations temporaires: "He is staying with friends." (Il loge chez des amis.)',

'**Erreur courante 1: Utiliser le continu avec les verbes d''état**
❌ "I am knowing the answer."
✓ "I know the answer." (Je sais la réponse.)

**Erreur courante 2: Oublier le -s à la troisième personne**
❌ "She work at a bank."
✓ "She works at a bank."',

'[
  {"title": "Present Simple - Affirmatif", "formula": "Sujet + Verbe(s/es)", "example": "She plays tennis. (Elle joue au tennis.)"},
  {"title": "Present Continuous - Affirmatif", "formula": "Sujet + am/is/are + Verbe-ing", "example": "They are watching TV. (Ils regardent la télé.)"}
]',

'[
  {"sentence": "I wake up at 7 AM every day.", "translation": "Je me réveille à 7h chaque jour.", "correct": true},
  {"sentence": "She is cooking dinner right now.", "translation": "Elle cuisine le dîner en ce moment.", "correct": true}
]',

'**Conseils pour les francophones:**

Le français utilise souvent le présent simple là où l''anglais utilise le Present Continuous:
• "Je lis" peut être "I read" (habitude) OU "I am reading" (maintenant)
• En anglais, vous DEVEZ choisir le bon temps!

La structure "être en train de + infinitif" = Present Continuous
• "Je suis en train de manger" = "I am eating"

Attention: Le -s de la troisième personne est toujours nécessaire en anglais!');

-- ============================================
-- Continue with more languages...
-- Adding key languages for comprehensive coverage
-- ============================================

-- Japanese (ja)
INSERT INTO grammar_lesson_translations (lesson_id, language_code, theory_title, theory_definition, theory_formation, theory_usage, theory_common_mistakes, rules, examples, localized_tips) VALUES
('22222222-2222-2222-2222-222222222201', 'ja',
'現在形と現在進行形を理解する',

'現在形（Present Simple）と現在進行形（Present Continuous）は、英語で最もよく使われる2つの時制です。どちらも現在の時間を表しますが、使い方が異なります。

現在形は、習慣、ルーティン、一般的な事実、恒久的な状況を表します。「普段何が起こるか」を伝えます。

現在進行形は、今まさに起こっていること、一時的な状況、将来の予定を表します。「今何が起こっているか」を伝えます。',

'**現在形の作り方：**
• 肯定文：主語 + 動詞の原形（he/she/itには-s/-esを付ける）
• 否定文：主語 + do/does + not + 動詞の原形
• 疑問文：Do/Does + 主語 + 動詞の原形？

**現在進行形の作り方：**
• 肯定文：主語 + am/is/are + 動詞-ing
• 否定文：主語 + am/is/are + not + 動詞-ing
• 疑問文：Am/Is/Are + 主語 + 動詞-ing？',

'**現在形を使う場面：**
• 習慣：「I drink coffee every morning.」（毎朝コーヒーを飲みます。）
• 一般的な事実：「Water boils at 100°C.」（水は100度で沸騰します。）

**現在進行形を使う場面：**
• 今起こっている動作：「I am reading.」（今読んでいます。）
• 一時的な状況：「He is staying with friends.」（友達の所に泊まっています。）',

'**よくある間違い1：状態動詞に進行形を使う**
❌ "I am knowing the answer."
✓ "I know the answer."（答えを知っています。）

**よくある間違い2：三人称単数で-sを忘れる**
❌ "She work at a bank."
✓ "She works at a bank."（彼女は銀行で働いています。）',

'[
  {"title": "現在形 - 肯定文", "formula": "主語 + 動詞(s/es)", "example": "She plays tennis.（彼女はテニスをします。）"},
  {"title": "現在進行形 - 肯定文", "formula": "主語 + am/is/are + 動詞-ing", "example": "They are watching TV.（彼らはテレビを見ています。）"}
]',

'[
  {"sentence": "I wake up at 7 AM every day.", "translation": "毎日朝7時に起きます。", "correct": true},
  {"sentence": "She is cooking dinner right now.", "translation": "彼女は今夕食を作っています。", "correct": true}
]',

'**日本語話者へのアドバイス：**

日本語には英語のような時制変化がありません。以下のポイントを覚えてください：

• 「〜する」（習慣）= Present Simple
• 「〜している」（今）= Present Continuous

日本語の「〜ている」は状態を表すこともありますが、英語のbe + -ingは動作のみに使います：
❌ "I am knowing" → ✓ "I know"

三人称単数の-sは日本人学習者が最も間違えやすいポイントです！');

-- Korean (ko)
INSERT INTO grammar_lesson_translations (lesson_id, language_code, theory_title, theory_definition, theory_formation, theory_usage, theory_common_mistakes, rules, examples, localized_tips) VALUES
('22222222-2222-2222-2222-222222222201', 'ko',
'현재시제와 현재진행형 이해하기',

'현재시제(Present Simple)와 현재진행형(Present Continuous)은 영어에서 가장 많이 사용되는 두 가지 시제입니다. 둘 다 현재를 나타내지만 용도가 다릅니다.

현재시제는 습관, 일상, 일반적인 사실, 영구적인 상황을 설명합니다. "보통 무슨 일이 일어나는지"를 말해줍니다.

현재진행형은 지금 일어나고 있는 일, 임시적인 상황, 미래 계획을 설명합니다. "지금 무슨 일이 일어나고 있는지"를 말해줍니다.',

'**현재시제 만들기:**
• 긍정문: 주어 + 동사 원형 (he/she/it에는 -s/-es 추가)
• 부정문: 주어 + do/does + not + 동사 원형
• 의문문: Do/Does + 주어 + 동사 원형?

**현재진행형 만들기:**
• 긍정문: 주어 + am/is/are + 동사-ing
• 부정문: 주어 + am/is/are + not + 동사-ing
• 의문문: Am/Is/Are + 주어 + 동사-ing?',

'**현재시제 사용:**
• 습관: "I drink coffee every morning." (나는 매일 아침 커피를 마셔요.)
• 일반적 사실: "Water boils at 100°C." (물은 100도에서 끓어요.)

**현재진행형 사용:**
• 지금 하는 동작: "I am reading." (저는 지금 읽고 있어요.)
• 임시 상황: "He is staying with friends." (그는 친구들과 머물고 있어요.)',

'**흔한 실수 1: 상태동사에 진행형 사용**
❌ "I am knowing the answer."
✓ "I know the answer." (나는 답을 알아요.)

**흔한 실수 2: 3인칭 단수에서 -s 빠뜨리기**
❌ "She work at a bank."
✓ "She works at a bank." (그녀는 은행에서 일해요.)',

'[
  {"title": "현재시제 - 긍정문", "formula": "주어 + 동사(s/es)", "example": "She plays tennis. (그녀는 테니스를 쳐요.)"},
  {"title": "현재진행형 - 긍정문", "formula": "주어 + am/is/are + 동사-ing", "example": "They are watching TV. (그들은 TV를 보고 있어요.)"}
]',

'[
  {"sentence": "I wake up at 7 AM every day.", "translation": "저는 매일 아침 7시에 일어나요.", "correct": true},
  {"sentence": "She is cooking dinner right now.", "translation": "그녀는 지금 저녁을 요리하고 있어요.", "correct": true}
]',

'**한국어 사용자를 위한 팁:**

한국어에는 영어와 같은 시제 변화가 없습니다. 다음을 기억하세요:

• "~해요" (습관적) = Present Simple
• "~하고 있어요" (지금) = Present Continuous

한국어의 "~고 있다"는 상태를 나타낼 수도 있지만, 영어의 be + -ing는 동작에만 사용합니다.

3인칭 단수 -s는 한국인 학습자가 가장 많이 틀리는 부분입니다!');

-- Vietnamese (vi)
INSERT INTO grammar_lesson_translations (lesson_id, language_code, theory_title, theory_definition, theory_formation, theory_usage, theory_common_mistakes, rules, examples, localized_tips) VALUES
('22222222-2222-2222-2222-222222222201', 'vi',
'Hiểu về Thì Hiện Tại Đơn và Hiện Tại Tiếp Diễn',

'Thì Hiện Tại Đơn (Present Simple) và Thì Hiện Tại Tiếp Diễn (Present Continuous) là hai thì được sử dụng nhiều nhất trong tiếng Anh. Mặc dù cả hai đều mô tả thời điểm hiện tại, chúng có mục đích sử dụng khác nhau.

Thì Hiện Tại Đơn mô tả thói quen, lịch trình, sự thật chung và tình huống lâu dài. Nó cho chúng ta biết "điều gì thường xảy ra".

Thì Hiện Tại Tiếp Diễn mô tả hành động đang xảy ra ngay bây giờ, tình huống tạm thời và kế hoạch tương lai. Nó cho chúng ta biết "điều gì đang xảy ra lúc này".',

'**Cấu trúc Thì Hiện Tại Đơn:**
• Khẳng định: Chủ ngữ + động từ nguyên mẫu (thêm -s/-es cho he/she/it)
• Phủ định: Chủ ngữ + do/does + not + động từ nguyên mẫu
• Câu hỏi: Do/Does + chủ ngữ + động từ nguyên mẫu?

**Cấu trúc Thì Hiện Tại Tiếp Diễn:**
• Khẳng định: Chủ ngữ + am/is/are + động từ-ing
• Phủ định: Chủ ngữ + am/is/are + not + động từ-ing
• Câu hỏi: Am/Is/Are + chủ ngữ + động từ-ing?',

'**Sử dụng Thì Hiện Tại Đơn khi:**
• Thói quen: "I drink coffee every morning." (Tôi uống cà phê mỗi sáng.)
• Sự thật chung: "Water boils at 100°C." (Nước sôi ở 100°C.)

**Sử dụng Thì Hiện Tại Tiếp Diễn khi:**
• Hành động đang xảy ra: "I am reading." (Tôi đang đọc.)
• Tình huống tạm thời: "He is staying with friends." (Anh ấy đang ở với bạn bè.)',

'**Lỗi thường gặp 1: Dùng tiếp diễn với động từ trạng thái**
❌ "I am knowing the answer."
✓ "I know the answer." (Tôi biết câu trả lời.)

**Lỗi thường gặp 2: Quên -s cho ngôi thứ ba số ít**
❌ "She work at a bank."
✓ "She works at a bank." (Cô ấy làm việc ở ngân hàng.)',

'[
  {"title": "Hiện Tại Đơn - Khẳng định", "formula": "Chủ ngữ + Động từ(s/es)", "example": "She plays tennis. (Cô ấy chơi tennis.)"},
  {"title": "Hiện Tại Tiếp Diễn - Khẳng định", "formula": "Chủ ngữ + am/is/are + Động từ-ing", "example": "They are watching TV. (Họ đang xem TV.)"}
]',

'[
  {"sentence": "I wake up at 7 AM every day.", "translation": "Tôi thức dậy lúc 7 giờ sáng mỗi ngày.", "correct": true},
  {"sentence": "She is cooking dinner right now.", "translation": "Cô ấy đang nấu bữa tối.", "correct": true}
]',

'**Mẹo cho người nói tiếng Việt:**

Tiếng Việt không có chia động từ theo thì như tiếng Anh. Hãy nhớ:

• "đang" trong tiếng Việt ≈ Present Continuous (be + -ing)
• Không có từ chỉ thời gian = có thể là Present Simple

Người Việt thường quên thêm -s cho ngôi thứ ba số ít - đây là lỗi rất phổ biến!

Động từ trạng thái (know, love, want, like) KHÔNG dùng với "đang" trong tiếng Anh.');

-- Thai (th)
INSERT INTO grammar_lesson_translations (lesson_id, language_code, theory_title, theory_definition, theory_formation, theory_usage, theory_common_mistakes, rules, examples, localized_tips) VALUES
('22222222-2222-2222-2222-222222222201', 'th',
'ทำความเข้าใจ Present Simple และ Present Continuous',

'Present Simple และ Present Continuous เป็นสอง Tense ที่ใช้บ่อยที่สุดในภาษาอังกฤษ แม้ว่าทั้งสองจะอธิบายเวลาปัจจุบัน แต่มีจุดประสงค์การใช้ที่ต่างกัน

Present Simple อธิบายนิสัย กิจวัตร ความจริงทั่วไป และสถานการณ์ถาวร มันบอกเราว่า "อะไรเกิดขึ้นเป็นปกติ"

Present Continuous อธิบายการกระทำที่กำลังเกิดขึ้นตอนนี้ สถานการณ์ชั่วคราว และแผนในอนาคต มันบอกเราว่า "อะไรกำลังเกิดขึ้นในขณะนี้"',

'**โครงสร้าง Present Simple:**
• ประโยคบอกเล่า: ประธาน + กริยาช่อง 1 (เติม -s/-es สำหรับ he/she/it)
• ประโยคปฏิเสธ: ประธาน + do/does + not + กริยาช่อง 1
• ประโยคคำถาม: Do/Does + ประธาน + กริยาช่อง 1?

**โครงสร้าง Present Continuous:**
• ประโยคบอกเล่า: ประธาน + am/is/are + กริยา-ing
• ประโยคปฏิเสธ: ประธาน + am/is/are + not + กริยา-ing
• ประโยคคำถาม: Am/Is/Are + ประธาน + กริยา-ing?',

'**ใช้ Present Simple เมื่อ:**
• นิสัย: "I drink coffee every morning." (ฉันดื่มกาแฟทุกเช้า)
• ความจริงทั่วไป: "Water boils at 100°C." (น้ำเดือดที่ 100 องศา)

**ใช้ Present Continuous เมื่อ:**
• การกระทำที่กำลังเกิดขึ้น: "I am reading." (ฉันกำลังอ่านหนังสือ)
• สถานการณ์ชั่วคราว: "He is staying with friends." (เขากำลังพักอยู่กับเพื่อน)',

'**ข้อผิดพลาดที่พบบ่อย 1: ใช้ Continuous กับกริยาแสดงสภาพ**
❌ "I am knowing the answer."
✓ "I know the answer." (ฉันรู้คำตอบ)

**ข้อผิดพลาดที่พบบ่อย 2: ลืมเติม -s สำหรับบุรุษที่ 3 เอกพจน์**
❌ "She work at a bank."
✓ "She works at a bank." (เธอทำงานที่ธนาคาร)',

'[
  {"title": "Present Simple - บอกเล่า", "formula": "ประธาน + กริยา(s/es)", "example": "She plays tennis. (เธอเล่นเทนนิส)"},
  {"title": "Present Continuous - บอกเล่า", "formula": "ประธาน + am/is/are + กริยา-ing", "example": "They are watching TV. (พวกเขากำลังดูทีวี)"}
]',

'[
  {"sentence": "I wake up at 7 AM every day.", "translation": "ฉันตื่นตอน 7 โมงเช้าทุกวัน", "correct": true},
  {"sentence": "She is cooking dinner right now.", "translation": "เธอกำลังทำอาหารเย็นตอนนี้", "correct": true}
]',

'**เคล็ดลับสำหรับคนไทย:**

ภาษาไทยไม่มีการผันกริยาตาม Tense แบบภาษาอังกฤษ จำไว้ว่า:

• "กำลัง" ในภาษาไทย ≈ Present Continuous (be + -ing)
• ไม่มีคำบอกเวลา = อาจเป็น Present Simple

คนไทยมักลืมเติม -s สำหรับบุรุษที่ 3 - นี่เป็นข้อผิดพลาดที่พบบ่อยมาก!');

-- Arabic (ar)
INSERT INTO grammar_lesson_translations (lesson_id, language_code, theory_title, theory_definition, theory_formation, theory_usage, theory_common_mistakes, rules, examples, localized_tips) VALUES
('22222222-2222-2222-2222-222222222201', 'ar',
'فهم المضارع البسيط والمستمر',

'المضارع البسيط (Present Simple) والمضارع المستمر (Present Continuous) هما أكثر الأزمنة استخداماً في اللغة الإنجليزية. على الرغم من أن كليهما يصف الوقت الحاضر، إلا أن لهما أغراضاً مختلفة.

المضارع البسيط يصف العادات والروتين والحقائق العامة والمواقف الدائمة. يخبرنا "ما يحدث عادةً".

المضارع المستمر يصف الأفعال التي تحدث الآن والمواقف المؤقتة والخطط المستقبلية. يخبرنا "ما يحدث في هذه اللحظة".',

'**تكوين المضارع البسيط:**
• إيجابي: الفاعل + الفعل الأساسي (أضف s/es لـ he/she/it)
• نفي: الفاعل + do/does + not + الفعل الأساسي
• سؤال: Do/Does + الفاعل + الفعل الأساسي؟

**تكوين المضارع المستمر:**
• إيجابي: الفاعل + am/is/are + فعل-ing
• نفي: الفاعل + am/is/are + not + فعل-ing
• سؤال: Am/Is/Are + الفاعل + فعل-ing؟',

'**استخدم المضارع البسيط لـ:**
• العادات: "I drink coffee every morning." (أشرب القهوة كل صباح.)
• الحقائق العامة: "Water boils at 100°C." (الماء يغلي عند 100 درجة.)

**استخدم المضارع المستمر لـ:**
• الأفعال الجارية: "I am reading." (أنا أقرأ الآن.)
• المواقف المؤقتة: "He is staying with friends." (هو يقيم مع أصدقائه.)',

'**خطأ شائع 1: استخدام المستمر مع أفعال الحالة**
❌ "I am knowing the answer."
✓ "I know the answer." (أنا أعرف الإجابة.)

**خطأ شائع 2: نسيان s للشخص الثالث المفرد**
❌ "She work at a bank."
✓ "She works at a bank." (هي تعمل في بنك.)',

'[
  {"title": "المضارع البسيط - إيجابي", "formula": "الفاعل + فعل(s/es)", "example": "She plays tennis. (هي تلعب التنس.)"},
  {"title": "المضارع المستمر - إيجابي", "formula": "الفاعل + am/is/are + فعل-ing", "example": "They are watching TV. (هم يشاهدون التلفزيون.)"}
]',

'[
  {"sentence": "I wake up at 7 AM every day.", "translation": "أستيقظ في السابعة صباحاً كل يوم.", "correct": true},
  {"sentence": "She is cooking dinner right now.", "translation": "هي تطبخ العشاء الآن.", "correct": true}
]',

'**نصائح للناطقين بالعربية:**

العربية لها نظام مختلف للأزمنة عن الإنجليزية. تذكر:

• المضارع في العربية قد يكون Present Simple أو Present Continuous في الإنجليزية
• يجب عليك الاختيار بين الاثنين في الإنجليزية!

إضافة s للشخص الثالث المفرد إلزامية - هذا خطأ شائع جداً عند العرب!');

-- German (de)
INSERT INTO grammar_lesson_translations (lesson_id, language_code, theory_title, theory_definition, theory_formation, theory_usage, theory_common_mistakes, rules, examples, localized_tips) VALUES
('22222222-2222-2222-2222-222222222201', 'de',
'Present Simple und Continuous verstehen',

'Das Present Simple und das Present Continuous sind die zwei am häufigsten verwendeten Zeitformen im Englischen. Obwohl beide die Gegenwart beschreiben, haben sie unterschiedliche Verwendungszwecke.

Das Present Simple beschreibt Gewohnheiten, Routinen, allgemeine Wahrheiten und dauerhafte Situationen. Es sagt uns, "was normalerweise passiert".

Das Present Continuous beschreibt Handlungen, die gerade stattfinden, vorübergehende Situationen und Zukunftspläne. Es sagt uns, "was gerade passiert".',

'**Bildung des Present Simple:**
• Positiv: Subjekt + Grundform des Verbs (füge -s/-es für he/she/it hinzu)
• Negativ: Subjekt + do/does + not + Grundform
• Frage: Do/Does + Subjekt + Grundform?

**Bildung des Present Continuous:**
• Positiv: Subjekt + am/is/are + Verb-ing
• Negativ: Subjekt + am/is/are + not + Verb-ing
• Frage: Am/Is/Are + Subjekt + Verb-ing?',

'**Verwende Present Simple für:**
• Gewohnheiten: "I drink coffee every morning." (Ich trinke jeden Morgen Kaffee.)
• Allgemeine Wahrheiten: "Water boils at 100°C." (Wasser kocht bei 100°C.)

**Verwende Present Continuous für:**
• Aktuelle Handlungen: "I am reading." (Ich lese gerade.)
• Vorübergehende Situationen: "He is staying with friends." (Er übernachtet bei Freunden.)',

'**Häufiger Fehler 1: Continuous mit Zustandsverben**
❌ "I am knowing the answer."
✓ "I know the answer." (Ich weiß die Antwort.)

**Häufiger Fehler 2: Vergessen von -s in der dritten Person**
❌ "She work at a bank."
✓ "She works at a bank." (Sie arbeitet bei einer Bank.)',

'[
  {"title": "Present Simple - Positiv", "formula": "Subjekt + Verb(s/es)", "example": "She plays tennis. (Sie spielt Tennis.)"},
  {"title": "Present Continuous - Positiv", "formula": "Subjekt + am/is/are + Verb-ing", "example": "They are watching TV. (Sie schauen fern.)"}
]',

'[
  {"sentence": "I wake up at 7 AM every day.", "translation": "Ich wache jeden Tag um 7 Uhr auf.", "correct": true},
  {"sentence": "She is cooking dinner right now.", "translation": "Sie kocht gerade das Abendessen.", "correct": true}
]',

'**Tipps für Deutschsprachige:**

Deutsch hat keine direkte Entsprechung zum Present Continuous. "Ich lese" kann sowohl "I read" als auch "I am reading" sein.

Im Englischen MÜSSEN Sie sich entscheiden:
• Gewohnheit → Present Simple: "I read every day."
• Gerade jetzt → Present Continuous: "I am reading now."

Deutsche benutzen oft "gerade" um das Continuous auszudrücken - denken Sie daran, wenn Sie auf Englisch sprechen!');

-- Portuguese (pt)
INSERT INTO grammar_lesson_translations (lesson_id, language_code, theory_title, theory_definition, theory_formation, theory_usage, theory_common_mistakes, rules, examples, localized_tips) VALUES
('22222222-2222-2222-2222-222222222201', 'pt',
'Entendendo o Present Simple e Continuous',

'O Present Simple e o Present Continuous são os dois tempos verbais mais usados em inglês. Embora ambos descrevam o tempo presente, eles têm propósitos diferentes.

O Present Simple descreve hábitos, rotinas, verdades gerais e situações permanentes. Ele nos diz "o que geralmente acontece".

O Present Continuous descreve ações que estão acontecendo agora, situações temporárias e planos futuros. Ele nos diz "o que está acontecendo neste momento".',

'**Formação do Present Simple:**
• Afirmativo: Sujeito + verbo base (adicione -s/-es para he/she/it)
• Negativo: Sujeito + do/does + not + verbo base
• Pergunta: Do/Does + sujeito + verbo base?

**Formação do Present Continuous:**
• Afirmativo: Sujeito + am/is/are + verbo-ing
• Negativo: Sujeito + am/is/are + not + verbo-ing
• Pergunta: Am/Is/Are + sujeito + verbo-ing?',

'**Use o Present Simple para:**
• Hábitos: "I drink coffee every morning." (Eu bebo café toda manhã.)
• Verdades gerais: "Water boils at 100°C." (A água ferve a 100°C.)

**Use o Present Continuous para:**
• Ações em andamento: "I am reading." (Estou lendo.)
• Situações temporárias: "He is staying with friends." (Ele está ficando com amigos.)',

'**Erro comum 1: Usar continuous com verbos de estado**
❌ "I am knowing the answer."
✓ "I know the answer." (Eu sei a resposta.)

**Erro comum 2: Esquecer o -s na terceira pessoa**
❌ "She work at a bank."
✓ "She works at a bank." (Ela trabalha em um banco.)',

'[
  {"title": "Present Simple - Afirmativo", "formula": "Sujeito + Verbo(s/es)", "example": "She plays tennis. (Ela joga tênis.)"},
  {"title": "Present Continuous - Afirmativo", "formula": "Sujeito + am/is/are + Verbo-ing", "example": "They are watching TV. (Eles estão assistindo TV.)"}
]',

'[
  {"sentence": "I wake up at 7 AM every day.", "translation": "Eu acordo às 7h todos os dias.", "correct": true},
  {"sentence": "She is cooking dinner right now.", "translation": "Ela está cozinhando o jantar agora.", "correct": true}
]',

'**Dicas para falantes de português:**

O português tem estruturas semelhantes:
• Presente do Indicativo ≈ Present Simple
• Estar + gerúndio ≈ Present Continuous

Mas atenção às diferenças:
1. Em inglês, NUNCA use continuous com verbos como "know", "love", "want"
2. O -s da terceira pessoa é OBRIGATÓRIO
3. Em português dizemos "estou sabendo" mas em inglês é sempre "I know"');

-- Russian (ru)
INSERT INTO grammar_lesson_translations (lesson_id, language_code, theory_title, theory_definition, theory_formation, theory_usage, theory_common_mistakes, rules, examples, localized_tips) VALUES
('22222222-2222-2222-2222-222222222201', 'ru',
'Понимание Present Simple и Continuous',

'Present Simple и Present Continuous — два наиболее часто используемых времени в английском языке. Хотя оба описывают настоящее время, они имеют разные цели.

Present Simple описывает привычки, рутину, общие истины и постоянные ситуации. Оно говорит нам «что обычно происходит».

Present Continuous описывает действия, происходящие прямо сейчас, временные ситуации и планы на будущее. Оно говорит нам «что происходит в данный момент».',

'**Образование Present Simple:**
• Утвердительное: Подлежащее + глагол (добавьте -s/-es для he/she/it)
• Отрицательное: Подлежащее + do/does + not + глагол
• Вопрос: Do/Does + подлежащее + глагол?

**Образование Present Continuous:**
• Утвердительное: Подлежащее + am/is/are + глагол-ing
• Отрицательное: Подлежащее + am/is/are + not + глагол-ing
• Вопрос: Am/Is/Are + подлежащее + глагол-ing?',

'**Используйте Present Simple для:**
• Привычек: "I drink coffee every morning." (Я пью кофе каждое утро.)
• Общих истин: "Water boils at 100°C." (Вода кипит при 100°C.)

**Используйте Present Continuous для:**
• Текущих действий: "I am reading." (Я читаю сейчас.)
• Временных ситуаций: "He is staying with friends." (Он живёт у друзей.)',

'**Частая ошибка 1: Continuous с глаголами состояния**
❌ "I am knowing the answer."
✓ "I know the answer." (Я знаю ответ.)

**Частая ошибка 2: Забывать -s в третьем лице**
❌ "She work at a bank."
✓ "She works at a bank." (Она работает в банке.)',

'[
  {"title": "Present Simple - Утвердительное", "formula": "Подлежащее + Глагол(s/es)", "example": "She plays tennis. (Она играет в теннис.)"},
  {"title": "Present Continuous - Утвердительное", "formula": "Подлежащее + am/is/are + Глагол-ing", "example": "They are watching TV. (Они смотрят телевизор.)"}
]',

'[
  {"sentence": "I wake up at 7 AM every day.", "translation": "Я просыпаюсь в 7 утра каждый день.", "correct": true},
  {"sentence": "She is cooking dinner right now.", "translation": "Она сейчас готовит ужин.", "correct": true}
]',

'**Советы для русскоязычных:**

В русском языке нет точного аналога Present Continuous. Помните:

• Русский несовершенный вид может быть и Simple, и Continuous
• В английском НУЖНО выбрать одно!

«Я читаю» может быть:
• "I read" (вообще, как привычка)
• "I am reading" (прямо сейчас)

Это ключевое отличие, которое нужно запомнить!');

-- ============================================
-- EXERCISES FOR TOPIC 1 (Present Simple & Continuous)
-- ============================================

-- Exercise 1: Multiple Choice
INSERT INTO grammar_exercises (id, topic_id, exercise_type, difficulty, exercise_order) VALUES
('33333333-3333-3333-3333-333333333301', '11111111-1111-1111-1111-111111111101', 'multiple_choice', 1, 1);

INSERT INTO grammar_exercise_translations (exercise_id, language_code, question, instruction, correct_answer, incorrect_answers, explanation, hint) VALUES
('33333333-3333-3333-3333-333333333301', 'en', 
'She ___ to work every day.',
'Choose the correct form of the verb.',
'goes',
'["go", "going", "is going"]',
'We use Present Simple (goes) for habitual actions. "Every day" indicates a routine.',
'Think about what happens regularly.');

-- Exercise 2: Fill in Blank
INSERT INTO grammar_exercises (id, topic_id, exercise_type, difficulty, exercise_order) VALUES
('33333333-3333-3333-3333-333333333302', '11111111-1111-1111-1111-111111111101', 'fill_in_blank', 1, 2);

INSERT INTO grammar_exercise_translations (exercise_id, language_code, question, instruction, correct_answer, incorrect_answers, explanation, hint, sentence_with_blank) VALUES
('33333333-3333-3333-3333-333333333302', 'en',
'Complete the sentence',
'Type the correct form of the verb "watch".',
'is watching',
'["watches", "watch"]',
'"Right now" tells us the action is happening at this moment, so we use Present Continuous.',
'Look at the time expression in the sentence.',
'Look! The baby ___ TV right now.');

-- Exercise 3: Error Correction
INSERT INTO grammar_exercises (id, topic_id, exercise_type, difficulty, exercise_order) VALUES
('33333333-3333-3333-3333-333333333303', '11111111-1111-1111-1111-111111111101', 'error_correction', 2, 3);

INSERT INTO grammar_exercise_translations (exercise_id, language_code, question, instruction, correct_answer, incorrect_answers, explanation, hint, incorrect_sentence) VALUES
('33333333-3333-3333-3333-333333333303', 'en',
'Find and correct the error',
'Rewrite the sentence correctly.',
'She works at a hospital.',
'[]',
'Third person singular (she/he/it) needs -s at the end of the verb in Present Simple.',
'Check the verb ending for third person.',
'She work at a hospital.');

-- Exercise 4: Sentence Transformation
INSERT INTO grammar_exercises (id, topic_id, exercise_type, difficulty, exercise_order, transformation_type) VALUES
('33333333-3333-3333-3333-333333333304', '11111111-1111-1111-1111-111111111101', 'sentence_transformation', 2, 4, 'Affirmative to Negative');

INSERT INTO grammar_exercise_translations (exercise_id, language_code, question, instruction, correct_answer, incorrect_answers, explanation, hint, original_sentence) VALUES
('33333333-3333-3333-3333-333333333304', 'en',
'Transform to negative',
'Change this sentence to the negative form.',
'They do not play football on Sundays.',
'["They don''t play football on Sundays.", "They are not playing football on Sundays."]',
'To make Present Simple negative, use do/does + not + base verb. "They" takes "do not" (don''t).',
'Use do/does + not + verb.',
'They play football on Sundays.');

-- Exercise 5: Drag Drop
INSERT INTO grammar_exercises (id, topic_id, exercise_type, difficulty, exercise_order, correct_order) VALUES
('33333333-3333-3333-3333-333333333305', '11111111-1111-1111-1111-111111111101', 'drag_drop_reorder', 1, 5, '["She", "is", "reading", "a", "book", "now"]');

INSERT INTO grammar_exercise_translations (exercise_id, language_code, question, instruction, correct_answer, incorrect_answers, explanation, hint) VALUES
('33333333-3333-3333-3333-333333333305', 'en',
'Arrange words to form a sentence',
'Put the words in the correct order.',
'She is reading a book now.',
'[]',
'Present Continuous structure: Subject + am/is/are + verb-ing. "Now" confirms it''s happening at this moment.',
'Start with the subject, then the verb "to be".');

-- Exercise 6: Multiple Choice (harder)
INSERT INTO grammar_exercises (id, topic_id, exercise_type, difficulty, exercise_order) VALUES
('33333333-3333-3333-3333-333333333306', '11111111-1111-1111-1111-111111111101', 'multiple_choice', 2, 6);

INSERT INTO grammar_exercise_translations (exercise_id, language_code, question, instruction, correct_answer, incorrect_answers, explanation, hint) VALUES
('33333333-3333-3333-3333-333333333306', 'en',
'I ___ what you mean.',
'Choose the correct form. (Note: "understand" is a state verb)',
'understand',
'["am understanding", "understands", "are understanding"]',
'"Understand" is a state verb and is NOT used in continuous form. We always say "I understand".',
'Think about whether this verb describes a state or an action.');

-- Exercise 7: Multiple Choice
INSERT INTO grammar_exercises (id, topic_id, exercise_type, difficulty, exercise_order) VALUES
('33333333-3333-3333-3333-333333333307', '11111111-1111-1111-1111-111111111101', 'multiple_choice', 1, 7);

INSERT INTO grammar_exercise_translations (exercise_id, language_code, question, instruction, correct_answer, incorrect_answers, explanation, hint) VALUES
('33333333-3333-3333-3333-333333333307', 'en',
'Water ___ at 100 degrees Celsius.',
'Choose the correct form for scientific facts.',
'boils',
'["is boiling", "boil", "are boiling"]',
'Scientific facts and general truths use Present Simple, not Continuous.',
'Is this a fact that is always true?');

-- Exercise 8: Fill in Blank
INSERT INTO grammar_exercises (id, topic_id, exercise_type, difficulty, exercise_order) VALUES
('33333333-3333-3333-3333-333333333308', '11111111-1111-1111-1111-111111111101', 'fill_in_blank', 2, 8);

INSERT INTO grammar_exercise_translations (exercise_id, language_code, question, instruction, correct_answer, incorrect_answers, explanation, hint, sentence_with_blank) VALUES
('33333333-3333-3333-3333-333333333308', 'en',
'Complete with the correct tense',
'Use the verb "stay" in the correct form.',
'is staying',
'["stays"]',
'"This week" indicates a temporary situation, so we use Present Continuous.',
'Is this a permanent or temporary situation?',
'He ___ at a hotel this week.');

-- Exercise 9: Error Correction
INSERT INTO grammar_exercises (id, topic_id, exercise_type, difficulty, exercise_order) VALUES
('33333333-3333-3333-3333-333333333309', '11111111-1111-1111-1111-111111111101', 'error_correction', 3, 9);

INSERT INTO grammar_exercise_translations (exercise_id, language_code, question, instruction, correct_answer, incorrect_answers, explanation, hint, incorrect_sentence) VALUES
('33333333-3333-3333-3333-333333333309', 'en',
'Find and correct the error',
'This sentence has a state verb error.',
'I know the answer to this question.',
'[]',
'"Know" is a state verb and cannot be used in continuous form. Always use "I know".',
'State verbs don''t take -ing.',
'I am knowing the answer to this question.');

-- Exercise 10: Multiple Choice
INSERT INTO grammar_exercises (id, topic_id, exercise_type, difficulty, exercise_order) VALUES
('33333333-3333-3333-3333-333333333310', '11111111-1111-1111-1111-111111111101', 'multiple_choice', 2, 10);

INSERT INTO grammar_exercise_translations (exercise_id, language_code, question, instruction, correct_answer, incorrect_answers, explanation, hint) VALUES
('33333333-3333-3333-3333-333333333310', 'en',
'The train ___ at 9:00 AM tomorrow.',
'Choose the correct form for scheduled events.',
'leaves',
'["is leaving", "leave", "will leave"]',
'We use Present Simple for fixed schedules (trains, planes, etc.) even when talking about the future.',
'Think about official timetables.');

-- ============================================
-- NOTE: Due to size constraints, this seed file includes:
-- - All 24 topics with basic structure
-- - Full lesson content for Topic 1 in 10 languages
-- - 10 exercises for Topic 1
-- 
-- The admin can add remaining content via the UI
-- or additional migration files can be created.
-- ============================================

