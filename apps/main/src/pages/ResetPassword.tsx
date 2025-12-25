import { useState, useRef, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Lock, Eye, EyeOff, CheckCircle2, Clock } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from 'sonner';

const ResetPassword = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const emailFromUrl = searchParams.get('email');

  const [step, setStep] = useState<'request' | 'verify'>('request');
  const [email, setEmail] = useState(emailFromUrl || '');
  const [code, setCode] = useState('');
  const [codeVerified, setCodeVerified] = useState(false);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [verifyingCode, setVerifyingCode] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);

  const passwordRef = useRef<HTMLInputElement>(null);

  // Timer for resend cooldown
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(prev => prev - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const requestReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!email) {
      setError('Please enter your email address.');
      return;
    }

    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke('request-password-reset', {
        body: { email }
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setSuccess('Password reset code sent! Please check your email.');
      setStep('verify');
      setResendCooldown(60);
    } catch (err: any) {
      setError(err.message || 'Failed to send reset code.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleResendCode = async () => {
    if (!email) return;

    setSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      const { data, error } = await supabase.functions.invoke('request-password-reset', {
        body: { email }
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setResendCooldown(60);
      toast.success('New verification code sent');
    } catch (err: any) {
      setError(err.message || "Failed to resend code");
    } finally {
      setSubmitting(false);
    }
  };

  const handleVerifyCode = async () => {
    setError(null);
    setSuccess(null);

    if (!code || code.length !== 6) {
      setError('Please enter the 6-digit code.');
      return;
    }

    setVerifyingCode(true);
    try {
      // Verify code only (no password reset yet)
      const { data, error } = await supabase.functions.invoke('reset-password-with-otp', {
        body: { email, code, verifyOnly: true }
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setCodeVerified(true);
      setTimeout(() => passwordRef.current?.focus(), 100);
    } catch (err: any) {
      setError(err.message || 'Invalid verification code.');
    } finally {
      setVerifyingCode(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!codeVerified) {
      setError('Please verify the code first.');
      return;
    }

    if (!password || password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }

    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }

    setSubmitting(true);
    try {
      const { data, error } = await supabase.functions.invoke('reset-password-with-otp', {
        body: { email, code, newPassword: password }
      });

      if (error) throw error;
      if (data?.error) throw new Error(data.error);

      setSuccess('Password reset successfully! Redirecting...');
      setTimeout(() => navigate('/auth'), 1500);
    } catch (err: any) {
      setError(err.message || 'Failed to reset password.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen w-full font-sans bg-[#f5f2e8] text-[#3c3c3c]">
      <div className="fixed inset-0 bg-[#f5f2e8] -z-10" />

      <div className="relative z-10 w-full min-h-screen flex flex-col items-center justify-center px-4 py-10">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="absolute top-4 left-4 inline-flex items-center gap-2 text-sm text-[#3c3c3c] hover:text-black bg-white/80 backdrop-blur px-3 py-2 rounded-xl border border-[#e6e0d4] font-medium"
          aria-label="Go back"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>

        <div className="w-full max-w-md rounded-2xl overflow-hidden shadow-sm bg-white border-2 border-[#d97757]/20 mx-auto">
          <div className="p-8 md:p-10 bg-white">
            {step === 'request' ? (
              <>
                <h3 className="text-2xl font-serif font-medium text-[#d97757] text-center mb-2">Reset Password</h3>
                <p className="text-sm text-[#666666] text-center mb-6 font-sans">
                  Enter your email to receive a reset code
                </p>
                <form onSubmit={requestReset} className="space-y-6">
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-[#3c3c3c] mb-2 font-sans">Email address</label>
                    <input
                      id="email"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full p-3 rounded-xl border border-[#d97757]/20 bg-white text-[#2d2d2d] shadow-sm focus:outline-none focus:ring-2 focus:ring-[#d97757]/20 focus:border-[#d97757] transition-all font-sans placeholder-[#666666]/50"
                      placeholder=""
                    />
                  </div>
                  {error && <div className="text-sm text-red-600 bg-red-50 p-3 rounded-lg border border-red-100">{error}</div>}
                  {success && <div className="text-sm text-emerald-600 bg-emerald-50 p-3 rounded-lg border border-emerald-100">{success}</div>}
                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full py-3 px-4 bg-[#d97757] text-white font-medium rounded-xl shadow-md hover:bg-[#c56a4b] transform hover:-translate-y-0.5 transition-all font-sans disabled:opacity-50"
                  >
                    {submitting ? 'Sending...' : 'Send Reset Code'}
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate('/auth')}
                    className="w-full py-2 text-sm text-[#666666] hover:text-[#2d2d2d] transition-colors font-sans"
                  >
                    Back to Sign In
                  </button>
                </form>
              </>
            ) : (
              <>
                <h3 className="text-2xl font-serif font-medium text-[#d97757] text-center mb-2">Enter Reset Code</h3>
                <p className="text-sm text-[#666666] text-center mb-6 font-sans">
                  Check your email for the 6-digit code
                </p>
                <form onSubmit={handleResetPassword} className="space-y-6">
                  {/* Code Input + Verify */}
                  <div>
                    <label htmlFor="code" className="block text-sm font-medium text-[#3c3c3c] mb-2 font-sans">Reset Code</label>
                    {!codeVerified ? (
                      <div className="relative">
                        <input
                          id="code"
                          type="text"
                          required
                          maxLength={6}
                          value={code}
                          onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                          className="w-full p-3 pr-28 rounded-xl border-2 border-[#d97757]/20 bg-white text-[#2d2d2d] shadow-sm focus:border-[#d97757] focus:ring-4 focus:ring-[#d97757]/10 focus:outline-none transition-all text-center text-2xl tracking-[0.5em] font-mono placeholder-[#666666]/30"
                          placeholder="000000"
                        />
                        <div className="absolute right-1.5 top-1.5 bottom-1.5">
                          <button
                            type="button"
                            onClick={handleVerifyCode}
                            disabled={code.length !== 6 || verifyingCode}
                            className="h-full px-6 bg-[#d97757] text-white font-medium rounded-lg shadow-sm hover:bg-[#c56a4b] transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center min-w-[80px]"
                          >
                            {verifyingCode ? (
                              <div className="h-4 w-4 rounded-full border-2 border-white/30 border-t-white animate-spin" />
                            ) : (
                              'Verify'
                            )}
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="flex items-center gap-3 p-3 rounded-xl border-2 border-green-200 bg-green-50">
                        <span className="flex-1 text-center text-2xl tracking-[0.5em] font-mono text-green-700">{code}</span>
                        <CheckCircle2 className="w-6 h-6 text-green-600" />
                      </div>
                    )}
                  </div>

                  {/* Password Fields - Only show after code is verified */}
                  {codeVerified && (
                    <div className="animate-in fade-in slide-in-from-top-2 duration-300 space-y-6">
                      <div>
                        <label htmlFor="password" className="block text-sm font-medium text-[#3c3c3c] mb-2 font-sans">New Password</label>
                        <div className="relative">
                          <Lock className="absolute left-3 top-3.5 h-5 w-5 text-[#d97757]/50" />
                          <input
                            id="password"
                            ref={passwordRef}
                            type={showPassword ? 'text' : 'password'}
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full pl-10 pr-12 p-3 rounded-xl border border-[#d97757]/20 bg-white text-[#2d2d2d] shadow-sm focus:outline-none focus:ring-2 focus:ring-[#d97757]/20 focus:border-[#d97757] transition-all font-sans placeholder-[#666666]/50"
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
                      <div>
                        <label htmlFor="confirm" className="block text-sm font-medium text-[#3c3c3c] mb-2 font-sans">Confirm Password</label>
                        <div className="relative">
                          <Lock className="absolute left-3 top-3.5 h-5 w-5 text-[#d97757]/50" />
                          <input
                            id="confirm"
                            type={showConfirm ? 'text' : 'password'}
                            required
                            value={confirm}
                            onChange={(e) => setConfirm(e.target.value)}
                            className="w-full pl-10 pr-12 p-3 rounded-xl border border-[#d97757]/20 bg-white text-[#2d2d2d] shadow-sm focus:outline-none focus:ring-2 focus:ring-[#d97757]/20 focus:border-[#d97757] transition-all font-sans placeholder-[#666666]/50"
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
                    </div>
                  )}

                  {error && <div className="text-sm text-red-600 bg-red-50 p-3 rounded-lg border border-red-100">{error}</div>}
                  {success && <div className="text-sm text-emerald-600 bg-emerald-50 p-3 rounded-lg border border-emerald-100">{success}</div>}

                  {/* Reset Password Button - Only show after code is verified */}
                  {codeVerified && (
                    <button
                      type="submit"
                      disabled={submitting}
                      className="w-full py-3 px-4 bg-[#d97757] text-white font-medium rounded-xl shadow-md hover:bg-[#c56a4b] transform hover:-translate-y-0.5 transition-all font-sans disabled:opacity-50"
                    >
                      {submitting ? 'Resetting...' : 'Reset Password'}
                    </button>
                  )}

                  <div className="flex flex-col gap-2 pt-2">
                    <button
                      type="button"
                      onClick={handleResendCode}
                      disabled={submitting || resendCooldown > 0}
                      className={`w-full py-3 px-4 rounded-xl text-sm font-medium transition-all flex items-center justify-center gap-2 ${resendCooldown > 0
                        ? 'bg-[#d97757]/10 text-[#d97757] border border-[#d97757]/20 cursor-not-allowed'
                        : 'bg-white text-[#d97757] border border-[#d97757]/20 hover:bg-[#d97757]/5'
                        }`}
                    >
                      {resendCooldown > 0 ? (
                        <>
                          <Clock className="w-4 h-4" />
                          Resend in {resendCooldown}s
                        </>
                      ) : (
                        'Resend Code'
                      )}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setStep('request');
                        setCode('');
                        setCodeVerified(false);
                        setPassword('');
                        setConfirm('');
                        setError(null);
                        setSuccess(null);
                      }}
                      className="w-full py-2 text-sm text-[#666666] hover:text-[#2d2d2d] transition-colors font-sans"
                    >
                      Change Email Address
                    </button>
                  </div>
                </form>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
