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
  return <div className="min-h-screen" style={{ backgroundColor: '#ffffff' }}>
      {/* Header with optional Back button */}
      

      {/* Main Content */}
      <main className="container mx-auto px-6 py-8">
        {children}
      </main>
    </div>;
};
export default StudentLayout;