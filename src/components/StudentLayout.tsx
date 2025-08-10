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
  showBackButton = false,
  backPath
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
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-100 via-blue-50/30 to-indigo-100/50" style={{
      backgroundImage: 'radial-gradient(circle at 20% 80%, rgba(120, 119, 198, 0.1) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(255, 255, 255, 0.8) 0%, transparent 50%), radial-gradient(circle at 40% 40%, rgba(59, 130, 246, 0.05) 0%, transparent 50%)'
    }}>
      {/* Header with optional Back button */}
      <header className="container mx-auto px-6 pt-6 flex items-center gap-3">
        {showBackButton && (
          <Button
            variant="ghost"
            size="icon"
            aria-label="Go back"
            onClick={() => (backPath ? navigate(backPath) : navigate(-1))}
          >
            <ArrowLeft className="h-5 w-5" />
          </Button>
        )}
        <h1 className="text-lg md:text-xl font-semibold">{title}</h1>
      </header>

      {/* Main Content */}
      <main className="container mx-auto px-6 py-8">
        {children}
      </main>
    </div>
  );
};
export default StudentLayout;