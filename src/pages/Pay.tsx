import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, LinkAuthenticationElement, useElements, useStripe } from '@stripe/react-stripe-js';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft } from 'lucide-react';

function useQuery() {
  const { search } = useLocation();
  return useMemo(() => new URLSearchParams(search), [search]);
}

const CheckoutForm = ({ returnUrl }: { returnUrl: string }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [submitting, setSubmitting] = useState(false);
  const [email, setEmail] = useState<string>("");
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;
    setSubmitting(true);
    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: { return_url: returnUrl, receipt_email: email || undefined },
      redirect: 'if_required',
    });
    setSubmitting(false);
    if (!error) {
      navigate('/personal-page');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <div className="bg-zinc-900 rounded-2xl shadow-xl p-6 md:p-8 border border-zinc-800">
        <div className="flex flex-col md:flex-row gap-8">
          {/* Card preview (decorative) */}
          <div className="w-full md:w-1/2 flex items-center justify-center mb-6 md:mb-0">
            <div className="relative w-[320px] h-[200px] md:w-[380px] md:h-[240px] bg-[#191f2e]/[.98] rounded-2xl overflow-hidden flex items-center"
                 style={{ boxShadow: '0 8px 40px 0 rgba(15,23,42,0.3),0 1.5px 10px 0 rgba(15,23,42,0.25)' }}>
              <div className="absolute top-1/2 left-1/2 w-[200px] h-[160px] rounded-full pointer-events-none"
                   style={{ background: 'linear-gradient(120deg,#6366f1 92%,transparent 100%)', filter: 'blur(24px)', animation: 'mesh1 7s ease-in-out infinite alternate' }} />
              <div className="absolute top-1/2 left-1/2 w-[180px] h-[150px] rounded-full pointer-events-none"
                   style={{ background: 'linear-gradient(80deg,#2563eb 85%,transparent 100%)', filter: 'blur(18px)', animation: 'mesh2 6.3s ease-in-out infinite alternate' }} />
              <div className="absolute top-1/2 left-1/2 w-[160px] h-[120px] rounded-full pointer-events-none"
                   style={{ background: 'linear-gradient(145deg,rgba(255,255,255,0.25) 80%,transparent 100%)', filter: 'blur(12px)', animation: 'mesh3 4.8s ease-in-out infinite alternate' }} />
              <div className="absolute top-1/2 left-1/2 w-[90px] h-[100px] rounded-full pointer-events-none"
                   style={{ background: 'linear-gradient(95deg,#fb923c 80%,transparent 100%)', filter: 'blur(14px)', animation: 'mesh4 8.2s ease-in-out infinite alternate' }} />

              <div className="absolute top-6 left-6 flex flex-col items-center z-10">
                <svg width="46" height="32" viewBox="0 0 46 32" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-12 h-8">
                  <rect x="1" y="1" width="44" height="30" rx="6" fill="#475569" stroke="#cbd5e1" strokeWidth="2"/>
                  <rect x="7" y="7" width="32" height="18" rx="3" fill="#cbd5e1"/>
                  <path d="M10.5,15 h25" stroke="#64748b" strokeWidth="1.1"/>
                  <path d="M10.5,21 h25" stroke="#64748b" strokeWidth="1.1"/>
                  <path d="M15,10 v12" stroke="#64748b" strokeWidth="1.1"/>
                  <path d="M31,10 v12" stroke="#64748b" strokeWidth="1.1"/>
                </svg>
              </div>

              <div className="absolute top-6 right-6 flex items-center z-10">
                <svg width="42" height="28" viewBox="0 0 42 28" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-10 h-7">
                  <defs>
                    <linearGradient id="logoGradient" x1="0" y1="0" x2="42" y2="28" gradientUnits="userSpaceOnUse">
                      <stop stopColor="#2563eb"/>
                      <stop offset="0.65" stopColor="#6366f1"/>
                      <stop offset="1" stopColor="#fb923c"/>
                    </linearGradient>
                  </defs>
                  <path d="M6 22 Q21 2 36 22" stroke="url(#logoGradient)" strokeWidth="5" fill="none" strokeLinecap="round"/>
                </svg>
              </div>

              <div className="absolute left-1/2 top-[47%] -translate-x-1/2 -translate-y-1/2 flex flex-col items-center w-full z-10">
                <span className="font-mono text-lg md:text-xl tracking-widest text-white/90 drop-shadow font-semibold select-none">
                  4628&nbsp;&nbsp;9301&nbsp;&nbsp;2457&nbsp;&nbsp;1098
                </span>
              </div>

              <div className="absolute w-full left-0 flex justify-between items-end px-6 bottom-5 z-10">
                <div>
                  <span className="block uppercase text-[10px] tracking-widest font-bold text-white/55 select-none">cardholder</span>
                  <span className="block text-white/90 text-sm tracking-wide font-medium select-none">YOUR NAME</span>
                </div>
                <div className="flex flex-col items-end">
                  <span className="uppercase text-[10px] tracking-widest font-bold text-white/55 select-none">expires</span>
                  <span className="text-white/90 text-sm font-semibold select-none">08/27</span>
                </div>
              </div>
            </div>
          </div>

          {/* Payment Element */}
          <div className="w-full md:w-1/2">
            <h2 className="text-xl font-semibold text-gray-100 mb-6">Payment Details</h2>
            <div className="mb-4 space-y-4">
              <LinkAuthenticationElement
                onChange={(e) => setEmail(e?.value?.email ?? '')}
                options={{
                  defaultValues: { email: email || '' },
                }}
              />
              <PaymentElement options={{ layout: 'tabs', business: { name: 'English AIdol' } }} />
            </div>
            <button
              type="submit"
              disabled={submitting || !stripe || !elements}
              className="w-full text-white font-medium py-3 px-4 rounded-lg shadow-lg"
              style={{ backgroundImage: 'linear-gradient(90deg, #2563eb 0%, #6366f1 35%, #fb923c 65%, #2563eb 100%)', backgroundSize: '200% 200%' }}
            >
              {submitting ? 'Processing…' : 'Pay now'}
            </button>
            <p className="text-xs text-gray-400 mt-3">Your payment is secured with industry-standard encryption.</p>
          </div>
        </div>
      </div>
    </form>
  );
};

