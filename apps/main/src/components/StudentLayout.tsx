import { ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useThemeStyles } from "@/hooks/useThemeStyles";
import { ArrowLeft, Home, BookOpen, Headphones, PenTool, Mic, FileText, CheckSquare, HelpCircle } from "lucide-react";
interface StudentLayoutProps {
  children: ReactNode;
  title: string;
  showBackButton?: boolean;
  backPath?: string;
  transparentBackground?: boolean;
  fullWidth?: boolean;
  noPadding?: boolean;
}

const StudentLayout = ({
  children,
  title,
  showBackButton = false,
  backPath,
  transparentBackground = false,
  fullWidth = false,
  noPadding = false
}: StudentLayoutProps) => {
  const navigate = useNavigate();
  const themeStyles = useThemeStyles();
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
    <div
      className={`min-h-screen ${transparentBackground ? 'bg-transparent' : 'bg-gradient-to-br from-slate-100 via-blue-50/30 to-indigo-100/50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 dark:opacity-95'}`}
      style={transparentBackground ? {} : {
        backgroundImage: 'radial-gradient(circle at 20% 80%, rgba(120, 119, 198, 0.08) 0%, transparent 50%), radial-gradient(circle at 80% 20%, rgba(255, 255, 255, 0.05) 0%, transparent 50%), radial-gradient(circle at 40% 40%, rgba(59, 130, 246, 0.03) 0%, transparent 50%)'
      }}
    >
      {/* Header with optional Back button */}
      {showBackButton && (
        <div className="absolute top-0 left-0 w-full z-50 pointer-events-none">
          <div className={`${fullWidth ? 'w-full px-4' : 'container mx-auto px-6'} pt-6`}>
            <Button
              variant="ghost"
              onClick={() => {
                if (backPath) navigate(backPath);
                else navigate(-1);
              }}
              className={`pointer-events-auto rounded-full h-9 px-4 transition-all shadow-none hover:bg-transparent p-0 h-auto mb-4 ${themeStyles.theme.name === 'note' ? 'hover:text-[#8B7355]' : 'hover:text-primary'}`}
              style={{
                color: themeStyles.theme.name === 'note' ? '#5d4e37' : themeStyles.textPrimary
              }}
            >
              <ArrowLeft className="w-5 h-5 mr-2" />
              <span className={`font-medium ${themeStyles.theme.name === 'note' ? 'font-handwriting text-xl' : ''}`}>Back</span>
            </Button>
          </div>
        </div>
      )}      {/* Main Content */}
      <main className={`${fullWidth ? 'w-full' : 'container mx-auto px-6'} ${noPadding ? '' : 'py-8'}`}>
        {children}
      </main>
    </div>
  );
};
export default StudentLayout;