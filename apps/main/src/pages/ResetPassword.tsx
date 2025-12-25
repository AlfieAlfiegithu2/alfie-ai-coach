import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';

const ResetPassword = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const emailFromUrl = searchParams.get('email');

  const [step, setStep] = useState<'request' | 'verify'>('request');
  const [email, setEmail] = useState(emailFromUrl || '');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

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

      setSuccess('Password reset code sent! Please check your email for a 6-digit verification code.');
      setStep('verify');
    } catch (err: any) {
      setError(err.message || 'Failed to send reset code.');
    } finally {
      setSubmitting(false);
    }
  };

  const verifyAndReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!code || code.length !== 6) {
      setError('Please enter the 6-digit code.');
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

      // Handle Supabase client errors
      if (error) {
        throw new Error(error.message || 'Failed to reset password.');
      }

      // Handle errors returned in the response body
      if (data?.error) {
        setError(data.error);
        return;
      }

      // Check for success
      if (!data?.success) {
        setError('Failed to reset password. Please try again.');
        return;
      }

      setSuccess('Password reset successfully! Redirecting...');
      setTimeout(() => navigate('/auth'), 1500);
    } catch (err: any) {
      // Try to extract error message from various formats
      let errorMessage = 'Failed to reset password.';

      if (err?.context?.body) {
        try {
          const body = JSON.parse(err.context.body);
          errorMessage = body.error || errorMessage;
        } catch {
          // Ignore parse errors
        }
      } else if (err?.message) {
        errorMessage = err.message;
      }

      setError(errorMessage);
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
                <form onSubmit={verifyAndReset} className="space-y-6">
                  <div>
                    <label htmlFor="code" className="block text-sm font-medium text-[#3c3c3c] mb-2 font-sans">Reset Code</label>
                    <input
                      id="code"
                      type="text"
                      required
                      maxLength={6}
                      value={code}
                      onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                      className="w-full p-3 rounded-xl border border-[#d97757]/20 bg-white text-[#2d2d2d] shadow-sm focus:outline-none focus:ring-2 focus:ring-[#d97757]/20 focus:border-[#d97757] transition-all text-center text-2xl tracking-widest font-mono"
                      placeholder="000000"
                    />
                  </div>
                  <div>
                    <label htmlFor="password" className="block text-sm font-medium text-[#3c3c3c] mb-2 font-sans">New Password</label>
                    <input
                      id="password"
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full p-3 rounded-xl border border-[#d97757]/20 bg-white text-[#2d2d2d] shadow-sm focus:outline-none focus:ring-2 focus:ring-[#d97757]/20 focus:border-[#d97757] transition-all font-sans placeholder-[#666666]/50"
                      placeholder="••••••••"
                    />
                  </div>
                  <div>
                    <label htmlFor="confirm" className="block text-sm font-medium text-[#3c3c3c] mb-2 font-sans">Confirm Password</label>
                    <input
                      id="confirm"
                      type="password"
                      required
                      value={confirm}
                      onChange={(e) => setConfirm(e.target.value)}
                      className="w-full p-3 rounded-xl border border-[#d97757]/20 bg-white text-[#2d2d2d] shadow-sm focus:outline-none focus:ring-2 focus:ring-[#d97757]/20 focus:border-[#d97757] transition-all font-sans placeholder-[#666666]/50"
                      placeholder="••••••••"
                    />
                  </div>
                  {error && <div className="text-sm text-red-600 bg-red-50 p-3 rounded-lg border border-red-100">{error}</div>}
                  {success && <div className="text-sm text-emerald-600 bg-emerald-50 p-3 rounded-lg border border-emerald-100">{success}</div>}
                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full py-3 px-4 bg-[#d97757] text-white font-medium rounded-xl shadow-md hover:bg-[#c56a4b] transform hover:-translate-y-0.5 transition-all font-sans disabled:opacity-50"
                  >
                    {submitting ? 'Resetting...' : 'Reset Password'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setStep('request')}
                    className="w-full py-2 text-sm text-[#666666] hover:text-[#2d2d2d] transition-colors font-sans"
                  >
                    Resend Code
                  </button>
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
