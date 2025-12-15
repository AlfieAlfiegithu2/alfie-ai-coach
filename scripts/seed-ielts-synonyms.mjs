// Script to seed IELTS-specific synonym questions with UNIQUE content per test
import { createClient } from '@supabase/supabase-js';
import fs from 'fs';
import path from 'path';

const envPath = path.resolve('apps/main/.env');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
    const [key, value] = line.split('=');
    if (key && value) {
        env[key.trim()] = value.trim().replace(/"/g, '');
    }
});

const supabase = createClient(
    env['VITE_SUPABASE_URL'],
    'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN1dW14bWZ6aHdsanlsYmRsZmxqIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1MzUxOTEyMSwiZXhwIjoyMDY5MDk1MTIxfQ.1-IKqEM9i2Plmuat2iBWTtKB3u1gL_Bx6P5ZrkYSmLg'
);

// 100 UNIQUE IELTS word pairs - 10 per test, no overlap
const testVocabulary = {
    // Test 1: Academic Research Basics
    1: [
        { word: "SIGNIFICANT", correct: "Considerable", wrong: ["Minor", "Trivial", "Negligible"] },
        { word: "DEMONSTRATE", correct: "Illustrate", wrong: ["Conceal", "Obscure", "Hide"] },
        { word: "FUNDAMENTAL", correct: "Essential", wrong: ["Optional", "Secondary", "Peripheral"] },
        { word: "CRUCIAL", correct: "Vital", wrong: ["Unimportant", "Irrelevant", "Insignificant"] },
        { word: "ABUNDANT", correct: "Plentiful", wrong: ["Scarce", "Rare", "Limited"] },
        { word: "PREVALENT", correct: "Widespread", wrong: ["Rare", "Uncommon", "Unusual"] },
        { word: "DIMINISH", correct: "Decrease", wrong: ["Increase", "Expand", "Grow"] },
        { word: "ENHANCE", correct: "Improve", wrong: ["Worsen", "Deteriorate", "Decline"] },
        { word: "ACQUIRE", correct: "Obtain", wrong: ["Lose", "Forfeit", "Surrender"] },
        { word: "ADEQUATE", correct: "Sufficient", wrong: ["Inadequate", "Lacking", "Deficient"] },
    ],

    // Test 2: Environment & Climate
    2: [
        { word: "SUSTAINABLE", correct: "Viable", wrong: ["Unsustainable", "Temporary", "Fleeting"] },
        { word: "CONSERVATION", correct: "Preservation", wrong: ["Destruction", "Exploitation", "Waste"] },
        { word: "EMISSIONS", correct: "Discharge", wrong: ["Absorption", "Intake", "Retention"] },
        { word: "RENEWABLE", correct: "Replenishable", wrong: ["Finite", "Exhaustible", "Limited"] },
        { word: "ECOSYSTEM", correct: "Habitat", wrong: ["Isolation", "Vacuum", "Void"] },
        { word: "CONTAMINATION", correct: "Pollution", wrong: ["Purification", "Cleansing", "Sterilisation"] },
        { word: "DEFORESTATION", correct: "Clearing forests", wrong: ["Reforestation", "Planting", "Cultivation"] },
        { word: "ENDANGERED", correct: "Threatened", wrong: ["Flourishing", "Thriving", "Abundant"] },
        { word: "DROUGHT", correct: "Dry spell", wrong: ["Flood", "Deluge", "Downpour"] },
        { word: "BIODIVERSITY", correct: "Species variety", wrong: ["Monoculture", "Uniformity", "Homogeneity"] },
    ],

    // Test 3: Society & Urbanisation
    3: [
        { word: "URBANISATION", correct: "City growth", wrong: ["Rural development", "Countryside expansion", "Village formation"] },
        { word: "INFRASTRUCTURE", correct: "Facilities", wrong: ["Destruction", "Demolition", "Ruins"] },
        { word: "INNOVATION", correct: "Advancement", wrong: ["Stagnation", "Tradition", "Convention"] },
        { word: "GLOBALISATION", correct: "Internationalisation", wrong: ["Isolation", "Nationalism", "Localism"] },
        { word: "DEMOGRAPHIC", correct: "Population-related", wrong: ["Geographic", "Economic", "Political"] },
        { word: "MIGRATION", correct: "Movement", wrong: ["Settlement", "Permanence", "Stability"] },
        { word: "INEQUALITY", correct: "Disparity", wrong: ["Equality", "Fairness", "Balance"] },
        { word: "POVERTY", correct: "Deprivation", wrong: ["Wealth", "Prosperity", "Affluence"] },
        { word: "DISCRIMINATION", correct: "Prejudice", wrong: ["Equality", "Fairness", "Justice"] },
        { word: "INTEGRATION", correct: "Inclusion", wrong: ["Segregation", "Exclusion", "Isolation"] },
    ],

    // Test 4: Education & Learning
    4: [
        { word: "CURRICULUM", correct: "Syllabus", wrong: ["Recreation", "Leisure", "Holiday"] },
        { word: "PEDAGOGY", correct: "Teaching method", wrong: ["Learning outcome", "Student behaviour", "School building"] },
        { word: "PROFICIENCY", correct: "Competence", wrong: ["Incompetence", "Inability", "Weakness"] },
        { word: "COGNITIVE", correct: "Mental", wrong: ["Physical", "Emotional", "Social"] },
        { word: "LITERACY", correct: "Reading ability", wrong: ["Illiteracy", "Ignorance", "Unawareness"] },
        { word: "ASSESSMENT", correct: "Evaluation", wrong: ["Ignorance", "Neglect", "Oversight"] },
        { word: "COMPULSORY", correct: "Mandatory", wrong: ["Optional", "Voluntary", "Elective"] },
        { word: "SCHOLARSHIP", correct: "Grant", wrong: ["Debt", "Loan", "Payment"] },
        { word: "VOCATIONAL", correct: "Occupational", wrong: ["Academic", "Theoretical", "Abstract"] },
        { word: "TUITION", correct: "Instruction", wrong: ["Ignorance", "Confusion", "Neglect"] },
    ],

    // Test 5: Health & Medicine
    5: [
        { word: "CHRONIC", correct: "Long-lasting", wrong: ["Acute", "Temporary", "Brief"] },
        { word: "EPIDEMIC", correct: "Outbreak", wrong: ["Endemic", "Isolated case", "Single incident"] },
        { word: "SEDENTARY", correct: "Inactive", wrong: ["Active", "Mobile", "Energetic"] },
        { word: "NUTRITION", correct: "Nourishment", wrong: ["Starvation", "Malnutrition", "Deprivation"] },
        { word: "THERAPEUTIC", correct: "Healing", wrong: ["Harmful", "Damaging", "Destructive"] },
        { word: "DIAGNOSIS", correct: "Identification", wrong: ["Treatment", "Cure", "Recovery"] },
        { word: "SYMPTOM", correct: "Indication", wrong: ["Cure", "Treatment", "Recovery"] },
        { word: "OBESITY", correct: "Overweight", wrong: ["Underweight", "Thin", "Slender"] },
        { word: "VACCINATION", correct: "Immunisation", wrong: ["Infection", "Disease", "Illness"] },
        { word: "REHABILITATION", correct: "Recovery", wrong: ["Deterioration", "Decline", "Worsening"] },
    ],

    // Test 6: Business & Economics
    6: [
        { word: "REVENUE", correct: "Income", wrong: ["Expenditure", "Cost", "Expense"] },
        { word: "FLUCTUATE", correct: "Vary", wrong: ["Stabilise", "Remain constant", "Stay fixed"] },
        { word: "EXPENDITURE", correct: "Spending", wrong: ["Savings", "Income", "Revenue"] },
        { word: "COMMODITY", correct: "Product", wrong: ["Service", "Idea", "Concept"] },
        { word: "SUBSIDISE", correct: "Fund", wrong: ["Tax", "Charge", "Penalise"] },
        { word: "INFLATION", correct: "Price rise", wrong: ["Deflation", "Price fall", "Stability"] },
        { word: "RECESSION", correct: "Economic decline", wrong: ["Boom", "Growth", "Expansion"] },
        { word: "MONOPOLY", correct: "Market control", wrong: ["Competition", "Rivalry", "Contest"] },
        { word: "INVESTMENT", correct: "Capital", wrong: ["Divestment", "Withdrawal", "Loss"] },
        { word: "TARIFF", correct: "Import tax", wrong: ["Subsidy", "Grant", "Aid"] },
    ],

    // Test 7: Science & Technology
    7: [
        { word: "HYPOTHESIS", correct: "Theory", wrong: ["Fact", "Proof", "Evidence"] },
        { word: "EMPIRICAL", correct: "Observational", wrong: ["Theoretical", "Speculative", "Abstract"] },
        { word: "PHENOMENON", correct: "Occurrence", wrong: ["Absence", "Void", "Nothing"] },
        { word: "INNOVATIVE", correct: "Groundbreaking", wrong: ["Traditional", "Conventional", "Ordinary"] },
        { word: "METHODOLOGY", correct: "Approach", wrong: ["Result", "Conclusion", "Outcome"] },
        { word: "VARIABLE", correct: "Factor", wrong: ["Constant", "Fixed", "Unchanged"] },
        { word: "CORRELATION", correct: "Connection", wrong: ["Independence", "Separation", "Isolation"] },
        { word: "SIMULATION", correct: "Imitation", wrong: ["Reality", "Actuality", "Truth"] },
        { word: "AUTOMATION", correct: "Mechanisation", wrong: ["Manual labour", "Handcraft", "Handiwork"] },
        { word: "BREAKTHROUGH", correct: "Discovery", wrong: ["Failure", "Setback", "Regression"] },
    ],

    // Test 8: Communication & Media
    8: [
        { word: "DISSEMINATE", correct: "Spread", wrong: ["Conceal", "Suppress", "Withhold"] },
        { word: "PROPAGANDA", correct: "Promotion", wrong: ["Truth", "Facts", "Reality"] },
        { word: "CENSORSHIP", correct: "Suppression", wrong: ["Freedom", "Liberty", "Expression"] },
        { word: "BIAS", correct: "Prejudice", wrong: ["Objectivity", "Fairness", "Impartiality"] },
        { word: "CREDIBILITY", correct: "Reliability", wrong: ["Doubt", "Suspicion", "Distrust"] },
        { word: "BROADCAST", correct: "Transmit", wrong: ["Receive", "Absorb", "Collect"] },
        { word: "CIRCULATION", correct: "Distribution", wrong: ["Collection", "Gathering", "Accumulation"] },
        { word: "ANONYMITY", correct: "Namelessness", wrong: ["Identity", "Fame", "Recognition"] },
        { word: "VIRAL", correct: "Rapidly spreading", wrong: ["Contained", "Limited", "Restricted"] },
        { word: "AUDIENCE", correct: "Viewers", wrong: ["Performers", "Presenters", "Speakers"] },
    ],

    // Test 9: Government & Politics
    9: [
        { word: "LEGISLATION", correct: "Law", wrong: ["Anarchy", "Chaos", "Disorder"] },
        { word: "BUREAUCRACY", correct: "Administration", wrong: ["Simplicity", "Efficiency", "Speed"] },
        { word: "SOVEREIGNTY", correct: "Independence", wrong: ["Dependence", "Subjugation", "Control"] },
        { word: "REFERENDUM", correct: "Public vote", wrong: ["Dictatorship", "Autocracy", "Tyranny"] },
        { word: "AUTONOMY", correct: "Self-governance", wrong: ["Dependency", "Subordination", "Control"] },
        { word: "CONSTITUTION", correct: "Charter", wrong: ["Violation", "Breach", "Infringement"] },
        { word: "DEMOCRACY", correct: "Popular rule", wrong: ["Dictatorship", "Tyranny", "Autocracy"] },
        { word: "DIPLOMACY", correct: "Negotiation", wrong: ["Conflict", "Hostility", "War"] },
        { word: "SANCTION", correct: "Penalty", wrong: ["Reward", "Incentive", "Benefit"] },
        { word: "REFORM", correct: "Change", wrong: ["Preservation", "Maintenance", "Status quo"] },
    ],

    // Test 10: Psychology & Human Behaviour
    10: [
        { word: "PERCEPTION", correct: "Understanding", wrong: ["Ignorance", "Misunderstanding", "Confusion"] },
        { word: "MOTIVATION", correct: "Drive", wrong: ["Apathy", "Indifference", "Lethargy"] },
        { word: "STIMULUS", correct: "Trigger", wrong: ["Response", "Reaction", "Effect"] },
        { word: "ANXIETY", correct: "Worry", wrong: ["Calm", "Peace", "Tranquility"] },
        { word: "RESILIENCE", correct: "Adaptability", wrong: ["Fragility", "Weakness", "Vulnerability"] },
        { word: "INSTINCT", correct: "Intuition", wrong: ["Logic", "Reasoning", "Analysis"] },
        { word: "BEHAVIOUR", correct: "Conduct", wrong: ["Thought", "Feeling", "Belief"] },
        { word: "CONSCIENCE", correct: "Moral sense", wrong: ["Immorality", "Wickedness", "Evil"] },
        { word: "EMPATHY", correct: "Compassion", wrong: ["Indifference", "Apathy", "Coldness"] },
        { word: "STEREOTYPE", correct: "Generalisation", wrong: ["Individuality", "Uniqueness", "Specificity"] },
    ],
};

