import { useEffect } from 'react';

const SentenceMastery = () => {
  useEffect(() => {
    // Store auth token if user is logged in
    const storeAuthToken = async () => {
      try {
        const { supabase } = await import('@/integrations/supabase/client');
        const { data: { session } } = await supabase.auth.getSession();

        if (session && session.access_token) {
          sessionStorage.setItem('sentence_mastery_auth', JSON.stringify({
            userId: session.user.id,
            email: session.user.email,
            token: session.access_token,
            expiresAt: Date.now() + 3600000,
          }));
        }
      } catch (error) {
        console.error('Error storing auth token:', error);
      }
    };

    storeAuthToken();

    // Open Earthworm in the same window
    window.location.href = '/earthworm/';
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-4">Redirecting to Sentence Mastery...</h2>
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto"></div>
        <p className="mt-4 text-sm text-muted-foreground">Opening Earthworm...</p>
      </div>
    </div>
  );
};

export default SentenceMastery;
