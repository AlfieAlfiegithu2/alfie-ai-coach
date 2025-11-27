import { useState, useEffect } from 'react';
import { Navigate, useNavigate, Link } from 'react-router-dom';
import { Eye, EyeOff, ArrowLeft } from 'lucide-react';
// Inline Google brand icon (multi-color)
const GoogleIcon = () => (
  <svg width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
    <path fill="#EA4335" d="M24 9.5c3.54 0 6.72 1.22 9.23 3.6l6.9-6.9C36.89 2.4 30.89 0 24 0 14.62 0 6.51 5.38 2.56 13.2l8.03 6.23C12.23 13.2 17.64 9.5 24 9.5z" />
    <path fill="#4285F4" d="M46.5 24c0-1.64-.15-3.21-.43-4.74H24v9.01h12.7c-.55 2.96-2.25 5.47-4.81 7.17l7.39 5.73C43.91 37.34 46.5 31.22 46.5 24z" />
    <path fill="#FBBC05" d="M10.59 19.43l-8.03-6.23C.93 16.12 0 19.94 0 24c0 3.99.93 7.78 2.56 11.13l8.03-6.23C9.9 26.52 9.5 25.3 9.5 24s.4-2.52 1.09-4.57z" />
    <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.91-5.83l-7.39-5.73c-2.05 1.38-4.69 2.21-8.52 2.21-6.36 0-11.77-3.7-13.4-8.93l-8.03 6.23C6.51 42.62 14.62 48 24 48z" />
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

  // Check for OAuth error in URL query params (from callback redirect)
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const errorParam = urlParams.get('error');
    if (errorParam) {
      setError(decodeURIComponent(errorParam));
      // Clean up URL
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, []);

  // Reset submitting state if user successfully signs in
  useEffect(() => {
    if (user && submitting) {
      setSubmitting(false);
    }
  }, [user, submitting]);

  console.log('🔍 Auth component render:', { user: user?.email, loading, submitting, error });

  // Only redirect if auth has finished loading AND user exists
  useEffect(() => {
    if (!loading && user) {
      console.log('🔄 Auth component redirecting to dashboard');
      navigate('/dashboard', { replace: true });
    }
  }, [loading, user, navigate]);

  // Show loading screen while auth is loading
  if (loading) {
    console.log('⏳ Auth component showing loading screen');
    return (
      <div className="min-h-screen w-full font-sans flex flex-col items-center justify-center bg-[#f5f2e8]">
        {/* Loading content */}
        <div className="flex flex-col items-center justify-center gap-4">
          <div className="relative w-20 h-20">
            <div className="absolute inset-0 rounded-full border-4 border-[#e6e0d4] border-t-[#2d2d2d] animate-spin"></div>
          </div>
          <div className="text-xl font-serif font-medium text-[#2d2d2d]">Loading…</div>
          <div className="text-sm text-[#666666] font-sans">Setting up your account</div>
        </div>
      </div>
    );
  }

  // Show loading while redirecting if user is logged in
  if (user) {
    return (
      <div className="min-h-screen w-full font-sans flex flex-col items-center justify-center bg-[#f5f2e8]">
        <div className="text-xl font-serif font-medium text-[#2d2d2d]">Redirecting...</div>
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
      // Provide more helpful error messages
      if (error.toLowerCase().includes('invalid') || error.toLowerCase().includes('credentials')) {
        setError('Invalid email or password. If you just signed up, please check your email for a verification link.');
      } else if (error.toLowerCase().includes('email') && error.toLowerCase().includes('confirm')) {
        setError('Please verify your email address before signing in. Check your inbox for a verification email.');
      } else {
        setError(error);
      }
      setSubmitting(false);
    } else {
      console.log('✅ Sign in successful, waiting for auth state change');
      // Give a moment for session to persist and auth state to update
      await new Promise(resolve => setTimeout(resolve, 100));
      // Don't set submitting to false yet - let the auth state change handle the redirect
      // The component will re-render when auth state updates
    }
  };

  const onGoogle = async () => {
    console.log('📱 Google sign in initiated');
    setSubmitting(true);
    setError(null);
    const { error } = await signInWithGoogle();
    if (error) {
      console.error('❌ Google sign in failed:', error);
      setError(error);
      setSubmitting(false);
    } else {
      console.log('✅ Google sign in successful, waiting for auth state change');
      // Don't set submitting to false yet - let the auth state change handle the redirect
      // The component will re-render when auth state updates
    }
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
    <div className="min-h-screen w-full font-sans bg-[#f5f2e8] text-[#3c3c3c]">
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

        {/* Card */}
        <div className="w-full max-w-md rounded-2xl overflow-hidden shadow-sm bg-white border-2 border-[#d97757]/20 mx-auto">
          {/* Single panel (centered) */}
          <div className="p-8 md:p-10 bg-white">
            {/* Minimal section heading */}
            <h3 className="text-2xl font-serif font-medium text-[#d97757] text-center mb-6">Are we ready?</h3>

            {!resetMode ? (
              <form onSubmit={onSubmit} className="space-y-6">
                <div>
                  <label htmlFor="email" className="block text-sm font-medium text-[#3c3c3c] mb-2 font-sans">Email address</label>
                  <input
                    id="email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full p-3 rounded-xl border border-[#d97757]/20 bg-[#faf8f6] text-[#2d2d2d] shadow-sm focus:outline-none focus:ring-2 focus:ring-[#d97757]/20 focus:border-[#d97757] transition-all font-sans placeholder-[#666666]/50"
                    placeholder="continuewith@google.com"
                  />
                </div>
                <div>
                  <label htmlFor="password" className="block text-sm font-medium text-[#3c3c3c] mb-2 font-sans">Password</label>
                  <div className="relative">
                    <input
                      id="password"
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full p-3 rounded-xl border border-[#d97757]/20 bg-[#faf8f6] text-[#2d2d2d] shadow-sm focus:outline-none focus:ring-2 focus:ring-[#d97757]/20 focus:border-[#d97757] transition-all pr-12 font-sans placeholder-[#666666]/50"
                      placeholder={showPassword ? "It's just better" : ''}
                    />
                    <button
                      type="button"
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      onClick={() => setShowPassword((p) => !p)}
                      className="absolute inset-y-0 right-0 px-3 text-[#666666] hover:text-[#2d2d2d]"
                    >
                      {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                    </button>
                  </div>
                </div>
                <div className="flex items-center justify-between text-sm font-sans">
                  <label className="flex items-center text-[#666666] cursor-pointer">
                    <input type="checkbox" className="w-4 h-4 rounded mr-2 border-[#e6e0d4] text-[#d97757] focus:ring-[#d97757]/30 accent-[#d97757]" />
                    Remember me
                  </label>
                  <button type="button" className="text-[#2d2d2d] font-medium hover:underline" onClick={() => navigate('/reset-password')}>Forgot password?</button>
                </div>
                {error && <div className="text-sm text-red-600 bg-red-50 p-3 rounded-lg border border-red-100">{error}</div>}
                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-3 px-4 bg-[#d97757] text-white font-medium rounded-xl shadow-md hover:bg-[#c56a4b] transform hover:-translate-y-0.5 transition-all font-sans"
                >
                  {submitting ? 'Signing in…' : 'I am born ready!'}
                </button>
                <div className="relative flex items-center my-4">
                  <div className="flex-1 border-t border-[#e6e0d4]" />
                  <span className="px-3 text-xs text-[#666666] font-sans">or</span>
                  <div className="flex-1 border-t border-[#e6e0d4]" />
                </div>
                <button
                  type="button"
                  onClick={onGoogle}
                  disabled={submitting}
                  className="w-full py-3 px-4 bg-white border border-[#d97757]/30 rounded-xl text-[#2d2d2d] font-medium hover:bg-[#fffaf8] transition-all flex items-center justify-center gap-2 font-sans shadow-sm"
                >
                  <GoogleIcon /> Continue with Google
                </button>
                <div className="text-center text-sm text-[#666666] mt-4 font-sans">
                  <Link className="text-[#2d2d2d] font-medium hover:underline" to="/signup">Create account</Link>
                </div>
              </form>
            ) : (
              <form onSubmit={onReset} className="space-y-6">
                <div>
                  <label htmlFor="reset-email" className="block text-sm font-medium text-[#3c3c3c] mb-2 font-sans">Email address</label>
                  <input
                    id="reset-email"
                    type="email"
                    required
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full p-3 rounded-xl border border-[#d97757]/20 bg-[#faf8f6] text-[#2d2d2d] shadow-sm focus:outline-none focus:ring-2 focus:ring-[#d97757]/20 focus:border-[#d97757] transition-all font-sans"
                    placeholder="operator@domain.com"
                  />
                </div>
                {error && <div className="text-sm text-red-600 bg-red-50 p-3 rounded-lg border border-red-100">{error}</div>}
                <div className="flex gap-3">
                  <button type="button" onClick={() => setResetMode(false)} className="flex-1 py-3 bg-white border border-[#d97757]/30 rounded-xl hover:bg-[#fffaf8] text-[#2d2d2d] font-medium font-sans">Cancel</button>
                  <button type="submit" disabled={submitting} className="flex-1 py-3 px-4 bg-[#d97757] text-white font-medium rounded-xl hover:bg-[#c56a4b] font-sans">{submitting ? 'Sending…' : 'Send reset link'}</button>
                </div>
              </form>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Auth;