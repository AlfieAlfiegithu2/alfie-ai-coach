#!/usr/bin/env node

/**
 * MCP Analytics Script for IELTS Writing Feedback System
 * Provides data-driven insights and optimization recommendations
 */

const { createClient } = require('@supabase/supabase-js');

// Supabase configuration
const supabaseUrl = 'https://cuumxmfzhwljylbdlflj.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImN1dW14bWZ6aHdsanlsYmRsZmxqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTM1MTkxMjEsImV4cCI6MjA2OTA5NTEyMX0.8jqO_ciOttSxSLZnKY0i5oJmEn79ROF53TjUMYhNemI';

const supabase = createClient(supabaseUrl, supabaseKey);

class IELTSAnalytics {
  constructor() {
    this.insights = {};
  }

  async analyzeWritingFeedback() {
    console.log('🔍 Analyzing IELTS Writing Feedback Data...\n');
    
    try {
      // Get writing submissions and feedback
      const { data: submissions, error } = await supabase
        .from('writing_submissions')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(100);

      if (error) {
        console.error('❌ Error fetching submissions:', error);
        return;
      }

      console.log(`📊 Found ${submissions.length} writing submissions\n`);

      // Analyze feedback patterns
      await this.analyzeFeedbackPatterns(submissions);
      
      // Analyze improvement trends
      await this.analyzeImprovementTrends(submissions);
      
      // Generate optimization recommendations
      await this.generateRecommendations();

    } catch (error) {
      console.error('❌ Analytics error:', error);
    }
  }

  async analyzeFeedbackPatterns(submissions) {
    console.log('📈 Analyzing Feedback Patterns...');
    
    const patterns = {
      commonErrors: {},
      improvementTypes: {},
      bandScoreDistribution: {},
      wordCountAnalysis: {}
    };

    submissions.forEach(submission => {
      // Analyze common errors
      if (submission.feedback && submission.feedback.improvements) {
        submission.feedback.improvements.forEach(improvement => {
          const errorType = improvement.issue || 'Unknown';
          patterns.commonErrors[errorType] = (patterns.commonErrors[errorType] || 0) + 1;
        });
      }

      // Analyze band scores
      if (submission.overall_band) {
        const band = Math.floor(submission.overall_band);
        patterns.bandScoreDistribution[band] = (patterns.bandScoreDistribution[band] || 0) + 1;
      }

      // Analyze word counts
      if (submission.word_count) {
        const wordCount = submission.word_count;
        if (wordCount < 150) patterns.wordCountAnalysis.under150 = (patterns.wordCountAnalysis.under150 || 0) + 1;
        else if (wordCount < 250) patterns.wordCountAnalysis.under250 = (patterns.wordCountAnalysis.under250 || 0) + 1;
        else patterns.wordCountAnalysis.adequate = (patterns.wordCountAnalysis.adequate || 0) + 1;
      }
    });

    this.insights.patterns = patterns;
    
    console.log('✅ Common Error Types:');
    Object.entries(patterns.commonErrors)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .forEach(([error, count]) => {
        console.log(`   • ${error}: ${count} occurrences`);
      });

    console.log('\n📊 Band Score Distribution:');
    Object.entries(patterns.bandScoreDistribution)
      .sort(([a], [b]) => parseInt(a) - parseInt(b))
      .forEach(([band, count]) => {
        console.log(`   • Band ${band}: ${count} students`);
      });
  }

  async analyzeImprovementTrends(submissions) {
    console.log('\n📈 Analyzing Improvement Trends...');
    
    const trends = {
      averageImprovements: 0,
      mostImprovedAreas: {},
      timeBasedAnalysis: {}
    };

    let totalImprovements = 0;
    let improvementAreas = {};

    submissions.forEach(submission => {
      if (submission.feedback && submission.feedback.improvements) {
        totalImprovements += submission.feedback.improvements.length;
        
        submission.feedback.improvements.forEach(improvement => {
          const area = improvement.issue || 'General';
          improvementAreas[area] = (improvementAreas[area] || 0) + 1;
        });
      }
    });

    trends.averageImprovements = totalImprovements / submissions.length;
    trends.mostImprovedAreas = improvementAreas;

    this.insights.trends = trends;

    console.log(`✅ Average improvements per essay: ${trends.averageImprovements.toFixed(1)}`);
    console.log('\n🎯 Most Improved Areas:');
    Object.entries(improvementAreas)
      .sort(([,a], [,b]) => b - a)
      .slice(0, 5)
      .forEach(([area, count]) => {
        console.log(`   • ${area}: ${count} improvements`);
      });
  }

