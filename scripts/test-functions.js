import { createClient } from '@supabase/supabase-js';

// Supabase configuration
const supabaseUrl = 'https://cuumxmfzhwljylbdlflj.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN1dW14bWZ6aHdsanlsYmRsZmxqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM1MTkxMjEsImV4cCI6MjA2OTA5NTEyMX0.8jqO_ciOttSxSLZnKY0i5oJmEn79ROF53TjUMYhNemI';

const supabase = createClient(supabaseUrl, supabaseKey);

async function testWritingFeedback() {
  console.log('🧪 Testing Writing Feedback Function...\n');
  
  const testEssay = `The graph shows the percentage of people who used different types of transport to travel to work in 2000 and 2020. In 2000, cars were the most popular mode of transport, with 45% of people using them. Buses were used by 25% of people, while trains were used by 20%. Walking and cycling were used by 10% of people combined.

In 2020, the use of cars decreased to 35%, while the use of public transport increased. Buses were used by 30% of people, and trains were used by 25%. Walking and cycling became more popular, with 10% of people using these modes of transport.`;

  try {
    console.log('📝 Sending test essay to writing-feedback function...');
    
    const { data, error } = await supabase.functions.invoke('writing-feedback', {
      body: {
        writing: testEssay,
        prompt: 'Describe the changes in transport usage shown in the graph.',
        taskType: 'IELTS Task 1'
      }
    });

    if (error) {
      console.error('❌ Function Error:', error);
      return false;
    }

    if (data.success) {
      console.log('✅ Function Success!');
      console.log(`📊 Word Count: ${data.wordCount}`);
      console.log(`📝 Sentence Count: ${data.sentenceCount}`);
      console.log(`📄 Response Length: ${data.feedback?.length || 0} characters`);
      
      if (data.structured?.sentence_comparisons) {
        console.log(`🔍 Sentence Comparisons: ${data.structured.sentence_comparisons.length}`);
      }
      
      return true;
    } else {
      console.error('❌ Function returned success: false');
      console.error('Error:', data.error);
      return false;
    }

  } catch (error) {
    console.error('❌ Test failed:', error);
    return false;
  }
}

async function testIELTSExaminer() {
  console.log('\n🧪 Testing IELTS Writing Examiner Function...\n');
  
  const testTask1 = `The graph shows the percentage of people who used different types of transport to travel to work in 2000 and 2020. In 2000, cars were the most popular mode of transport, with 45% of people using them. Buses were used by 25% of people, while trains were used by 20%. Walking and cycling were used by 10% of people combined.`;
  
  const testTask2 = `Some people believe that technology has made our lives easier, while others think it has made life more complicated. Discuss both views and give your own opinion. I think technology has both positive and negative effects on our lives. On the positive side, technology has made communication much easier. We can now talk to people anywhere in the world instantly through video calls and messaging apps. Technology has also made work more efficient, allowing us to complete tasks faster and more accurately. However, technology can also make life more complicated. Many people feel overwhelmed by the constant notifications and updates from their devices. Additionally, some people become addicted to social media and spend too much time online instead of interacting with people in real life.`;

  try {
    console.log('📝 Sending test essays to ielts-writing-examiner function...');
    
    const { data, error } = await supabase.functions.invoke('ielts-writing-examiner', {
      body: {
        task1Answer: testTask1,
        task2Answer: testTask2,
        task1Data: {
          title: 'Transport Usage Changes',
          instructions: 'Describe the changes shown in the graph.'
        },
        task2Data: {
          title: 'Technology Impact',
          instructions: 'Discuss both views and give your opinion.'
        },
        apiProvider: 'gemini'
      }
    });

    if (error) {
      console.error('❌ Function Error:', error);
      return false;
    }

    if (data.success) {
      console.log('✅ Function Success!');
      console.log(`📊 Task 1 Word Count: ${data.task1WordCount}`);
      console.log(`📊 Task 2 Word Count: ${data.task2WordCount}`);
      console.log(`🤖 API Used: ${data.apiUsed}`);
      
      if (data.structured?.overall?.band) {
        console.log(`🎯 Overall Band Score: ${data.structured.overall.band}`);
      }
      
      return true;
    } else {
      console.error('❌ Function returned success: false');
      console.error('Error:', data.error);
      return false;
    }

  } catch (error) {
    console.error('❌ Test failed:', error);
    return false;
  }
}

async function main() {
  console.log('🚀 Testing Supabase Edge Functions with Gemini 2.5 Flash...\n');
  
  const writingFeedbackSuccess = await testWritingFeedback();
  const examinerSuccess = await testIELTSExaminer();
  
  console.log('\n📊 Test Results:');
  console.log(`   • Writing Feedback: ${writingFeedbackSuccess ? '✅ PASS' : '❌ FAIL'}`);
  console.log(`   • IELTS Examiner: ${examinerSuccess ? '✅ PASS' : '❌ FAIL'}`);
  
  if (writingFeedbackSuccess && examinerSuccess) {
    console.log('\n🎉 All tests passed! Your functions are working correctly.');
    console.log('🌐 You can now test your website at: http://localhost:8080/');
  } else {
    console.log('\n⚠️ Some tests failed. You may need to:');
    console.log('   1. Deploy the functions: npm run deploy:supabase');
    console.log('   2. Check your Gemini API key configuration');
    console.log('   3. Ensure you have proper authentication');
  }
}

main().catch(console.error);
