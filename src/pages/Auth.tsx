import { useState, useEffect } from 'react';
import { Navigate } from 'react-router-dom';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Mail, Lock, User, Chrome, Sparkles, Shield, Eye, EyeOff } from "lucide-react";
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
    return <Navigate to="/dashboard" replace />;
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
    setErrors({});

    try {
      const { error } = await signIn(formData.email, formData.password);

      if (error) {
        console.error('Sign-in error:', error);
        setErrors({ general: error });
      }
    } catch (err) {
      console.error('Sign-in unexpected error:', err);
      setErrors({ general: 'An unexpected error occurred. Please try again.' });
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
    setErrors({});

    try {
      const { error } = await signInWithGoogle();

      if (error) {
        console.error('Google sign-in error:', error);
        setErrors({ general: error });
      }
    } catch (err) {
      console.error('Google sign-in unexpected error:', err);
      setErrors({ general: 'Failed to sign in with Google. Please try again.' });
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
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="backdrop-blur-xl bg-white/10 border border-white/20 rounded-2xl p-8">
          <div className="flex items-center gap-3">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white"></div>
            <span className="text-white font-medium">Loading...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen relative overflow-hidden" style={{
      backgroundImage: "url('/public/lovable-uploads/38d81cb0-fd21-4737-b0f5-32bc5d0ae774.png')",
      backgroundSize: 'cover',
      backgroundPosition: 'center'
    }}>
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900"></div>
      <div className="absolute inset-0 bg-[url('data:image/svg+xml,%3Csvg width=60 height=60 viewBox=0 0 60 xmlns=http://www.w3.org/2000/svg%3E%3Cg fill=none fill-rule=evenodd fill-opacity=0.03%3E%3Ccircle cx=30 cy=30 r=1/%3E%3C/g%3E%3C/svg%3E')] opacity-50"></div>
      
      {/* Main Login Container */}
      <div className="relative w-full max-w-5xl mx-auto p-4 min-h-screen flex items-center justify-center animate-in fade-in slide-in-from-bottom-8 duration-1000">
        {/* Glass Card */}
        <div className="relative backdrop-blur-xl bg-white/10 border border-white/20 rounded-3xl shadow-2xl overflow-hidden w-full">
          {/* Specular Highlight */}
          <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-white/20 via-transparent to-transparent pointer-events-none"></div>
          
          {/* Split Layout */}
          <div className="flex flex-col lg:flex-row min-h-[600px]">
            {/* Left Side - Login Form */}
            <div className="flex-1 p-8 space-y-6">
              {showResetForm ? (
                /* Password Reset Form */
                <div className="space-y-6 animate-in fade-in slide-in-from-top-4 duration-700 delay-300">
                  <div className="text-center space-y-2">
                    <div className="w-16 h-16 bg-gradient-to-r from-slate-900 to-slate-700 rounded-2xl mx-auto shadow-lg flex items-center justify-center">
                      <Shield className="w-8 h-8 text-white" />
                    </div>
                    <h1 className="text-4xl font-light text-white tracking-tight uppercase">Reset Password</h1>
                    <p className="text-white/70 text-sm">Enter your email to receive a password reset link</p>
                  </div>

                  <form onSubmit={handleResetPassword} className="space-y-5">
                    <div className="space-y-2">
                      <label className="text-sm font-medium text-white/90 block">Email address</label>
                      <div className="relative">
                        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                          <Mail className="w-5 h-5 text-white/50" />
                        </div>
                        <input
                          type="email"
                          className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-blue-400/50 focus:border-blue-400/50 transition-all duration-300"
                          placeholder="Enter your email"
                          value={resetEmail}
                          onChange={(e) => setResetEmail(e.target.value)}
                          required
                        />
                      </div>
                      {errors.reset && (
                        <p className="text-sm text-red-400 mt-1">{errors.reset}</p>
                      )}
                    </div>

                    <div className="flex gap-3">
                      <button
                        type="button"
                        onClick={() => setShowResetForm(false)}
                        className="flex-1 py-3 px-4 bg-white/10 border border-white/20 rounded-xl text-white font-medium hover:bg-white/20 transition-all duration-300"
                      >
                        Cancel
                      </button>
                      <button
                        type="submit"
                        disabled={isSubmitting}
                        className="flex-1 py-3 px-4 bg-gradient-to-r from-slate-900 to-slate-700 rounded-xl text-white font-medium shadow-lg hover:shadow-xl transform hover:scale-[1.02] transition-all duration-300"
                      >
                        {isSubmitting ? (
                          <div className="flex items-center justify-center gap-2">
                            <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                            Sending...
                          </div>
                        ) : (
                          "Send Reset Link"
                        )}
                      </button>
                    </div>
                  </form>
                </div>
              ) : (
                <>
                  {/* Header */}
                  <div className="text-center space-y-2 animate-in fade-in slide-in-from-top-4 duration-700 delay-300">
                    <div className="w-16 h-16 bg-gradient-to-r from-slate-900 to-slate-700 rounded-2xl mx-auto shadow-lg flex items-center justify-center">
                      <Sparkles className="w-8 h-8 text-white" />
                    </div>
                    <h1 className="text-4xl font-light text-white tracking-tight uppercase">Welcome back</h1>
                    <p className="text-white/70 text-sm">Sign in to your IELTS learning account</p>
                  </div>

                  <Tabs defaultValue="signin" className="w-full">
                    <TabsList className="flex bg-white/10 p-1 rounded-xl mb-6">
                      <TabsTrigger 
                        value="signin" 
                        className="flex-1 py-2 text-center text-white/70 data-[state=active]:bg-white/20 data-[state=active]:text-white rounded-lg transition-all duration-300"
                      >
                        Sign In
                      </TabsTrigger>
                      <TabsTrigger 
                        value="signup" 
                        className="flex-1 py-2 text-center text-white/70 data-[state=active]:bg-white/20 data-[state=active]:text-white rounded-lg transition-all duration-300"
                      >
                        Sign Up
                      </TabsTrigger>
                    </TabsList>

                    <TabsContent value="signin" className="space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-500">
                      <form onSubmit={handleSignIn} className="space-y-5">
                        {/* Email Input */}
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-white/90 block">Email address</label>
                          <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                              <Mail className="w-5 h-5 text-white/50" />
                            </div>
                            <input
                              type="email"
                              className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-blue-400/50 focus:border-blue-400/50 transition-all duration-300"
                              placeholder="Enter your email"
                              value={formData.email}
                              onChange={(e) => updateFormData('email', e.target.value)}
                              required
                            />
                          </div>
                          {errors.email && (
                            <p className="text-sm text-red-400 mt-1">{errors.email}</p>
                          )}
                        </div>

                        {/* Password Input */}
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-white/90 block">Password</label>
                          <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                              <Lock className="w-5 h-5 text-white/50" />
                            </div>
                            <input
                              type={showPassword ? "text" : "password"}
                              className="w-full pl-10 pr-12 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-blue-400/50 focus:border-blue-400/50 transition-all duration-300"
                              placeholder="Enter your password"
                              value={formData.password}
                              onChange={(e) => updateFormData('password', e.target.value)}
                              required
                            />
                            <button
                              type="button"
                              className="absolute inset-y-0 right-0 pr-3 flex items-center text-white/50 hover:text-white/80 transition-colors"
                              onClick={() => setShowPassword(!showPassword)}
                            >
                              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                            </button>
                          </div>
                          {errors.password && (
                            <p className="text-sm text-red-400 mt-1">{errors.password}</p>
                          )}
                        </div>

                        {/* Remember Me & Forgot Password */}
                        <div className="flex items-center justify-between text-sm">
                          <label className="flex items-center space-x-2 text-white/80 cursor-pointer">
                            <input type="checkbox" className="sr-only" />
                            <div className="w-4 h-4 bg-white/20 border border-white/30 rounded flex items-center justify-center">
                              <svg className="w-3 h-3 text-white hidden" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                              </svg>
                            </div>
                            <span>Remember me</span>
                          </label>
                          <button
                            type="button"
                            onClick={() => setShowResetForm(true)}
                            className="text-blue-400 hover:text-blue-300 transition-colors"
                          >
                            Forgot password?
                          </button>
                        </div>

                        {errors.general && (
                          <div className="p-3 bg-red-500/20 border border-red-500/30 rounded-xl text-red-400 text-sm">
                            {errors.general}
                          </div>
                        )}

                        {/* Login Button */}
                        <button
                          type="submit"
                          disabled={isSubmitting}
                          className="w-full hover:shadow-xl transform hover:scale-[1.02] transition-all duration-300 flex font-medium text-white bg-gradient-to-r from-slate-900 to-slate-700 rounded-xl py-3 px-4 shadow-lg space-x-2 items-center justify-center"
                        >
                          <span>{isSubmitting ? "Signing in..." : "Sign in"}</span>
                          {!isSubmitting && <ArrowLeft className="w-4 h-4 rotate-180" />}
                        </button>
                      </form>
                    </TabsContent>

                    <TabsContent value="signup" className="space-y-5 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-500">
                      <form onSubmit={handleSignUp} className="space-y-5">
                        {/* Full Name Input */}
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-white/90 block">Full Name</label>
                          <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                              <User className="w-5 h-5 text-white/50" />
                            </div>
                            <input
                              type="text"
                              className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-blue-400/50 focus:border-blue-400/50 transition-all duration-300"
                              placeholder="Enter your full name"
                              value={formData.fullName}
                              onChange={(e) => updateFormData('fullName', e.target.value)}
                              required
                            />
                          </div>
                          {errors.fullName && (
                            <p className="text-sm text-red-400 mt-1">{errors.fullName}</p>
                          )}
                        </div>

                        {/* Email Input */}
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-white/90 block">Email address</label>
                          <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                              <Mail className="w-5 h-5 text-white/50" />
                            </div>
                            <input
                              type="email"
                              className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-blue-400/50 focus:border-blue-400/50 transition-all duration-300"
                              placeholder="Enter your email"
                              value={formData.email}
                              onChange={(e) => updateFormData('email', e.target.value)}
                              required
                            />
                          </div>
                          {errors.email && (
                            <p className="text-sm text-red-400 mt-1">{errors.email}</p>
                          )}
                        </div>

                        {/* Password Input */}
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-white/90 block">Password</label>
                          <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                              <Lock className="w-5 h-5 text-white/50" />
                            </div>
                            <input
                              type={showPassword ? "text" : "password"}
                              className="w-full pl-10 pr-12 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-blue-400/50 focus:border-blue-400/50 transition-all duration-300"
                              placeholder="Enter your password"
                              value={formData.password}
                              onChange={(e) => updateFormData('password', e.target.value)}
                              required
                            />
                            <button
                              type="button"
                              className="absolute inset-y-0 right-0 pr-3 flex items-center text-white/50 hover:text-white/80 transition-colors"
                              onClick={() => setShowPassword(!showPassword)}
                            >
                              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                            </button>
                          </div>
                          {errors.password && (
                            <p className="text-sm text-red-400 mt-1">{errors.password}</p>
                          )}
                        </div>

                        {/* Confirm Password Input */}
                        <div className="space-y-2">
                          <label className="text-sm font-medium text-white/90 block">Confirm Password</label>
                          <div className="relative">
                            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                              <Lock className="w-5 h-5 text-white/50" />
                            </div>
                            <input
                              type="password"
                              className="w-full pl-10 pr-4 py-3 bg-white/10 border border-white/20 rounded-xl text-white placeholder-white/50 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-blue-400/50 focus:border-blue-400/50 transition-all duration-300"
                              placeholder="Confirm your password"
                              value={formData.confirmPassword}
                              onChange={(e) => updateFormData('confirmPassword', e.target.value)}
                              required
                            />
                          </div>
                          {errors.confirmPassword && (
                            <p className="text-sm text-red-400 mt-1">{errors.confirmPassword}</p>
                          )}
                        </div>

                        {errors.general && (
                          <div className="p-3 bg-red-500/20 border border-red-500/30 rounded-xl text-red-400 text-sm">
                            {errors.general}
                          </div>
                        )}

                        {/* Sign Up Button */}
                        <button
                          type="submit"
                          disabled={isSubmitting}
                          className="w-full hover:shadow-xl transform hover:scale-[1.02] transition-all duration-300 flex font-medium text-white bg-gradient-to-r from-slate-900 to-slate-700 rounded-xl py-3 px-4 shadow-lg space-x-2 items-center justify-center"
                        >
                          <span>{isSubmitting ? "Creating account..." : "Create Account"}</span>
                          {!isSubmitting && <ArrowLeft className="w-4 h-4 rotate-180" />}
                        </button>
                      </form>
                    </TabsContent>
                  </Tabs>

                  {/* Divider */}
                  <div className="relative flex items-center animate-in fade-in duration-700 delay-700">
                    <div className="flex-1 border-t border-white/20"></div>
                    <span className="px-3 text-white/60 text-sm">or</span>
                    <div className="flex-1 border-t border-white/20"></div>
                  </div>

                  {/* Social Login */}
                  <div className="space-y-3 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-900">
                    <button 
                      onClick={handleGoogleSignIn}
                      disabled={isSubmitting}
                      className="w-full py-3 px-4 bg-white/10 border border-white/20 rounded-xl text-white font-medium hover:bg-white/20 transition-all duration-300 flex items-center justify-center space-x-2"
                    >
                      <Chrome className="w-5 h-5" />
                      <span>Continue with Google</span>
                    </button>
                  </div>

                  {/* Back to Home Link */}
                  <div className="text-center text-sm text-white/70 animate-in fade-in duration-700 delay-1100">
                    <button
                      onClick={() => navigate('/')}
                      className="text-blue-400 hover:text-blue-300 transition-colors font-medium"
                    >
                      Back to Home
                    </button>
                  </div>
                </>
              )}
            </div>

            {/* Vertical Divider */}
            <div className="hidden lg:block w-px bg-gradient-to-b from-transparent via-white/20 to-transparent"></div>

            {/* Right Side - Welcome Content */}
            <div className="flex-1 p-8 flex flex-col justify-center space-y-6 animate-in fade-in slide-in-from-right-8 duration-1000 delay-300 bg-neutral-950/10">
              {/* Welcome Message */}
              <div className="space-y-4">
                <div className="w-20 h-20 bg-gradient-to-br from-blue-500/20 to-purple-500/20 rounded-3xl flex items-center justify-center backdrop-blur-sm border border-white/10">
                  <Sparkles className="w-[40px] h-[40px] text-slate-200" />
                </div>
                <h2 className="text-4xl font-light text-white tracking-tight">Master IELTS with AI</h2>
                <p className="text-white/70 text-lg leading-relaxed">Join thousands of students who have achieved their target IELTS scores with our AI-powered learning platform.</p>
              </div>

              {/* Features List */}
              <div className="space-y-4">
                <div className="flex items-start space-x-3 animate-in fade-in slide-in-from-right-4 duration-700 delay-500">
                  <div className="w-6 h-6 bg-green-500/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <svg className="w-3 h-3 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-white font-medium">AI-Powered Feedback</h3>
                    <p className="text-white/60 text-sm">Get instant, personalized feedback on your writing and speaking</p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3 animate-in fade-in slide-in-from-right-4 duration-700 delay-700">
                  <div className="w-6 h-6 bg-green-500/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <svg className="w-3 h-3 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-white font-medium">Unlimited Practice Tests</h3>
                    <p className="text-white/60 text-sm">Access hundreds of practice tests for all four IELTS skills</p>
                  </div>
                </div>
                
                <div className="flex items-start space-x-3 animate-in fade-in slide-in-from-right-4 duration-700 delay-900">
                  <div className="w-6 h-6 bg-green-500/20 rounded-full flex items-center justify-center flex-shrink-0 mt-0.5">
                    <svg className="w-3 h-3 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7"></path>
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-white font-medium">Personalized Study Plans</h3>
                    <p className="text-white/60 text-sm">Customized learning paths based on your strengths and weaknesses</p>
                  </div>
                </div>
              </div>

              {/* Testimonial */}
              <div className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-sm animate-in fade-in slide-in-from-bottom-4 duration-700 delay-1100">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-semibold">
                    A
                  </div>
                  <div>
                    <h4 className="text-white font-medium text-sm">Ahmad Rahman</h4>
                    <p className="text-white/60 text-xs">IELTS 8.0 Achiever</p>
                  </div>
                </div>
                <p className="text-sm font-light text-white/80">"This platform helped me achieve my target IELTS score of 8.0. The AI feedback was incredibly detailed and helped me improve my writing significantly."</p>
              </div>

              {/* Stats */}
              <div className="grid grid-cols-3 gap-4 animate-in fade-in slide-in-from-bottom-4 duration-700 delay-1300">
                <div className="text-center">
                  <div className="text-2xl font-semibold text-white">15K+</div>
                  <div className="text-white/60 text-xs">Students</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-semibold text-white">7.5+</div>
                  <div className="text-white/60 text-xs">Avg Score</div>
                </div>
                <div className="text-center">
                  <div className="text-2xl font-semibold text-white">95%</div>
                  <div className="text-white/60 text-xs">Success Rate</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Glow Effect */}
        <div className="absolute inset-0 -z-10 bg-gradient-to-r from-blue-600/20 to-purple-600/20 blur-3xl"></div>
      </div>
    </div>
  );
};

export default Auth;