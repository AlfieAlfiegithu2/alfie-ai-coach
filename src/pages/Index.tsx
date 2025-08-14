import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import HeroIndex from "./HeroIndex";
import Dashboard from "./Dashboard";
import LottieLoadingAnimation from "@/components/animations/LottieLoadingAnimation";

const Index = () => {
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      setLoading(false);
    };
    getUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
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
