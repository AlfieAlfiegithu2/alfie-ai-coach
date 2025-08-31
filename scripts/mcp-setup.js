import { createClient } from '@supabase/supabase-js';

// Supabase configuration
const supabaseUrl = 'https://cuumxmfzhwljylbdlflj.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN1dW14bWZ6aHdsanlsYmRsZmxqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM1MTkxMjEsImV4cCI6MjA2OTA5NTEyMX0.8jqO_ciOttSxSLZnKY0i5oJmEn79ROF53TjUMYhNemI';

const supabase = createClient(supabaseUrl, supabaseKey);

async function analyzeWritingData() {
  console.log('🔍 Analyzing IELTS Writing Data...\n');
  
  try {
    // Get writing test results
    const { data: submissions, error } = await supabase
      .from('writing_test_results')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(50);

    if (error) {
      console.error('❌ Error:', error);
      return;
    }

    console.log(`📊 Found ${submissions.length} writing submissions\n`);

    // Analyze patterns
    const patterns = {
      commonErrors: {},
      bandScores: {},
      wordCounts: { under150: 0, under250: 0, adequate: 0 }
    };

    submissions.forEach(sub => {
      // Analyze band scores
      if (sub.overall_band) {
        const band = Math.floor(sub.overall_band);
        patterns.bandScores[band] = (patterns.bandScores[band] || 0) + 1;
      }

      // Analyze word counts
      if (sub.word_count) {
        if (sub.word_count < 150) patterns.wordCounts.under150++;
        else if (sub.word_count < 250) patterns.wordCounts.under250++;
        else patterns.wordCounts.adequate++;
      }
    });

    // Display insights
    console.log('📈 Key Insights:');
    console.log(`   • Word Count Issues: ${patterns.wordCounts.under150 + patterns.wordCounts.under250} students`);
    console.log(`   • Band Score Distribution:`, patterns.bandScores);
    
    console.log('\n💡 Recommendations:');
    console.log('   1. Add word count validation');
    console.log('   2. Focus on common error patterns');
    console.log('   3. Implement progressive feedback');

  } catch (error) {
    console.error('❌ Analysis failed:', error);
  }
}

analyzeWritingData();
