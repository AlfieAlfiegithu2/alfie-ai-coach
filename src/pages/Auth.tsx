import { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { ArrowLeft, Mail, Lock, User, Chrome, Sparkles, Shield, Zap, Eye, EyeOff } from "lucide-react";
import { useAuth } from '@/hooks/useAuth';
import { useNavigate } from 'react-router-dom';

const Auth = () => {
  const navigate = useNavigate();
  const { user, signIn, signUp, signInWithGoogle, resetPassword, loading } = useAuth();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    fullName: '',
    confirmPassword: ''
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showResetForm, setShowResetForm] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [resetEmail, setResetEmail] = useState('');

  // Redirect if already authenticated
  if (user && !loading) {
    return <Navigate to="/" replace />;
  }

  const validateForm = (isSignUp = false) => {
    const newErrors: Record<string, string> = {};

    if (!formData.email) {
      newErrors.email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = 'Email is invalid';
    }

    if (!formData.password) {
      newErrors.password = 'Password is required';
    } else if (formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters';
    }

    if (isSignUp) {
      if (!formData.fullName) {
        newErrors.fullName = 'Full name is required';
      }

      if (!formData.confirmPassword) {
        newErrors.confirmPassword = 'Please confirm your password';
      } else if (formData.password !== formData.confirmPassword) {
        newErrors.confirmPassword = 'Passwords do not match';
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSignIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    setIsSubmitting(true);
    const { error } = await signIn(formData.email, formData.password);
    
    if (error) {
      setErrors({ general: error });
    }
    
    setIsSubmitting(false);
  };

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm(true)) return;

    setIsSubmitting(true);
    const { error } = await signUp(formData.email, formData.password, formData.fullName);
    
    if (error) {
      setErrors({ general: error });
    }
    
    setIsSubmitting(false);
  };

  const handleGoogleSignIn = async () => {
    setIsSubmitting(true);
    const { error } = await signInWithGoogle();
    
    if (error) {
      setErrors({ general: error });
    }
    
    setIsSubmitting(false);
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resetEmail) {
      setErrors({ reset: 'Email is required' });
      return;
    }

    setIsSubmitting(true);
    const { error } = await resetPassword(resetEmail);
    
    if (error) {
      setErrors({ reset: error });
    } else {
      setShowResetForm(false);
      setResetEmail('');
    }
    
    setIsSubmitting(false);
  };

  const updateFormData = (field: string, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    if (errors[field]) {
      setErrors(prev => ({ ...prev, [field]: '' }));
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-600/20 via-purple-600/20 to-pink-600/20 flex items-center justify-center">
        <div className="glass-card rounded-2xl p-8">
          <div className="flex items-center gap-3">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="text-gray-700 font-medium">Loading...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative overflow-hidden">
      {/* Glassmorphism Background */}
      <div className="fixed inset-0 bg-gradient-to-br from-blue-600/20 via-purple-600/20 to-pink-600/20">
        <div className="absolute inset-0 opacity-30" style={{
          backgroundImage: `radial-gradient(circle at 25% 25%, white 1px, transparent 1px)`,
          backgroundSize: '50px 50px'
        }}></div>
        <div className="absolute inset-0 backdrop-blur-3xl"></div>
      </div>

      {/* Floating Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-32 h-32 bg-blue-500/10 rounded-full blur-xl animate-float"></div>
        <div className="absolute top-3/4 right-1/4 w-24 h-24 bg-purple-500/10 rounded-full blur-xl animate-float" style={{animationDelay: '2s'}}></div>
        <div className="absolute top-1/2 left-3/4 w-20 h-20 bg-pink-500/10 rounded-full blur-xl animate-float" style={{animationDelay: '4s'}}></div>
      </div>

      <div className="relative z-10 min-h-screen flex items-center justify-center p-4">
        <div className="max-w-md w-full space-y-8">
          {/* Back to Home Button */}
          <Button
            variant="ghost"
            onClick={() => navigate('/')}
            className="glass-button flex items-center gap-2 text-gray-700 hover:text-gray-900 border-white/20 hover:border-white/40"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Home
          </Button>

          {/* Main Auth Card */}
          <div className="glass-card rounded-3xl p-8 shadow-2xl animate-fade-in">
            {showResetForm ? (
              /* Password Reset Form */
              <div className="space-y-6">
                <div className="text-center mb-6">
                  <div className="flex justify-center mb-4">
                    <div className="w-16 h-16 bg-gradient-to-br from-orange-500 to-red-600 rounded-2xl flex items-center justify-center shadow-lg">
                      <Shield className="w-8 h-8 text-white" />
                    </div>
                  </div>
                  <h1 className="text-2xl font-display font-bold text-gray-900 mb-2">
                    Reset Password
                  </h1>
                  <p className="text-gray-600">
                    Enter your email to receive a password reset link
                  </p>
                </div>

                <form onSubmit={handleResetPassword} className="space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="resetEmail" className="text-gray-700 font-medium">Email</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                      <Input
                        id="resetEmail"
                        type="email"
                        placeholder="Enter your email"
                        value={resetEmail}
                        onChange={(e) => setResetEmail(e.target.value)}
                        className="pl-10 h-12 rounded-xl border-gray-200 focus:border-blue-500 focus:ring-blue-500/20"
                        required
                      />
                    </div>
                  </div>

                  {errors.reset && (
                    <Alert className="border-red-200 bg-red-50/80 backdrop-blur-sm rounded-xl">
                      <AlertDescription className="text-red-800">{errors.reset}</AlertDescription>
                    </Alert>
                  )}

                  <div className="flex gap-3">
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => setShowResetForm(false)}
                      className="flex-1 h-12 rounded-xl border-gray-300 hover:bg-gray-50"
                    >
                      Cancel
                    </Button>
                    <Button
                      type="submit"
                      disabled={isSubmitting}
                      className="flex-1 h-12 bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white font-medium rounded-xl shadow-lg hover:shadow-xl transition-all duration-300"
                    >
                      {isSubmitting ? (
                        <div className="flex items-center gap-2">
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                          Sending...
                        </div>
                      ) : (
                        "Send Reset Link"
                      )}
                    </Button>
                  </div>
                </form>
              </div>
            ) : (
              /* Main Auth Forms */
              <>
                {/* Header */}
                <div className="text-center mb-8">
                  <div className="flex justify-center mb-4">
                    <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
                      <Sparkles className="w-8 h-8 text-white" />
                    </div>
                  </div>
                  <h1 className="text-3xl font-display font-bold text-gray-900 mb-2">
                    Welcome to EnglishAI
                  </h1>
                  <p className="text-gray-600">
                    Your AI-powered English learning journey starts here
                  </p>
                </div>

                {/* Google Sign In - Primary CTA */}
                <Button
                  onClick={handleGoogleSignIn}
                  disabled={isSubmitting}
                  className="w-full mb-6 bg-white hover:bg-gray-50 text-gray-900 border border-gray-200 shadow-lg hover:shadow-xl transition-all duration-300 h-12 rounded-xl flex items-center justify-center gap-3 font-medium hover-lift"
                >
                  <Chrome className="w-5 h-5 text-blue-500" />
                  Continue with Google
                </Button>

                {/* Divider */}
                <div className="relative my-6">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-200"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-4 bg-white/80 text-gray-500 rounded-full">Or continue with email</span>
                  </div>
                </div>

                <Tabs defaultValue="signin" className="w-full">
                  <TabsList className="grid w-full grid-cols-2 bg-gray-100 p-1 rounded-xl">
                    <TabsTrigger value="signin" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">Sign In</TabsTrigger>
                    <TabsTrigger value="signup" className="rounded-lg data-[state=active]:bg-white data-[state=active]:shadow-sm">Sign Up</TabsTrigger>
                  </TabsList>

                  <TabsContent value="signin" className="space-y-6 mt-6">
                    <form onSubmit={handleSignIn} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="email" className="text-gray-700 font-medium">Email</Label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                          <Input
                            id="email"
                            type="email"
                            placeholder="Enter your email"
                            value={formData.email}
                            onChange={(e) => updateFormData('email', e.target.value)}
                            className={`pl-10 h-12 rounded-xl border-gray-200 focus:border-blue-500 focus:ring-blue-500/20 ${errors.email ? "border-red-500" : ""}`}
                            required
                          />
                        </div>
                        {errors.email && (
                          <p className="text-sm text-red-500 flex items-center gap-2">
                            <span className="w-1 h-1 bg-red-500 rounded-full"></span>
                            {errors.email}
                          </p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="password" className="text-gray-700 font-medium">Password</Label>
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                          <Input
                            id="password"
                            type={showPassword ? "text" : "password"}
                            placeholder="Enter your password"
                            value={formData.password}
                            onChange={(e) => updateFormData('password', e.target.value)}
                            className={`pl-10 pr-12 h-12 rounded-xl border-gray-200 focus:border-blue-500 focus:ring-blue-500/20 ${errors.password ? "border-red-500" : ""}`}
                            required
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute right-2 top-1/2 transform -translate-y-1/2 h-8 w-8 hover:bg-gray-100"
                            onClick={() => setShowPassword(!showPassword)}
                          >
                            {showPassword ? (
                              <EyeOff className="h-4 w-4 text-gray-400" />
                            ) : (
                              <Eye className="h-4 w-4 text-gray-400" />
                            )}
                          </Button>
                        </div>
                        {errors.password && (
                          <p className="text-sm text-red-500 flex items-center gap-2">
                            <span className="w-1 h-1 bg-red-500 rounded-full"></span>
                            {errors.password}
                          </p>
                        )}
                      </div>

                      <div className="text-right">
                        <Button
                          type="button"
                          variant="link"
                          onClick={() => setShowResetForm(true)}
                          className="text-sm text-gray-600 hover:text-gray-900 p-0 h-auto"
                        >
                          Forgot your password?
                        </Button>
                      </div>

                      {errors.general && (
                        <Alert className="border-red-200 bg-red-50/80 backdrop-blur-sm rounded-xl">
                          <AlertDescription className="text-red-800">{errors.general}</AlertDescription>
                        </Alert>
                      )}

                      <Button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full h-12 bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-700 hover:to-purple-700 text-white font-medium rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover-lift press-down"
                      >
                        {isSubmitting ? (
                          <div className="flex items-center gap-2">
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                            Signing in...
                          </div>
                        ) : (
                          "Sign In"
                        )}
                      </Button>
                    </form>
                  </TabsContent>

                  <TabsContent value="signup" className="space-y-6 mt-6">
                    <form onSubmit={handleSignUp} className="space-y-4">
                      <div className="space-y-2">
                        <Label htmlFor="fullName" className="text-gray-700 font-medium">Full Name</Label>
                        <div className="relative">
                          <User className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                          <Input
                            id="fullName"
                            type="text"
                            placeholder="Enter your full name"
                            value={formData.fullName}
                            onChange={(e) => updateFormData('fullName', e.target.value)}
                            className={`pl-10 h-12 rounded-xl border-gray-200 focus:border-blue-500 focus:ring-blue-500/20 ${errors.fullName ? "border-red-500" : ""}`}
                            required
                          />
                        </div>
                        {errors.fullName && (
                          <p className="text-sm text-red-500 flex items-center gap-2">
                            <span className="w-1 h-1 bg-red-500 rounded-full"></span>
                            {errors.fullName}
                          </p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="signupEmail" className="text-gray-700 font-medium">Email</Label>
                        <div className="relative">
                          <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                          <Input
                            id="signupEmail"
                            type="email"
                            placeholder="Enter your email"
                            value={formData.email}
                            onChange={(e) => updateFormData('email', e.target.value)}
                            className={`pl-10 h-12 rounded-xl border-gray-200 focus:border-blue-500 focus:ring-blue-500/20 ${errors.email ? "border-red-500" : ""}`}
                            required
                          />
                        </div>
                        {errors.email && (
                          <p className="text-sm text-red-500 flex items-center gap-2">
                            <span className="w-1 h-1 bg-red-500 rounded-full"></span>
                            {errors.email}
                          </p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="signupPassword" className="text-gray-700 font-medium">Password</Label>
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                          <Input
                            id="signupPassword"
                            type={showPassword ? "text" : "password"}
                            placeholder="Create a secure password"
                            value={formData.password}
                            onChange={(e) => updateFormData('password', e.target.value)}
                            className={`pl-10 pr-12 h-12 rounded-xl border-gray-200 focus:border-blue-500 focus:ring-blue-500/20 ${errors.password ? "border-red-500" : ""}`}
                            required
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute right-2 top-1/2 transform -translate-y-1/2 h-8 w-8 hover:bg-gray-100"
                            onClick={() => setShowPassword(!showPassword)}
                          >
                            {showPassword ? (
                              <EyeOff className="h-4 w-4 text-gray-400" />
                            ) : (
                              <Eye className="h-4 w-4 text-gray-400" />
                            )}
                          </Button>
                        </div>
                        {errors.password && (
                          <p className="text-sm text-red-500 flex items-center gap-2">
                            <span className="w-1 h-1 bg-red-500 rounded-full"></span>
                            {errors.password}
                          </p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label htmlFor="confirmPassword" className="text-gray-700 font-medium">Confirm Password</Label>
                        <div className="relative">
                          <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                          <Input
                            id="confirmPassword"
                            type="password"
                            placeholder="Confirm your password"
                            value={formData.confirmPassword}
                            onChange={(e) => updateFormData('confirmPassword', e.target.value)}
                            className={`pl-10 h-12 rounded-xl border-gray-200 focus:border-blue-500 focus:ring-blue-500/20 ${errors.confirmPassword ? "border-red-500" : ""}`}
                            required
                          />
                        </div>
                        {errors.confirmPassword && (
                          <p className="text-sm text-red-500 flex items-center gap-2">
                            <span className="w-1 h-1 bg-red-500 rounded-full"></span>
                            {errors.confirmPassword}
                          </p>
                        )}
                      </div>

                      {errors.general && (
                        <Alert className="border-red-200 bg-red-50/80 backdrop-blur-sm rounded-xl">
                          <AlertDescription className="text-red-800">{errors.general}</AlertDescription>
                        </Alert>
                      )}

                      <Button
                        type="submit"
                        disabled={isSubmitting}
                        className="w-full h-12 bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-white font-medium rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 hover-lift press-down"
                      >
                        {isSubmitting ? (
                          <div className="flex items-center gap-2">
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                            Creating account...
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <Zap className="w-4 h-4" />
                            Create Account
                          </div>
                        )}
                      </Button>
                    </form>
                  </TabsContent>
                </Tabs>

                {/* Features Preview */}
                <div className="mt-8 pt-6 border-t border-gray-200">
                  <p className="text-center text-sm text-gray-600 mb-4 font-medium">
                    What you'll get with EnglishAI:
                  </p>
                  <div className="grid grid-cols-3 gap-4 text-center">
                    <div className="space-y-2">
                      <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center mx-auto">
                        <Zap className="w-4 h-4 text-blue-600" />
                      </div>
                      <p className="text-xs text-gray-600">AI Feedback</p>
                    </div>
                    <div className="space-y-2">
                      <div className="w-8 h-8 bg-green-100 rounded-lg flex items-center justify-center mx-auto">
                        <Shield className="w-4 h-4 text-green-600" />
                      </div>
                      <p className="text-xs text-gray-600">Secure Platform</p>
                    </div>
                    <div className="space-y-2">
                      <div className="w-8 h-8 bg-purple-100 rounded-lg flex items-center justify-center mx-auto">
                        <Sparkles className="w-4 h-4 text-purple-600" />
                      </div>
                      <p className="text-xs text-gray-600">Smart Learning</p>
                    </div>
                  </div>
                </div>

                {/* Terms */}
                <div className="mt-6 text-center">
                  <p className="text-xs text-gray-500">
                    By signing up, you agree to our{' '}
                    <button className="text-blue-600 hover:text-blue-700 underline">
                      Terms of Service
                    </button>{' '}
                    and{' '}
                    <button className="text-blue-600 hover:text-blue-700 underline">
                      Privacy Policy
                    </button>
                  </p>
                </div>

                {/* Google Auth Configuration Note */}
                <div className="mt-6 p-4 bg-blue-50/80 backdrop-blur-sm rounded-xl border border-blue-200">
                  <p className="text-sm text-blue-800">
                    <strong>Note:</strong> To enable Google sign-in, configure Google OAuth in your Supabase dashboard under Authentication → Providers.
                  </p>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Auth;