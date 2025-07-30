import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BookOpen, Headphones, PenTool, Mic, Upload, FileText, Users } from "lucide-react";
import AdminLayout from "@/components/AdminLayout";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import CSVImport from "@/components/CSVImport";

const AdminTestDetails = () => {
  const navigate = useNavigate();
  const { testType, testId } = useParams<{ testType: string; testId: string }>();
  const { admin, loading } = useAdminAuth();

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
          <p className="mt-2 text-sm text-muted-foreground">Loading Test Details...</p>
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
      description: "Manage reading passages and comprehension questions",
      color: "text-blue-600",
      bgColor: "bg-blue-50"
    },
    {
      id: "listening",
      title: "Listening",
      icon: Headphones,
      description: "Manage audio files and listening comprehension questions",
      color: "text-green-600",
      bgColor: "bg-green-50"
    },
    {
      id: "writing",
      title: "Writing",
      icon: PenTool,
      description: "Manage writing prompts and assessment criteria",
      color: "text-purple-600",
      bgColor: "bg-purple-50"
    },
    {
      id: "speaking",
      title: "Speaking",
      icon: Mic,
      description: "Manage speaking topics and assessment criteria",
      color: "text-orange-600",
      bgColor: "bg-orange-50"
    }
  ];

  const handleCSVImport = async (questions: any[], section: string, partNumber: number = 1) => {
    try {
      // This will be handled by the CSVImport component's internal logic
      console.log('Importing questions for section:', section, 'part:', partNumber);
    } catch (error) {
      console.error('Error importing questions:', error);
    }
  };

  return (
    <AdminLayout 
      title={`${testType?.toUpperCase()} Test ${testId}`} 
      showBackButton={true} 
      backPath={`/admin/${testType}/tests`}
    >
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
              {testType?.toUpperCase()} Test {testId} Management
            </h1>
            <p className="text-muted-foreground mt-1">
              Manage content for all four skills
            </p>
          </div>
          <Badge variant="secondary" className="text-sm">
            Test {testId}
          </Badge>
        </div>

        {/* Sections Grid */}
        <div className="grid gap-6 md:grid-cols-2">
          {sections.map((section) => {
            const Icon = section.icon;
            return (
              <Card 
                key={section.id} 
                className="hover:shadow-lg transition-all duration-200 cursor-pointer border-border/40"
              >
                <CardHeader>
                  <div className="flex items-center space-x-3">
                    <div className={`p-2 rounded-lg ${section.bgColor}`}>
                      <Icon className={`h-6 w-6 ${section.color}`} />
                    </div>
                    <div>
                      <CardTitle className="text-xl">{section.title}</CardTitle>
                      <CardDescription>{section.description}</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <Tabs defaultValue="content" className="w-full">
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="content">Manage Content</TabsTrigger>
                      <TabsTrigger value="upload">Upload CSV</TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="content" className="mt-4">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between text-sm">
                          <span className="text-muted-foreground">Current Content:</span>
                          <Badge variant="outline">0 items</Badge>
                        </div>
                        <Button 
                          variant="outline" 
                          className="w-full"
                          onClick={() => navigate(`/admin/${testType}/test/${testId}/${section.id}`)}
                        >
                          <FileText className="w-4 h-4 mr-2" />
                          Manage {section.title}
                        </Button>
                      </div>
                    </TabsContent>
                    
                    <TabsContent value="upload" className="mt-4">
                      <div className="space-y-3">
                        <CSVImport 
                          onImport={(questions) => handleCSVImport(questions, section.id)}
                          type={section.id as "reading" | "listening" | "writing" | "speaking"}
                          module={testType as "ielts" | "pte" | "toefl" | "general"}
                          testId={testId}
                          testType={testType}
                        />
                      </div>
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>
            );
          })}
        </div>

        {/* Quick Actions */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Upload className="h-5 w-5" />
              <span>Bulk Operations</span>
            </CardTitle>
            <CardDescription>
              Perform bulk operations on test content
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid gap-4 md:grid-cols-3">
              <Button variant="outline" className="w-full">
                <Upload className="w-4 h-4 mr-2" />
                Import All Sections
              </Button>
              <Button variant="outline" className="w-full">
                <FileText className="w-4 h-4 mr-2" />
                Export Test Data
              </Button>
              <Button variant="outline" className="w-full">
                <Users className="w-4 h-4 mr-2" />
                Preview Test
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default AdminTestDetails;