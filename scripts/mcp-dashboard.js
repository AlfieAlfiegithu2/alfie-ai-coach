import { createClient } from '@supabase/supabase-js';

// Supabase configuration
const supabaseUrl = 'https://cuumxmfzhwljylbdlflj.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN1dW14bWZ6aHdsanlsYmRsZmxqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM1MTkxMjEsImV4cCI6MjA2OTA5NTEyMX0.8jqO_ciOttSxSLZnKY0i5oJmEn79ROF53TjUMYhNemI';

const supabase = createClient(supabaseUrl, supabaseKey);

class MCPDashboard {
  constructor() {
    this.metrics = {
      totalUsers: 0,
      totalTests: 0,
      averageBandScore: 0,
      commonErrors: {},
      improvementAreas: {},
      userEngagement: {}
    };
  }

  async initialize() {
    console.log('🚀 Initializing MCP Dashboard for IELTS Writing Feedback...\n');
    
    try {
      // Get all available data
      await this.analyzeUserData();
      await this.analyzeTestData();
      await this.analyzeFeedbackPatterns();
      await this.generateInsights();
      
      console.log('✅ MCP Dashboard Ready!\n');
      console.log('📊 Real-time data collection active');
      console.log('💡 Use this dashboard to optimize your IELTS feedback system');
      
    } catch (error) {
      console.error('❌ Dashboard initialization failed:', error);
    }
  }

  async analyzeUserData() {
    console.log('👥 Analyzing User Data...');
    
    try {
      // Get user profiles
      const { data: profiles, error } = await supabase
        .from('profiles')
        .select('*');

      if (error) {
        console.log('⚠️ No user profiles found yet');
        return;
      }

      this.metrics.totalUsers = profiles.length;
      console.log(`   • Total Users: ${this.metrics.totalUsers}`);

      // Analyze user engagement
      const activeUsers = profiles.filter(p => p.last_sign_in_at);
      this.metrics.userEngagement.activeUsers = activeUsers.length;
      this.metrics.userEngagement.engagementRate = (activeUsers.length / profiles.length * 100).toFixed(1);
      
      console.log(`   • Active Users: ${activeUsers.length} (${this.metrics.userEngagement.engagementRate}%)`);

    } catch (error) {
      console.log('⚠️ User data analysis skipped');
    }
  }

  async analyzeTestData() {
    console.log('📝 Analyzing Test Data...');
    
    try {
      // Get all test results
      const { data: testResults, error } = await supabase
        .from('test_results')
        .select('*');

      if (error) {
        console.log('⚠️ No test results found yet');
        return;
      }

      this.metrics.totalTests = testResults.length;
      console.log(`   • Total Tests: ${this.metrics.totalTests}`);

      // Analyze test types
      const testTypes = {};
      testResults.forEach(test => {
        const type = test.test_type || 'Unknown';
        testTypes[type] = (testTypes[type] || 0) + 1;
      });

      console.log('   • Test Type Distribution:');
      Object.entries(testTypes).forEach(([type, count]) => {
        console.log(`     - ${type}: ${count} tests`);
      });

    } catch (error) {
      console.log('⚠️ Test data analysis skipped');
    }
  }

  async analyzeFeedbackPatterns() {
    console.log('🔍 Analyzing Feedback Patterns...');
    
    try {
      // Get writing test results
      const { data: writingResults, error } = await supabase
        .from('writing_test_results')
        .select('*');

      if (error || !writingResults || writingResults.length === 0) {
        console.log('⚠️ No writing test results found yet');
        return;
      }

      console.log(`   • Writing Tests: ${writingResults.length}`);

      // Analyze band scores
      const bandScores = writingResults
        .filter(r => r.overall_band)
        .map(r => r.overall_band);

      if (bandScores.length > 0) {
        const average = bandScores.reduce((a, b) => a + b, 0) / bandScores.length;
        this.metrics.averageBandScore = average.toFixed(1);
        console.log(`   • Average Band Score: ${this.metrics.averageBandScore}`);
      }

      // Analyze feedback patterns
      writingResults.forEach(result => {
        if (result.feedback && result.feedback.improvements) {
          result.feedback.improvements.forEach(improvement => {
            const issue = improvement.issue || 'General';
            this.metrics.commonErrors[issue] = (this.metrics.commonErrors[issue] || 0) + 1;
          });
        }
      });

      if (Object.keys(this.metrics.commonErrors).length > 0) {
        console.log('   • Common Error Types:');
        Object.entries(this.metrics.commonErrors)
          .sort(([,a], [,b]) => b - a)
          .slice(0, 5)
          .forEach(([error, count]) => {
            console.log(`     - ${error}: ${count} occurrences`);
          });
      }

    } catch (error) {
      console.log('⚠️ Feedback pattern analysis skipped');
    }
  }

  async generateInsights() {
    console.log('\n💡 Generating Insights & Recommendations...\n');

    const insights = [];

    // Data collection insights
    if (this.metrics.totalUsers === 0) {
      insights.push({
        priority: 'HIGH',
        type: 'Data Collection',
        insight: 'No user data found. Focus on user acquisition and engagement.',
        action: 'Implement user onboarding and encourage test taking'
      });
    }

    if (this.metrics.totalTests === 0) {
      insights.push({
        priority: 'HIGH',
        type: 'Test Engagement',
        insight: 'No test results found. Users need to start taking tests.',
        action: 'Promote free practice tests and writing exercises'
      });
    }

    // AI optimization insights
    insights.push({
      priority: 'MEDIUM',
      type: 'AI Model',
      insight: 'Gemini 2.5 Flash is optimized for cost and performance.',
      action: 'Monitor feedback quality and user satisfaction'
    });

    insights.push({
      priority: 'MEDIUM',
      type: 'Feedback System',
      insight: 'Red/green highlighting system provides granular feedback.',
      action: 'Track which improvements lead to better band scores'
    });

    // Display insights
    console.log('🎯 Key Insights:');
    insights.forEach((insight, index) => {
      console.log(`\n${index + 1}. [${insight.priority}] ${insight.type}:`);
      console.log(`   ${insight.insight}`);
      console.log(`   Action: ${insight.action}`);
    });

    // Next steps
    console.log('\n🚀 Next Steps for MCP Integration:');
    console.log('   1. Start collecting user data through your app');
    console.log('   2. Monitor feedback patterns as users submit writing');
    console.log('   3. Use insights to optimize AI prompts and feedback');
    console.log('   4. Implement A/B testing for different feedback approaches');
    console.log('   5. Track user progression and improvement over time');

    this.metrics.insights = insights;
  }

  async getRealTimeMetrics() {
    return {
      timestamp: new Date().toISOString(),
      metrics: this.metrics,
      status: 'active'
    };
  }

  async exportData() {
    const data = await this.getRealTimeMetrics();
    console.log('\n📊 Data Export:');
    console.log(JSON.stringify(data, null, 2));
    return data;
  }
}

// Initialize dashboard
async function main() {
  const dashboard = new MCPDashboard();
  await dashboard.initialize();
  
  // Export data for external analysis
  await dashboard.exportData();
  
  console.log('\n✅ MCP Dashboard Complete!');
  console.log('💡 Your IELTS writing feedback system is now data-ready!');
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export default MCPDashboard;
