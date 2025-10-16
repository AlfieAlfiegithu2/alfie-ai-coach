import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { Settings, ArrowLeft } from "lucide-react";

const AdminLogin = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { login } = useAdminAuth();
  const [isLoading, setIsLoading] = useState(false);

  const onLogin = async () => {
    setIsLoading(true);
    try {
      const result = await login();

      if (result.success) {
        toast({
          title: "Access granted",
          description: "Welcome to the admin panel",
        });
        navigate("/admin");
      } else {
        toast({
          title: "Access denied",
          description: result.error || "Failed to login",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "An unexpected error occurred",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative overflow-hidden">
      <div className="fixed inset-0 w-full h-full">
        <img
          src="/lovable-uploads/c25cc620-ab6d-47a4-9dc6-32d1f6264773.png"
          alt="Background"
          className="absolute inset-0 w-full h-full object-cover"
        />
      </div>

      <div className="relative z-10 flex items-center justify-center min-h-screen p-4">
        <div className="w-full max-w-md space-y-6">
          <div className="text-center space-y-2">
            <Button variant="ghost" size="sm" onClick={() => navigate("/")} className="mb-4 bg-zinc-950/60 text-white hover:bg-zinc-800/80">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back to Home
            </Button>

            <div className="flex justify-center">
              <div className="w-16 h-16 bg-white/10 border border-white/20 backdrop-blur-xl rounded-full flex items-center justify-center">
                <Settings className="w-8 h-8 text-white" />
              </div>
            </div>
            <h1 className="text-2xl font-light text-zinc-950">Admin Panel</h1>
            <p className="text-zinc-700">Click to access admin panel</p>
          </div>

          <Card className="bg-white/10 border border-white/20 backdrop-blur-xl">
            <CardHeader>
              <CardTitle className="text-zinc-950 font-normal">Admin Access</CardTitle>
            </CardHeader>
            <CardContent>
              <Button onClick={onLogin} className="w-full" disabled={isLoading}>
                {isLoading ? "Accessing..." : "Access Admin Panel"}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;