import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { BookOpen, Headphones, PenTool, Mic, Upload, Users, BarChart3, Settings, ArrowLeft } from "lucide-react";
import AdminLayout from "@/components/AdminLayout";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import CSVImport from "@/components/CSVImport";

const AdminIELTS = () => {
  const navigate = useNavigate();
  const { admin, loading } = useAdminAuth();
  const [stats, setStats] = useState({
    totalTests: 0,
    activeStudents: 0,
    completionRate: 0,
    avgScore: 0
  });

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
          <p className="mt-2 text-sm text-muted-foreground">Loading IELTS Admin...</p>
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
      description: "Manage IELTS Reading passages and questions",
      path: "/admin/reading"
    },
    {
      id: "listening",
      title: "Listening", 
      icon: Headphones,
      description: "Manage IELTS Listening sections and audio",
      path: "/admin/listening"
    },
    {
      id: "writing",
      title: "Writing",
      icon: PenTool,
      description: "Manage IELTS Writing prompts and criteria",
      path: "/admin/writing"
    },
    {
      id: "speaking",
      title: "Speaking",
      icon: Mic,
      description: "Manage IELTS Speaking topics and assessments",
      path: "/admin/speaking"
    }
  ];

  return (
    <AdminLayout title="IELTS Administration" showBackButton={true} backPath="/admin">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              IELTS Admin Portal
            </h1>
            <p className="text-muted-foreground">
              Manage IELTS content, tests, and student progress
            </p>
          </div>
          <Badge variant="secondary" className="text-sm">
            IELTS Module
          </Badge>
        </div>

        {/* Quick Stats */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Total Tests</CardTitle>
              <BookOpen className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.totalTests}</div>
              <p className="text-xs text-muted-foreground">
                IELTS practice tests
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
                Band score
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
              <h3 className="text-xl font-semibold mb-4">IELTS Test Management</h3>
              <p className="text-muted-foreground mb-6">
                Manage IELTS tests, create new content, and monitor student progress
              </p>
              <Button
                onClick={() => navigate('/admin/ielts/tests')}
                className="bg-primary hover:bg-primary/90 text-primary-foreground"
                size="lg"
              >
                <BookOpen className="w-5 h-5 mr-2" />
                Manage IELTS Tests
              </Button>
            </div>
          </TabsContent>

          <TabsContent value="upload" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <Upload className="h-5 w-5" />
                  <span>Upload IELTS Content</span>
                </CardTitle>
                <CardDescription>
                  Import IELTS questions, passages, and audio content via CSV
                </CardDescription>
              </CardHeader>
              <CardContent>
                <CSVImport 
                  onImport={() => {}} 
                  onQuestionsPreview={() => {}} 
                  type="reading"
                />
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analytics" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center space-x-2">
                  <BarChart3 className="h-5 w-5" />
                  <span>IELTS Analytics</span>
                </CardTitle>
                <CardDescription>
                  View performance metrics and student progress
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="text-center py-8 text-muted-foreground">
                  <BarChart3 className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Analytics dashboard coming soon</p>
                  <p className="text-sm">Track student performance and test completion rates</p>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </AdminLayout>
  );
};

export default AdminIELTS;