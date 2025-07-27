
import { Button } from "@/components/ui/button";
import { BookOpen, User, Zap } from "lucide-react";

const Header = () => {
  return (
    <header className="w-full bg-background/80 backdrop-blur-md border-b border-border/20 shadow-neon sticky top-0 z-50">
      <div className="container mx-auto px-4 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-electric-blue to-neon-cyan flex items-center justify-center shadow-neon">
            <BookOpen className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-foreground font-orbitron">
              <span className="text-electric-blue">ALFIE</span> IELTS AI
            </h1>
            <p className="text-sm text-muted-foreground">Master IELTS with AI Power</p>
          </div>
        </div>
        
        <nav className="hidden md:flex items-center gap-8">
          <button onClick={() => window.location.href = '/tests'} className="text-foreground hover:text-electric-blue transition-colors relative group">
            Tests
            <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-gradient-to-r from-electric-blue to-neon-cyan group-hover:w-full transition-all duration-300"></span>
          </button>
          <button onClick={() => window.location.href = '/practice'} className="text-foreground hover:text-electric-blue transition-colors relative group">
            Practice
            <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-gradient-to-r from-electric-blue to-neon-cyan group-hover:w-full transition-all duration-300"></span>
          </button>
          <button onClick={() => window.location.href = '/personal-page'} className="text-foreground hover:text-electric-blue transition-colors relative group">
            Progress
            <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-gradient-to-r from-electric-blue to-neon-cyan group-hover:w-full transition-all duration-300"></span>
          </button>
          <button onClick={() => window.location.href = '/community'} className="text-foreground hover:text-electric-blue transition-colors relative group">
            Community
            <span className="absolute bottom-0 left-0 w-0 h-0.5 bg-gradient-to-r from-electric-blue to-neon-cyan group-hover:w-full transition-all duration-300"></span>
          </button>
        </nav>

        <div className="flex items-center gap-3">
          <Button variant="ghost" size="sm" onClick={() => window.location.href = '/admin'}>
            <User className="w-4 h-4" />
            Login
          </Button>
          <Button variant="neon" size="sm" onClick={() => window.location.href = '/tests'}>
            <Zap className="w-4 h-4" />
            Start Journey
          </Button>
        </div>
      </div>
    </header>
  );
};

export default Header;
