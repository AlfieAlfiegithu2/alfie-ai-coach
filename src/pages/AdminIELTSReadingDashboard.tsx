// Example for src/pages/AdminIELTSReadingDashboard.tsx
import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, BookOpen } from 'lucide-react';
import AdminLayout from '@/components/AdminLayout';
import { useAdminAuth } from '@/hooks/useAdminAuth';
import { toast } from 'sonner';

export default function AdminIELTSReadingDashboard() {
  const [tests, setTests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const navigate = useNavigate();
  const { admin, loading: authLoading } = useAdminAuth();

  const module = 'Reading';
  const testType = 'IELTS';

  useEffect(() => {
    if (!authLoading && !admin) {
      navigate('/admin/login');
    }
  }, [admin, authLoading, navigate]);

  useEffect(() => {
    const fetchTests = async () => {
      setLoading(true);
      const { data, error } = await supabase
        .from('tests')
        .select('*')
        .eq('test_type', testType)
        .eq('module', module)
        .order('created_at', { ascending: false });
      
      if (error) {
        setError(error.message);
      } else {
        setTests(data);
      }
      setLoading(false);
    };
    fetchTests();
  }, []);

  const handleCreateNewTest = async () => {
    setLoading(true);
    setError(null);
    const { count } = await supabase
      .from('tests')
      .select('*', { count: 'exact', head: true })
      .eq('test_type', testType)
      .eq('module', module);

    const newTestNumber = (count || 0) + 1;
    
    const { data: newTest, error: invokeError } = await supabase.functions.invoke('admin-content', {
        body: {
            action: 'create_test',
            payload: {
                test_name: `${testType} ${module} Test ${newTestNumber}`,
                test_type: testType,
                module: module,
            }
        },
    });

    if (invokeError || newTest.error) {
      setError(invokeError?.message || newTest.error);
      toast.error('Failed to create test');
    } else {
      // Refresh the list or navigate
      navigate(`/admin/ielts/test/${newTest.data.id}/reading`);
      toast.success('Test created successfully');
    }
    setLoading(false);
  };

  if (authLoading) return <div className="text-white">Loading...</div>;
  if (!admin) return null;

  if (loading && tests.length === 0) return (
    <AdminLayout title="IELTS Reading Tests" showBackButton={true} backPath="/admin">
      <p className="text-white">Loading tests...</p>
    </AdminLayout>
  );
  
  if (error) return (
    <AdminLayout title="IELTS Reading Tests" showBackButton={true} backPath="/admin">
      <p className="text-red-500">Error: {error}</p>
    </AdminLayout>
  );

  return (
    <AdminLayout title="IELTS Reading Tests" showBackButton={true} backPath="/admin">
      <div className="p-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-white">IELTS Reading Tests</h1>
          <Button
            onClick={handleCreateNewTest}
            disabled={loading}
            className="bg-[#3B82F6] text-white font-semibold py-2 px-4 rounded-lg hover:bg-[#2563EB]"
          >
            {loading ? 'Creating...' : '+ Add New Test'}
          </Button>
        </div>
        
        {tests.length === 0 ? (
          <div className="text-center py-8">
            <p className="text-white">No tests found. Create your first test!</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {tests.map((test) => (
              <Card key={test.id} className="hover:shadow-lg transition-shadow">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <BookOpen className="w-5 h-5" />
                    {test.test_name}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="text-sm text-muted-foreground">
                      Created: {new Date(test.created_at).toLocaleDateString()}
                    </div>
                    <Button 
                      size="sm" 
                      className="w-full"
                      onClick={() => navigate(`/admin/ielts/test/${test.id}/reading`)}
                    >
                      Manage Test
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
    </AdminLayout>
  );
}