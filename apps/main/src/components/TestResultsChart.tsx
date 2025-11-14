import { useState, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { format, subDays, subMonths, isAfter } from 'date-fns';
import { useThemeStyles } from '@/hooks/useThemeStyles';

interface TestResult {
  id: string;
  score_percentage: number;
  test_type: string;
  created_at: string;
  test_data?: any;
}

interface TestResultsChartProps {
  selectedSkill: string;
  selectedTestType: string;
}

const TestResultsChart = ({ selectedSkill, selectedTestType }: TestResultsChartProps) => {
  const { user } = useAuth();
  const { t } = useTranslation();
  const themeStyles = useThemeStyles();
  const [dateRange, setDateRange] = useState('week');
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [userPreferences, setUserPreferences] = useState<{ target_score?: number; target_deadline?: string; target_scores?: any } | null>(null);

  useEffect(() => {
    if (user) {
      loadTestResults();
      loadUserPreferences();
    }
  }, [user, dateRange, selectedSkill, selectedTestType]);

  const loadUserPreferences = async () => {
    if (!user) return;

    try {
      const { data, error } = await supabase
        .from('user_preferences')
        .select('target_score, target_deadline, target_scores')
        .eq('user_id', user.id)
        .single();

      if (error && error.code !== 'PGRST116') {
        console.error('Error loading user preferences:', error);
        return;
      }

      setUserPreferences(data);
    } catch (error) {
      console.error('Error loading user preferences:', error);
    }
  };

  const loadTestResults = async () => {
    if (!user) return;

    setLoading(true);
    try {
      let query = supabase
        .from('test_results')
        .select('*')
        .eq('user_id', user.id);

      if (dateRange !== 'full') {
        let fromDate: Date;
        switch (dateRange) {
          case 'week':
            fromDate = subDays(new Date(), 7);
            break;
          case 'month':
            fromDate = subMonths(new Date(), 1);
            break;
          default:
            fromDate = subDays(new Date(), 7);
        }
        query = query.gte('created_at', fromDate.toISOString());
      }

      // Filter by skill if not overall
      if (selectedSkill !== 'overall') {
        query = query.ilike('test_type', `%${selectedSkill}%`);
      }

      const { data, error } = await query.order('created_at', { ascending: true });

      if (error) throw error;

      setTestResults(data || []);
    } catch (error) {
      console.error('Error loading test results:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateMockData = () => {
    if (!user) return;

    // Generate 8 tests with realistic variation
    // Overall trend: gradually increasing but with some same scores and fluctuations
    const basePercentage = 50;
    const targetPercentage = 85;
    const trend = (targetPercentage - basePercentage) / 7; // Overall trend
    
    const mockResults: TestResult[] = [];
    const now = new Date();
    
    // Generate random dates over the last 30 days (not sequential)
    const dates: Date[] = [];
    for (let i = 0; i < 8; i++) {
      const randomDaysAgo = Math.floor(Math.random() * 30); // Random day within last 30 days
      const testDate = new Date(now);
      testDate.setDate(testDate.getDate() - randomDaysAgo);
      dates.push(testDate);
    }
    // Sort dates chronologically
    dates.sort((a, b) => a.getTime() - b.getTime());
    
    // Generate scores with realistic variation
    const scores: number[] = [];
    for (let i = 0; i < 8; i++) {
      const trendValue = basePercentage + (trend * i);
      // Add random variation: -5% to +5% around the trend
      const variation = (Math.random() * 10) - 5;
      let percentage = trendValue + variation;
      
      // Sometimes use the same score as previous (30% chance after first test)
      if (i > 0 && Math.random() < 0.3) {
        percentage = scores[i - 1];
      }
      
      // Ensure score stays within reasonable bounds
      percentage = Math.max(45, Math.min(90, percentage));
      scores.push(Math.round(percentage * 10) / 10);
    }
    
    // Determine test type based on selected skill
    let testType = 'IELTS';
    if (selectedSkill !== 'overall') {
      if (selectedSkill === 'reading') testType = 'IELTS Reading';
      else if (selectedSkill === 'listening') testType = 'IELTS Listening';
      else if (selectedSkill === 'writing') testType = 'writing';
      else if (selectedSkill === 'speaking') testType = 'speaking';
    }
    
    // Create mock results
    for (let i = 0; i < 8; i++) {
      mockResults.push({
        id: `mock-${i}-${Date.now()}`,
        score_percentage: scores[i],
        test_type: testType,
        created_at: dates[i].toISOString(),
        test_data: null
      });
    }
    
    setTestResults(mockResults);
    setLoading(false);
  };

  // Convert percentage to IELTS band score
  const convertToIELTSScore = (percentage: number): number => {
    if (percentage >= 95) return 9;
    if (percentage >= 90) return 8.5;
    if (percentage >= 85) return 8;
    if (percentage >= 80) return 7.5;
    if (percentage >= 75) return 7;
    if (percentage >= 70) return 6.5;
    if (percentage >= 65) return 6;
    if (percentage >= 60) return 5.5;
    if (percentage >= 55) return 5;
    if (percentage >= 50) return 4.5;
    if (percentage >= 45) return 4;
    if (percentage >= 40) return 3.5;
    if (percentage >= 35) return 3;
    if (percentage >= 30) return 2.5;
    if (percentage >= 25) return 2;
    if (percentage >= 20) return 1.5;
    if (percentage >= 15) return 1;
    if (percentage >= 10) return 0.5;
    return 0;
  };

  const chartData = testResults.map((result, index) => ({
    test: format(new Date(result.created_at), 'MMM dd'),
    score: convertToIELTSScore(result.score_percentage || 0),
    date: format(new Date(result.created_at), 'MMM dd'),
    type: result.test_type
  }));

  const averageScore = testResults.length > 0 
    ? convertToIELTSScore(testResults.reduce((acc, test) => acc + (test.score_percentage || 0), 0) / testResults.length)
    : 0;

  const improvement = testResults.length > 1
    ? convertToIELTSScore(testResults[testResults.length - 1]?.score_percentage || 0) - convertToIELTSScore(testResults[0]?.score_percentage || 0)
    : 0;

  const deadlineDays = userPreferences?.target_deadline
    ? Math.max(
        0,
        Math.ceil(
          (new Date(userPreferences.target_deadline).getTime() - Date.now()) /
            (1000 * 60 * 60 * 24)
        )
      )
    : null;

  return (
    <Card className={`${themeStyles.cardClassName} h-full flex flex-col shadow-md`} style={themeStyles.cardStyle}>
      <CardHeader className="pb-2 relative flex-shrink-0">
        <div className="flex items-center justify-between">
          <CardTitle style={{ fontFamily: 'Poppins, sans-serif', color: themeStyles.textPrimary }}>
            {selectedSkill === 'overall' 
              ? t('testResults.overallResults', { defaultValue: 'Overall Test Results' })
              : ''}
          </CardTitle>
          {/* Period selector inside container - tiny */}
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger 
              className={`w-auto min-w-[70px] h-7 text-xs border`} 
              style={{ 
                fontFamily: 'Poppins, sans-serif',
                backgroundColor: themeStyles.theme.name === 'glassmorphism' ? 'rgba(255,255,255,0.1)' : themeStyles.theme.name === 'dark' ? 'rgba(255,255,255,0.1)' : themeStyles.theme.name === 'minimalist' ? '#ffffff' : 'rgba(255,255,255,0.6)',
                borderColor: themeStyles.border,
                color: themeStyles.textPrimary
              }}
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent 
              className={`backdrop-blur-xl border`}
              style={{
                backgroundColor: themeStyles.cardBackground,
                borderColor: themeStyles.border
              }}
            >
              <SelectItem value="week" className="text-xs" style={{ fontFamily: 'Poppins, sans-serif', color: themeStyles.textPrimary }}>Week</SelectItem>
              <SelectItem value="month" className="text-xs" style={{ fontFamily: 'Poppins, sans-serif', color: themeStyles.textPrimary }}>Month</SelectItem>
              <SelectItem value="full" className="text-xs" style={{ fontFamily: 'Poppins, sans-serif', color: themeStyles.textPrimary }}>Full</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent className="px-0 lg:px-2 flex-1 flex flex-col min-h-0">
        {/* Chart area: fixed height whether or not there is data */}
        <div className="h-64 mb-4 w-full flex items-center justify-center flex-shrink-0">
          {loading ? (
            <p style={{ color: themeStyles.textSecondary }}>
              {t('common.loading', { defaultValue: 'Loading...' })}
            </p>
          ) : testResults.length === 0 ? (
            <div className="flex flex-col items-center justify-center gap-3 px-4">
              <p className="text-sm text-center" style={{ fontFamily: 'Inter, sans-serif', color: themeStyles.textSecondary }}>
                No data available for graph
              </p>
              <button
                onClick={generateMockData}
                className="px-4 py-2 rounded-lg text-sm font-medium transition shadow-sm"
                style={{
                  fontFamily: 'Poppins, sans-serif',
                  backgroundColor: themeStyles.buttonPrimary,
                  color: 'white'
                }}
                onMouseEnter={(e) => e.currentTarget.style.backgroundColor = themeStyles.buttonPrimaryHover}
                onMouseLeave={(e) => e.currentTarget.style.backgroundColor = themeStyles.buttonPrimary}
              >
                Generate Mock Data
              </button>
            </div>
          ) : (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ left: -10, right: 10, top: 5, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={themeStyles.textSecondary + '40'} />
                  <XAxis 
                    dataKey="test" 
                    stroke={themeStyles.textSecondary}
                    fontSize={12}
                  />
                  <YAxis 
                    stroke={themeStyles.textSecondary}
                    fontSize={12}
                    domain={[0, 9]}
                    ticks={[0, 1, 2, 3, 4, 5, 6, 7, 8, 9]}
                    tickFormatter={(value) => `${value}`}
                  />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: themeStyles.cardBackground,
                      border: `1px solid ${themeStyles.border}`,
                      borderRadius: '8px',
                      color: themeStyles.textPrimary
                    }}
                    formatter={(value: number, name: string) => [`${value}`, 'IELTS Band']}
                    labelFormatter={(label) => `${label}`}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="score" 
                    stroke={themeStyles.chartLine} 
                    strokeWidth={3}
                    dot={{ fill: themeStyles.chartLine, strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6, stroke: themeStyles.chartLine, strokeWidth: 2 }}
                  />
                  {/* Target Score Line */}
                  {userPreferences?.target_scores && selectedSkill !== 'overall' ? (
                    <Line 
                      type="monotone"
                      dataKey={() => (userPreferences.target_scores as any)?.[selectedSkill] || userPreferences.target_score}
                      stroke={themeStyles.chartTarget} 
                      strokeWidth={2}
                      strokeDasharray="5 5"
                      dot={false}
                      activeDot={false}
                    />
                  ) : userPreferences?.target_score && (
                    <Line 
                      type="monotone"
                      dataKey={() => userPreferences.target_score}
                      stroke={themeStyles.chartTarget} 
                      strokeWidth={2}
                      strokeDasharray="5 5"
                      dot={false}
                      activeDot={false}
                    />
                  )}
                </LineChart>
              </ResponsiveContainer>
          )}
        </div>

        {/* Statistics: always reserved space so card height stays consistent */}
        {!loading && (
          <div className="grid grid-cols-3 gap-3 flex-shrink-0">
            <div className="text-center">
              <p className="text-xl font-normal" style={{ fontFamily: 'Poppins, sans-serif', color: themeStyles.textPrimary }}>
                {deadlineDays !== null ? deadlineDays : '—'}
              </p>
              <p className="text-[11px]" style={{ fontFamily: 'Poppins, sans-serif', color: themeStyles.textSecondary }}>
                {t('dashboard.daysLeft', { defaultValue: 'Days Left' })}
              </p>
            </div>
              <div className="text-center">
                <p className="text-xl font-normal" style={{ fontFamily: 'Poppins, sans-serif', color: themeStyles.textPrimary }}>
                  {averageScore.toFixed(1)}
                </p>
                <p className="text-[11px]" style={{ fontFamily: 'Poppins, sans-serif', color: themeStyles.textSecondary }}>
                  {t('dashboard.averageScore', { defaultValue: 'Average Score' })}
                </p>
              </div>
              <div className="text-center">
                <p className="text-xl font-normal" style={{ fontFamily: 'Poppins, sans-serif', color: improvement >= 0 ? themeStyles.textSecondary : themeStyles.chartTarget }}>
                  {improvement > 0 ? '+' : ''}{improvement.toFixed(1)}
                </p>
                <p className="text-[11px]" style={{ fontFamily: 'Poppins, sans-serif', color: themeStyles.textSecondary }}>
                  {t('testResults.improvement', { defaultValue: 'Improvement' })}
                </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default TestResultsChart;