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
        .eq('test_type', 'IELTS')
        .eq('skill_category', 'Reading') // Individual skill tests
        .order('created_at', { ascending: false });
      
      if (error) {
        setError(error.message);
      } else {
        setTests(data || []);
      }
      setLoading(false);
    };
    fetchTests();
  }, []);

  const handleCreateNewTest = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const { count } = await supabase
        .from('tests')
        .select('*', { count: 'exact', head: true })
        .eq('test_type', testType)
        .eq('skill_category', 'Reading'); // Individual skill test

      const newTestNumber = (count || 0) + 1;
      
      const { data, error } = await supabase
        .from('tests')
        .insert({
          test_name: `IELTS Reading Test ${newTestNumber}`,
          test_type: 'IELTS',
          module: 'academic',
          skill_category: 'Reading'
        })
        .select()
        .single();

      if (error) throw error;

      toast.success('Test created successfully');
      
      // Refresh the list and navigate to test management
      navigate(`/admin/ielts/test/${data.id}/reading`);
    } catch (err: any) {
      console.error('Error creating test:', err);
      setError(err.message);
      toast.error('Failed to create test');
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
          <h1 className="text-3xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            IELTS Reading Tests
          </h1>
          <Button
            onClick={handleCreateNewTest}
            disabled={loading}
            className="gap-2"
          >
            <Plus className="w-4 h-4" />
            {loading ? 'Creating...' : 'Create Reading Test'}
          </Button>
        </div>
        
        {tests.length === 0 ? (
          <div className="text-center py-12">
            <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Reading tests found</h3>
            <p className="text-muted-foreground mb-4">
              Create your first IELTS Reading test to get started
            </p>
            <Button onClick={handleCreateNewTest} disabled={loading}>
              <Plus className="w-4 h-4 mr-2" />
              {loading ? 'Creating...' : 'Create First Test'}
            </Button>
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