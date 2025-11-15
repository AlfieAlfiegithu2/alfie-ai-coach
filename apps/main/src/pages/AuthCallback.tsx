import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';

/**
 * OAuth Callback Handler
 * This component handles the OAuth redirect from Google/Supabase
 * Supabase automatically processes the session from URL hash/query params
 */
const AuthCallback = () => {
  const navigate = useNavigate();
  const { user, loading } = useAuth();

  useEffect(() => {
    // Give Supabase a moment to process the OAuth callback
    const handleCallback = async () => {
      try {
        // Check if there's an error in the URL
        const urlParams = new URLSearchParams(window.location.search);
        const error = urlParams.get('error');
        const errorDescription = urlParams.get('error_description');

        if (error) {
          console.error('❌ OAuth error:', error, errorDescription);
          // Redirect to auth page with error
          navigate('/auth?error=' + encodeURIComponent(errorDescription || error), { replace: true });
          return;
        }

        // Wait for Supabase to process the session and profile creation
        let session = null;
        let profile = null;
        let retries = 0;
        const maxRetries = 10; // Wait up to 5 seconds (10 * 500ms)
        
        while (retries < maxRetries) {
          const { data: { session: currentSession } } = await supabase.auth.getSession();
          
          if (currentSession) {
            session = currentSession;
            // Check if profile exists (created by trigger)
            const { data: profileData } = await supabase
              .from('profiles')
              .select('id, full_name, native_language')
              .eq('id', currentSession.user.id)
              .maybeSingle();
            
            if (profileData) {
              profile = profileData;
              break;
            }
          }
          
          // Wait before retrying
          await new Promise(resolve => setTimeout(resolve, 500));
          retries++;
        }
        
        if (session && profile) {
          console.log('✅ OAuth callback successful, session and profile found');
          
          // Check if this is a new user (no preferences set)
          const { data: preferences } = await supabase
            .from('user_preferences')
            .select('target_test_type, target_score')
            .eq('user_id', session.user.id)
            .maybeSingle();
          
          const isNewUser = !preferences || !preferences.target_test_type;
          
          // Clear any OAuth params from URL
          window.history.replaceState({}, document.title, window.location.pathname);
          
          // Redirect to dashboard with flag for new users
          if (isNewUser) {
            console.log('🆕 New user detected, redirecting to dashboard with settings prompt');
            navigate('/dashboard?setup=required', { replace: true });
          } else {
            navigate('/dashboard', { replace: true });
          }
        } else if (session) {
          console.log('✅ Session found but profile not ready yet, redirecting anyway');
          window.history.replaceState({}, document.title, window.location.pathname);
          navigate('/dashboard?setup=required', { replace: true });
        } else {
          console.warn('⚠️ OAuth callback completed but no session found');
          navigate('/auth?error=authentication_failed', { replace: true });
        }
      } catch (error) {
        console.error('❌ Error handling OAuth callback:', error);
        navigate('/auth?error=callback_error', { replace: true });
      }
    };

    handleCallback();
  }, [navigate]);

  // Show loading state while processing callback
  return (
    <div className="min-h-screen w-full font-sans flex flex-col items-center justify-center">
      <div
        className="fixed inset-0 bg-cover bg-center bg-no-repeat -z-10"
        style={{ backgroundImage: "url('/lovable-uploads/38d81cb0-fd21-4737-b0f5-32bc5d0ae774.png')" }}
      />
      <div className="fixed inset-0 bg-background/20 backdrop-blur-sm -z-10" />
      
      <div className="flex flex-col items-center justify-center gap-4">
        <div className="relative w-20 h-20">
          <div className="absolute inset-0 rounded-full border-4 border-gray-300/30 border-t-white/80 animate-spin"></div>
        </div>
        <div className="text-xl font-semibold text-white/80">Completing sign in...</div>
        <div className="text-sm text-white/60">Please wait while we finish setting up your account</div>
      </div>
    </div>
  );
};

export default AuthCallback;

