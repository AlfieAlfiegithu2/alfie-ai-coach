import { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Home, BookOpen, Headphones, PenTool, Mic, Settings, Users, BarChart3 } from "lucide-react";

interface AdminLayoutProps {
  children: ReactNode;
  title: string;
  showBackButton?: boolean;
  backPath?: string;
}

const AdminLayout = ({ children, title, showBackButton = true, backPath = "/admin" }: AdminLayoutProps) => {
  const navigate = useNavigate();

  const contentSections = [
    { name: "Reading", path: "/admin/reading", icon: BookOpen, color: "from-green-400 to-green-600" },
    { name: "Listening", path: "/admin/listening", icon: Headphones, color: "from-blue-400 to-blue-600" },
    { name: "Writing", path: "/admin/writing", icon: PenTool, color: "from-purple-400 to-purple-600" },
    { name: "Speaking", path: "/admin/speaking", icon: Mic, color: "from-orange-400 to-orange-600" },
  ];

  // Remove management items as requested

  return (
    <div className="min-h-screen relative" style={{ 
      backgroundImage: "url('/lovable-uploads/38d81cb0-fd21-4737-b0f5-32bc5d0ae774.png')",
      backgroundSize: 'cover',
      backgroundPosition: 'center',
      backgroundAttachment: 'fixed'
    }}>
      {/* Header Navigation */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-light-border sticky top-0 z-50 relative">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {showBackButton && (
                <Button 
                  variant="ghost" 
                  onClick={() => navigate(backPath)}
                  className="hover:bg-gentle-blue/10 rounded-xl"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
              )}
              <div className="flex items-center gap-3">
                <Settings className="w-6 h-6 text-gentle-blue" />
                <h1 className="text-2xl font-georgia font-bold text-foreground">Admin - {title}</h1>
              </div>
            </div>
            
            <Button 
              variant="ghost" 
              onClick={() => navigate('/')}
              className="hover:bg-gentle-blue/10 rounded-xl"
            >
              <Home className="w-4 h-4 mr-2" />
              Student Portal
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-8 relative z-10">
        {children}
      </main>
    </div>
  );
};

export default AdminLayout;