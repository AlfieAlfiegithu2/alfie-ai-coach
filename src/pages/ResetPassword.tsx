import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';

const ResetPassword = () => {
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    if (!password || password.length < 6) {
      setError('Password must be at least 6 characters.');
      return;
    }
    if (password !== confirm) {
      setError('Passwords do not match.');
      return;
    }
    setSubmitting(true);
    const { error } = await supabase.auth.updateUser({ password });
    setSubmitting(false);
    if (error) {
      setError(error.message || 'Failed to reset password.');
      return;
    }
    setSuccess('Password updated successfully. You can sign in now.');
    setTimeout(() => navigate('/auth'), 1200);
  };

  return (
    <div className="min-h-screen w-full font-sans">
      <div className="fixed inset-0 bg-cover bg-center bg-no-repeat -z-10" style={{ backgroundImage: "url('/lovable-uploads/38d81cb0-fd21-4737-b0f5-32bc5d0ae774.png')" }} />
      <div className="fixed inset-0 bg-background/50 backdrop-blur-sm -z-10" />

      <div className="relative z-10 w-full min-h-screen flex flex-col items-center justify-center px-4 py-10">
        <div className="w-full max-w-md rounded-2xl overflow-hidden shadow-xl bg-card/90 border border-border mx-auto">
          <div className="p-6 md:p-8 bg-card">
            <h3 className="text-2xl font-semibold text-foreground text-center mb-4">Set a new password</h3>
            <form onSubmit={onSubmit} className="space-y-5">
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-muted-foreground mb-2">New password</label>
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
              {success && <div className="text-sm text-emerald-600">{success}</div>}
              <button
                type="submit"
                disabled={submitting}
                className="w-full py-3 px-4 bg-primary text-primary-foreground font-medium rounded-xl shadow-sm hover:bg-primary/90"
              >
                {submitting ? 'Updating…' : 'Update password'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;


