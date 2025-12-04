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
  Plus,
  Activity,
  Library,
  Image,
  Wand2,
  Radio,
  UserPlus
} from "lucide-react";
import AdminLayout from "@/components/AdminLayout";

const AdminDashboard = () => {
  const navigate = useNavigate();

  const testTypes = [
    {
      title: "IELTS Admin",
      description: "Manage IELTS Academic & General content",
      icon: BookOpen,
      route: "/admin/ielts",
      count: "IELTS Tests"
    },
    {
      title: "PTE Admin", 
      description: "Manage PTE Academic content and integrated tasks",
      icon: Headphones,
      route: "/admin/pte",
      count: "PTE Tests"
    },
    {
      title: "TOEFL Admin",
      description: "Manage TOEFL iBT content across all sections", 
      icon: PenTool,
      route: "/admin/toefl",
      count: "TOEFL Tests"
    },
    {
      title: "TOEIC Admin",
      description: "Manage TOEIC Listening & Reading tests",
      icon: FileText,
      route: "/admin/toeic",
      count: "TOEIC Tests"
    },
    {
      title: "General English Admin",
      description: "Manage ESL/EFL lessons and exercises",
      icon: Mic,
      route: "/admin/general-english", 
      count: "English Lessons"
    },
    {
      title: "Vocabulary Admin",
      description: "Manage vocabulary decks and AI cards",
      icon: FileText,
      route: "/admin/vocab",
      count: "Vocab"
    },
    {
      title: "Analytics Dashboard",
      description: "Audio usage, storage & cost tracking",
      icon: BarChart3,
      route: "/admin/analytics",
      count: "View Stats"
    },
    {
      title: "Blog Management",
      description: "Create and manage blog posts in 23 languages",
      icon: FileText,
      route: "/admin/blog",
      count: "Blog Posts"
    },
    {
      title: "Grammar Learning",
      description: "Manage grammar lessons, exercises & translations",
      icon: BookOpen,
      route: "/admin/grammar",
      count: "24 Topics"
    },
    {
      title: "NCLEX Admin",
      description: "Manage NCLEX nursing practice tests with SATA & MCQ",
      icon: Activity,
      route: "/admin/nclex",
      count: "NCLEX Tests"
    },
    {
      title: "Book Creation",
      description: "AI-powered paraphrasing & book publishing with Gemini 3.0 Pro",
      icon: Library,
      route: "/admin/books",
      count: "Books"
    },
    {
      title: "Templates",
      description: "Upload charts, graphs & visual templates for students",
      icon: Image,
      route: "/admin/templates",
      count: "Templates"
    },
    {
      title: "Podcasts",
      description: "Create & manage audio podcasts for listening practice",
      icon: Radio,
      route: "/admin/podcasts",
      count: "Podcasts"
    },
    {
      title: "Affiliate Management",
      description: "Manage affiliates, promo codes, referrals & payouts",
      icon: UserPlus,
      route: "/admin/affiliates",
      count: "Affiliates"
    }
  ];


  return (
    <AdminLayout title="Dashboard" showBackButton={false}>
      <div className="max-w-7xl mx-auto" style={{ backgroundColor: '#f5f2e8' }}>
        {/* Welcome Section */}
        <div className="text-center mb-12">
          <h1 className="text-5xl font-georgia font-bold text-[#2d2d2d] mb-4">
            Test Administration Center
          </h1>
          <p className="text-xl text-[#666666] max-w-3xl mx-auto leading-relaxed">
            Manage content for IELTS, PTE, TOEFL, and General English. Independent admin portals for each test type.
          </p>
        </div>

        {/* Content Management Grid */}
        <div className="mb-16">
          <h2 className="text-3xl font-georgia font-bold text-center text-[#2d2d2d] mb-8">
            Test Type Administration
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-6">
            {testTypes.map((section) => {
              const Icon = section.icon;
              return (
                <Card
                  key={section.title}
                  className="cursor-pointer transition-all duration-300 rounded-2xl border-[#e6e0d4] shadow-soft hover:shadow-lg hover:scale-105"
                  onClick={() => navigate(section.route)}
                  style={{ backgroundColor: '#faf8f6' }}
                >
                  <CardContent className="p-8">
                    <div
                      className="w-16 h-16 rounded-2xl flex items-center justify-center mb-6"
                      style={{ backgroundColor: '#d97757' }}
                    >
                      <Icon className="w-8 h-8 text-white" />
                    </div>
                    <h3 className="font-semibold text-[#2d2d2d] text-xl mb-3">{section.title}</h3>
                    <p className="text-sm text-[#666666] mb-4 leading-relaxed">{section.description}</p>
                    <div className="flex justify-between items-center">
                      <div className="text-xs text-[#d97757] font-medium">{section.count}</div>
                      <Button
                        size="sm"
                        className="rounded-xl"
                        style={{ backgroundColor: '#d97757', border: 'none' }}
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
        <Card className="rounded-2xl border-[#e6e0d4] shadow-soft" style={{ backgroundColor: '#faf8f6' }}>
          <CardHeader>
            <CardTitle className="text-3xl font-georgia text-center text-[#2d2d2d]">
              Quick Overview
            </CardTitle>
            <p className="text-[#666666] text-center text-lg">
              Manage all your IELTS content efficiently
            </p>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
              <div>
                <div className="text-2xl font-bold text-[#d97757]">0</div>
                <div className="text-sm text-[#666666]">Reading Tests</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-[#d97757]">0</div>
                <div className="text-sm text-[#666666]">Listening Tests</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-[#d97757]">0</div>
                <div className="text-sm text-[#666666]">Writing Prompts</div>
              </div>
              <div>
                <div className="text-2xl font-bold text-[#d97757]">0</div>
                <div className="text-sm text-[#666666]">Speaking Prompts</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </AdminLayout>
  );
};

export default AdminDashboard;