import { useState, useEffect } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer } from 'recharts';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { format, subDays, subMonths, isAfter } from 'date-fns';

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
  const [dateRange, setDateRange] = useState('1week');
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [loading, setLoading] = useState(true);
  const [userPreferences, setUserPreferences] = useState<{ target_score?: number; target_deadline?: string } | null>(null);

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
        .select('target_score, target_deadline')
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
      let fromDate: Date;
      
      switch (dateRange) {
        case '1week':
          fromDate = subDays(new Date(), 7);
          break;
        case '1month':
          fromDate = subMonths(new Date(), 1);
          break;
        case '3months':
          fromDate = subMonths(new Date(), 3);
          break;
        default:
          fromDate = subDays(new Date(), 7);
      }

      let query = supabase
        .from('test_results')
        .select('*')
        .eq('user_id', user.id)
        .gte('created_at', fromDate.toISOString());

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
    test: `Test ${index + 1}`,
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

  return (
    <Card className="bg-white/10 border-white/20 backdrop-blur-xl">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-slate-800">
            {selectedSkill === 'overall' ? 'Overall Test Results' : `${selectedSkill.charAt(0).toUpperCase() + selectedSkill.slice(1)} Test Results`}
          </CardTitle>
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-32 bg-white/50 border-white/30">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-white/95 backdrop-blur-xl border-white/20">
              <SelectItem value="1week">1 Week</SelectItem>
              <SelectItem value="1month">1 Month</SelectItem>
              <SelectItem value="3months">3 Months</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="h-64 flex items-center justify-center">
            <p className="text-slate-600">Loading results...</p>
          </div>
        ) : testResults.length === 0 ? (
          <div className="h-64 flex items-center justify-center">
            <p className="text-slate-600">No test results found for this period</p>
          </div>
        ) : (
          <>
            {/* Chart */}
            <div className="h-64 mb-6">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(148, 163, 184, 0.3)" />
                  <XAxis 
                    dataKey="test" 
                    stroke="rgb(71, 85, 105)"
                    fontSize={12}
                  />
                  <YAxis 
                    stroke="rgb(71, 85, 105)"
                    fontSize={12}
                    domain={[0, 9]}
                    ticks={[0, 1, 2, 3, 4, 5, 6, 7, 8, 9]}
                    tickFormatter={(value) => `${value}`}
                  />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: 'rgba(255, 255, 255, 0.95)',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      borderRadius: '8px',
                      backdropFilter: 'blur(12px)'
                    }}
                    formatter={(value: number, name: string) => [`${value}`, 'IELTS Band']}
                    labelFormatter={(label) => `${label}`}
                  />
                  <Line 
                    type="monotone" 
                    dataKey="score" 
                    stroke="rgb(59, 130, 246)" 
                    strokeWidth={3}
                    dot={{ fill: 'rgb(59, 130, 246)', strokeWidth: 2, r: 4 }}
                    activeDot={{ r: 6, stroke: 'rgb(59, 130, 246)', strokeWidth: 2 }}
                  />
                  {/* Target Score Line */}
                  {userPreferences?.target_score && (
                    <Line 
                      type="monotone"
                      dataKey={() => userPreferences.target_score}
                      stroke="rgb(239, 68, 68)" 
                      strokeWidth={2}
                      strokeDasharray="5 5"
                      dot={false}
                      activeDot={false}
                    />
                  )}
                </LineChart>
              </ResponsiveContainer>
            </div>

            {/* Statistics */}
            <div className="grid grid-cols-3 gap-4">
              <div className="text-center">
                <p className="text-2xl font-semibold text-slate-800" style={{ fontFamily: 'Bricolage Grotesque, sans-serif' }}>
                  {testResults.length}
                </p>
                <p className="text-xs text-slate-600" style={{ fontFamily: 'Inter, sans-serif' }}>
                  Tests Taken
                </p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-semibold text-slate-800" style={{ fontFamily: 'Bricolage Grotesque, sans-serif' }}>
                  {averageScore.toFixed(1)}
                </p>
                <p className="text-xs text-slate-600" style={{ fontFamily: 'Inter, sans-serif' }}>
                  Average Score
                </p>
              </div>
              <div className="text-center">
                <p className={`text-2xl font-semibold ${improvement >= 0 ? 'text-green-600' : 'text-red-600'}`} style={{ fontFamily: 'Bricolage Grotesque, sans-serif' }}>
                  {improvement > 0 ? '+' : ''}{improvement.toFixed(1)}
                </p>
                <p className="text-xs text-slate-600" style={{ fontFamily: 'Inter, sans-serif' }}>
                  Improvement
                </p>
              </div>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default TestResultsChart;