import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/hooks/useAuth";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { Menu, X, LogOut, Settings, User, Shield } from "lucide-react";
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const handleSignOut = async () => {
    await signOut();
    navigate('/');
  };
  return <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      

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