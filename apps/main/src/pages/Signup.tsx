import { useState, useRef, useEffect } from 'react';
import { Navigate, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft, User, Mail, Lock, Eye, EyeOff, CheckCircle2, Clock } from 'lucide-react';
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
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  
  // UI State
  const [codeSent, setCodeSent] = useState(false);
  const [sendingCode, setSendingCode] = useState(false);
  const [verifying, setVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  // Refs for OTP inputs and password
  const otpRefs = useRef<(HTMLInputElement | null)[]>([]);
  const passwordRef = useRef<HTMLInputElement>(null);

  // Timer for resend cooldown
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(prev => prev - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  // Email validation helper
  const isValidEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  // Check if OTP is complete (all 6 digits entered)
  const isOtpComplete = otp.join('').length === 6;

  // Handle OTP Change
  const handleOtpChange = (index: number, value: string) => {
    if (isNaN(Number(value))) return;
    
    const newOtp = [...otp];
    newOtp[index] = value.substring(value.length - 1);
    setOtp(newOtp);

    // Move to next input if value entered
    if (value && index < 5) {
      otpRefs.current[index + 1]?.focus();
    }
  };

  const handleOtpKeyDown = (index: number, e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      otpRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').slice(0, 6).split('');
    const newOtp = [...otp];
    pastedData.forEach((char, index) => {
      if (index < 6 && !isNaN(Number(char))) {
        newOtp[index] = char;
      }
    });
    setOtp(newOtp);
    const nextIndex = Math.min(pastedData.length, 5);
    otpRefs.current[nextIndex]?.focus();
  };

  // Handle Send Verification Code via Resend API
  const handleSendCode = async () => {
    setError(null);

    if (!email) {
      setError('Please enter your email address');
      return;
    }

    if (!isValidEmail(email)) {
      setError('Please enter a valid email address');
      return;
    }
    
      setSendingCode(true);
      
      try {
        const { data, error } = await supabase.functions.invoke('send-signup-otp', {
          body: { email }
        });
        
        if (error) throw error;
        if (data?.error) throw new Error(data.error);
      
      setCodeSent(true);
      setResendCooldown(60); // Start 60s cooldown
      toast.success('Verification code sent to your email');
      setTimeout(() => otpRefs.current[0]?.focus(), 100);
    } catch (err: any) {
      setError(err.message || 'Failed to send verification code');
    } finally {
      setSendingCode(false);
    }
  };

  // Handle Resend Code
  const handleResend = async () => {
    if (!email || !isValidEmail(email)) return;
    
    setSendingCode(true);
    setError(null);
    
    try {
      const { data, error } = await supabase.functions.invoke('send-signup-otp', {
        body: { email }
      });
      
      if (error) throw error;
      if (data?.error) throw new Error(data.error);
      
      // Reset OTP fields
      setOtp(['', '', '', '', '', '']);
      setResendCooldown(60); // Reset cooldown
      toast.success('New verification code sent');
      setTimeout(() => otpRefs.current[0]?.focus(), 100);
    } catch (err: any) {
      setError(err.message || "Failed to resend code");
    } finally {
      setSendingCode(false);
    }
  };

  // Handle Create Account (verifies OTP and creates account)
  const handleCreateAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Must have code sent and OTP complete
    if (!codeSent) {
      setError('Please get a verification code first');
      return;
    }

    if (!isOtpComplete) {
      setError('Please enter the complete 6-digit verification code');
      return;
    }

    // Validate other fields before verifying
    if (!fullName) {
      setError('Please enter your nickname');
      return;
    }

    if (!password) {
      setError('Please set a password');
      passwordRef.current?.focus();
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

    const otpCode = otp.join('');

    setVerifying(true);
    
    try {
      // Verify OTP via edge function
      const { data, error } = await supabase.functions.invoke('verify-signup-otp', {
        body: { 
          email, 
          otp: otpCode,
          password, 
          fullName
        }
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      // Sign in the user after successful account creation
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password
      });

      if (signInError) {
        toast.success('Account created! Please sign in.');
        navigate('/auth');
        return;
      }

      toast.success('Account created successfully!');
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message || 'Failed to create account');
    } finally {
      setVerifying(false);
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

              {/* Email & Verification */}
              <div>
                <label className="block text-sm font-medium text-[#3c3c3c] mb-2 font-sans">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-3.5 h-5 w-5 text-[#d97757]/50" />
                  <input
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-32 p-3 rounded-xl border border-[#d97757]/20 bg-[#faf8f6] text-[#2d2d2d] shadow-sm focus:outline-none focus:ring-2 focus:ring-[#d97757]/20 focus:border-[#d97757] transition-all font-sans placeholder-[#666666]/50"
                    placeholder="john@example.com"
                  />
                  {/* Send Code Button inside email input */}
                  <div className="absolute right-1.5 top-1.5 bottom-1.5">
                    <button
                      type="button"
                      onClick={codeSent ? handleResend : handleSendCode}
                      disabled={sendingCode || !email || !isValidEmail(email) || (codeSent && resendCooldown > 0)}
                      className={`h-full px-4 rounded-lg text-sm font-medium transition-all flex items-center gap-1.5 ${
                        codeSent 
                          ? 'bg-green-100 text-green-700 hover:bg-green-200' 
                          : 'bg-[#d97757] text-white hover:bg-[#c56a4b] shadow-sm'
                      } disabled:opacity-50 disabled:cursor-not-allowed`}
                    >
                      {sendingCode ? (
                        <div className="h-4 w-4 rounded-full border-2 border-current border-t-transparent animate-spin" />
                      ) : codeSent ? (
                        <>
                          {resendCooldown > 0 ? (
                            <>
                              <Clock className="w-4 h-4" />
                              {resendCooldown}s
                            </>
                          ) : (
                            <>
                              <CheckCircle2 className="w-4 h-4" />
                              Sent
                            </>
                          )}
                        </>
                      ) : (
                        'Get Code'
                      )}
                    </button>
                  </div>
                </div>

                {/* OTP Inputs - Reveal when code sent */}
                {codeSent && (
                  <div className="mt-4 animate-in fade-in slide-in-from-top-2 duration-300">
                    <div className="flex items-center justify-between mb-2">
                        <label className="text-xs font-medium text-[#666666] font-sans">
                            Enter verification code sent to your email
                        </label>
                        <button 
                            type="button"
                            onClick={handleResend}
                            disabled={sendingCode || resendCooldown > 0}
                            className="text-xs text-[#d97757] hover:underline disabled:opacity-50 disabled:hover:no-underline"
                        >
                            {resendCooldown > 0 ? `Resend in ${resendCooldown}s` : 'Resend'}
                        </button>
                    </div>
                    <div className="grid grid-cols-6 gap-2" onPaste={handlePaste}>
                      {otp.map((digit, index) => (
                        <input
                          key={index}
                          ref={(el) => otpRefs.current[index] = el}
                          type="text"
                          maxLength={1}
                          value={digit}
                          onChange={(e) => handleOtpChange(index, e.target.value)}
                          onKeyDown={(e) => handleOtpKeyDown(index, e)}
                          className={`w-full aspect-square text-center text-xl font-bold rounded-xl border-2 bg-[#faf8f6] text-[#2d2d2d] focus:border-[#d97757] focus:ring-4 focus:ring-[#d97757]/10 focus:outline-none transition-all ${
                            digit ? 'border-[#d97757]/50' : 'border-[#d97757]/20'
                          }`}
                          placeholder="•"
                        />
                      ))}
                    </div>
                  </div>
                )}
              </div>

              {/* Password */}
              <div>
                <label className="block text-sm font-medium text-[#3c3c3c] mb-2 font-sans">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-3.5 h-5 w-5 text-[#d97757]/50" />
                  <input
                    ref={passwordRef}
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

              {/* Create Account Button - Always says "Create Account" */}
              <button
                type="submit"
                disabled={verifying || !codeSent || !isOtpComplete}
                className={`w-full py-4 px-6 font-medium rounded-xl shadow-md transform transition-all font-sans flex items-center justify-center gap-2 ${
                  codeSent && isOtpComplete
                    ? 'bg-[#d97757] text-white hover:bg-[#c56a4b] hover:-translate-y-0.5'
                    : 'bg-[#d97757]/50 text-white/80 cursor-not-allowed'
                } disabled:hover:transform-none`}
              >
                {verifying ? (
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