import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import HeroIndex from "./HeroIndex";
import Dashboard from "./Dashboard";
import LottieLoadingAnimation from "@/components/animations/LottieLoadingAnimation";

const Index = () => {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const getUser = async () => {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (isMounted) {
          setUser(user);
          setLoading(false);
        }
      } catch (error) {
        console.error('Error getting user:', error);
        if (isMounted) {
          setLoading(false);
        }
      }
    };
    
    getUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (isMounted) {
        setUser(session?.user ?? null);
        setLoading(false);
      }
    });

    // Aggressive timeout - just show the page
    const timeout = setTimeout(() => {
      if (isMounted) {
        setLoading(false);
      }
    }, 2000);

    return () => {
      isMounted = false;
      clearTimeout(timeout);
      subscription.unsubscribe();
    };
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-primary flex items-center justify-center">
        <LottieLoadingAnimation size="lg" />
      </div>
    );
  }

  // Show dashboard if user is authenticated, otherwise show hero page
  if (user) {
    return <Dashboard />;
  }

  return <HeroIndex />;
};

export default Index;
