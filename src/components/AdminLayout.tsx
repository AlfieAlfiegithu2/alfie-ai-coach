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
    <div className="relative min-h-screen overflow-hidden">
      {/* Background Image to match student portal */}
      <div className="fixed inset-0 w-full h-full">
        <img
          src="/lovable-uploads/c25cc620-ab6d-47a4-9dc6-32d1f6264773.png"
          alt="Background"
          className="absolute inset-0 w-full h-full object-cover"
        />
      </div>

      {/* Header Navigation */}
      <header className="relative z-10 bg-white/10 backdrop-blur-xl border-b border-white/20 sticky top-0">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {showBackButton && (
                <Button 
                  variant="ghost" 
                  onClick={() => navigate(backPath)}
                  className="rounded-xl bg-white/10 text-white hover:bg-white/15"
                >
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>
              )}
              <div className="flex items-center gap-3">
                <Settings className="w-6 h-6 text-white" />
                <h1 className="text-2xl font-light text-white">Admin - {title}</h1>
              </div>
            </div>
            
            <Button 
              variant="ghost" 
              onClick={() => navigate('/')}
              className="rounded-xl bg-white/10 text-white hover:bg-white/15"
            >
              <Home className="w-4 h-4 mr-2" />
              Student Portal
            </Button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 container mx-auto px-6 py-8">
        {children}
      </main>
    </div>
  );
};

export default AdminLayout;