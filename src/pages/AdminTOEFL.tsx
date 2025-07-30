import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { BookOpen, Headphones, PenTool, Mic, Upload, Users, BarChart3, Settings } from "lucide-react";
import AdminLayout from "@/components/AdminLayout";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import CSVImport from "@/components/CSVImport";
import ModuleSelector from "@/components/ModuleSelector";

const AdminTOEFL = () => {
  const navigate = useNavigate();
  const { admin, loading } = useAdminAuth();
  const [stats, setStats] = useState({
    totalTests: 0,
    activeStudents: 0,
    completionRate: 0,
    avgScore: 0
  });
  const [selectedModule, setSelectedModule] = useState<'ielts' | 'pte' | 'toefl' | 'general'>('toefl');

  useEffect(() => {
    if (!loading && !admin) {
      navigate('/admin/login');
    }
  }, [admin, loading, navigate]);

  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-sm text-muted-foreground">Loading TOEFL Admin...</p>
        </div>
      </div>
    );
  }

  if (!admin) {
    return null;
  }

  const sections = [
    {
      id: "reading",
      title: "Reading",
      icon: BookOpen,
      description: "Manage TOEFL iBT Reading comprehension passages",
      path: "/admin/toefl/reading"
    },
    {
      id: "listening",
      title: "Listening", 
      icon: Headphones,
      description: "Manage TOEFL iBT Listening lectures and conversations",
      path: "/admin/toefl/listening"
    },
    {
      id: "speaking",
      title: "Speaking",
      icon: Mic,
      description: "Manage TOEFL iBT Speaking independent and integrated tasks",
      path: "/admin/toefl/speaking"
    },
    {
      id: "writing",
      title: "Writing",
      icon: PenTool,
      description: "Manage TOEFL iBT Writing independent and integrated essays",
      path: "/admin/toefl/writing"
    }
  ];

  return (
    <AdminLayout title="TOEFL Administration" showBackButton={true} backPath="/admin">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-orange-500 to-red-600 bg-clip-text text-transparent">
              TOEFL Admin Portal
            </h1>
            <p className="text-muted-foreground">
              Manage TOEFL iBT content, tests, and student progress
            </p>
          </div>
          <Badge variant="secondary" className="text-sm bg-orange-100 text-orange-700 dark:bg-orange-900/20 dark:text-orange-400">
            TOEFL iBT
          </Badge>
        </div>

        {/* Quick Stats */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">TOEFL Tests</CardTitle>
              <BookOpen className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalTests}</div>
              <p className="text-xs text-muted-foreground">
                TOEFL iBT tests
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Active Students</CardTitle>
              <Users className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.activeStudents}</div>
              <p className="text-xs text-muted-foreground">
                Currently enrolled
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Completion Rate</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.completionRate}%</div>
              <p className="text-xs text-muted-foreground">
                Test completion
              </p>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Average Score</CardTitle>
              <BarChart3 className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.avgScore}</div>
              <p className="text-xs text-muted-foreground">
                Total score (0-120)
              </p>
            </CardContent>
          </Card>
        </div>

        <Separator />

        {/* Main Content Tabs */}
        <Tabs defaultValue="content" className="space-y-4">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="content">Content Management</TabsTrigger>
            <TabsTrigger value="upload">Upload Content</TabsTrigger>
            <TabsTrigger value="analytics">Analytics</TabsTrigger>
          </TabsList>

          <TabsContent value="content" className="space-y-4">
            <div className="text-center py-8">
              <h3 className="text-xl font-semibold mb-4">TOEFL Test Management</h3>
              <p className="text-muted-foreground mb-6">
                Manage TOEFL iBT tests, create new content, and monitor student progress
              </p>
              <Button
                onClick={() => navigate('/admin/toefl/tests')}
                className="bg-primary hover:bg-primary/90 text-primary-foreground"
                size="lg"
              >
                <BookOpen className="w-5 h-5 mr-2" />
                Manage TOEFL Tests
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="upload" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Upload className="h-5 w-5" />
                  <span>Upload TOEFL Content</span>
                </CardTitle>
                <CardDescription>
                  Import TOEFL iBT questions, passages, lectures, and content via CSV
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ModuleSelector 
                  selectedModule={selectedModule}
                  onModuleChange={setSelectedModule}
                />
                <CSVImport 
                  onImport={() => {}} 
                  onQuestionsPreview={() => {}} 
                  type="reading"
                  module={selectedModule}
                  cambridgeBook={`TOEFL ${new Date().getFullYear() - 2000}`}
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <BarChart3 className="h-5 w-5" />
                  <span>TOEFL Analytics</span>
                </CardTitle>
                <CardDescription>
                  View performance metrics and student progress for TOEFL iBT
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-muted-foreground">
                  <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>TOEFL Analytics dashboard coming soon</p>
                  <p className="text-sm">Track student performance across all four sections</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
};

export default AdminTOEFL;