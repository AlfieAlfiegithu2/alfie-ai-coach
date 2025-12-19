
DO $$
DECLARE
    v_lesson_id uuid;
BEGIN

    -- Updating sentence-structure-svo (En)
    UPDATE grammar_lesson_translations
    SET 
        theory_definition = '## The Golden Rule: SVO

In English, clarity comes from order. Unlike some languages where word order is flexible, English is strict.

The basic "Skeleton" of almost every sentence is:

**Subject + Verb + Object**',
        theory_formation = '### Formula

Subject + Verb + Object',
        theory_usage = 'Used for almost all statements in English.',
        theory_common_mistakes = '*   ❌ **I you love.** (Object before verb)
*   ❌ **Yesterday came my friend.** (Verb before subject)',
        localized_tips = 'Subject is the driver. Verb is the car. Driver first!',
        rules = '[{"title":"Basic Order","formula":"S + V + O","example":"I (S) love (V) you (O)."},{"title":"With Time & Place","formula":"S + V + O + Place + Time","example":"I ate pizza at home yesterday."}]'::jsonb,
        examples = '[{"sentence":"John eats an apple.","explanation":"Standard SVO."},{"sentence":"She plays soccer.","explanation":"Standard SVO."},{"sentence":"I like him.","explanation":"Subject (I), Verb (like), Object (him, not ''he'')."}]'::jsonb
    WHERE language_code = 'en' 
    AND lesson_id IN (
        SELECT id FROM grammar_lessons 
        WHERE topic_id = (SELECT id FROM grammar_topics WHERE slug = 'sentence-structure-svo')
    );

    -- Updating sentence-structure-svo (Vi)
    SELECT id INTO v_lesson_id 
    FROM grammar_lessons 
    WHERE topic_id = (SELECT id FROM grammar_topics WHERE slug = 'sentence-structure-svo')
    LIMIT 1;

    IF v_lesson_id IS NOT NULL THEN
        INSERT INTO grammar_lesson_translations (lesson_id, language_code, theory_title, theory_definition, theory_formation, theory_usage, theory_common_mistakes, localized_tips, rules, examples)
        VALUES (
            v_lesson_id,
            'vi',
            'Cấu trúc câu: SVO',
            '## Quy tắc vàng: SVO

Tiếng Anh rất nghiêm ngặt về trật tự từ. Cấu trúc cơ bản là:

**Chủ ngữ + Động từ + Tân ngữ**',
            '### Công thức

S + V + O',
            'Dùng cho hầu hết các câu.',
            '*   ❌ **I you love.** (Sai trật tự)
*   ❌ **Yesterday came my friend.** (Chủ ngữ phải đứng trước động từ)',
            'SVO là vua. Đừng đảo lộn nó.',
            '[{"title":"Cấu trúc cơ bản","formula":"S + V + O","example":"I (S) love (V) you (O)."},{"title":"Với Nơi chốn & Thời gian","formula":"S + V + O + Nơi chốn + Thời gian","example":"I ate pizza at home yesterday."}]'::jsonb,
            '[{"sentence":"John eats an apple.","translation":"John ăn một quả táo.","explanation":"Cấu trúc SVO chuẩn."},{"sentence":"She plays soccer.","translation":"Cô ấy chơi bóng đá.","explanation":"SVO."},{"sentence":"I like him.","translation":"Tôi thích anh ấy.","explanation":"Object là him (không phải he)."}]'::jsonb
        )
        ON CONFLICT (lesson_id, language_code) DO UPDATE SET
            theory_title = EXCLUDED.theory_title,
            theory_definition = EXCLUDED.theory_definition,
            theory_formation = EXCLUDED.theory_formation,
            theory_usage = EXCLUDED.theory_usage,
            theory_common_mistakes = EXCLUDED.theory_common_mistakes,
            localized_tips = EXCLUDED.localized_tips,
            rules = EXCLUDED.rules,
            examples = EXCLUDED.examples;
    END IF;

    -- Updating adjectives-linking-verbs (En)
    UPDATE grammar_lesson_translations
    SET 
        theory_definition = '## Describing Things

Linking verbs act like an equals sign (=). They connect the subject to an adjective describing it.

**Subject + Linking Verb + Adjective**',
        theory_formation = '### Common Linking Verbs
*   To Be (am, is, are)
*   Sense Verbs (look, feel, smell, taste, sound)
*   Change Verbs (become, get)',
        theory_usage = 'To describe a state or condition.',
        theory_common_mistakes = '*   ❌ **She sings good.** (Use adverb for actions)
