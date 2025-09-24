import { useState } from 'react';
import { Navigate, Link } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';

const Signup = () => {
  const { user, signUp, loading } = useAuth();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [verifying, setVerifying] = useState(false);
  const [verifyMsg, setVerifyMsg] = useState<string | null>(null);

  if (user && !loading) return <Navigate to="/dashboard" replace />;

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
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
      const siteUrl = (import.meta as any)?.env?.VITE_PUBLIC_SITE_URL || window.location.origin;
      const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: `${siteUrl}/signup` }
      });
      if (error) {
        setVerifyMsg(error.message);
      } else {
        setVerifyMsg('Verification email sent. Please check your inbox.');
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


