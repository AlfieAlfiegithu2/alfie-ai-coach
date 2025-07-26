import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  BookOpen, 
  Headphones, 
  PenTool, 
  Mic,
  BarChart3,
  FileText,
  Users,
  Plus
} from "lucide-react";
import AdminLayout from "@/components/AdminLayout";

const AdminDashboard = () => {
  const navigate = useNavigate();

  const contentSections = [
    {
      title: "Reading Passages",
      description: "Manage reading passages and questions from Cambridge books C20 to C1",
      icon: BookOpen,
      route: "/admin/reading",
      count: "0 passages"
    },
    {
      title: "Listening Sections", 
      description: "Manage audio content and questions from Cambridge books C20 to C1",
      icon: Headphones,
      route: "/admin/listening",
      count: "0 sections"
    },
    {
      title: "Writing Prompts",
      description: "Manage writing tasks and prompts from Cambridge books C20 to C1", 
      icon: PenTool,
      route: "/admin/writing",
      count: "0 prompts"
    },
    {
      title: "Speaking Prompts",
      description: "Manage speaking questions and prompts from Cambridge books C20 to C1",
      icon: Mic,
      route: "/admin/speaking", 
      count: "0 prompts"
    }
  ];


  return (
    <AdminLayout title="Dashboard" showBackButton={false}>
      <div className="max-w-7xl mx-auto">
        {/* Welcome Section */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-georgia font-bold text-foreground mb-4">
            Content Management
          </h1>
          <p className="text-xl text-warm-gray max-w-3xl mx-auto leading-relaxed">
            Manage IELTS content across Cambridge books C20 to C1. Create comprehensive test materials with our intuitive interface.
          </p>
        </div>

        {/* Content Management Grid */}
        <div className="mb-16">
          <h2 className="text-3xl font-georgia font-bold text-center text-foreground mb-8">
            Content Sections
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {contentSections.map((section) => {
              const Icon = section.icon;
              return (
                <Card
                  key={section.title}
                  className="cursor-pointer transition-all duration-300 rounded-2xl border-light-border shadow-soft hover:shadow-lg hover:scale-105"
                  onClick={() => navigate(section.route)}
                  style={{ background: 'var(--gradient-card)' }}
                >
                  <CardContent className="p-8">
                    <div 
                      className="w-16 h-16 rounded-2xl flex items-center justify-center mb-6"
                      style={{ background: 'var(--gradient-button)' }}
                    >
                      <Icon className="w-8 h-8 text-white" />
                    </div>
                    <h3 className="font-semibold text-foreground text-xl mb-3">{section.title}</h3>
                    <p className="text-sm text-warm-gray mb-4 leading-relaxed">{section.description}</p>
                    <div className="flex justify-between items-center">
                      <div className="text-xs text-gentle-blue font-medium">{section.count}</div>
                      <Button 
                        size="sm"
                        className="rounded-xl"
                        style={{ background: 'var(--gradient-button)', border: 'none' }}
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(section.route);
                        }}
                      >
                        <Plus className="w-4 h-4 mr-1" />
                        Add
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </div>

        {/* Quick Stats Section */}
        <Card className="rounded-2xl border-light-border shadow-soft" style={{ background: 'var(--gradient-card)' }}>
          <CardHeader>
            <CardTitle className="text-3xl font-georgia text-center text-foreground">
              Quick Overview
            </CardTitle>
            <p className="text-warm-gray text-center text-lg">
              Manage all your IELTS content efficiently
            </p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-gentle-blue">0</div>
                <div className="text-sm text-warm-gray">Reading Tests</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-gentle-blue">0</div>
                <div className="text-sm text-warm-gray">Listening Tests</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-gentle-blue">0</div>
                <div className="text-sm text-warm-gray">Writing Prompts</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-gentle-blue">0</div>
                <div className="text-sm text-warm-gray">Speaking Prompts</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default AdminDashboard;