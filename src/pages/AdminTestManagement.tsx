import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { BookOpen, Headphones, PenTool, Mic, Clock, Users, Info } from "lucide-react";
import AdminLayout from "@/components/AdminLayout";
import { useAdminAuth } from "@/hooks/useAdminAuth";

const AdminTestManagement = () => {
  const navigate = useNavigate();
  const { testType } = useParams<{ testType: string }>();
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
          <p className="mt-2 text-sm text-muted-foreground">Loading Test Management...</p>
        </div>
      </div>
    );
  }

  if (!admin) {
    return null;
  }

  const getTestTypeConfig = () => {
    switch (testType) {
      case 'ielts':
        return {
          title: 'IELTS Mock Tests',
          description: 'IELTS Academic and General Training Tests',
          color: 'from-blue-500 to-purple-600'
        };
      case 'pte':
        return {
          title: 'PTE Mock Tests',
          description: 'PTE Academic Test Preparation',
          color: 'from-green-500 to-blue-600'
        };
      case 'toefl':
        return {
          title: 'TOEFL Mock Tests',
          description: 'TOEFL iBT Test Preparation',
          color: 'from-orange-500 to-red-600'
        };
      case 'general':
        return {
          title: 'General English Tests',
          description: 'English Proficiency Development',
          color: 'from-purple-500 to-pink-600'
        };
      default:
        return {
          title: 'Mock Tests',
          description: 'Test Preparation',
          color: 'from-blue-500 to-purple-600'
        };
    }
  };

  const config = getTestTypeConfig();

  const tests = Array.from({ length: 10 }, (_, i) => ({
    id: i + 1,
    title: `${testType?.toUpperCase()} Test ${i + 1}`,
    subtitle: testType === 'ielts' ? 'Mixed Bands' : 'Mixed Bands',
    duration: '2h 45m',
    sections: 4,
    isActive: true
  }));

  return (
    <AdminLayout 
      title={config.title} 
      showBackButton={true} 
      backPath={`/admin/${testType}`}
    >
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className={`text-3xl font-bold tracking-tight bg-gradient-to-r ${config.color} bg-clip-text text-transparent`}>
              {config.title}
            </h1>
            <p className="text-muted-foreground mt-1">
              {config.description}
            </p>
          </div>
          <Badge variant="secondary" className="text-sm">
            {testType?.toUpperCase()} Module
          </Badge>
        </div>

        {/* Test Cards Grid */}
        <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {tests.map((test) => (
            <Card 
              key={test.id} 
              className="hover:shadow-lg transition-all duration-200 cursor-pointer border-border/40 bg-card/50 backdrop-blur-sm"
              onClick={() => navigate(`/admin/${testType}/test/${test.id}`)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-lg font-semibold text-foreground">
                    {test.title}
                  </CardTitle>
                  <Info className="w-4 h-4 text-primary" />
                </div>
                <CardDescription className="text-sm text-muted-foreground">
                  <div className="flex items-center space-x-1">
                    <Users className="w-3 h-3" />
                    <span>{test.subtitle}</span>
                  </div>
                </CardDescription>
              </CardHeader>
              
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between text-sm text-muted-foreground">
                  <div className="flex items-center space-x-1">
                    <Clock className="w-3 h-3" />
                    <span>{test.duration}</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <BookOpen className="w-3 h-3" />
                    <span>{test.sections} sections included</span>
                  </div>
                </div>
                
                <Button 
                  className="w-full bg-primary hover:bg-primary/90 text-primary-foreground"
                  onClick={(e) => {
                    e.stopPropagation();
                    navigate(`/admin/${testType}/test/${test.id}`);
                  }}
                >
                  Manage Test Content
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </AdminLayout>
  );
};

export default AdminTestManagement;