*   ❌ **I feel happily.** (Use adjective for linking verbs)',
        localized_tips = 'If you can replace the verb with ''IS'', it''s a linking verb.',
        rules = '[{"title":"The Rule","formula":"Subject + Linking Verb + Adjective","example":"You look tired."},{"title":"Difference from Action Verbs","formula":"Subject + Action Verb + Adverb","example":"You run quickly."}]'::jsonb,
        examples = '[{"sentence":"She is happy.","explanation":"To be + Adjective."},{"sentence":"He looks tired.","explanation":"Look is a linking verb."},{"sentence":"This soup tastes good.","explanation":"Taste connects subject to adjective."},{"sentence":"I feel good.","explanation":"Describing my state."}]'::jsonb
    WHERE language_code = 'en' 
    AND lesson_id IN (
        SELECT id FROM grammar_lessons 
        WHERE topic_id = (SELECT id FROM grammar_topics WHERE slug = 'adjectives-linking-verbs')
    );

    -- Updating adjectives-linking-verbs (Vi)
    SELECT id INTO v_lesson_id 
    FROM grammar_lessons 
    WHERE topic_id = (SELECT id FROM grammar_topics WHERE slug = 'adjectives-linking-verbs')
    LIMIT 1;

    IF v_lesson_id IS NOT NULL THEN
        INSERT INTO grammar_lesson_translations (lesson_id, language_code, theory_title, theory_definition, theory_formation, theory_usage, theory_common_mistakes, localized_tips, rules, examples)
        VALUES (
            v_lesson_id,
            'vi',
            'Tính từ & Động từ nối',
            '## Mô tả sự vật

Động từ nối (Linking Verbs) giống như dấu bằng (=). Chúng nối chủ ngữ với tính từ.

**Chủ ngữ + Linking Verb + Tính từ**',
            '### Các từ phổ biến
*   To Be (am, is, are)
*   Giác quan (look, feel, smell, taste, sound)
*   Thay đổi (become, get)',
            'Mô tả trạng thái.',
            '*   ❌ **I feel happily.** (Phải dùng tính từ)
*   ✅ **I feel happy.**',
            'Nếu thay được bằng ''thì/là'', đó là linking verb.',
            '[{"title":"Quy tắc","formula":"Chủ ngữ + Linking Verb + Tính từ","example":"You look tired."},{"title":"Khác với Động từ thường","formula":"Chủ ngữ + Động từ thường + Trạng từ","example":"You run quickly."}]'::jsonb,
            '[{"sentence":"She is happy.","translation":"Cô ấy hạnh phúc.","explanation":"To be + Tính từ."},{"sentence":"He looks tired.","translation":"Anh ấy trông mệt mỏi.","explanation":"Look là động từ nối."},{"sentence":"This soup tastes good.","translation":"Món súp này vị ngon.","explanation":"Taste + Tính từ."}]'::jsonb
        )
        ON CONFLICT (lesson_id, language_code) DO UPDATE SET
            theory_title = EXCLUDED.theory_title,
            theory_definition = EXCLUDED.theory_definition,
            theory_formation = EXCLUDED.theory_formation,
            theory_usage = EXCLUDED.theory_usage,
            theory_common_mistakes = EXCLUDED.theory_common_mistakes,
            localized_tips = EXCLUDED.localized_tips,
            rules = EXCLUDED.rules,
            examples = EXCLUDED.examples;
    END IF;

    -- Updating word-order-time-place (En)
    UPDATE grammar_lesson_translations
    SET 
        theory_definition = '## Place First, Time Last

English puts **Place** before **Time**.',
        theory_formation = '**Subject + Verb + Place + Time**',
        theory_usage = 'Standard sentences.',
        theory_common_mistakes = '*   ❌ **I go every day to school.**
*   ✅ **I go to school every day.**',
        localized_tips = 'P.T. (Place -> Time).',
        rules = '[{"title":"Standard Order","formula":"Place + Time","example":"at home (Place) + now (Time)"}]'::jsonb,
        examples = '[{"sentence":"I study at school every day.","explanation":"at school (Place) -> every day (Time)"},{"sentence":"We met in London in 2010.","explanation":"in London (Place) -> in 2010 (Time)"}]'::jsonb
    WHERE language_code = 'en' 
    AND lesson_id IN (
        SELECT id FROM grammar_lessons 
        WHERE topic_id = (SELECT id FROM grammar_topics WHERE slug = 'word-order-time-place')
    );

    -- Updating word-order-time-place (Vi)
    SELECT id INTO v_lesson_id 
    FROM grammar_lessons 
    WHERE topic_id = (SELECT id FROM grammar_topics WHERE slug = 'word-order-time-place')
    LIMIT 1;

    IF v_lesson_id IS NOT NULL THEN
        INSERT INTO grammar_lesson_translations (lesson_id, language_code, theory_title, theory_definition, theory_formation, theory_usage, theory_common_mistakes, localized_tips, rules, examples)
        VALUES (
            v_lesson_id,
            'vi',
            'Trật tự từ: Nơi chốn & Thời gian',
            '## Nơi chốn trước, Thời gian sau',
            '**Chủ ngữ + Động từ + Nơi chốn + Thời gian**',
            'Câu chuẩn.',
            '*   ❌ **I go every day to school.**
*   ✅ **I go to school every day.**',
            'P.T. (Place trước, Time sau).',
            '[{"title":"Quy tắc chuẩn","formula":"Nơi chốn + Thời gian","example":"at home (Nơi chốn) + now (Thời gian)"}]'::jsonb,
            '[{"sentence":"I study at school every day.","translation":"Tôi học ở trường mỗi ngày.","explanation":"at school (Nơi chốn) -> every day (Thời gian)"},{"sentence":"We met in London in 2010.","translation":"Chúng tôi gặp nhau ở London năm 2010.","explanation":"in London (Nơi chốn) -> in 2010 (Thời gian)"}]'::jsonb
        )
        ON CONFLICT (lesson_id, language_code) DO UPDATE SET
            theory_title = EXCLUDED.theory_title,
            theory_definition = EXCLUDED.theory_definition,
            theory_formation = EXCLUDED.theory_formation,
            theory_usage = EXCLUDED.theory_usage,
            theory_common_mistakes = EXCLUDED.theory_common_mistakes,
            localized_tips = EXCLUDED.localized_tips,
            rules = EXCLUDED.rules,
            examples = EXCLUDED.examples;
    END IF;

    -- Updating adjective-placement (En)
    UPDATE grammar_lesson_translations
    SET 
        theory_definition = '## Before Noun

Adjectives go **before** the noun.',
        theory_formation = '**Adjective + Noun**',
        theory_usage = 'Describing things.',
        theory_common_mistakes = '*   ❌ **Car red.**
