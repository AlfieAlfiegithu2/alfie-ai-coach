
const SUPABASE_URL = 'https://cuumxmfzhwljylbdlflj.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN1dW14bWZ6aHdsanlsYmRsZmxqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM1MTkxMjEsImV4cCI6MjA2OTA5NTEyMX0.8jqO_ciOttSxSLZnKY0i5oJmEn79ROF53TjUMYhNemI';

async function updateLesson() {
    console.log("Updating Sentence Structure content...");

    const lessonId = '5cb71d31-a580-41cd-ac09-d01e143d3476';

    const payload = {
        theory_title: "Sentence Structure: The SVO Rule",
        theory_definition: "English is a rigidly **Subject-Verb-Object (SVO)** language. This means the standard order for a basic sentence is strict: first the **Subject** (who), then the **Verb** (action), and finally the **Object** (receiver). Unlike many other languages, changing this order in English changes the meaning completely.",
        theory_formation: "**Subject (S) + Verb (V) + Object (O)**\n\n*   **S - Subject**: The person, place, or thing doing the action.\n*   **V - Verb**: The action word.\n*   **O - Object**: The person or thing receiving the action.",
        theory_usage: "Use the SVO structure for all standard statements/declarative sentences. It is the foundation of English communication. \n\n*   **Correct**: I (S) love (V) you (O).\n*   **Incorrect**: I you love. (SOV)",
        theory_common_mistakes: "1. Placing the Object before the Verb (common in Asian languages).\n2. Putting time phrases between the Verb and Object (e.g. 'I ate yesterday pizza'). Time goes at the end.\n3. Forgetting the Subject (e.g. 'Is raining' instead of 'It is raining').",
        rules: [
            "**Strict Order**: Always follow S-V-O for statements. *Exceptions include questions and passive voice.*",
            "**Adverbs of Frequency**: Adverbs like *always, often, never* go **before** the main verb (S-Adv-V-O).",
            "**Place & Time Rule**: Put 'Place' and then 'Time' at the very end of the sentence (S-V-O + Place + Time).",
            "**Transitivity**: Only Transitive verbs (like *buy, eat*) need an Object. Intransitive verbs (like *sleep, arrive*) stop after the Verb."
        ],
        examples: [
            { "sentence": "The dog chased the cat.", "explanation": "Classic SVO: Dog (Subject), chased (Verb), cat (Object)." },
            { "sentence": "I usually drink coffee in the morning.", "explanation": "SVO with Adverb 'usually' before verb, and Time 'in the morning' at the end." },
            { "sentence": "She plays the piano beautifully.", "explanation": "SVO with Adverb of Manner 'beautifully' at the end." },
            { "sentence": "They bought a new house last year.", "explanation": "Subject + Verb + Object + Time." },
            { "sentence": "My friend passed the exam.", "explanation": "Clear Subject, Verb, and Object structure." }
        ],
        localized_tips: "Remember: 'Place before Time'. If you have both, say where it happened, then when it happened."
    };

    // Update 'en' translation
    const res = await fetch(`${SUPABASE_URL}/rest/v1/grammar_lesson_translations?lesson_id=eq.${lessonId}&language_code=eq.en`, {
        method: "PATCH",
        headers: {
            "apikey": SUPABASE_KEY,
            "Authorization": `Bearer ${SUPABASE_KEY}`,
            "Content-Type": "application/json",
            "Prefer": "return=representation"
        },
        body: JSON.stringify(payload)
    });

    if (res.ok) {
        console.log("✅ Successfully updated Sentence Structure (SVO) content!");
        const data = await res.json();
        // console.log(data);
    } else {
        console.error("❌ Failed to update:", res.status, await res.text());
    }
}

updateLesson();
