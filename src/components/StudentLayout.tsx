import { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Home, BookOpen, Headphones, PenTool, Mic, FileText, CheckSquare, HelpCircle } from "lucide-react";
interface StudentLayoutProps {
  children: ReactNode;
  title: string;
  showBackButton?: boolean;
  backPath?: string;
}
const StudentLayout = ({
  children,
  title,
  showBackButton = true,
  backPath = "/"
}: StudentLayoutProps) => {
  const navigate = useNavigate();
  const navigationItems = [{
    name: "Reading",
    path: "/reading",
    icon: BookOpen,
    color: "from-green-400 to-green-600"
  }, {
    name: "Listening",
    path: "/listening",
    icon: Headphones,
    color: "from-blue-400 to-blue-600"
  }, {
    name: "Writing",
    path: "/writing",
    icon: PenTool,
    color: "from-purple-400 to-purple-600"
  }, {
    name: "Speaking",
    path: "/speaking",
    icon: Mic,
    color: "from-orange-400 to-orange-600"
  }];
  const practiceItems = [{
    name: "Practice Tests",
    path: "/tests",
    icon: FileText
  }, {
    name: "Answer Sheets",
    path: "/answer-sheets",
    icon: CheckSquare
  }, {
    name: "Model Answers",
    path: "/model-answers",
    icon: HelpCircle
  }, {
    name: "Explanations",
    path: "/explanations",
    icon: HelpCircle
  }];
  return <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-blue-50">
      {/* Header Navigation */}
      <header className="bg-white/90 backdrop-blur-sm border-b border-light-border sticky top-0 z-50">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              {showBackButton && <Button variant="ghost" onClick={() => navigate(backPath)} className="hover:bg-gentle-blue/10 rounded-xl">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back
                </Button>}
              <h1 className="text-2xl font-georgia font-bold text-foreground">{title}</h1>
            </div>
            
            <Button variant="ghost" onClick={() => navigate('/')} className="hover:bg-gentle-blue/10 rounded-xl">
              <Home className="w-4 h-4 mr-2" />
              Home
            </Button>
          </div>
        </div>
      </header>

      {/* Navigation Bar */}
      

      {/* Main Content */}
      <main className="container mx-auto px-6 py-8">
        {children}
      </main>
    </div>;
};
export default StudentLayout;