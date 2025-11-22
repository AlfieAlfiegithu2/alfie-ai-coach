import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { Loader2 } from 'lucide-react';

const AuthCallback = () => {
  const navigate = useNavigate();

  useEffect(() => {
    // Handle the OAuth callback
    const handleAuthCallback = async () => {
      const { error } = await supabase.auth.getSession();

      if (error) {
        console.error('Error during auth callback:', error);
        // Redirect to login on error
        navigate('/auth');
      } else {
        // Redirect to dashboard on success
        // We use replace to prevent going back to the callback url
        navigate('/dashboard', { replace: true });
      }
    };

    handleAuthCallback();
  }, [navigate]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background">
      <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
      <h2 className="text-xl font-semibold text-foreground">Completing sign in...</h2>
      <p className="text-muted-foreground mt-2">Please wait while we redirect you.</p>
    </div>
  );
};

export default AuthCallback;
