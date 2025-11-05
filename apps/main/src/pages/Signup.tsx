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
  // OTP email verification removed for simpler UX; Supabase email confirmation is sent after sign up

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

  // OTP email verification removed for simpler UX; Supabase email confirmation is sent after sign up

  // Wait for auth to finish loading before checking user
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <div className="text-black font-mono">Loading…</div>
      </div>
    );
  }

  // Only redirect if auth has finished loading AND user exists
  if (!loading && user) {
    return <Navigate to="/dashboard" replace />;
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
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full p-3 rounded-xl border border-border bg-background text-foreground shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                  placeholder="okie@dokie.com"
                />
                <p className="mt-1 text-xs text-muted-foreground">We’ll send a verification email after you sign up.</p>
              </div>

              {/* OTP step removed for simpler UX */}
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


