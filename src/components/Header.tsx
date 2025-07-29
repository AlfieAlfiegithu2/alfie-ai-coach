
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { Menu, X, LogOut, Settings, User, Shield } from "lucide-react";
import { useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const Header = () => {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { admin } = useAdminAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 max-w-screen-2xl items-center justify-between px-4">
        {/* Logo */}
        <div className="flex items-center space-x-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-secondary">
            <span className="text-lg font-bold text-primary-foreground">A</span>
          </div>
          <span className="text-xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent">
            ALFIE IELTS AI
          </span>
        </div>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center space-x-6">
          <Button
            variant="ghost"
            onClick={() => navigate('/tests')}
            className="text-sm font-medium transition-colors hover:text-primary"
          >
            Tests
          </Button>
          <Button
            variant="ghost"
            onClick={() => navigate('/practice')}
            className="text-sm font-medium transition-colors hover:text-primary"
          >
            Practice
          </Button>
          <Button
            variant="ghost"
            onClick={() => navigate('/dashboard')}
            className="text-sm font-medium transition-colors hover:text-primary"
          >
            Dashboard
          </Button>
          <Button
            variant="ghost"
            onClick={() => navigate('/community')}
            className="text-sm font-medium transition-colors hover:text-primary"
          >
            Community
          </Button>
        </nav>

        {/* Right side actions */}
        <div className="flex items-center space-x-4">
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="relative h-8 w-8 rounded-full">
                  <User className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent className="w-56" align="end" forceMount>
                <div className="flex items-center justify-start gap-2 p-2">
                  <div className="flex flex-col space-y-1 leading-none">
                    <p className="font-medium">{user.email}</p>
                  </div>
                </div>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate('/dashboard')}>
                  <User className="mr-2 h-4 w-4" />
                  Dashboard
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate('/personal-page')}>
                  <Settings className="mr-2 h-4 w-4" />
                  Settings
                </DropdownMenuItem>
                {admin && (
                  <DropdownMenuItem onClick={() => navigate('/admin')}>
                    <Shield className="mr-2 h-4 w-4" />
                    Admin Dashboard
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut}>
                  <LogOut className="mr-2 h-4 w-4" />
                  Sign Out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <div className="hidden md:flex items-center space-x-3">
              <Button
                variant="ghost"
                onClick={() => navigate('/auth')}
                className="text-sm font-medium"
              >
                Sign In
              </Button>
              <Button
                onClick={() => navigate('/auth')}
                className="text-sm font-medium bg-gradient-to-r from-primary to-secondary hover:opacity-90"
              >
                Start Journey
              </Button>
            </div>
          )}

          {/* Admin Button - only show if not already admin */}
          {!admin && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => navigate('/admin/login')}
              className="hidden md:flex text-xs"
            >
              Admin
            </Button>
          )}

          {/* Mobile menu button */}
          <Button
            variant="ghost"
            size="sm"
            className="md:hidden"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
          </Button>
        </div>
      </div>

      {/* Mobile Navigation */}
      {mobileMenuOpen && (
        <div className="md:hidden border-t border-border/40 bg-background/95 backdrop-blur">
          <div className="container px-4 py-4 space-y-3">
            <Button
              variant="ghost"
              onClick={() => navigate('/tests')}
              className="w-full justify-start"
            >
              Tests
            </Button>
            <Button
              variant="ghost"
              onClick={() => navigate('/practice')}
              className="w-full justify-start"
            >
              Practice
            </Button>
            <Button
              variant="ghost"
              onClick={() => navigate('/dashboard')}
              className="w-full justify-start"
            >
              Dashboard
            </Button>
            <Button
              variant="ghost"
              onClick={() => navigate('/community')}
              className="w-full justify-start"
            >
              Community
            </Button>
            {!user && (
              <>
                <Button
                  variant="ghost"
                  onClick={() => navigate('/auth')}
                  className="w-full justify-start"
                >
                  Sign In
                </Button>
                <Button
                  onClick={() => navigate('/auth')}
                  className="w-full justify-start bg-gradient-to-r from-primary to-secondary"
                >
                  Start Journey
                </Button>
              </>
            )}
            {!admin && (
              <Button
                variant="outline"
                onClick={() => navigate('/admin/login')}
                className="w-full justify-start"
              >
                Admin Login
              </Button>
            )}
          </div>
        </div>
      )}
    </header>
  );
};

export default Header;
