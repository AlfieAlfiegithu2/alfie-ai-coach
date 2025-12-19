import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://cuumxmfzhwljylbdlflj.supabase.co';
// Using the key found in fix-remaining-duplicates.mjs which appears to have sufficient privileges
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN1dW14bWZ6aHdsanlsYmRsZmxqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM1MTkxMjEsImV4cCI6MjA2OTA5NTEyMX0.8jqO_ciOttSxSLZnKY0i5oJmEn79ROF53TjUMYhNemI';

const supabase = createClient(supabaseUrl, supabaseKey);

const FOUNDATION_TOPICS = [
    {
        slug: 'sentence-structure-svo',
        level: 'beginner',
        topic_order: 1,
        icon: 'target',
        color: 'emerald',
        title: 'Sentence Structure: SVO',
        description: 'The golden rule of English sentences: Subject + Verb + Object. Learn how to build basic sentences correctly.',
        definition: `
## The Golden Rule: SVO

In English, the order of words is very important. You cannot change the order easily like in some other languages.

The basic "Skeleton" of an English sentence is:

**Subject + Verb + Object**

*   **Subject**: Who is doing the action? (I, You, John, The cat)
*   **Verb**: What is the action? (eat, love, is, run)
*   **Object**: Who receives the action? (an apple, you, the ball)

### Examples
*   ✅ **I love you.** (S + V + O)
*   ❌ **I you love.** (Incorrect)
*   ✅ **John eats apples.**
*   ❌ **Apples eats John.** (Meaning changes or makes no sense)
`
    },
    {
        slug: 'adjectives-linking-verbs',
        level: 'beginner',
        topic_order: 2,
        icon: 'star',
        color: 'emerald',
        title: 'Adjectives with Linking Verbs',
        description: 'Learn how to use "is", "feel", "look" with adjectives to describe things.',
        definition: `
## Describing Things (Linking Verbs)

Usually, a verb is an *action* (run, eat). But some verbs are **Linking Verbs**. They connect the Subject to a description (Adjective).

**Subject + Linking Verb + Adjective**

Common Linking Verbs:
*   **Be (am, is, are)**
*   **Feel**
*   **Look**
*   **Smell**
*   **Taste**
*   **Sound**

### Examples
*   ✅ **She is happy.** (Not "She is happiness")
*   ✅ **You look tired.**
*   ✅ **It smells good.** (Not "It smells well")
`
    },
    {
        slug: 'word-order-time-place',
        level: 'beginner',
        topic_order: 3,
        icon: 'book',
        color: 'emerald',
        title: 'Word Order: Place & Time',
        description: 'When do you say "at 6 PM"? Learn the correct order for Place and Time in a sentence.',
        definition: `
## Place Before Time

In English, if you have both a **Place** (where) and a **Time** (when) in a sentence, the Place usually comes first.

**Subject + Verb + Place + Time**

Rule: **P.T.** (Place, then Time).

### Examples
*   ✅ **I go *to the park* *at 6 PM*.**
*   ❌ **I go *at 6 PM* *to the park*.** (Sounds unnatural)
*   ✅ **We arrived *here* *yesterday*.**
`
    },
    {
        slug: 'adjective-placement',
        level: 'beginner',
        topic_order: 4,
        icon: 'target',
        color: 'emerald',
        title: 'Adjective Placement',
        description: 'Where do adjectives go? Before or after the noun? Learn the rule.',
        definition: `
## Before the Noun

In many languages (like Spanish or French), the adjective comes *after* the noun (Car red).
In **English**, the adjective comes **BEFORE** the noun.

**Adjective + Noun**

### Examples
*   ✅ **A *red* car.**
*   ❌ **A car *red*.**
*   ✅ **A *happy* man.**
*   ✅ **An *expensive* house.**

Note: If you use "is/are", the adjective comes after the verb (The car is red), but if it is attached to the noun directly, it must be before.
`
    },
    {
        slug: 'plural-nouns',
        level: 'beginner',
        topic_order: 5,
        icon: 'book',
        color: 'emerald',
        title: 'Plural Nouns (Regular & Irregular)',
        description: 'One cat, two cats. Build plurals correctly, including the tricky irregular ones.',
        definition: `
## Making Things Plural

### Regular Plurals (+s / +es)
Most words just add **-s**.
*   Dog -> Dogs
*   Car -> Cars

Words ending in -s, -sh, -ch, -x add **-es**.
*   Bus -> Buses
*   Watch -> Watches

### Irregular Plurals (Memorize these!)
Some words change completely. DO NOT add 's'.
*   **Child -> Children** (Not "childs")
*   **Person -> People** (Not "persons")
*   **Man -> Men**
*   **Woman -> Women**
*   **Foot -> Feet**
*   **Tooth -> Teeth**
*   **Mouse -> Mice**
`
    },
    {
        slug: 'possessives-s-vs-of',
        level: 'beginner',
        topic_order: 6,
        icon: 'zap',
        color: 'emerald',
        title: 'Possession: \'s vs OF',
        description: 'When to say "John\'s car" and when to say "The door of the house".',
        definition: `
## 's vs OF

How do we show possession (who owns what)?

### 1. Use 's for People and Animals
*   ✅ **John's car.**
*   ❌ **The car of John.** (Grammatically okay but sounds very unnatural)
*   ✅ **My mother's house.**
*   ✅ **The cat's toy.**

### 2. Use OF for Things / Inanimate Objects
*   ✅ **The door of the house.**
*   ❌ **The house's door.** (Usually avoiding 's for objects)
*   ✅ **The end of the movie.**
*   ✅ **The capital of France.**
`
    },
    {
        slug: 'basic-questions-yes-no',
        level: 'beginner',
        topic_order: 7,
        icon: 'trophy',
        color: 'emerald',
        title: 'Yes/No Questions',
        description: 'How to ask simple questions using Do, Does, Is, and Are.',
        definition: `
## The Helper Verb Strategy

To ask a Yes/No question in English, you cannot just raise your voice. You usually need a **Helper Verb** at the start.

### 1. With "To Be" (Am, Is, Are) -> Invert
Swap the Subject and Verb.
*   Statement: **You are** happy.
*   Question: **Are you** happy?

### 2. With Action Verbs -> Use DO / DOES
You need "Do" (I/You/We/They) or "Does" (He/She/It).
*   Statement: **You like** pizza.
*   Question: **Do you like** pizza?
*   Statement: **She lives** here.
*   Question: **Does she live** here? (Note: "lives" becomes "live" because "Does" takes the 's')
`
    },
    {
        slug: 'basic-questions-wh',
        level: 'beginner',
        topic_order: 8,
        icon: 'target',
        color: 'emerald',
        title: 'Wh- Questions',
        description: 'Who, What, Where, When, Why, How. Learn the correct word order.',
        definition: `
## Asking for Information (Wh-)

To ask for information, put the **Wh- word** at the very beginning. Then follow the Yes/No rule.

**Wh-Word + Helper + Subject + Verb?**

### Structure
1.  **Wh** (Where)
2.  **Helper** (do)
3.  **Subject** (you)
4.  **Verb** (live)
-> **Where do you live?**

### Examples
*   **What** is your name?
*   **When** does the train leave?
*   **Why** are you crying?
*   **How** do you cook this?
`
    },
    {
        slug: 'conjunctions-basics',
        level: 'beginner',
        topic_order: 9,
        icon: 'star',
        color: 'emerald',
        title: 'Conjunctions: And, But, So, Because',
        description: 'Connect your simple sentences together to make longer thoughts.',
        definition: `
## Glue Words

Use these words to connect two ideas.

### And (Addition)
*   I like coffee **and** I like tea.

### But (Contrast / Surprise)
*   I like coffee, **but** I don't like tea.
*   He is small, **but** he is strong.

### So (Result)
*   It was raining, **so** took an umbrella.

### Because (Reason)
*   I took an umbrella **because** it was raining.
`
    },
    {
        slug: 'to-be-vs-to-have',
        level: 'beginner',
        topic_order: 10,
        icon: 'book',
        color: 'emerald',
        title: 'Feelings: To Be vs To Have',
        description: 'Stop saying "I have hunger". Learn which feelings use "To Be" in English.',
        definition: `
## The "Have" Trap

In many languages (Spanish, French, Portuguese, Italian), you say "I have hunger" or "I have cold".
In **English**, these are states of being. You use **TO BE**.

**Subject + Am/Is/Are + Adjective**

### Common Mistakes
*   ❌ I have hunger. -> ✅ **I am hungry.**
*   ❌ I have thirst. -> ✅ **I am thirsty.**
*   ❌ I have cold. -> ✅ **I am cold.**
*   ❌ I have hot. -> ✅ **I am hot.**
*   ❌ I have fear. -> ✅ **I am afraid.**
*   ❌ I have 20 years. -> ✅ **I am 20 years old.** (Very important!)
`
    },
    {
        slug: 'adjective-order',
        level: 'beginner',
        topic_order: 11,
        icon: 'zap',
        color: 'emerald',
        title: 'Adjective Order',
        description: 'Big red car or Red big car? Learn the secret rule native speakers use.',
        definition: `
## The Order of Description

When you have more than one adjective, they must go in a specific order. Native speakers do this naturally, but you must learn it.

**Opinion -> Size -> Age -> Shape -> Color -> Origin -> Material -> Purpose**

A simple version to remember: **Size - Age - Color**

### Examples
*   ✅ A **big red** bus. (Size, then Color)
*   ❌ A **red big** bus.
*   ✅ A **beautiful old Italian** house. (Opinion, Age, Origin)
*   ✅ A **small round** table.
`
    },
    {
        slug: 'demonstratives',
        level: 'beginner',
        topic_order: 12,
        icon: 'target',
        color: 'emerald',
        title: 'This, That, These, Those',
        description: 'Pointing at the world. Learn the difference between singular/plural and near/far.',
        definition: `
## Pointing Words

We choose the word based on **Distance** (Near/Far) and **Number** (One/Many).

| | Near (Here) | Far (There) |
|---|---|---|
| **Singular (1)** | **This** | **That** |
| **Plural (2+)** | **These** | **Those** |

### Examples
*   **This** is my phone. (Holding it)
*   **That** is my car. (Pointing across the street)
*   **These** are my keys. (Holding them)
*   **Those** are the birds. (Flying in the sky)
`
    },
    {
        slug: 'subject-verb-agreement',
        level: 'beginner',
        topic_order: 13,
        icon: 'trophy',
        color: 'emerald',
        title: 'He/She/It (The S Rule)',
        description: 'The most common mistake: forgetting the S. He runs, She eats.',
        definition: `
## Generally, Add 'S'

In the Present Simple tense, for **He, She, It** (and singular names like John, The Cat), you MUST add an **-s** to the verb.

*   I play -> **He plays**
*   You eat -> **She eats**
*   We work -> **It works**

### Exceptions
*   **Have -> Has** (Not "haves")
*   **Go -> Goes**
*   **Do -> Does**
`
    },
    {
        slug: 'there-is-vs-it-is',
        level: 'beginner',
        topic_order: 14,
        icon: 'star',
        color: 'emerald',
        title: 'There is vs It is',
        description: 'Do not confuse existence ("There is a dog") with definition ("It is a dog").',
        definition: `
## Existence vs Identification

### There is / There are
Use this to say something **exists** or is located somewhere. "Presentar" algo.
*   ✅ **There is** a spider in the bathroom.
*   ✅ **There are** many people here.

### It is
Use this to **identify** or **describe** a specific thing you already mentioned or see.
*   What is that noise? **It is** the wind.
*   I like this car. **It is** fast.

### Comparison
*   **There is** a problem. (A problem exists)
*   **It is** a problem. (Identifying a specific situation as a problem)
`
    },
    {
        slug: 'frequency-adverbs',
        level: 'beginner',
        topic_order: 15,
        icon: 'book',
        color: 'emerald',
        title: 'Frequency Adverbs (Always, Never)',
        description: 'Where do you put "always"? Before or after the verb? It depends!',
        definition: `
## Before the Action, After the Be

Words like **Always, Usually, Often, Sometimes, Never** tell us "How Often".

### Rule 1: Before Action Verbs
Put it **BEFORE** the main verb.
*   ✅ I **always** drink coffee.
*   ❌ I drink **always** coffee.
*   ✅ She **never** listens.

### Rule 2: After "To Be"
Put it **AFTER** am/is/are.
*   ✅ I am **always** happy.
*   ❌ I **always** am happy.
*   ✅ He is **never** late.
`
    },
    {
        slug: 'object-pronouns-placement',
        level: 'beginner',
        topic_order: 16,
        icon: 'zap',
        color: 'emerald',
        title: 'Object Placement',
        description: 'Stop separating the verb and the object. "I like it very much", not "I like very much it".',
        definition: `
## Glue the Object

In English, the **Verb** and the **Object** contain a very strong magnetic connection. You generally CANNOT separate them.

**Verb + Object**

Adverbs (like 'very much', 'a lot', 'well') usually go at the **END** of the sentence.

### Examples
*   ✅ I [like] [pizza] **very much**.
*   ❌ I [like] **very much** [pizza].
*   ✅ He [speaks] [English] **well**.
*   ❌ He [speaks] **well** [English].
*   ✅ I [love] [it].
`
    }
];


