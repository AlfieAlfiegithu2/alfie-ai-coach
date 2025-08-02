import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import HeroIndex from "./HeroIndex";
import Dashboard from "./Dashboard";
import VideoLoadingAnimation from "@/components/animations/VideoLoadingAnimation";

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
        <VideoLoadingAnimation 
          videoSrc="/path/to/your/loading-animation.mp4"
          size="lg" 
        />
      </div>
    );
  }

  // Always show hero page first
  return <HeroIndex />;
};

export default Index;