const Pay = () => {
  const query = useQuery();
  const planId = query.get('plan') || 'premium';
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setError(null);
      const { data, error } = await supabase.functions.invoke('create-payment-intent', { body: { planId } });
      if (error || !data?.clientSecret) {
        setError(error?.message || 'Failed to initialize payment');
      } else {
        setClientSecret(data.clientSecret);
      }
    })();
  }, [planId]);

  const stripePromise = useMemo(() => {
    const pk = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY as string;
    if (!pk) {
      console.warn('VITE_STRIPE_PUBLISHABLE_KEY not set');
    }
    return loadStripe(pk || '');
  }, []);

  const options = useMemo(() => ({
    clientSecret,
    appearance: {
      theme: 'night',
      variables: {
        colorPrimary: '#6366f1',
        colorBackground: '#0b0b0b',
        colorText: '#e5e7eb',
        colorTextSecondary: '#9ca3af',
        colorDanger: '#ef4444',
        fontFamily: 'Inter, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial',
        borderRadius: '12px'
      },
      rules: {
        '.Input': { backgroundColor: '#0b0b0b', borderColor: 'rgba(255,255,255,0.1)' },
        '.Tab, .Block': { backgroundColor: '#0b0b0b' }
      }
    },
    loader: 'auto'
  }), [clientSecret]);

  const returnUrl = `${window.location.origin}/personal-page?plan=${planId}`;

  return (
    <div className="min-h-screen w-full font-sans bg-black text-gray-200">
      <div className="max-w-4xl mx-auto py-10 px-4 md:px-0">
        <div className="flex items-center gap-3 mb-6">
          <button
            type="button"
            onClick={() => window.history.back()}
            className="inline-flex items-center gap-2 text-sm text-gray-300 hover:text-white"
          >
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
        </div>
        <h1 className="text-2xl md:text-3xl font-bold text-gray-100 mb-6 text-center">Complete Your Payment</h1>
        {error && <div className="text-sm text-red-500 mb-4 text-center">{error}</div>}
        {clientSecret && (
          <Elements stripe={stripePromise} options={options}>
            <CheckoutForm returnUrl={returnUrl} />
          </Elements>
        )}
      </div>
    </div>
  );
};

export default Pay;


