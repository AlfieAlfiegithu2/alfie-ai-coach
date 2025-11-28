import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, LinkAuthenticationElement, useElements, useStripe } from '@stripe/react-stripe-js';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, Crown, Sparkles, Check } from 'lucide-react';

function useQuery() {
  const { search } = useLocation();
  return useMemo(() => new URLSearchParams(search), [search]);
}

// Plan configuration
const PLANS = {
  premium: {
    name: 'Pro',
    price: '$49',
    period: '/month',
    description: 'Unlimited AI Practice & Feedback',
    features: [
      'Unlimited AI Practice Tests',
      'Examiner-Level Detailed Feedback',
      'Advanced Pronunciation Coaching',
      'Personalized Study Roadmap',
    ],
    icon: Sparkles,
    color: 'from-[#d97757] to-[#e8956f]'
  },
  pro: {
    name: 'Pro',
    price: '$49',
    period: '/month',
    description: 'Unlimited AI Practice & Feedback',
    features: [
      'Unlimited AI Practice Tests',
      'Examiner-Level Detailed Feedback',
      'Advanced Pronunciation Coaching',
      'Personalized Study Roadmap',
    ],
    icon: Sparkles,
    color: 'from-[#d97757] to-[#e8956f]'
  },
  ultra: {
    name: 'Ultra',
    price: '$199',
    period: '/month',
    description: 'Ultimate Mentorship Package',
    features: [
      'Everything in Pro Plan',
      '1-on-1 Personal Meeting with Developers',
      'All Premium Templates & E-books',
      'Direct Access to New Beta Features',
    ],
    icon: Crown,
    color: 'from-amber-500 to-yellow-400'
  }
};

const CheckoutForm = ({ returnUrl, plan }: { returnUrl: string; plan: typeof PLANS.premium }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [submitting, setSubmitting] = useState(false);
  const [email, setEmail] = useState<string>('');
  const navigate = useNavigate();
  const Icon = plan.icon;

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
    if (!error) navigate('/dashboard?payment=success');
  };

  return (
    <div className="w-full max-w-2xl mx-auto bg-white rounded-2xl shadow-xl overflow-hidden">
      {/* Plan Header */}
      <div className={`bg-gradient-to-r ${plan.color} p-6 text-white`}>
        <div className="flex items-center gap-3 mb-2">
          <Icon className="w-6 h-6" />
          <h1 className="text-2xl font-bold">{plan.name} Plan</h1>
        </div>
        <p className="opacity-90">{plan.description}</p>
        <div className="mt-4 flex items-baseline gap-1">
          <span className="text-4xl font-bold">{plan.price}</span>
          <span className="text-lg opacity-80">{plan.period}</span>
        </div>
      </div>

      {/* Features */}
      <div className="px-6 py-4 bg-gray-50 border-b">
        <ul className="grid gap-2">
          {plan.features.map((feature, i) => (
            <li key={i} className="flex items-center gap-2 text-sm text-gray-700">
              <Check className="w-4 h-4 text-green-500 flex-shrink-0" />
              {feature}
            </li>
          ))}
        </ul>
      </div>

      {/* Payment Form */}
      <div className="p-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Email address</label>
            <LinkAuthenticationElement
              onChange={(e) => setEmail(e?.value?.email ?? '')}
              options={{ defaultValues: { email: email || '' } }}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Payment method</label>
            <PaymentElement options={{ layout: 'tabs', business: { name: 'English AIdol' } }} />
          </div>

          <button
            type="submit"
            disabled={submitting || !stripe || !elements}
            className={`w-full bg-gradient-to-r ${plan.color} text-white font-medium py-4 px-6 rounded-xl shadow-lg transition-all hover:shadow-xl disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {submitting ? 'Processing…' : `Subscribe to ${plan.name} Plan`}
          </button>

          <p className="text-xs text-gray-500 text-center">
            By subscribing, you authorise English AIdol to charge you {plan.price}{plan.period} until you cancel. 
            You can cancel anytime from your dashboard settings.
          </p>
        </form>
      </div>
    </div>
  );
};

const Pay = () => {
  const query = useQuery();
  const planId = query.get('plan') || 'premium';
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [stripeError, setStripeError] = useState<string | null>(null);
  const navigate = useNavigate();

  const plan = PLANS[planId as keyof typeof PLANS] || PLANS.premium;

  useEffect(() => {
    (async () => {
      setError(null);
      try {
        // Check if user is authenticated
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          setError('Please sign in to subscribe');
          setTimeout(() => navigate('/auth'), 2000);
          return;
        }

        const { data, error } = await supabase.functions.invoke('create-payment-intent', { 
          body: { planId } 
        });
        
        if (error || !data?.clientSecret) {
          setError(error?.message || data?.error || 'Failed to initialize payment');
        } else {
          setClientSecret(data.clientSecret);
        }
      } catch (err: any) {
        console.error('Error creating payment intent:', err);
        setError(err.message || 'Failed to initialize payment');
      }
    })();
  }, [planId, navigate]);

  const stripePromise = useMemo(() => {
    try {
      const pk = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY as string;
      if (!pk) {
        const msg = 'Stripe key not configured. Please contact support.';
        console.error(msg);
        setStripeError(msg);
        return null;
      }
      return loadStripe(pk).catch((err) => {
        console.error('Error loading Stripe:', err);
        setStripeError('Failed to load Stripe. Please try again later.');
        return null;
      });
    } catch (err: any) {
      console.error('Error initializing Stripe:', err);
      setStripeError('Failed to initialize payment processing.');
      return null;
    }
  }, []);

  const options = useMemo(() => ({
    clientSecret,
    appearance: {
      theme: 'flat' as const,
      variables: {
        colorPrimary: planId === 'ultra' ? '#f59e0b' : '#d97757',
        colorBackground: '#ffffff',
        colorText: '#1f2937',
        colorTextSecondary: '#6b7280',
        colorDanger: '#ef4444',
        fontFamily: 'Inter, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial',
        borderRadius: '12px',
      },
    },
    loader: 'auto' as const,
  }), [clientSecret, planId]);

  const returnUrl = `${window.location.origin}/dashboard?plan=${planId}&payment=success`;
  const stripeKeyMissing = !import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;

  return (
    <div className="min-h-screen w-full font-sans bg-[#f5f2e8] flex items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        <div className="flex items-center gap-3 mb-6">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 text-sm text-[#666666] hover:text-[#2d2d2d] bg-white/80 px-3 py-2 rounded-lg border border-[#e6e0d4]"
          >
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
        </div>
        
        {(error || stripeKeyMissing || stripeError) && (
          <div className="text-sm text-red-600 mb-4 text-center bg-red-50 p-4 rounded-xl border border-red-100">
            {stripeKeyMissing 
              ? "Payment configuration error: Stripe publishable key is missing. Please contact support." 
              : stripeError || error}
          </div>
        )}
        
        {!stripeKeyMissing && !stripeError && clientSecret && stripePromise ? (
          <Elements stripe={stripePromise} options={options}>
            <CheckoutForm returnUrl={returnUrl} plan={plan} />
          </Elements>
        ) : !stripeKeyMissing && !stripeError && !error ? (
          <div className="w-full max-w-2xl mx-auto bg-white rounded-2xl shadow-xl p-8">
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className={`animate-spin rounded-full h-12 w-12 border-b-2 border-[#d97757] mx-auto mb-4`} />
                <p className="text-[#666666]">Loading payment form...</p>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default Pay;
