import { useState } from 'react';
import { Navigate, useNavigate, Link } from 'react-router-dom';
import { Eye, EyeOff, ArrowLeft } from 'lucide-react';
// Inline Google brand icon (multi-color)
const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
    <path fill="#EA4335" d="M24 9.5c3.54 0 6.72 1.22 9.23 3.6l6.9-6.9C36.89 2.4 30.89 0 24 0 14.62 0 6.51 5.38 2.56 13.2l8.03 6.23C12.23 13.2 17.64 9.5 24 9.5z"/>
    <path fill="#4285F4" d="M46.5 24c0-1.64-.15-3.21-.43-4.74H24v9.01h12.7c-.55 2.96-2.25 5.47-4.81 7.17l7.39 5.73C43.91 37.34 46.5 31.22 46.5 24z"/>
    <path fill="#FBBC05" d="M10.59 19.43l-8.03-6.23C.93 16.12 0 19.94 0 24c0 3.99.93 7.78 2.56 11.13l8.03-6.23C9.9 26.52 9.5 25.3 9.5 24s.4-2.52 1.09-4.57z"/>
    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.91-5.83l-7.39-5.73c-2.05 1.38-4.69 2.21-8.52 2.21-6.36 0-11.77-3.7-13.4-8.93l-8.03 6.23C6.51 42.62 14.62 48 24 48z"/>
  </svg>
);
import { useAuth } from '@/hooks/useAuth';

// Technical, monochrome, grid-styled login inspired by the reference
const Auth = () => {
  const { user, signIn, signInWithGoogle, resetPassword, loading } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [resetMode, setResetMode] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  console.log('🔍 Auth component render:', { user: user?.email, loading, submitting, error });

  if (user && !loading) {
    console.log('🔄 Auth component redirecting to dashboard');
    return <Navigate to="/dashboard" replace />;
  }

  if (loading) {
    console.log('⏳ Auth component showing loading screen');
    return (
      <div className="min-h-screen w-full font-sans flex flex-col items-center justify-center">
        {/* Background with green image */}
        <div
          className="fixed inset-0 bg-cover bg-center bg-no-repeat -z-10"
          style={{ backgroundImage: "url('/lovable-uploads/38d81cb0-fd21-4737-b0f5-32bc5d0ae774.png')" }}
        />
        <div className="fixed inset-0 bg-background/20 backdrop-blur-sm -z-10" />
        
        {/* Loading content */}
        <div className="flex flex-col items-center justify-center gap-4">
          <div className="relative w-20 h-20">
            <div className="absolute inset-0 rounded-full border-4 border-gray-300/30 border-t-white/80 animate-spin"></div>
          </div>
          <div className="text-xl font-semibold text-white/80">Loading…</div>
          <div className="text-sm text-white/60">Setting up your account</div>
        </div>
      </div>
    );
  }

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    console.log('📝 Sign in form submitted:', email);
    setSubmitting(true);
    setError(null);
    const { error } = await signIn(email, password);
    if (error) {
      console.error('❌ Sign in failed:', error);
      setError(error);
    } else {
      console.log('✅ Sign in successful, waiting for auth state change');
    }
    setSubmitting(false);
  };

  const onGoogle = async () => {
    console.log('📱 Google sign in initiated');
    setSubmitting(true);
    setError(null);
    const { error } = await signInWithGoogle();
    if (error) {
      console.error('❌ Google sign in failed:', error);
      setError(error);
    } else {
      console.log('✅ Google sign in successful, waiting for auth state change');
    }
    setSubmitting(false);
  };

  const onReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    const { error } = await resetPassword(email);
    if (error) setError(error); else setResetMode(false);
    setSubmitting(false);
  };

  return (
    <div className="min-h-screen w-full font-sans">
      {/* Full-page fixed background */}
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
        {/* Header removed per request */}

        {/* Card */}
        <div className="w-full max-w-md rounded-2xl overflow-hidden shadow-xl bg-card/90 border border-border mx-auto">
          {/* Single panel (centered) */}
          <div className="p-6 md:p-8 bg-card">
            {/* Minimal section heading */}
            <h3 className="text-xl font-semibold text-foreground text-center mb-4">Are we ready?</h3>

            {!resetMode ? (
            <form onSubmit={onSubmit} className="space-y-5">
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-muted-foreground mb-2">Email address</label>
                            <input
                  id="email"
                              type="email"
                              required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full p-3 rounded-xl border border-border bg-background text-foreground shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                  placeholder="continuewith@google.com"
                            />
                          </div>
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-muted-foreground mb-2">Password</label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? 'text' : 'password'}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full p-3 rounded-xl border border-border bg-background text-foreground shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all pr-12"
                    placeholder={showPassword ? "It's just better" : ''}
                  />
                  <button
                    type="button"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                    onClick={() => setShowPassword((p) => !p)}
                    className="absolute inset-y-0 right-0 px-3 text-muted-foreground hover:text-foreground"
                  >
                    {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                  </button>
                </div>
              </div>
                        <div className="flex items-center justify-between text-sm">
                <label className="flex items-center text-muted-foreground cursor-pointer">
                  <input type="checkbox" className="w-4 h-4 rounded mr-2 border-border text-primary focus:ring-primary/30" />
                  Remember me
                          </label>
                <button type="button" className="text-primary font-medium hover:underline" onClick={() => navigate('/reset-password')}>Forgot password?</button>
                        </div>
              {error && <div className="text-sm text-red-500">{error}</div>}
                        <button
                          type="submit"
                disabled={submitting}
                className="w-full py-3 px-4 bg-primary text-primary-foreground font-medium rounded-xl shadow-sm hover:bg-primary/90 transform hover:-translate-y-0.5 transition-all"
                        >
                {submitting ? 'Signing in…' : 'I am born ready!'}
                        </button>
              <div className="relative flex items-center my-2">
                <div className="flex-1 border-t border-border" />
                <span className="px-3 text-xs text-muted-foreground">or</span>
                <div className="flex-1 border-t border-border" />
                            </div>
                            <button
                              type="button"
                onClick={onGoogle}
                disabled={submitting}
                className="w-full py-3 px-4 bg-card border border-border rounded-xl text-foreground font-medium hover:bg-accent/40 transition-all flex items-center justify-center gap-2"
                            >
                <GoogleIcon /> Continue with Google
                            </button>
              <div className="text-center text-sm text-muted-foreground mt-2">
                Please allow me to <Link className="text-primary font-medium hover:underline" to="/signup">Create account</Link>
              </div>
            </form>
          ) : (
            <form onSubmit={onReset} className="space-y-5">
              <div>
                <label htmlFor="reset-email" className="block text-sm font-medium text-muted-foreground mb-2">Email address</label>
                            <input
                  id="reset-email"
                  type="email"
                              required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full p-3 rounded-xl border border-border bg-background text-foreground shadow-sm focus:outline-none focus:ring-2 focus:ring-primary/30 focus:border-primary transition-all"
                  placeholder="operator@domain.com"
                            />
                          </div>
              {error && <div className="text-sm text-red-500">{error}</div>}
              <div className="flex gap-2">
                <button type="button" onClick={() => setResetMode(false)} className="flex-1 py-3 bg-card border border-border rounded-xl hover:bg-accent/40">Cancel</button>
                <button type="submit" disabled={submitting} className="flex-1 py-3 px-4 bg-primary text-primary-foreground font-medium rounded-xl hover:bg-primary/90">{submitting ? 'Sending…' : 'Send reset link'}</button>
              </div>
            </form>
          )}
                  </div>
                </div>
                
        {/* Bottom specs removed per request */}
      </div>
    </div>
  );
};

export default Auth;