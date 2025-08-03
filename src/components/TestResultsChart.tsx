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

const TestResultsChart = () => {
  const { user } = useAuth();
  const [dateRange, setDateRange] = useState('1week');
  const [testResults, setTestResults] = useState<TestResult[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user) {
      loadTestResults();
    }
  }, [user, dateRange]);

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

      const { data, error } = await supabase
        .from('test_results')
        .select('*')
        .eq('user_id', user.id)
        .gte('created_at', fromDate.toISOString())
        .order('created_at', { ascending: true });

      if (error) throw error;

      setTestResults(data || []);
    } catch (error) {
      console.error('Error loading test results:', error);
    } finally {
      setLoading(false);
    }
  };

  const chartData = testResults.map((result, index) => ({
    test: `Test ${index + 1}`,
    score: result.score_percentage || 0,
    date: format(new Date(result.created_at), 'MMM dd'),
    type: result.test_type
  }));

  const averageScore = testResults.length > 0 
    ? Math.round(testResults.reduce((acc, test) => acc + (test.score_percentage || 0), 0) / testResults.length)
    : 0;

  const improvement = testResults.length > 1
    ? Math.round((testResults[testResults.length - 1]?.score_percentage || 0) - (testResults[0]?.score_percentage || 0))
    : 0;

  return (
    <Card className="bg-white/10 border-white/20 backdrop-blur-xl">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-slate-800">Overall Test Results</CardTitle>
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
                    domain={[0, 100]}
                  />
                  <Tooltip 
                    contentStyle={{
                      backgroundColor: 'rgba(255, 255, 255, 0.95)',
                      border: '1px solid rgba(255, 255, 255, 0.2)',
                      borderRadius: '8px',
                      backdropFilter: 'blur(12px)'
                    }}
                    formatter={(value: number, name: string) => [`${value}%`, 'Score']}
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
                  {averageScore}%
                </p>
                <p className="text-xs text-slate-600" style={{ fontFamily: 'Inter, sans-serif' }}>
                  Average Score
                </p>
              </div>
              <div className="text-center">
                <p className={`text-2xl font-semibold ${improvement >= 0 ? 'text-green-600' : 'text-red-600'}`} style={{ fontFamily: 'Bricolage Grotesque, sans-serif' }}>
                  {improvement > 0 ? '+' : ''}{improvement}%
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