  async generateRecommendations() {
    console.log('\n💡 Generating Optimization Recommendations...\n');
    
    const recommendations = [];

    // Analyze patterns for recommendations
    if (this.insights.patterns) {
      const patterns = this.insights.patterns;
      
      // Word count recommendations
      if (patterns.wordCountAnalysis.under150 > patterns.wordCountAnalysis.adequate) {
        recommendations.push({
          type: 'Word Count',
          priority: 'HIGH',
          recommendation: 'Many students are writing under the minimum word count. Consider adding word count warnings and guidance.',
          impact: 'High - affects Task Achievement scores'
        });
      }

      // Common error recommendations
      const topErrors = Object.entries(patterns.commonErrors)
        .sort(([,a], [,b]) => b - a)
        .slice(0, 3);
      
      topErrors.forEach(([error, count]) => {
        recommendations.push({
          type: 'Common Error',
          priority: 'MEDIUM',
          recommendation: `Focus on improving feedback for "${error}" - ${count} occurrences found.`,
          impact: 'Medium - targeted improvement opportunity'
        });
      });
    }

    // AI model optimization recommendations
    recommendations.push({
      type: 'AI Model',
      priority: 'HIGH',
      recommendation: 'Consider fine-tuning the Gemini 2.5 Flash model with IELTS-specific training data.',
      impact: 'High - could improve feedback accuracy by 15-20%'
    });

    recommendations.push({
      type: 'User Experience',
      priority: 'MEDIUM',
      recommendation: 'Implement progressive feedback - show basic errors first, then advanced improvements.',
      impact: 'Medium - better learning progression'
    });

    console.log('🚀 Optimization Recommendations:\n');
    recommendations.forEach((rec, index) => {
      console.log(`${index + 1}. [${rec.priority}] ${rec.type}:`);
      console.log(`   ${rec.recommendation}`);
      console.log(`   Impact: ${rec.impact}\n`);
    });

    this.insights.recommendations = recommendations;
  }

  async generateReport() {
    console.log('\n📋 Generating Comprehensive Analytics Report...\n');
    
    const report = {
      timestamp: new Date().toISOString(),
      summary: {
        totalSubmissions: this.insights.patterns ? Object.values(this.insights.patterns.bandScoreDistribution).reduce((a, b) => a + b, 0) : 0,
        averageBandScore: this.calculateAverageBandScore(),
        mostCommonError: this.getMostCommonError(),
        improvementOpportunity: this.getImprovementOpportunity()
      },
      insights: this.insights,
      nextSteps: [
        'Implement word count validation and warnings',
        'Add targeted feedback for common error types',
        'Consider A/B testing different feedback approaches',
        'Monitor improvement trends over time',
        'Implement user satisfaction surveys'
      ]
    };

    console.log('📊 Analytics Report Summary:');
    console.log(`   • Total Submissions: ${report.summary.totalSubmissions}`);
    console.log(`   • Average Band Score: ${report.summary.averageBandScore}`);
    console.log(`   • Most Common Error: ${report.summary.mostCommonError}`);
    console.log(`   • Improvement Opportunity: ${report.summary.improvementOpportunity}`);

    return report;
  }

  calculateAverageBandScore() {
    if (!this.insights.patterns?.bandScoreDistribution) return 'N/A';
    
    const distribution = this.insights.patterns.bandScoreDistribution;
    const total = Object.values(distribution).reduce((a, b) => a + b, 0);
    const weightedSum = Object.entries(distribution)
      .reduce((sum, [band, count]) => sum + (parseInt(band) * count), 0);
    
    return total > 0 ? (weightedSum / total).toFixed(1) : 'N/A';
  }

  getMostCommonError() {
    if (!this.insights.patterns?.commonErrors) return 'N/A';
    
    const errors = this.insights.patterns.commonErrors;
    return Object.entries(errors)
      .sort(([,a], [,b]) => b - a)[0]?.[0] || 'N/A';
  }

  getImprovementOpportunity() {
    if (!this.insights.trends?.averageImprovements) return 'N/A';
    
    const avg = this.insights.trends.averageImprovements;
    if (avg < 3) return 'High - students need more comprehensive feedback';
    if (avg < 5) return 'Medium - good balance of feedback';
    return 'Low - consider if feedback is too overwhelming';
  }
}

// Run analytics
async function main() {
  const analytics = new IELTSAnalytics();
  await analytics.analyzeWritingFeedback();
  await analytics.generateReport();
  
  console.log('\n✅ MCP Analytics Complete!');
  console.log('💡 Use these insights to optimize your IELTS writing feedback system.');
}

if (require.main === module) {
  main().catch(console.error);
}

module.exports = IELTSAnalytics;
