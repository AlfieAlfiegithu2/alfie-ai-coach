import { useState } from 'react';
import { Navigate, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, User, Mail, Lock, Eye, EyeOff } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const Signup = () => {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  
  // Form State
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  
  // UI State
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  // Email validation helper
  const isValidEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // Handle Create Account using standard Supabase signup
  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validate fields
    if (!fullName.trim()) {
      setError('Please enter your nickname');
      return;
    }

    if (!email) {
      setError('Please enter your email address');
      return;
    }

    if (!isValidEmail(email)) {
      setError('Please enter a valid email address');
      return;
    }

    if (!password) {
      setError('Please set a password');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    if (password !== confirm) {
      setError('Passwords do not match');
      return;
    }

    setSubmitting(true);
    
    try {
      // Create user via Edge Function (auto-confirms email)
      const { data, error: createError } = await supabase.functions.invoke('create-user', {
        body: { 
          email, 
          password, 
          fullName: fullName.trim() 
        }
      });

      if (createError) {
        throw createError;
      }

      if (data?.error) {
        throw new Error(data.error);
      }

      // User created successfully - now sign them in
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (signInError) {
        // Account created but couldn't auto-sign in - redirect to login
        toast.success('Account created! Please sign in.');
        navigate('/auth');
        return;
      }

      // Successfully signed in
      toast.success('Account created successfully!');
      navigate('/dashboard');
    } catch (err: any) {
      console.error('Signup error:', err);
      // Provide user-friendly error messages
      if (err.message?.includes('already registered')) {
        setError('This email is already registered. Try signing in instead.');
      } else if (err.message?.includes('invalid')) {
        setError('Please check your email format and try again.');
      } else if (err.message?.includes('Edge Function')) {
        setError('Service temporarily unavailable. Please try again in a moment.');
      } else {
        setError(err.message || 'Failed to create account. Please try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen w-full font-sans flex flex-col items-center justify-center bg-[#f5f2e8]">
        <div className="flex flex-col items-center justify-center gap-4">
          <div className="relative w-20 h-20">
            <div className="absolute inset-0 rounded-full border-4 border-[#e6e0d4] border-t-[#d97757] animate-spin"></div>
          </div>
          <div className="text-xl font-serif font-medium text-[#2d2d2d]">Loading…</div>
        </div>
      </div>
    );
  }

  // Redirect if already logged in
  if (!loading && user) {
    return <Navigate to="/dashboard" replace />;
  }

  return (
    <div className="min-h-screen w-full font-sans bg-[#f5f2e8] text-[#3c3c3c]">
      <div className="relative z-10 w-full min-h-screen flex flex-col items-center justify-center px-4 py-10">
        
        <div className="w-full max-w-md">
          <button
            type="button"
            onClick={() => navigate('/')}
            className="mb-6 inline-flex items-center gap-2 text-sm text-[#666666] hover:text-[#d97757] font-medium transition-colors px-2 py-1 rounded-lg hover:bg-[#d97757]/5"
            aria-label="Go back"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Home
          </button>

          <div className="w-full rounded-2xl overflow-hidden shadow-sm bg-white border-2 border-[#d97757]/20">
            <div className="p-8 md:p-10 bg-white">
            <h3 className="text-2xl font-serif font-medium text-[#d97757] text-center mb-2">
              Create Account
            </h3>
            <p className="text-center text-[#666666] text-sm mb-8 font-sans">
              Start your English mastery journey today
            </p>

            <form onSubmit={handleCreateAccount} className="space-y-5">
              {/* Nickname */}
              <div>
                <label className="block text-sm font-medium text-[#3c3c3c] mb-2 font-sans">Nickname</label>
                <div className="relative">
                  <User className="absolute left-3 top-3.5 h-5 w-5 text-[#d97757]/50" />
                  <input
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="w-full pl-10 p-3 rounded-xl border border-[#d97757]/20 bg-[#faf8f6] text-[#2d2d2d] shadow-sm focus:outline-none focus:ring-2 focus:ring-[#d97757]/20 focus:border-[#d97757] transition-all font-sans placeholder-[#666666]/50"
                    placeholder="Johnny"
                  />
                </div>
              </div>

              {/* Email */}
              <div>
                <label className="block text-sm font-medium text-[#3c3c3c] mb-2 font-sans">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3.5 h-5 w-5 text-[#d97757]/50" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 p-3 rounded-xl border border-[#d97757]/20 bg-[#faf8f6] text-[#2d2d2d] shadow-sm focus:outline-none focus:ring-2 focus:ring-[#d97757]/20 focus:border-[#d97757] transition-all font-sans placeholder-[#666666]/50"
                    placeholder="john@example.com"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="block text-sm font-medium text-[#3c3c3c] mb-2 font-sans">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3.5 h-5 w-5 text-[#d97757]/50" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-12 p-3 rounded-xl border border-[#d97757]/20 bg-[#faf8f6] text-[#2d2d2d] shadow-sm focus:outline-none focus:ring-2 focus:ring-[#d97757]/20 focus:border-[#d97757] transition-all font-sans placeholder-[#666666]/50"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-3.5 text-[#666666] hover:text-[#d97757] transition-colors"
                  >
                    {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              {/* Confirm Password */}
              <div>
                <label className="block text-sm font-medium text-[#3c3c3c] mb-2 font-sans">Confirm Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3.5 h-5 w-5 text-[#d97757]/50" />
                  <input
                    type={showConfirm ? 'text' : 'password'}
                    required
                    value={confirm}
                    onChange={(e) => setConfirm(e.target.value)}
                    className="w-full pl-10 pr-12 p-3 rounded-xl border border-[#d97757]/20 bg-[#faf8f6] text-[#2d2d2d] shadow-sm focus:outline-none focus:ring-2 focus:ring-[#d97757]/20 focus:border-[#d97757] transition-all font-sans placeholder-[#666666]/50"
                    placeholder="••••••••"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm(!showConfirm)}
                    className="absolute right-3 top-3.5 text-[#666666] hover:text-[#d97757] transition-colors"
                  >
                    {showConfirm ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                  </button>
                </div>
              </div>

              {/* Error Message */}
              {error && (
                <div className="p-3 bg-red-50 border border-red-100 rounded-lg text-sm text-red-600 flex items-start gap-2 animate-in fade-in slide-in-from-top-1">
                  <div className="mt-0.5">⚠️</div>
                  <div>{error}</div>
                </div>
              )}

              {/* Create Account Button */}
              <button
                type="submit"
                disabled={submitting}
                className="w-full py-4 px-6 font-medium rounded-xl shadow-md transform transition-all font-sans flex items-center justify-center gap-2 bg-[#d97757] text-white hover:bg-[#c56a4b] hover:-translate-y-0.5 disabled:opacity-60 disabled:cursor-not-allowed disabled:hover:transform-none"
              >
                {submitting ? (
                  <>
                    <div className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin"></div>
                    Creating Account...
                  </>
                ) : (
                  'Create Account'
                )}
              </button>


              {/* Sign In Link */}
              <div className="text-center text-sm text-[#666666] font-sans mt-6">
                Already have an account? <Link className="text-[#d97757] font-medium hover:underline" to="/auth">Sign in</Link>
              </div>
            </form>
          </div>
        </div>
      </div>
      </div>
    </div>
  );
};

export default Signup;