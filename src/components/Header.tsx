import { Button } from "@/components/ui/button";
import { BookOpen, User } from "lucide-react";

const Header = () => {
  return (
    <header className="w-full bg-background border-b border-border shadow-soft">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gradient-to-r from-blue-deep to-blue-medium flex items-center justify-center">
            <BookOpen className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground">Alfie IELTS AI Mock</h1>
            <p className="text-sm text-muted-foreground">AI-Powered Test Preparation</p>
          </div>
        </div>
        
        <nav className="hidden md:flex items-center gap-6">
          <a href="#tests" className="text-foreground hover:text-primary transition-colors">Tests</a>
          <a href="#practice" className="text-foreground hover:text-primary transition-colors">Practice</a>
          <a href="#progress" className="text-foreground hover:text-primary transition-colors">Progress</a>
          <a href="#community" className="text-foreground hover:text-primary transition-colors">Community</a>
        </nav>

        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm">
            <User className="w-4 h-4" />
            Login
          </Button>
          <Button variant="hero" size="sm">
            Get Started
          </Button>
        </div>
      </div>
    </header>
  );
};

export default Header;