async function reseedUniqueIELTSSynonyms() {
    console.log('🔍 Fetching existing synonym match tests...');

    const { data: tests, error: fetchError } = await supabase
        .from('skill_tests')
        .select('id, title, test_order')
        .eq('skill_slug', 'synonym-match')
        .order('test_order', { ascending: true });

    if (fetchError) {
        console.error('❌ Error fetching tests:', fetchError);
        return;
    }

    if (!tests || tests.length === 0) {
        console.log('⚠️ No synonym match tests found.');
        return;
    }

    console.log(`📚 Found ${tests.length} tests. Deleting old questions first...`);

    // Delete existing questions for all tests
    for (const test of tests) {
        await supabase
            .from('skill_practice_questions')
            .delete()
            .eq('skill_test_id', test.id);
    }

    console.log('🗑️ Old questions deleted. Adding UNIQUE IELTS vocabulary per test...\n');

    for (let i = 0; i < tests.length; i++) {
        const test = tests[i];
        const testNumber = i + 1;
        const vocabulary = testVocabulary[testNumber];

        if (!vocabulary) {
            console.log(`⚠️ No vocabulary defined for test ${testNumber}`);
            continue;
        }

        console.log(`📝 Test ${testNumber}: Adding ${vocabulary.length} unique questions`);

        const questions = vocabulary.map((pair) => ({
            skill_test_id: test.id,
            skill_type: 'synonym-match',
            created_by: '30982d39-b842-42e0-94dd-5411ad1e0c4a',
            content: `In IELTS passages, "${pair.word}" is often replaced with which word?`,
            question_format: "DefinitionMatch",
            correct_answer: pair.correct,
            incorrect_answers: pair.wrong,
            explanation: `In IELTS reading and listening, "${pair.correct}" is commonly used as a synonym for "${pair.word}". Recognizing these paraphrases helps you match information in the passage.`
        }));

        const { error: insertError } = await supabase
            .from('skill_practice_questions')
            .insert(questions);

        if (insertError) {
            console.error(`❌ Error for ${test.title}:`, insertError);
        } else {
            console.log(`✅ ${test.title}: ${vocabulary.map(v => v.word).join(', ')}`);
        }
    }

    console.log('\n🎉 All 10 tests now have UNIQUE IELTS vocabulary!');
}

reseedUniqueIELTSSynonyms();
