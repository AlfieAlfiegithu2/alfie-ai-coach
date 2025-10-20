import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { useSentenceMasteryAuth } from "@/hooks/useSentenceMasteryAuth";
import { Menu, X, LogOut, Settings, User, Shield, BookOpen } from "lucide-react";
import { useState } from "react";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useTranslation } from 'react-i18next';

const Header = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const {
    user,
    signOut
  } = useAuth();
  const {
    admin
  } = useAdminAuth();
  const { navigateToSentenceMastery } = useSentenceMasteryAuth();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  
  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };

  return <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container px-4 py-4 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-2 cursor-pointer" onClick={() => navigate('/')}>
          <h1 className="text-2xl font-bold text-primary">English AIdol</h1>
        </div>

        {/* Desktop Navigation */}
        <nav className="hidden md:flex items-center gap-4">
          <Button variant="ghost" onClick={() => navigate('/tests')}>
            {t('navigation.tests', { defaultValue: 'Tests' })}
          </Button>
          <Button variant="ghost" onClick={() => navigate('/practice')}>
            {t('navigation.practice', { defaultValue: 'Practice' })}
          </Button>
          <Button variant="ghost" onClick={() => navigate('/dashboard')}>
            {t('header.dashboard', { defaultValue: 'Dashboard' })}
          </Button>
          <Button variant="ghost" onClick={() => navigate('/community')}>
            {t('navigation.community', { defaultValue: 'Community' })}
          </Button>
          {/* Sentence Mastery Link */}
          <Button 
            variant="outline" 
            onClick={navigateToSentenceMastery}
            className="gap-2"
          >
            <BookOpen className="w-4 h-4" />
            {t('navigation.sentenceMastery', { defaultValue: 'Sentence Mastery' })}
          </Button>
        </nav>

        {/* Right side actions */}
        <div className="flex items-center gap-2">
          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm">
                  <User className="w-4 h-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem disabled>
                  {user.email}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                {admin && <DropdownMenuItem onClick={() => navigate('/admin/dashboard')}>
                    <Shield className="w-4 h-4 mr-2" />
                    {t('navigation.adminDashboard', { defaultValue: 'Admin' })}
                  </DropdownMenuItem>}
                <DropdownMenuItem onClick={() => navigate('/settings')}>
                  <Settings className="w-4 h-4 mr-2" />
                  {t('navigation.settings', { defaultValue: 'Settings' })}
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut}>
                  <LogOut className="w-4 h-4 mr-2" />
                  {t('auth.signOut', { defaultValue: 'Sign Out' })}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <>
              <Button variant="outline" onClick={() => navigate('/auth')} size="sm">
                {t('auth.signIn', { defaultValue: 'Log In' })}
              </Button>
              <Button onClick={() => navigate('/auth')} size="sm">
                {t('auth.signUp', { defaultValue: 'Sign Up' })}
              </Button>
            </>
          )}
          {!admin && <Button variant="ghost" onClick={() => navigate('/admin/login')} size="sm">
              {t('navigation.adminLogin', { defaultValue: 'Admin' })}
            </Button>}

          {/* Mobile menu toggle */}
          <Button 
            variant="ghost" 
            size="sm" 
            className="md:hidden"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </Button>
        </div>
      </div>

      {/* Mobile Navigation */}
      {mobileMenuOpen && <div className="md:hidden border-t border-border/40 bg-background/95 backdrop-blur">
          <div className="container px-4 py-4 space-y-3">
            <Button variant="ghost" onClick={() => navigate('/tests')} className="w-full justify-start">
              {t('navigation.tests', { defaultValue: 'Tests' })}
            </Button>
            <Button variant="ghost" onClick={() => navigate('/practice')} className="w-full justify-start">
              {t('navigation.practice', { defaultValue: 'Practice' })}
            </Button>
            <Button variant="ghost" onClick={() => navigate('/dashboard')} className="w-full justify-start">
              {t('header.dashboard', { defaultValue: 'Dashboard' })}
            </Button>
            <Button variant="ghost" onClick={() => navigate('/community')} className="w-full justify-start">
              {t('navigation.community', { defaultValue: 'Community' })}
            </Button>
            {/* Sentence Mastery Link Mobile */}
            <Button 
              variant="outline" 
              onClick={navigateToSentenceMastery}
              className="w-full justify-start gap-2"
            >
              <BookOpen className="w-4 h-4" />
              {t('navigation.sentenceMastery', { defaultValue: 'Sentence Mastery' })}
            </Button>
            {!user && <>
                <Button variant="outline" onClick={() => navigate('/auth')} className="w-full justify-start">
                  {t('auth.signIn', { defaultValue: 'Log In' })}
                </Button>
                <Button onClick={() => navigate('/auth')} className="w-full justify-start bg-primary text-primary-foreground">
                  {t('auth.signUp', { defaultValue: 'Sign Up' })}
                </Button>
              </>}
            {!admin && <Button variant="outline" onClick={() => navigate('/admin/login')} className="w-full justify-start">
                {t('navigation.adminLogin', { defaultValue: 'Admin Login' })}
              </Button>}
          </div>
        </div>}
    </header>;
};

export default Header;