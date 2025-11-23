import { useAuth } from "@/hooks/useAuth";
import HeroIndex from "./HeroIndex";
import Dashboard from "./Dashboard";
import LottieLoadingAnimation from "@/components/animations/LottieLoadingAnimation";

const Index = () => {
  const { user, loading } = useAuth();

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
