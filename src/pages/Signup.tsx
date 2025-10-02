import { useState } from 'react';
import { Navigate, Link, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

const Signup = () => {
  const { user, signUp, loading } = useAuth();
  const navigate = useNavigate();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [verifyMsg, setVerifyMsg] = useState<string | null>(null);
  const [code, setCode] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [emailVerified, setEmailVerified] = useState(false);

  if (user && !loading) return <Navigate to="/dashboard" replace />;

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!emailVerified) {
      setError('Please verify your email first.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match');
      return;
    }
    setSubmitting(true);
    const { error } = await signUp(email, password, fullName);
    if (error) setError(error);
    setSubmitting(false);
  };

  const isEmailValid = (value: string) => /\S+@\S+\.\S+/.test(value);

  const verifyEmail = async () => {
    setVerifyMsg(null);
    setError(null);
    if (!isEmailValid(email)) {
      setVerifyMsg('Please enter a valid email address.');
      return;
    }
    try {
      setVerifying(true);
      const { data, error } = await supabase.functions.invoke('send-email-otp', { body: { email } });
      if (error || !data?.success) setVerifyMsg(error?.message || data?.error || 'Failed to send email');
      else {
        setVerifyMsg('We sent a 6‑digit code to your email. Enter it below to verify.');
        setCodeSent(true);
      }
    } finally {
      setVerifying(false);
    }
  };

  const confirmCode = async () => {
    setVerifyMsg(null);
    setError(null);
    if (!/^[0-9]{6}$/.test(code)) {
      setVerifyMsg('Enter the 6‑digit code.');
      return;
    }
    try {
      setVerifying(true);
      const { data, error } = await supabase.functions.invoke('verify-email-otp', { body: { email, code } });
      if (error || !data?.success) setVerifyMsg(error?.message || data?.error || 'Invalid or expired code');
      else {
        setVerifyMsg('Email verified. You can now create your account.');
        setEmailVerified(true);
      }
    } finally {
      setVerifying(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-black font-mono">Loading…</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen w-full font-sans">
      <div
        className="fixed inset-0 bg-cover bg-center bg-no-repeat -z-10"
        style={{ backgroundImage: "url('/lovable-uploads/38d81cb0-fd21-4737-b0f5-32bc5d0ae774.png')" }}
      />
      <div className="fixed inset-0 bg-background/50 backdrop-blur-sm -z-10" />

      <div className="relative z-10 w-full min-h-screen flex flex-col items-center justify-center px-4 py-10">
        <button
          type="button"
          onClick={() => navigate(-1)}
          className="absolute top-4 left-4 inline-flex items-center gap-2 text-sm text-foreground/80 hover:text-foreground bg-card/80 backdrop-blur px-3 py-2 rounded-xl border border-border"
          aria-label="Go back"
        >
          <ArrowLeft className="w-4 h-4" />
          Back
        </button>
        <div className="w-full max-w-md rounded-2xl overflow-hidden shadow-xl bg-card/90 border border-border mx-auto">
          <div className="p-6 md:p-8 bg-card">
            <h3 className="text-2xl font-semibold text-foreground text-center mb-4">Create account</h3>

            <form onSubmit={onSubmit} className="space-y-5">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-muted-foreground mb-2">You can be creative here</label>
                <input
                  id="name"
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full p-3 rounded-xl border border-border bg-background text-foreground shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                  placeholder="Your name"
                />
              </div>
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-muted-foreground mb-2">Email address</label>
                <div className="flex gap-2">
                  <input
                    id="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full p-3 rounded-xl border border-border bg-background text-foreground shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                    placeholder="okie@dokie.com"
                  />
                  <button
                    type="button"
                    onClick={verifyEmail}
                    disabled={verifying || !email}
                    className="px-4 rounded-xl border border-border bg-card text-foreground hover:bg-accent/40"
                  >
                    {verifying ? 'Sending…' : 'Verify'}
                  </button>
                </div>
                {verifyMsg && <p className="mt-1 text-xs text-muted-foreground">{verifyMsg}</p>}
              </div>

              {codeSent && (
                <div>
                  <label htmlFor="code" className="block text-sm font-medium text-muted-foreground mb-2">Enter 6‑digit code</label>
                  <div className="flex gap-2">
                    <input
                      id="code"
                      type="text"
                      inputMode="numeric"
                      pattern="[0-9]{6}"
                      maxLength={6}
                      value={code}
                      onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
                      className="w-full p-3 rounded-xl border border-border bg-background text-foreground shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                      placeholder="000000"
                    />
                    <button type="button" onClick={confirmCode} disabled={verifying || code.length !== 6} className="px-4 rounded-xl border border-border bg-card text-foreground hover:bg-accent/40">{verifying ? 'Checking…' : 'Confirm'}</button>
                  </div>
                </div>
              )}
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-muted-foreground mb-2">Password</label>
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
                <label htmlFor="confirm" className="block text-sm font-medium text-muted-foreground mb-2">Confirm password</label>
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
              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3 px-4 bg-primary text-primary-foreground font-medium rounded-xl shadow-sm hover:bg-primary/90 transform hover:-translate-y-0.5 transition-all"
              >
                {submitting ? 'Creating…' : 'Create account'}
              </button>
              <div className="text-center text-sm text-muted-foreground">
                Already have an account? <Link className="text-primary font-medium hover:underline" to="/auth">Sign in</Link>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Signup;


