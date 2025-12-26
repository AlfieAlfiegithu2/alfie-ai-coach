import { useAuth } from "@/hooks/useAuth";
import HeroIndex from "./HeroIndex";
import Dashboard from "./Dashboard";
import PageLoadingScreen from "@/components/PageLoadingScreen";

const Index = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return <PageLoadingScreen />;
  }

  // Show dashboard if user is authenticated, otherwise show hero page
  if (user) {
    return <Dashboard />;
  }

  return <HeroIndex />;
};

export default Index;
