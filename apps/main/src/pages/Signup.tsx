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
    if (error) {
      setError(error);
    } else {
      // Successful sign‑up – redirect to dashboard
      navigate('/dashboard');
    }
    setSubmitting(false);
  };

  // OTP email verification removed for simpler UX; Supabase email confirmation is sent after sign up

  // Wait for auth to finish loading before checking user
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#f5f2e8]">
        <div className="text-[#2d2d2d] font-serif">Loading…</div>
      </div>
    );
  }

  // Only redirect if auth has finished loading AND user exists
  if (!loading && user) {
    return <Navigate to="/dashboard" replace />;
  }

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
            <h3 className="text-2xl font-serif font-medium text-[#d97757] text-center mb-6">Create account</h3>

            <form onSubmit={onSubmit} className="space-y-6">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-[#3c3c3c] mb-2 font-sans">Your nickname</label>
                <input
                  id="name"
                  type="text"
                  required
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full p-3 rounded-xl border border-[#d97757]/20 bg-white text-[#2d2d2d] shadow-sm focus:outline-none focus:ring-2 focus:ring-[#d97757]/20 focus:border-[#d97757] transition-all font-sans placeholder-[#666666]/50 [&:-webkit-autofill]:bg-white [&:-webkit-autofill]:shadow-[0_0_0_1000px_white_inset] [&:-webkit-autofill]:-webkit-text-fill-color-[#2d2d2d]"
                  placeholder="Your name"
                />
              </div>
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-[#3c3c3c] mb-2 font-sans">Email address</label>
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full p-3 rounded-xl border border-[#d97757]/20 bg-white text-[#2d2d2d] shadow-sm focus:outline-none focus:ring-2 focus:ring-[#d97757]/20 focus:border-[#d97757] transition-all font-sans placeholder-[#666666]/50 [&:-webkit-autofill]:bg-white [&:-webkit-autofill]:shadow-[0_0_0_1000px_white_inset] [&:-webkit-autofill]:-webkit-text-fill-color-[#2d2d2d]"
                  placeholder=""
                />
                <p className="mt-2 text-xs text-[#666666] font-sans">We'll send a verification email after you sign up.</p>
              </div>

              {/* OTP step removed for simpler UX */}
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-[#3c3c3c] mb-2 font-sans">Password</label>
                <input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full p-3 rounded-xl border border-[#d97757]/20 bg-white text-[#2d2d2d] shadow-sm focus:outline-none focus:ring-2 focus:ring-[#d97757]/20 focus:border-[#d97757] transition-all font-sans placeholder-[#666666]/50 [&:-webkit-autofill]:bg-white [&:-webkit-autofill]:shadow-[0_0_0_1000px_white_inset] [&:-webkit-autofill]:-webkit-text-fill-color-[#2d2d2d]"
                  placeholder="••••••••"
                />
              </div>
              <div>
                <label htmlFor="confirm" className="block text-sm font-medium text-[#3c3c3c] mb-2 font-sans">Confirm password</label>
                <input
                  id="confirm"
                  type="password"
                  required
                  value={confirm}
                  onChange={(e) => setConfirm(e.target.value)}
                  className="w-full p-3 rounded-xl border border-[#d97757]/20 bg-white text-[#2d2d2d] shadow-sm focus:outline-none focus:ring-2 focus:ring-[#d97757]/20 focus:border-[#d97757] transition-all font-sans placeholder-[#666666]/50 [&:-webkit-autofill]:bg-white [&:-webkit-autofill]:shadow-[0_0_0_1000px_white_inset] [&:-webkit-autofill]:-webkit-text-fill-color-[#2d2d2d]"
                  placeholder="••••••••"
                />
              </div>
              {error && <div className="text-sm text-red-600 bg-red-50 p-3 rounded-lg border border-red-100">{error}</div>}
              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3 px-4 bg-[#d97757] text-white font-medium rounded-xl shadow-md hover:bg-[#c56a4b] transform hover:-translate-y-0.5 transition-all font-sans"
              >
                {submitting ? 'Creating…' : 'Create account'}
              </button>
              <div className="text-center text-sm text-[#666666] font-sans">
                Already have an account? <Link className="text-[#2d2d2d] font-medium hover:underline" to="/auth">Sign in</Link>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Signup;