
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://cuumxmfzhwljylbdlflj.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN1dW14bWZ6aHdsanlsYmRsZmxqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM1MTkxMjEsImV4cCI6MjA2OTA5NTEyMX0.8jqO_ciOttSxSLZnKY0i5oJmEn79ROF53TjUMYhNemI';

const supabase = createClient(supabaseUrl, supabaseKey);

async function debugFunction() {
    console.log('Testing Edge Function directly for detailed error...');

    // Lesson ID for present simple
    const lessonId = '22222222-2222-2222-2222-222222222201';

    const { data, error } = await supabase.functions.invoke('enhance-grammar-lesson', {
        body: {
            lesson_id: lessonId,
            language_code: 'pt',
            language_name: 'Portuguese'
        }
    });

    if (error) {
        console.error('❌ Function call error:', error);
        if (error.context) {
            // Log the raw response if available in the context (sometimes attached by custom clients, but supabase-js hides it)
            console.error('Context:', error.context);
        }
        // Try to reproduce with fetch to see status code
        try {
            console.log('Trying raw fetch...');
            const res = await fetch(`${supabaseUrl}/functions/v1/enhance-grammar-lesson`, {
                method: 'POST',
                headers: {
                    'Authorization': `Bearer ${supabaseKey}`,
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({
                    lesson_id: lessonId,
                    language_code: 'pt',
                    language_name: 'Portuguese'
                })
            });
            console.log('Status:', res.status, res.statusText);
            const text = await res.text();
            console.log('Body:', text);
        } catch (e) {
            console.error('Fetch error:', e);
        }
    } else {
        console.log('✅ Success:', data);
    }
}

debugFunction();