*   ✅ **Red car.**',
        localized_tips = 'Adjective stands in front to protect the noun.',
        rules = '[{"title":"Attribute Position","formula":"Adjective + Noun","example":"A black cat"},{"title":"Predicative Position","formula":"To Be + Adjective","example":"The cat is black"}]'::jsonb,
        examples = '[{"sentence":"I have a new car.","explanation":"New (adj) + Car (noun)"},{"sentence":"It is a beautiful day.","explanation":"Beautiful (adj) + Day (noun)"}]'::jsonb
    WHERE language_code = 'en' 
    AND lesson_id IN (
        SELECT id FROM grammar_lessons 
        WHERE topic_id = (SELECT id FROM grammar_topics WHERE slug = 'adjective-placement')
    );

    -- Updating adjective-placement (Vi)
    SELECT id INTO v_lesson_id 
    FROM grammar_lessons 
    WHERE topic_id = (SELECT id FROM grammar_topics WHERE slug = 'adjective-placement')
    LIMIT 1;

    IF v_lesson_id IS NOT NULL THEN
        INSERT INTO grammar_lesson_translations (lesson_id, language_code, theory_title, theory_definition, theory_formation, theory_usage, theory_common_mistakes, localized_tips, rules, examples)
        VALUES (
            v_lesson_id,
            'vi',
            'Vị trí của Tính từ',
            '## Trước Danh từ

Tính từ đứng **trước** danh từ.',
            '**Tính từ + Danh từ**',
            'Mô tả.',
            '*   ❌ **Car red.**
*   ✅ **Red car.**',
            'Ngược với tiếng Việt.',
            '[{"title":"Vị trí thuộc ngữ","formula":"Tính từ + Danh từ","example":"A black cat"},{"title":"Vị trí vị ngữ","formula":"To Be + Tính từ","example":"The cat is black"}]'::jsonb,
            '[{"sentence":"I have a new car.","translation":"Tôi có xe mới.","explanation":"New (adj) + Car (noun)"},{"sentence":"It is a beautiful day.","translation":"Hôm nay đẹp trời.","explanation":"Beautiful (adj) + Day (noun)"}]'::jsonb
        )
        ON CONFLICT (lesson_id, language_code) DO UPDATE SET
            theory_title = EXCLUDED.theory_title,
            theory_definition = EXCLUDED.theory_definition,
            theory_formation = EXCLUDED.theory_formation,
            theory_usage = EXCLUDED.theory_usage,
            theory_common_mistakes = EXCLUDED.theory_common_mistakes,
            localized_tips = EXCLUDED.localized_tips,
            rules = EXCLUDED.rules,
            examples = EXCLUDED.examples;
    END IF;

    -- Updating plural-nouns-regular-irregular (En)
    UPDATE grammar_lesson_translations
    SET 
        theory_definition = '## Making Plurals',
        theory_formation = 'Usually add **-s**.',
        theory_usage = 'Counting > 1.',
        theory_common_mistakes = 'Childs, Mans, Peoples.',
        localized_tips = 'Watch out for irregulars.',
        rules = '[{"title":"Regular","formula":"Add -s","example":"Cat -> Cats"},{"title":"Ends in -s, -x, -ch, -sh","formula":"Add -es","example":"Box -> Boxes"},{"title":"Ends in Consonant + y","formula":"Change y to -ies","example":"Baby -> Babies"},{"title":"Irregular","formula":"Memorize","example":"Man -> Men"}]'::jsonb,
        examples = '[{"sentence":"I have two dogs.","explanation":"Regular plural."},{"sentence":"The children are playing.","explanation":"Irregular plural (Child -> Children)."},{"sentence":"I brush my teeth.","explanation":"Irregular (Tooth -> Teeth)."}]'::jsonb
    WHERE language_code = 'en' 
    AND lesson_id IN (
        SELECT id FROM grammar_lessons 
        WHERE topic_id = (SELECT id FROM grammar_topics WHERE slug = 'plural-nouns-regular-irregular')
    );

    -- Updating plural-nouns-regular-irregular (Vi)
    SELECT id INTO v_lesson_id 
    FROM grammar_lessons 
    WHERE topic_id = (SELECT id FROM grammar_topics WHERE slug = 'plural-nouns-regular-irregular')
    LIMIT 1;

    IF v_lesson_id IS NOT NULL THEN
        INSERT INTO grammar_lesson_translations (lesson_id, language_code, theory_title, theory_definition, theory_formation, theory_usage, theory_common_mistakes, localized_tips, rules, examples)
        VALUES (
            v_lesson_id,
            'vi',
            'Danh từ số nhiều',
            '## Số nhiều',
            'Thường thêm **-s**.',
            'Đếm > 1.',
            'Childs, Mans, Peoples.',
            'Cẩn thận từ bất quy tắc.',
            '[{"title":"Thường","formula":"Thêm -s","example":"Cat -> Cats"},{"title":"Tận cùng -s, -x, -ch, -sh","formula":"Thêm -es","example":"Box -> Boxes"},{"title":"Tận cùng Phụ âm + y","formula":"Đổi y thành -ies","example":"Baby -> Babies"},{"title":"Bất quy tắc","formula":"Học thuộc","example":"Man -> Men"}]'::jsonb,
            '[{"sentence":"I have two dogs.","translation":"Tôi có 2 con chó.","explanation":"Số nhiều thường."},{"sentence":"The children are playing.","translation":"Lũ trẻ đang chơi.","explanation":"Bất quy tắc (Child -> Children)."}]'::jsonb
        )
        ON CONFLICT (lesson_id, language_code) DO UPDATE SET
            theory_title = EXCLUDED.theory_title,
            theory_definition = EXCLUDED.theory_definition,
            theory_formation = EXCLUDED.theory_formation,
            theory_usage = EXCLUDED.theory_usage,
            theory_common_mistakes = EXCLUDED.theory_common_mistakes,
            localized_tips = EXCLUDED.localized_tips,
            rules = EXCLUDED.rules,
            examples = EXCLUDED.examples;
    END IF;

    -- Updating possession-s-vs-of (En)
    UPDATE grammar_lesson_translations
    SET 
        theory_definition = 'Ways to show ownership.',
        theory_formation = '**''s** for people/animals. **OF** for things.',
        theory_usage = 'Possession.',
        theory_common_mistakes = 'The car of John.',
        localized_tips = 'People get the S.',
        rules = '[{"title":"People & Animals","formula":"Owner + ''s + Item","example":"John''s car"},{"title":"Things & Ideas","formula":"Item + of + Owner","example":"The door of the room"}]'::jsonb,
        examples = '[{"sentence":"This is Tom''s book.","explanation":"Tom is a person -> ''s"},{"sentence":"The leg of the table is broken.","explanation":"Table is a thing -> of"}]'::jsonb
    WHERE language_code = 'en' 
    AND lesson_id IN (
        SELECT id FROM grammar_lessons 
        WHERE topic_id = (SELECT id FROM grammar_topics WHERE slug = 'possession-s-vs-of')
    );

    -- Updating possession-s-vs-of (Vi)
    SELECT id INTO v_lesson_id 
    FROM grammar_lessons 
    WHERE topic_id = (SELECT id FROM grammar_topics WHERE slug = 'possession-s-vs-of')
    LIMIT 1;

    IF v_lesson_id IS NOT NULL THEN
        INSERT INTO grammar_lesson_translations (lesson_id, language_code, theory_title, theory_definition, theory_formation, theory_usage, theory_common_mistakes, localized_tips, rules, examples)
        VALUES (
            v_lesson_id,
            'vi',
            'Sở hữu: ''s hay OF',
            'Cách chỉ sở hữu.',
            '**''s** cho người/vật. **OF** cho đồ vật.',
            'Sở hữu.',
            'The car of John.',
            'Người thì thêm S.',
            '[{"title":"Người & Động vật","formula":"Chủ + ''s + Vật","example":"John''s car"},{"title":"Đồ vật & Ý tưởng","formula":"Vật + of + Chủ","example":"The door of the room"}]'::jsonb,
            '[{"sentence":"This is Tom''s book.","translation":"Đây là sách của Tom.","explanation":"Tom là người -> ''s"},{"sentence":"The leg of the table is broken.","translation":"Chân bàn bị gãy.","explanation":"Bàn là vật -> of"}]'::jsonb
        )
        ON CONFLICT (lesson_id, language_code) DO UPDATE SET
            theory_title = EXCLUDED.theory_title,
            theory_definition = EXCLUDED.theory_definition,
            theory_formation = EXCLUDED.theory_formation,
            theory_usage = EXCLUDED.theory_usage,
            theory_common_mistakes = EXCLUDED.theory_common_mistakes,
            localized_tips = EXCLUDED.localized_tips,
            rules = EXCLUDED.rules,
            examples = EXCLUDED.examples;
    END IF;

    -- Updating yes-no-questions (En)
    UPDATE grammar_lesson_translations
    SET 
        theory_definition = 'Questions with Yes/No answers.',
        theory_formation = 'Helper + Subject + Verb?',
        theory_usage = 'Checking facts.',
        theory_common_mistakes = 'You like pizza?',
        localized_tips = 'Helper verb goes first.',
        rules = '[{"title":"With Do/Does","formula":"Do/Does + Subject + Verb?","example":"Do you like it?"},{"title":"With To Be","formula":"Am/Is/Are + Subject + Adjective/Noun?","example":"Are you ready?"}]'::jsonb,
        examples = '[{"sentence":"Do you play tennis?","explanation":"Helper ''Do'' first."},{"sentence":"Is she your sister?","explanation":"To Be ''Is'' first."}]'::jsonb
    WHERE language_code = 'en' 
    AND lesson_id IN (
        SELECT id FROM grammar_lessons 
        WHERE topic_id = (SELECT id FROM grammar_topics WHERE slug = 'yes-no-questions')
    );

    -- Updating yes-no-questions (Vi)
    SELECT id INTO v_lesson_id 
    FROM grammar_lessons 
    WHERE topic_id = (SELECT id FROM grammar_topics WHERE slug = 'yes-no-questions')
    LIMIT 1;

    IF v_lesson_id IS NOT NULL THEN
        INSERT INTO grammar_lesson_translations (lesson_id, language_code, theory_title, theory_definition, theory_formation, theory_usage, theory_common_mistakes, localized_tips, rules, examples)
        VALUES (
            v_lesson_id,
            'vi',
            'Câu hỏi Yes/No',
            'Câu hỏi có/không.',
            'Trợ động từ + Chủ từ + Động từ?',
            'Kiểm tra thông tin.',
            'You like pizza?',
            'Trợ động từ lên đầu.',
            '[{"title":"Với Do/Does","formula":"Do/Does + S + V?","example":"Do you like it?"},{"title":"Với To Be","formula":"Am/Is/Are + S + Adj/Noun?","example":"Are you ready?"}]'::jsonb,
            '[{"sentence":"Do you play tennis?","translation":"Bạn chơi tennis không?","explanation":"Đảo Do lên đầu."},{"sentence":"Is she your sister?","translation":"Cô ấy là chị bạn à?","explanation":"Đảo Is lên đầu."}]'::jsonb
        )
        ON CONFLICT (lesson_id, language_code) DO UPDATE SET
            theory_title = EXCLUDED.theory_title,
            theory_definition = EXCLUDED.theory_definition,
            theory_formation = EXCLUDED.theory_formation,
            theory_usage = EXCLUDED.theory_usage,
            theory_common_mistakes = EXCLUDED.theory_common_mistakes,
            localized_tips = EXCLUDED.localized_tips,
            rules = EXCLUDED.rules,
            examples = EXCLUDED.examples;
    END IF;

    -- Updating wh-questions (En)
    UPDATE grammar_lesson_translations
    SET 
        theory_definition = 'Asking for information.',
        theory_formation = 'Wh-Word + Helper + Subject + Verb?',
        theory_usage = 'Details.',
        theory_common_mistakes = 'Where you go?',
        localized_tips = 'Wh-word -> Helper -> Subject.',
        rules = '[{"title":"Structure","formula":"Wh- + Helper + S + V?","example":"Where do you live?"},{"title":"Exception (Who as Subject)","formula":"Who + Verb?","example":"Who called you?"}]'::jsonb,
        examples = '[{"sentence":"What do you want?","explanation":"Wh- + Do + S + V"},{"sentence":"Where is he?","explanation":"Wh- + Is + S"}]'::jsonb
    WHERE language_code = 'en' 
    AND lesson_id IN (
        SELECT id FROM grammar_lessons 
        WHERE topic_id = (SELECT id FROM grammar_topics WHERE slug = 'wh-questions')
    );

    -- Updating wh-questions (Vi)
    SELECT id INTO v_lesson_id 
    FROM grammar_lessons 
    WHERE topic_id = (SELECT id FROM grammar_topics WHERE slug = 'wh-questions')
    LIMIT 1;

    IF v_lesson_id IS NOT NULL THEN
        INSERT INTO grammar_lesson_translations (lesson_id, language_code, theory_title, theory_definition, theory_formation, theory_usage, theory_common_mistakes, localized_tips, rules, examples)
        VALUES (
            v_lesson_id,
            'vi',
            'Câu hỏi Wh-',
            'Hỏi thông tin.',
            'Từ để hỏi + Trợ động từ + S + V?',
            'Chi tiết.',
            'Where you go?',
            'Từ để hỏi -> Trợ động từ -> Chủ ngữ.',
            '[{"title":"Cấu trúc","formula":"Wh- + Trợ động từ + S + V?","example":"Where do you live?"},{"title":"Ngoại lệ (Who là chủ từ)","formula":"Who + V?","example":"Who called you?"}]'::jsonb,
            '[{"sentence":"What do you want?","translation":"Bạn muốn gì?","explanation":"Standard form."},{"sentence":"Where is he?","translation":"Anh ấy ở đâu?","explanation":"With To Be."}]'::jsonb
        )
        ON CONFLICT (lesson_id, language_code) DO UPDATE SET
            theory_title = EXCLUDED.theory_title,
            theory_definition = EXCLUDED.theory_definition,
            theory_formation = EXCLUDED.theory_formation,
            theory_usage = EXCLUDED.theory_usage,
            theory_common_mistakes = EXCLUDED.theory_common_mistakes,
            localized_tips = EXCLUDED.localized_tips,
            rules = EXCLUDED.rules,
            examples = EXCLUDED.examples;
    END IF;

    -- Updating conjunctions-intro (En)
    UPDATE grammar_lesson_translations
    SET 
        theory_definition = 'Joining ideas.',
        theory_formation = 'And, But, So, Because.',
        theory_usage = 'Connecting sentences.',
        theory_common_mistakes = 'So vs Because.',
        localized_tips = 'So = Result. Because = Reason.',
        rules = '[{"title":"And","formula":"Add info","example":"A and B"},{"title":"But","formula":"Contrast","example":"A but B"},{"title":"So","formula":"Result","example":"Cause -> So -> Result"},{"title":"Because","formula":"Reason","example":"Result <- Because <- Cause"}]'::jsonb,
        examples = '[{"sentence":"I like tea but I hate coffee.","explanation":"Contrast."},{"sentence":"It was raining so I stayed home.","explanation":"Result."}]'::jsonb
    WHERE language_code = 'en' 
    AND lesson_id IN (
        SELECT id FROM grammar_lessons 
        WHERE topic_id = (SELECT id FROM grammar_topics WHERE slug = 'conjunctions-intro')
    );

    -- Updating conjunctions-intro (Vi)
    SELECT id INTO v_lesson_id 
    FROM grammar_lessons 
    WHERE topic_id = (SELECT id FROM grammar_topics WHERE slug = 'conjunctions-intro')
    LIMIT 1;

    IF v_lesson_id IS NOT NULL THEN
        INSERT INTO grammar_lesson_translations (lesson_id, language_code, theory_title, theory_definition, theory_formation, theory_usage, theory_common_mistakes, localized_tips, rules, examples)
        VALUES (
            v_lesson_id,
            'vi',
            'Liên từ',
            'Nối ý.',
            'And, But, So, Because.',
            'Nối câu.',
            'Nhầm So và Because.',
            'So = Kết quả. Because = Lý do.',
            '[{"title":"And","formula":"Thêm thông tin","example":"A and B"},{"title":"But","formula":"Tương phản","example":"A but B"},{"title":"So","formula":"Kết quả","example":"Nguyên nhân -> So -> Kết quả"},{"title":"Because","formula":"Lý do","example":"Kết quả <- Because <- Nguyên nhân"}]'::jsonb,
            '[{"sentence":"I like tea but I hate coffee.","translation":"Tôi thích trà nhưng ghét cà phê.","explanation":"Tương phản."},{"sentence":"It was raining so I stayed home.","translation":"Trời mưa nên tôi ở nhà.","explanation":"Kết quả."}]'::jsonb
        )
        ON CONFLICT (lesson_id, language_code) DO UPDATE SET
            theory_title = EXCLUDED.theory_title,
            theory_definition = EXCLUDED.theory_definition,
            theory_formation = EXCLUDED.theory_formation,
            theory_usage = EXCLUDED.theory_usage,
            theory_common_mistakes = EXCLUDED.theory_common_mistakes,
            localized_tips = EXCLUDED.localized_tips,
            rules = EXCLUDED.rules,
            examples = EXCLUDED.examples;
    END IF;

    -- Updating feelings-to-be-vs-to-have (En)
    UPDATE grammar_lesson_translations
    SET 
        theory_definition = 'I am hungry, not I have hunger.',
        theory_formation = 'Subject + To Be + Adjective.',
        theory_usage = 'States.',
        theory_common_mistakes = 'I have hungry.',
        localized_tips = 'Use TO BE for feelings.',
        rules = '[{"title":"Feelings","formula":"S + am/is/are + Adjective","example":"I am hungry."},{"title":"Age","formula":"S + am/is/are + Age","example":"I am 20."}]'::jsonb,
        examples = '[{"sentence":"I am hungry.","explanation":"Correct (Adj)."},{"sentence":"She is afraid.","explanation":"Correct (Adj)."},{"sentence":"I am 10 years old.","explanation":"Use ''am'', not ''have''."}]'::jsonb
    WHERE language_code = 'en' 
    AND lesson_id IN (
        SELECT id FROM grammar_lessons 
        WHERE topic_id = (SELECT id FROM grammar_topics WHERE slug = 'feelings-to-be-vs-to-have')
    );

    -- Updating feelings-to-be-vs-to-have (Vi)
    SELECT id INTO v_lesson_id 
    FROM grammar_lessons 
    WHERE topic_id = (SELECT id FROM grammar_topics WHERE slug = 'feelings-to-be-vs-to-have')
    LIMIT 1;

    IF v_lesson_id IS NOT NULL THEN
        INSERT INTO grammar_lesson_translations (lesson_id, language_code, theory_title, theory_definition, theory_formation, theory_usage, theory_common_mistakes, localized_tips, rules, examples)
        VALUES (
            v_lesson_id,
            'vi',
            'Cảm xúc: To Be vs To Have',
            'Tôi thì đói, không phải tôi có đói.',
            'Chủ ngữ + To Be + Tính từ.',
            'Trạng thái.',
            'I have hungry.',
            'Dùng TO BE cho cảm xúc.',
            '[{"title":"Cảm xúc","formula":"S + am/is/are + Tính từ","example":"I am hungry."},{"title":"Tuổi","formula":"S + am/is/are + Tuổi","example":"I am 20."}]'::jsonb,
            '[{"sentence":"I am hungry.","translation":"Tôi đói.","explanation":"Dùng tính từ."},{"sentence":"She is afraid.","translation":"Cô ấy sợ.","explanation":"Dùng tính từ."}]'::jsonb
        )
        ON CONFLICT (lesson_id, language_code) DO UPDATE SET
            theory_title = EXCLUDED.theory_title,
            theory_definition = EXCLUDED.theory_definition,
            theory_formation = EXCLUDED.theory_formation,
            theory_usage = EXCLUDED.theory_usage,
            theory_common_mistakes = EXCLUDED.theory_common_mistakes,
            localized_tips = EXCLUDED.localized_tips,
            rules = EXCLUDED.rules,
            examples = EXCLUDED.examples;
    END IF;

    -- Updating adjective-order (En)
    UPDATE grammar_lesson_translations
    SET 
        theory_definition = 'OSASCOMP rule.',
        theory_formation = 'Opinion -> Size -> Age -> Shape -> Color...',
        theory_usage = 'Multiple adjectives.',
        theory_common_mistakes = 'Red big ball.',
        localized_tips = 'Size first.',
        rules = '[{"title":"Order","formula":"Size - Age - Color","example":"Big old red car"}]'::jsonb,
        examples = '[{"sentence":"A beautiful big white house.","explanation":"Opinion -> Size -> Color"},{"sentence":"A small old wooden box.","explanation":"Size -> Age -> Material"}]'::jsonb
    WHERE language_code = 'en' 
    AND lesson_id IN (
        SELECT id FROM grammar_lessons 
        WHERE topic_id = (SELECT id FROM grammar_topics WHERE slug = 'adjective-order')
    );

    -- Updating adjective-order (Vi)
    SELECT id INTO v_lesson_id 
    FROM grammar_lessons 
    WHERE topic_id = (SELECT id FROM grammar_topics WHERE slug = 'adjective-order')
    LIMIT 1;

    IF v_lesson_id IS NOT NULL THEN
        INSERT INTO grammar_lesson_translations (lesson_id, language_code, theory_title, theory_definition, theory_formation, theory_usage, theory_common_mistakes, localized_tips, rules, examples)
        VALUES (
            v_lesson_id,
            'vi',
            'Trật tự tính từ',
            'Quy tắc OSASCOMP.',
            'Ý kiến -> Kích thước -> Tuổi -> Màu...',
            'Nhiều tính từ.',
            'Red big ball.',
            'Kích thước trước.',
            '[{"title":"Trật tự","formula":"Kích thước - Tuổi - Màu","example":"Big old red car"}]'::jsonb,
            '[{"sentence":"A beautiful big white house.","translation":"Ngôi nhà to, đẹp, trắng.","explanation":"Ý kiến -> Kích thước -> Màu"}]'::jsonb
        )
        ON CONFLICT (lesson_id, language_code) DO UPDATE SET
            theory_title = EXCLUDED.theory_title,
            theory_definition = EXCLUDED.theory_definition,
            theory_formation = EXCLUDED.theory_formation,
            theory_usage = EXCLUDED.theory_usage,
            theory_common_mistakes = EXCLUDED.theory_common_mistakes,
            localized_tips = EXCLUDED.localized_tips,
            rules = EXCLUDED.rules,
            examples = EXCLUDED.examples;
    END IF;

    -- Updating this-that-these-those (En)
    UPDATE grammar_lesson_translations
    SET 
        theory_definition = 'Demonstratives.',
        theory_formation = 'Near/Far + Singular/Plural.',
        theory_usage = 'Pointing.',
        theory_common_mistakes = 'These is.',
        localized_tips = 'This/That -> Single.',
        rules = '[{"title":"Near (Here)","formula":"This (1) / These (>1)","example":"This cat, These cats"},{"title":"Far (There)","formula":"That (1) / Those (>1)","example":"That dog, Those dogs"}]'::jsonb,
        examples = '[{"sentence":"This is my friend.","explanation":"Near, singular."},{"sentence":"Those are my shoes.","explanation":"Far, plural."}]'::jsonb
    WHERE language_code = 'en' 
    AND lesson_id IN (
        SELECT id FROM grammar_lessons 
        WHERE topic_id = (SELECT id FROM grammar_topics WHERE slug = 'this-that-these-those')
    );

    -- Updating this-that-these-those (Vi)
    SELECT id INTO v_lesson_id 
    FROM grammar_lessons 
    WHERE topic_id = (SELECT id FROM grammar_topics WHERE slug = 'this-that-these-those')
    LIMIT 1;

    IF v_lesson_id IS NOT NULL THEN
        INSERT INTO grammar_lesson_translations (lesson_id, language_code, theory_title, theory_definition, theory_formation, theory_usage, theory_common_mistakes, localized_tips, rules, examples)
        VALUES (
            v_lesson_id,
            'vi',
            'This, That, These, Those',
            'Đại từ chỉ định.',
            'Gần/Xa + Ít/Nhiều.',
            'Chỉ trỏ.',
            'These is.',
            'This/That -> Số ít.',
            '[{"title":"Gần (Đây)","formula":"This (1) / These (>1)","example":"This cat, These cats"},{"title":"Xa (Đó)","formula":"That (1) / Those (>1)","example":"That dog, Those dogs"}]'::jsonb,
            '[{"sentence":"This is my friend.","translation":"Đây là bạn tôi.","explanation":"Gần, số ít."},{"sentence":"Those are my shoes.","translation":"Kia là giày của tôi.","explanation":"Xa, số nhiều."}]'::jsonb
        )
        ON CONFLICT (lesson_id, language_code) DO UPDATE SET
            theory_title = EXCLUDED.theory_title,
            theory_definition = EXCLUDED.theory_definition,
            theory_formation = EXCLUDED.theory_formation,
            theory_usage = EXCLUDED.theory_usage,
            theory_common_mistakes = EXCLUDED.theory_common_mistakes,
            localized_tips = EXCLUDED.localized_tips,
            rules = EXCLUDED.rules,
            examples = EXCLUDED.examples;
    END IF;

    -- Updating he-she-it-the-s-rule (En)
    UPDATE grammar_lesson_translations
    SET 
        theory_definition = 'Present Simple 3rd Person.',
        theory_formation = 'Add -s to verb.',
        theory_usage = 'Present Simple.',
        theory_common_mistakes = 'He have.',
        localized_tips = 'He/She/It likes S.',
        rules = '[{"title":"General Rule","formula":"He/She/It + Verb-s","example":"He plays"},{"title":"Have / Go / Do","formula":"Has / Goes / Does","example":"She has"}]'::jsonb,
        examples = '[{"sentence":"He works here.","explanation":"Add s."},{"sentence":"She goes to school.","explanation":"Go -> Goes."}]'::jsonb
    WHERE language_code = 'en' 
    AND lesson_id IN (
        SELECT id FROM grammar_lessons 
        WHERE topic_id = (SELECT id FROM grammar_topics WHERE slug = 'he-she-it-the-s-rule')
    );

    -- Updating he-she-it-the-s-rule (Vi)
    SELECT id INTO v_lesson_id 
    FROM grammar_lessons 
    WHERE topic_id = (SELECT id FROM grammar_topics WHERE slug = 'he-she-it-the-s-rule')
    LIMIT 1;

    IF v_lesson_id IS NOT NULL THEN
        INSERT INTO grammar_lesson_translations (lesson_id, language_code, theory_title, theory_definition, theory_formation, theory_usage, theory_common_mistakes, localized_tips, rules, examples)
        VALUES (
            v_lesson_id,
            'vi',
            'Quy tắc thêm S',
            'Ngôi thứ 3 số ít.',
            'Thêm -s vào động từ.',
            'Hiện tại đơn.',
            'He have.',
            'He/She/It thích S.',
            '[{"title":"Quy tắc chung","formula":"He/She/It + V-s","example":"He plays"},{"title":"Have / Go / Do","formula":"Has / Goes / Does","example":"She has"}]'::jsonb,
            '[{"sentence":"He works here.","translation":"Anh ấy làm ở đây.","explanation":"Thêm s."},{"sentence":"She goes to school.","translation":"Cô ấy đi học.","explanation":"Go -> Goes."}]'::jsonb
        )
        ON CONFLICT (lesson_id, language_code) DO UPDATE SET
            theory_title = EXCLUDED.theory_title,
            theory_definition = EXCLUDED.theory_definition,
            theory_formation = EXCLUDED.theory_formation,
            theory_usage = EXCLUDED.theory_usage,
            theory_common_mistakes = EXCLUDED.theory_common_mistakes,
            localized_tips = EXCLUDED.localized_tips,
            rules = EXCLUDED.rules,
            examples = EXCLUDED.examples;
    END IF;

    -- Updating there-is-vs-it-is (En)
    UPDATE grammar_lesson_translations
    SET 
        theory_definition = 'Existence vs ID.',
        theory_formation = 'There is + Noun. It is + Adj.',
        theory_usage = 'Introducing vs Describing.',
        theory_common_mistakes = 'Have a dog.',
        localized_tips = 'There is for new things.',
        rules = '[{"title":"Existence","formula":"There is + Object","example":"There is a car."},{"title":"Identification","formula":"It is + Object/Adj","example":"It is fast."}]'::jsonb,
        examples = '[{"sentence":"There is a problem.","explanation":"Something exists."},{"sentence":"It is a big problem.","explanation":"Describing it."}]'::jsonb
    WHERE language_code = 'en' 
    AND lesson_id IN (
        SELECT id FROM grammar_lessons 
        WHERE topic_id = (SELECT id FROM grammar_topics WHERE slug = 'there-is-vs-it-is')
    );

    -- Updating there-is-vs-it-is (Vi)
    SELECT id INTO v_lesson_id 
    FROM grammar_lessons 
    WHERE topic_id = (SELECT id FROM grammar_topics WHERE slug = 'there-is-vs-it-is')
    LIMIT 1;

    IF v_lesson_id IS NOT NULL THEN
        INSERT INTO grammar_lesson_translations (lesson_id, language_code, theory_title, theory_definition, theory_formation, theory_usage, theory_common_mistakes, localized_tips, rules, examples)
        VALUES (
            v_lesson_id,
            'vi',
            'There is vs It is',
            'Tồn tại vs Nhận diện.',
            'There is + Noun. It is + Adj.',
            'Giới thiệu vs Mô tả.',
            'Have a dog.',
            'There is dùng để giới thiệu.',
            '[{"title":"Tồn tại","formula":"There is + Object","example":"There is a car."},{"title":"Nhận diện","formula":"It is + Object/Adj","example":"It is fast."}]'::jsonb,
            '[{"sentence":"There is a problem.","translation":"Có một vấn đề.","explanation":"Tồn tại."},{"sentence":"It is a big problem.","translation":"Đó là vấn đề lớn.","explanation":"Nhận diện."}]'::jsonb
        )
        ON CONFLICT (lesson_id, language_code) DO UPDATE SET
            theory_title = EXCLUDED.theory_title,
            theory_definition = EXCLUDED.theory_definition,
            theory_formation = EXCLUDED.theory_formation,
            theory_usage = EXCLUDED.theory_usage,
            theory_common_mistakes = EXCLUDED.theory_common_mistakes,
            localized_tips = EXCLUDED.localized_tips,
            rules = EXCLUDED.rules,
            examples = EXCLUDED.examples;
    END IF;

    -- Updating frequency-adverbs (En)
    UPDATE grammar_lesson_translations
    SET 
        theory_definition = 'How often.',
        theory_formation = 'Before V, After ToBe.',
        theory_usage = 'Routines.',
        theory_common_mistakes = 'Always I go.',
        localized_tips = 'After ToBe.',
        rules = '[{"title":"Normal Verbs","formula":"Subject + Adverb + Verb","example":"I always eat"},{"title":"To Be","formula":"Subject + Am/Is/Are + Adverb","example":"I am always happy"}]'::jsonb,
        examples = '[{"sentence":"I never smoke.","explanation":"Before smoke."},{"sentence":"She is usually late.","explanation":"After Is."}]'::jsonb
    WHERE language_code = 'en' 
    AND lesson_id IN (
        SELECT id FROM grammar_lessons 
        WHERE topic_id = (SELECT id FROM grammar_topics WHERE slug = 'frequency-adverbs')
    );

    -- Updating frequency-adverbs (Vi)
    SELECT id INTO v_lesson_id 
    FROM grammar_lessons 
    WHERE topic_id = (SELECT id FROM grammar_topics WHERE slug = 'frequency-adverbs')
    LIMIT 1;

    IF v_lesson_id IS NOT NULL THEN
        INSERT INTO grammar_lesson_translations (lesson_id, language_code, theory_title, theory_definition, theory_formation, theory_usage, theory_common_mistakes, localized_tips, rules, examples)
        VALUES (
            v_lesson_id,
            'vi',
            'Trạng từ tần suất',
            'Bao lâu một lần.',
            'Trước V, Sau ToBe.',
            'Thói quen.',
            'Always I go.',
            'Sau ToBe.',
            '[{"title":"Động từ thường","formula":"S + Trạng từ + V","example":"I always eat"},{"title":"To Be","formula":"S + ToBe + Trạng từ","example":"I am always happy"}]'::jsonb,
            '[{"sentence":"I never smoke.","translation":"Tôi không bao giờ hút thuốc.","explanation":"Trước smoke."},{"sentence":"She is usually late.","translation":"Cô ấy thường đi trễ.","explanation":"Sau Is."}]'::jsonb
        )
        ON CONFLICT (lesson_id, language_code) DO UPDATE SET
            theory_title = EXCLUDED.theory_title,
            theory_definition = EXCLUDED.theory_definition,
            theory_formation = EXCLUDED.theory_formation,
            theory_usage = EXCLUDED.theory_usage,
            theory_common_mistakes = EXCLUDED.theory_common_mistakes,
            localized_tips = EXCLUDED.localized_tips,
            rules = EXCLUDED.rules,
            examples = EXCLUDED.examples;
    END IF;

    -- Updating object-pronouns-placement (En)
    UPDATE grammar_lesson_translations
    SET 
        theory_definition = 'Verb and Object stick together.',
        theory_formation = 'Verb + Object.',
        theory_usage = 'Everywhere.',
        theory_common_mistakes = 'I like very much it.',
        localized_tips = 'No separation.',
        rules = '[{"title":"No Separation","formula":"Verb + Object (Together)","example":"I love football"}]'::jsonb,
        examples = '[{"sentence":"I like pizza very much.","explanation":"Correct."},{"sentence":"I like very much pizza.","explanation":"Incorrect order!","correct":false}]'::jsonb
    WHERE language_code = 'en' 
    AND lesson_id IN (
        SELECT id FROM grammar_lessons 
        WHERE topic_id = (SELECT id FROM grammar_topics WHERE slug = 'object-pronouns-placement')
    );

    -- Updating object-pronouns-placement (Vi)
    SELECT id INTO v_lesson_id 
    FROM grammar_lessons 
    WHERE topic_id = (SELECT id FROM grammar_topics WHERE slug = 'object-pronouns-placement')
    LIMIT 1;

    IF v_lesson_id IS NOT NULL THEN
        INSERT INTO grammar_lesson_translations (lesson_id, language_code, theory_title, theory_definition, theory_formation, theory_usage, theory_common_mistakes, localized_tips, rules, examples)
        VALUES (
            v_lesson_id,
            'vi',
            'Vị trí tân ngữ',
            'Động từ và tân ngữ dính liền.',
            'V + O.',
            'Mọi nơi.',
            'Like very much it.',
            'Không tách rời.',
            '[{"title":"Không tách rời","formula":"Động từ + Tân ngữ","example":"I love football"}]'::jsonb,
            '[{"sentence":"I like pizza very much.","translation":"Tôi rất thích pizza.","explanation":"Đúng."},{"sentence":"I like very much pizza.","translation":"Tôi thích rất nhiều pizza.","explanation":"Sai trật tự!","correct":false}]'::jsonb
        )
        ON CONFLICT (lesson_id, language_code) DO UPDATE SET
            theory_title = EXCLUDED.theory_title,
            theory_definition = EXCLUDED.theory_definition,
            theory_formation = EXCLUDED.theory_formation,
            theory_usage = EXCLUDED.theory_usage,
            theory_common_mistakes = EXCLUDED.theory_common_mistakes,
            localized_tips = EXCLUDED.localized_tips,
            rules = EXCLUDED.rules,
            examples = EXCLUDED.examples;
    END IF;

END $$;
