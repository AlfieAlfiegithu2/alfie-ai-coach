#!/usr/bin/env node
/**
 * Script to generate model answers for all IELTS Writing tasks
 * Uses Gemini 3.0 Pro via the generate-writing-model-answer Edge Function
 */

const SUPABASE_URL = 'https://cuumxmfzhwljylbdlflj.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN1dW14bWZ6aHdsanlsYmRsZmxqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM1MTkxMjEsImV4cCI6MjA2OTA5NTEyMX0.8jqO_ciOttSxSLZnKY0i5oJmEn79ROF53TjUMYhNemI';

async function fetchWritingTasks() {
    const response = await fetch(
        `${SUPABASE_URL}/rest/v1/questions?question_type=in.("Task 1","Task 2")&select=id,test_id,question_type,part_number,passage_text,image_url,transcription`,
        {
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${SUPABASE_KEY}`,
                'Content-Type': 'application/json'
            }
        }
    );

    if (!response.ok) {
        throw new Error(`Failed to fetch tasks: ${response.status}`);
    }

    return response.json();
}

async function generateModelAnswer(taskNumber, instructions, imageUrl) {
    console.log(`  🤖 Calling Gemini 3.0 Pro...`);

    const response = await fetch(
        `${SUPABASE_URL}/functions/v1/generate-writing-model-answer`,
        {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${SUPABASE_KEY}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                taskNumber,
                instructions,
                imageUrl,
                trainingType: 'Academic'
            })
        }
    );

    if (!response.ok) {
        const error = await response.text();
        throw new Error(`Generation failed: ${error}`);
    }

    const data = await response.json();
    if (!data.success) {
        throw new Error(data.error || 'Unknown error');
    }

    return data.modelAnswer;
}

async function updateTaskWithModelAnswer(taskId, modelAnswer) {
    const response = await fetch(
        `${SUPABASE_URL}/rest/v1/questions?id=eq.${taskId}`,
        {
            method: 'PATCH',
            headers: {
                'apikey': SUPABASE_KEY,
                'Authorization': `Bearer ${SUPABASE_KEY}`,
                'Content-Type': 'application/json',
                'Prefer': 'return=minimal'
            },
            body: JSON.stringify({
                transcription: modelAnswer
            })
        }
    );

    if (!response.ok) {
        throw new Error(`Failed to update task: ${response.status}`);
    }
}

async function main() {
    console.log('🚀 Starting model answer generation for all IELTS Writing tasks...\n');

    // Fetch all writing tasks
    const tasks = await fetchWritingTasks();
    console.log(`📋 Found ${tasks.length} writing tasks\n`);

    // Filter tasks that don't have model answers yet
    const tasksNeedingAnswers = tasks.filter(t => !t.transcription || t.transcription.trim() === '');
    console.log(`📝 ${tasksNeedingAnswers.length} tasks need model answers\n`);

    let successCount = 0;
    let errorCount = 0;

    for (const task of tasksNeedingAnswers) {
        const taskType = task.question_type;
        const taskNumber = task.part_number;

        console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
        console.log(`📄 ${taskType} (ID: ${task.id.substring(0, 8)}...)`);
        console.log(`   Instructions: ${task.passage_text?.substring(0, 80)}...`);
        if (task.image_url) {
            console.log(`   📷 Has image: Yes`);
        }

        try {
            const modelAnswer = await generateModelAnswer(
                taskNumber,
                task.passage_text,
                task.image_url
            );

            const wordCount = modelAnswer.split(/\s+/).filter(w => w.length > 0).length;
            console.log(`   ✅ Generated ${wordCount} words`);

            // Save to database
            await updateTaskWithModelAnswer(task.id, modelAnswer);
            console.log(`   💾 Saved to database`);

            successCount++;

            // Small delay to avoid rate limiting
            await new Promise(resolve => setTimeout(resolve, 2000));

        } catch (error) {
            console.log(`   ❌ Error: ${error.message}`);
            errorCount++;
        }
    }

    console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`\n🎉 Complete!`);
    console.log(`   ✅ Success: ${successCount}`);
    console.log(`   ❌ Errors: ${errorCount}`);
}

main().catch(console.error);
