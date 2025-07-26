import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { useAdminContent } from "@/hooks/useAdminContent";
import { 
  BookOpen, 
  Headphones, 
  PenTool, 
  Mic,
  Settings,
  LogOut,
  Plus
} from "lucide-react";

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { admin, loading: authLoading, logout } = useAdminAuth();
  const { listContent, loading: contentLoading } = useAdminContent();
  const [stats, setStats] = useState({
    reading_passages: 0,
    listening_sections: 0,
    writing_prompts: 0,
    speaking_prompts: 0
  });

  useEffect(() => {
    if (!authLoading && !admin) {
      navigate("/admin/login");
      return;
    }

    if (admin) {
      loadStats();
    }
  }, [admin, authLoading, navigate]);

  const loadStats = async () => {
    try {
      const [reading, listening, writing, speaking] = await Promise.all([
        listContent('reading_passages'),
        listContent('listening_sections'),
        listContent('writing_prompts'),
        listContent('speaking_prompts')
      ]);

      setStats({
        reading_passages: reading.data?.length || 0,
        listening_sections: listening.data?.length || 0,
        writing_prompts: writing.data?.length || 0,
        speaking_prompts: speaking.data?.length || 0
      });
    } catch (error) {
      console.error('Error loading stats:', error);
    }
  };

  const handleLogout = () => {
    logout();
    navigate("/admin/login");
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">Loading...</div>
      </div>
    );
  }

  if (!admin) {
    return null;
  }

  const contentSections = [
    {
      title: "Reading Passages",
      icon: BookOpen,
      count: stats.reading_passages,
      color: "text-green-600",
      bgColor: "bg-green-light/30",
      route: "/admin/reading"
    },
    {
      title: "Listening Sections",
      icon: Headphones,
      count: stats.listening_sections,
      color: "text-blue-600",
      bgColor: "bg-blue-light/30",
      route: "/admin/listening"
    },
    {
      title: "Writing Prompts",
      icon: PenTool,
      count: stats.writing_prompts,
      color: "text-purple-600",
      bgColor: "bg-purple-light/30",
      route: "/admin/writing"
    },
    {
      title: "Speaking Prompts",
      icon: Mic,
      count: stats.speaking_prompts,
      color: "text-orange-600",
      bgColor: "bg-orange-light/30",
      route: "/admin/speaking"
    }
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-background shadow-soft">
        <div className="container mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-light rounded-full flex items-center justify-center">
                <Settings className="w-5 h-5 text-blue-deep" />
              </div>
              <div>
                <h1 className="text-xl font-semibold">Admin Dashboard</h1>
                <p className="text-sm text-muted-foreground">Welcome, {admin.name}</p>
              </div>
            </div>
            
            <Button variant="outline" onClick={handleLogout}>
              <LogOut className="w-4 h-4 mr-2" />
              Logout
            </Button>
          </div>
        </div>
      </header>

      <div className="container mx-auto px-4 py-8">
        <div className="space-y-8">
          {/* Stats Overview */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {contentSections.map((section) => {
              const Icon = section.icon;
              return (
                <Card key={section.title} className="hover:shadow-medium transition-shadow duration-300">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-muted-foreground">{section.title}</p>
                        <p className="text-2xl font-bold">{section.count}</p>
                      </div>
                      <div className={`w-12 h-12 rounded-full ${section.bgColor} flex items-center justify-center`}>
                        <Icon className={`w-6 h-6 ${section.color}`} />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Content Management */}
          <div className="space-y-6">
            <h2 className="text-2xl font-semibold">Content Management</h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {contentSections.map((section) => {
                const Icon = section.icon;
                return (
                  <Card key={section.title}>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-3">
                        <Icon className={`w-5 h-5 ${section.color}`} />
                        {section.title}
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <p className="text-sm text-muted-foreground">
                        Manage {section.title.toLowerCase()} for IELTS tests
                      </p>
                      <div className="flex gap-2">
                        <Button onClick={() => navigate(section.route)} variant="outline" className="flex-1">
                          View All ({section.count})
                        </Button>
                        <Button onClick={() => navigate(`${section.route}/create`)} size="sm">
                          <Plus className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;