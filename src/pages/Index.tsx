import { useState, useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import HeroIndex from "./HeroIndex";
import Dashboard from "./Dashboard";
import CatLoadingAnimation from "@/components/animations/CatLoadingAnimation";

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
        <CatLoadingAnimation size="lg" />
      </div>
    );
  }

  // Always show hero page first
  return <HeroIndex />;
};

export default Index;
