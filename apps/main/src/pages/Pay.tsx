import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, Crown, Sparkles, Check, Shield, Lock, CreditCard, Loader2 } from 'lucide-react';

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
    color: 'from-[#d97757] to-[#e8956f]',
    bgColor: 'bg-[#d97757]'
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
    color: 'from-[#d97757] to-[#e8956f]',
    bgColor: 'bg-[#d97757]'
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
    color: 'from-amber-500 to-yellow-400',
    bgColor: 'bg-amber-500'
  }
};

// Payment method badges
const ALL_PAYMENT_METHODS = [
  { name: 'Visa/MC', icon: '💳' },
  { name: 'Korean Cards', icon: '🇰🇷' },
  { name: 'Google Pay', icon: '🔵' },
  { name: 'Apple Pay', icon: '🍎' },
  { name: 'Kakao Pay', icon: '💛' },
  { name: 'Naver Pay', icon: '🟢' },
  { name: 'Alipay', icon: '🔷' },
  { name: 'WeChat Pay', icon: '🟩' },
];

// Initialize Stripe
const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '');

// Embedded Payment Form Component
const EmbeddedCheckoutForm = ({ 
  plan, 
  onSuccess, 
  onError,
  displayPrice
}: { 
  plan: typeof PLANS.premium; 
  onSuccess: () => void; 
  onError: (msg: string) => void;
  displayPrice: string;
}) => {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;

    setProcessing(true);
    setMessage(null);

    const { error, paymentIntent } = await stripe.confirmPayment({
      elements,
      confirmParams: {
        return_url: `${window.location.origin}/dashboard?payment=success`,
      },
      redirect: 'if_required',
    });

    if (error) {
      setMessage(error.message || 'Payment failed');
      onError(error.message || 'Payment failed');
      setProcessing(false);
    } else if (paymentIntent && paymentIntent.status === 'succeeded') {
      onSuccess();
    } else {
      // Payment requires additional action (redirect may happen for Alipay/WeChat)
      setProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <PaymentElement 
        options={{
          layout: 'accordion',
          business: { name: 'English AIdol' },
        }}
      />
      
      {message && (
        <div className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">
          {message}
        </div>
      )}

      <button
        type="submit"
        disabled={!stripe || processing}
        className={`w-full bg-gradient-to-r ${plan.color} text-white font-semibold py-4 px-6 rounded-xl shadow-lg transition-all hover:shadow-xl hover:-translate-y-0.5 disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2`}
      >
        {processing ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" />
            Processing...
          </>
        ) : (
          <>
            <CreditCard className="w-5 h-5" />
            Pay {displayPrice}
          </>
        )}
      </button>
    </form>
  );
};

// Base prices in USD (Stripe will convert to local currency)
const BASE_PRICES = {
  pro: 49,    // $49 USD
  ultra: 199, // $199 USD
};

// Approximate exchange rates for display only (actual rate determined by Stripe at checkout)
const APPROX_RATES: Record<string, { rate: number; symbol: string; name: string }> = {
  usd: { rate: 1, symbol: '$', name: 'USD' },
  krw: { rate: 1350, symbol: '₩', name: 'KRW' },  // ~1350 KRW per USD
  cny: { rate: 7.35, symbol: '¥', name: 'CNY' },  // ~7.35 CNY per USD
};

