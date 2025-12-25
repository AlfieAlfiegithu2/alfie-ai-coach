import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useAdminAuth } from "@/hooks/useAdminAuth";
import { Settings, ArrowLeft, Mail, Lock } from "lucide-react";

const AdminLogin = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { login } = useAdminAuth();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [remainingAttempts, setRemainingAttempts] = useState<number | null>(null);
  const [isBlocked, setIsBlocked] = useState(false);

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      onLogin();
    }
  };

  const onLogin = async () => {
    if (!email || !password) {
      toast({
        title: "Credentials required",
        description: "Please enter your email and password",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const result = await login(email, password);

      if (result.success) {
        console.log('✅ Login successful');
        setRemainingAttempts(null);
        setIsBlocked(false);
        toast({
          title: "Access granted",
          description: "Welcome to the admin panel",
        });
        navigate("/admin");
      } else {
        console.log('❌ Login failed:', result.error);

        if (result.blocked) {
          setIsBlocked(true);
          setRemainingAttempts(0);
        } else {
          setIsBlocked(false);
          setRemainingAttempts(result.remaining ?? null);
        }

        toast({
          title: result.blocked ? "Access Blocked" : "Access denied",
          description: result.error || "Invalid credentials",
          variant: "destructive",
        });

        if (!result.blocked) {
          setPassword("");
        }
      }
    } catch (error) {
      console.error('❌ Login error:', error);
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
            <p className="text-zinc-700">Enter your credentials to access</p>
          </div>

          <Card className="bg-white/10 border border-white/20 backdrop-blur-xl">
            <CardHeader>
              <CardTitle className="text-zinc-950 font-normal">Admin Access</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-950">Email</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-zinc-500" />
                  <Input
                    type="email"
                    placeholder="admin@example.com"
                    value={email}
                    onChange={(e) => {
                      setEmail(e.target.value);
                      if (remainingAttempts !== null || isBlocked) {
                        setRemainingAttempts(null);
                        setIsBlocked(false);
                      }
                    }}
                    onKeyPress={handleKeyPress}
                    disabled={isLoading || isBlocked}
                    className="pl-10 bg-white/20 border-white/30 text-zinc-950 placeholder:text-zinc-600"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-zinc-950">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-zinc-500" />
                  <Input
                    type="password"
                    placeholder="Enter admin password"
                    value={password}
                    onChange={(e) => {
                      setPassword(e.target.value);
                      if (remainingAttempts !== null || isBlocked) {
                        setRemainingAttempts(null);
                        setIsBlocked(false);
                      }
                    }}
                    onKeyPress={handleKeyPress}
                    disabled={isLoading || isBlocked}
                    className="pl-10 bg-white/20 border-white/30 text-zinc-950 placeholder:text-zinc-600"
                  />
                </div>
                {remainingAttempts !== null && remainingAttempts > 0 && !isBlocked && (
                  <p className="text-xs text-amber-600 dark:text-amber-400">
                    {remainingAttempts} attempt{remainingAttempts !== 1 ? 's' : ''} remaining
                  </p>
                )}
                {isBlocked && (
                  <p className="text-xs text-red-600 dark:text-red-400">
                    Too many failed attempts. Please try again in 30 minutes.
                  </p>
                )}
              </div>
              <Button
                onClick={onLogin}
                className="w-full"
                disabled={isLoading || !email || !password || isBlocked}
              >
                {isLoading ? "Accessing..." : isBlocked ? "Blocked - Try Again Later" : "Access Admin Panel"}
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default AdminLogin;