import fs from 'fs';
import path from 'path';

// ... (keep constant data)

async function main() {
    console.log('🚀 Generating SQL for Foundation Topics...');

    let sql = `
-- Seeding Foundation Grammar Topics
-- Generated by seed-foundations.js

DO $$
DECLARE
    v_topic_id uuid;
    v_lesson_id uuid;
BEGIN
`;

    for (const topic of FOUNDATION_TOPICS) {
        console.log(`Processing: ${topic.title}`);

        const escape = (str) => str.replace(/'/g, "''");

        sql += `
    -- Topic: ${topic.title}
    INSERT INTO grammar_topics (slug, level, topic_order, icon, color, is_published)
    VALUES ('${topic.slug}', '${topic.level}', ${-100 + topic.topic_order}, '${topic.icon}', '${topic.color}', true)
    ON CONFLICT (slug) DO UPDATE SET 
        level = EXCLUDED.level,
        topic_order = EXCLUDED.topic_order
    RETURNING id INTO v_topic_id;

    -- If updated and not returned (because no change?), force get ID.
    IF v_topic_id IS NULL THEN
        SELECT id INTO v_topic_id FROM grammar_topics WHERE slug = '${topic.slug}';
    END IF;


    INSERT INTO grammar_topic_translations (topic_id, language_code, title, description)
    VALUES (v_topic_id, 'en', '${escape(topic.title)}', '${escape(topic.description)}')
    ON CONFLICT (topic_id, language_code) DO UPDATE SET 
        title = EXCLUDED.title,
        description = EXCLUDED.description;

    -- Check for existing lesson manually because there is no unique constraint on (topic_id, lesson_order)
    v_lesson_id := NULL;
    SELECT id INTO v_lesson_id FROM grammar_lessons WHERE topic_id = v_topic_id AND lesson_order = 1 LIMIT 1;

    IF v_lesson_id IS NULL THEN
        INSERT INTO grammar_lessons (topic_id, lesson_order)
        VALUES (v_topic_id, 1)
        RETURNING id INTO v_lesson_id;
    END IF;

    INSERT INTO grammar_lesson_translations (lesson_id, language_code, theory_title, theory_definition, theory_formation, theory_usage, theory_common_mistakes, localized_tips, rules, examples)

    VALUES (
        v_lesson_id, 
        'en', 
        '${escape(topic.title)}', 
        '${escape(topic.definition)}', 
        'Coming soon...', 
        'Coming soon...', 
        'Coming soon...', 
        'Start with the basics!', 
        '[]'::jsonb, 
        '[]'::jsonb
    )
    ON CONFLICT (lesson_id, language_code) DO UPDATE SET 
        theory_definition = EXCLUDED.theory_definition;
`;
    }

    sql += `
END $$;
`;

    const outputPath = path.join(process.cwd(), 'apps/main/supabase/migrations/20251216_seed_foundations.sql');
    fs.writeFileSync(outputPath, sql);

    console.log(`✅ SQL file generated at: ${outputPath}`);
}

main().catch(console.error);