const Pay = () => {
  const query = useQuery();
  const planId = query.get('plan') || 'premium';
  const cancelled = query.get('cancelled');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [paymentMode, setPaymentMode] = useState<'embedded' | 'redirect'>('embedded');
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [currency, setCurrency] = useState<'usd' | 'krw' | 'cny'>('usd');
  const navigate = useNavigate();

  const plan = PLANS[planId as keyof typeof PLANS] || PLANS.premium;
  const rateInfo = APPROX_RATES[currency];
  const basePrice = planId === 'ultra' ? BASE_PRICES.ultra : BASE_PRICES.pro;
  const convertedPrice = Math.round(basePrice * rateInfo.rate);
  const displayPrice = currency === 'usd' 
    ? `$${basePrice}` 
    : `≈ ${rateInfo.symbol}${convertedPrice.toLocaleString()}`;
  
  // Check if we're on HTTPS (required for embedded payment form with live keys)
  const isHttps = window.location.protocol === 'https:';

  // Show message if user cancelled
  useEffect(() => {
    if (cancelled === 'true') {
      setError('Payment was cancelled. You can try again when ready.');
    }
  }, [cancelled]);

  // Fetch client secret for embedded payment
  useEffect(() => {
    if (paymentMode === 'embedded') {
      fetchClientSecret();
    }
  }, [paymentMode, planId]);

  const fetchClientSecret = async () => {
    setLoading(true);
    setError(null);
    setClientSecret(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError('Please sign in to continue');
        setTimeout(() => navigate('/auth'), 2000);
        return;
      }

      const { data, error: fnError } = await supabase.functions.invoke('create-embedded-payment', {
        body: { planId }
      });

      if (fnError || !data?.clientSecret) {
        throw new Error(fnError?.message || data?.error || 'Failed to initialize payment');
      }

      setClientSecret(data.clientSecret);
    } catch (err: any) {
      console.error('Payment init error:', err);
      setError(err.message || 'Failed to initialize payment');
    } finally {
      setLoading(false);
    }
  };

  const handleRedirectCheckout = async () => {
    setLoading(true);
    setError(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError('Please sign in to subscribe');
        setTimeout(() => navigate('/auth'), 2000);
        return;
      }

      const { data, error: fnError } = await supabase.functions.invoke('create-payment-intent', {
        body: {
          planId,
          successUrl: `${window.location.origin}/dashboard?payment=success&plan=${planId}`,
          cancelUrl: `${window.location.origin}/pay?plan=${planId}&cancelled=true`,
        }
      });

      if (fnError || !data?.url) {
        throw new Error(fnError?.message || data?.error || 'Failed to create checkout session');
      }

      window.location.href = data.url;

    } catch (err: any) {
      console.error('Checkout error:', err);
      setError(err.message || 'Failed to start checkout');
      setLoading(false);
    }
  };

  const handlePaymentSuccess = () => {
    navigate('/dashboard?payment=success');
  };

  const handlePaymentError = (msg: string) => {
    setError(msg);
  };

  // Stripe Elements appearance
  const appearance = {
    theme: 'stripe' as const,
    variables: {
      colorPrimary: planId === 'ultra' ? '#f59e0b' : '#d97757',
      colorBackground: '#ffffff',
      colorText: '#1f2937',
      fontFamily: 'Inter, system-ui, sans-serif',
      borderRadius: '12px',
    },
  };

  const elementsOptions = clientSecret ? {
    clientSecret,
    appearance,
  } : undefined;

  return (
    <div className="min-h-screen w-full font-sans bg-gradient-to-br from-slate-50 to-slate-100 flex items-center justify-center p-4 py-8">
      <div className="w-full max-w-5xl bg-white rounded-3xl shadow-2xl overflow-hidden flex flex-col md:flex-row">
        
        {/* Left Panel - Plan Details */}
        <div className={`p-8 md:p-10 md:w-5/12 bg-gradient-to-br ${plan.color} text-white flex flex-col relative overflow-hidden`}>
          {/* Background pattern */}
          <div className="absolute inset-0 opacity-10">
            <div className="absolute top-10 right-10 w-32 h-32 rounded-full border-4 border-white" />
            <div className="absolute bottom-20 left-5 w-20 h-20 rounded-full border-4 border-white" />
            <div className="absolute top-1/2 right-1/4 w-16 h-16 rounded-full border-4 border-white" />
          </div>

          <button
            type="button"
            onClick={() => navigate(-1)}
            className="self-start inline-flex items-center gap-2 text-sm text-white/80 hover:text-white mb-8 transition-colors relative z-10"
          >
            <ArrowLeft className="w-4 h-4" /> Back
          </button>

          <div className="flex-1 relative z-10">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-xl bg-white/20 backdrop-blur-sm">
                <plan.icon className="w-6 h-6" />
              </div>
              <h1 className="text-3xl font-bold">{plan.name} Plan</h1>
            </div>
            
            <div className="flex items-baseline gap-1 mb-6">
              <span className="text-5xl font-bold tracking-tight">{plan.price}</span>
              <span className="text-xl opacity-80">{plan.period}</span>
            </div>

            <p className="text-lg opacity-90 mb-8 leading-relaxed">
              {plan.description}
            </p>

            <div className="space-y-4 mb-8">
              <h3 className="font-semibold opacity-90 uppercase tracking-wide text-sm">What's included:</h3>
              <ul className="space-y-3">
                {plan.features.map((feature, i) => (
                  <li key={i} className="flex items-start gap-3">
                    <div className="p-1 rounded-full bg-white/20 mt-0.5 flex-shrink-0">
                      <Check className="w-3 h-3" />
                    </div>
                    <span className="text-sm font-medium">{feature}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="pt-6 border-t border-white/20 relative z-10">
            <div className="flex items-center gap-2 text-sm opacity-80">
              <Shield className="w-4 h-4" />
              <span>Secure encrypted payment via Stripe</span>
            </div>
          </div>
        </div>

        {/* Right Panel - Checkout */}
        <div className="p-8 md:p-10 md:w-7/12 bg-white flex flex-col">
          <div className="mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Complete your purchase</h2>
            <p className="text-gray-500 text-sm mt-1">Choose your preferred checkout method</p>
          </div>

          {error && (
            <div className="text-sm text-red-600 mb-6 bg-red-50 p-4 rounded-xl border border-red-100 flex items-start gap-3">
              <span className="text-red-500">⚠️</span>
              <span>{error}</span>
            </div>
          )}

          {/* Currency Preview Selector */}
          <div className="mb-4">
            <p className="text-sm font-medium text-gray-700 mb-2">View price in:</p>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setCurrency('usd')}
                className={`p-3 rounded-lg border-2 transition-all text-center ${
                  currency === 'usd'
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="font-semibold text-gray-900">🇺🇸 USD</div>
              </button>
              <button
                type="button"
                onClick={() => setCurrency('krw')}
                className={`p-3 rounded-lg border-2 transition-all text-center ${
                  currency === 'krw'
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="font-semibold text-gray-900">🇰🇷 KRW</div>
              </button>
              <button
                type="button"
                onClick={() => setCurrency('cny')}
                className={`p-3 rounded-lg border-2 transition-all text-center ${
                  currency === 'cny'
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="font-semibold text-gray-900">🇨🇳 CNY</div>
              </button>
            </div>
          </div>

          {/* Checkout Method Toggle */}
          <div className="mb-6">
            <div className="grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setPaymentMode('embedded')}
                className={`p-4 rounded-xl border-2 transition-all text-left ${
                  paymentMode === 'embedded'
                    ? 'border-blue-500 bg-blue-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="font-semibold text-gray-900 mb-1">💳 Pay Here</div>
                <div className="text-xs text-gray-500">All methods • Stay on site</div>
              </button>
              <button
                type="button"
                onClick={() => setPaymentMode('redirect')}
                className={`p-4 rounded-xl border-2 transition-all text-left ${
                  paymentMode === 'redirect'
                    ? 'border-green-500 bg-green-50'
                    : 'border-gray-200 hover:border-gray-300'
                }`}
              >
                <div className="font-semibold text-gray-900 mb-1">🔗 Stripe Checkout</div>
                <div className="text-xs text-gray-500">Redirect to Stripe</div>
              </button>
            </div>
          </div>

          {/* Payment Methods Info */}
          <div className="mb-6">
            <p className="text-sm text-gray-500 mb-3">Available payment methods:</p>
            <div className="flex flex-wrap gap-2">
              {ALL_PAYMENT_METHODS.map((method) => (
                <div
                  key={method.name}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 rounded-lg text-xs text-gray-600"
                >
                  <span>{method.icon}</span>
                  <span>{method.name}</span>
                </div>
              ))}
              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-100 rounded-lg text-xs text-gray-600">
                <span>+</span>
                <span>More</span>
              </div>
            </div>
          </div>

          {/* Order Summary */}
          <div className="bg-slate-50 rounded-2xl p-5 mb-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className={`p-2 rounded-lg bg-gradient-to-br ${plan.color}`}>
                  <plan.icon className="w-4 h-4 text-white" />
                </div>
                <div>
                  <p className="font-medium text-gray-900">{plan.name} Plan</p>
                  <p className="text-sm text-gray-500">One month access</p>
                </div>
              </div>
              <div className="text-right">
                <p className="text-xl font-bold text-gray-900">${basePrice} USD</p>
                {currency !== 'usd' && (
                  <p className="text-sm text-gray-500">{displayPrice}</p>
                )}
              </div>
            </div>
            {currency !== 'usd' && (
              <p className="text-xs text-gray-400 mt-3 text-center">
                * Approximate price. Final amount in {rateInfo.name} shown at checkout.
              </p>
            )}
          </div>

          {/* Payment Form or Checkout Button */}
          {paymentMode === 'embedded' ? (
            <div className="flex-1">
              {!isHttps && (
                <div className="text-sm text-amber-600 mb-4 bg-amber-50 p-4 rounded-xl border border-amber-100">
                  ⚠️ Embedded payments require HTTPS. Use{' '}
                  <a 
                    href={`https://englishaidol.loca.lt/pay?plan=${planId}`} 
                    className="underline font-medium"
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    https://englishaidol.loca.lt
                  </a>{' '}
                  or switch to "Stripe Checkout".
                </div>
              )}
              
              {loading && !clientSecret ? (
                <div className="flex items-center justify-center py-12">
                  <Loader2 className="w-8 h-8 animate-spin text-gray-400" />
                </div>
              ) : clientSecret && elementsOptions ? (
                <Elements stripe={stripePromise} options={elementsOptions}>
                  <EmbeddedCheckoutForm 
                    plan={plan} 
                    onSuccess={handlePaymentSuccess}
                    onError={handlePaymentError}
                    displayPrice={displayPrice}
                  />
                </Elements>
              ) : !error ? (
                <div className="text-center py-12 text-gray-500">
                  <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2" />
                  Initializing payment form...
                </div>
              ) : null}
            </div>
          ) : (
            <div className="flex-1 flex flex-col">
              <button
                onClick={handleRedirectCheckout}
                disabled={loading}
                className={`w-full bg-gradient-to-r ${plan.color} text-white font-semibold py-4 px-6 rounded-xl shadow-lg transition-all hover:shadow-xl hover:-translate-y-0.5 disabled:opacity-70 disabled:cursor-not-allowed disabled:transform-none flex items-center justify-center gap-2`}
              >
                {loading ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin" />
                    Redirecting to Stripe...
                  </>
                ) : (
                  <>
                    <CreditCard className="w-5 h-5" />
                    Continue to Stripe Checkout
                  </>
                )}
              </button>
              
              <p className="text-xs text-gray-500 text-center mt-4">
                You'll be redirected to Stripe's secure checkout page
              </p>
            </div>
          )}

          <div className="mt-auto pt-6 text-center">
            <div className="flex items-center justify-center gap-2 text-xs text-gray-400">
              <Lock className="w-3 h-3" />
              Powered by Stripe • PCI-DSS compliant
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Pay;
