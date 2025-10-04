import { useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
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
      
      if (error) throw error;
      
      setSuccess('Password reset successfully! Redirecting...');
      setTimeout(() => navigate('/auth'), 1500);
    } catch (err: any) {
      setError(err.message || 'Failed to reset password.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen w-full font-sans">
      <div className="fixed inset-0 bg-cover bg-center bg-no-repeat -z-10" style={{ backgroundImage: "url('/lovable-uploads/38d81cb0-fd21-4737-b0f5-32bc5d0ae774.png')" }} />
      <div className="fixed inset-0 bg-background/50 backdrop-blur-sm -z-10" />

      <div className="relative z-10 w-full min-h-screen flex flex-col items-center justify-center px-4 py-10">
        <div className="w-full max-w-md rounded-2xl overflow-hidden shadow-xl bg-card/90 border border-border mx-auto">
          <div className="p-6 md:p-8 bg-card">
            {step === 'request' ? (
              <>
                <h3 className="text-2xl font-semibold text-foreground text-center mb-2">Reset Password</h3>
                <p className="text-sm text-muted-foreground text-center mb-6">
                  Enter your email to receive a reset code
                </p>
                <form onSubmit={requestReset} className="space-y-5">
                  <div>
                    <label htmlFor="email" className="block text-sm font-medium text-muted-foreground mb-2">Email address</label>
                    <input
                      id="email"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full p-3 rounded-xl border border-border bg-background text-foreground shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                      placeholder="your@email.com"
                    />
                  </div>
                  {error && <div className="text-sm text-red-500">{error}</div>}
                  {success && <div className="text-sm text-emerald-600">{success}</div>}
                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full py-3 px-4 bg-primary text-primary-foreground font-medium rounded-xl shadow-sm hover:bg-primary/90 disabled:opacity-50"
                  >
                    {submitting ? 'Sending...' : 'Send Reset Code'}
                  </button>
                  <button
                    type="button"
                    onClick={() => navigate('/auth')}
                    className="w-full py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
                  >
                    Back to Sign In
                  </button>
                </form>
              </>
            ) : (
              <>
                <h3 className="text-2xl font-semibold text-foreground text-center mb-2">Enter Reset Code</h3>
                <p className="text-sm text-muted-foreground text-center mb-6">
                  Check your email for the 6-digit code
                </p>
                <form onSubmit={verifyAndReset} className="space-y-5">
                  <div>
                    <label htmlFor="code" className="block text-sm font-medium text-muted-foreground mb-2">Reset Code</label>
                    <input
                      id="code"
                      type="text"
                      required
                      maxLength={6}
                      value={code}
                      onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                      className="w-full p-3 rounded-xl border border-border bg-background text-foreground shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all text-center text-2xl tracking-widest font-mono"
                      placeholder="000000"
                    />
                  </div>
                  <div>
                    <label htmlFor="password" className="block text-sm font-medium text-muted-foreground mb-2">New Password</label>
                    <input
                      id="password"
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full p-3 rounded-xl border border-border bg-background text-foreground shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                      placeholder="••••••••"
                    />
                  </div>
                  <div>
                    <label htmlFor="confirm" className="block text-sm font-medium text-muted-foreground mb-2">Confirm Password</label>
                    <input
                      id="confirm"
                      type="password"
                      required
                      value={confirm}
                      onChange={(e) => setConfirm(e.target.value)}
                      className="w-full p-3 rounded-xl border border-border bg-background text-foreground shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                      placeholder="••••••••"
                    />
                  </div>
                  {error && <div className="text-sm text-red-500">{error}</div>}
                  {success && <div className="text-sm text-emerald-600">{success}</div>}
                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full py-3 px-4 bg-primary text-primary-foreground font-medium rounded-xl shadow-sm hover:bg-primary/90 disabled:opacity-50"
                  >
                    {submitting ? 'Resetting...' : 'Reset Password'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setStep('request')}
                    className="w-full py-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
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


