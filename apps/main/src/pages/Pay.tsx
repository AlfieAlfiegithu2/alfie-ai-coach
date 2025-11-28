import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, Crown, Sparkles, Check, Shield, Lock, CreditCard, Loader2, Zap } from 'lucide-react';

function useQuery() {
  const { search } = useLocation();
  return useMemo(() => new URLSearchParams(search), [search]);
}

// Base prices in USD
const BASE_PRICES = {
  pro: 49,
  ultra: 199,
};

// Plan details
const PLANS = {
  premium: {
    name: 'Pro',
    description: 'Unlimited AI Practice & Feedback',
    features: [
      'Unlimited AI Practice Tests',
      'Examiner-Level Detailed Feedback',
      'Advanced Pronunciation Coaching',
      'Personalized Study Roadmap',
    ],
    icon: Sparkles,
    color: 'from-[#d97757] to-[#e8956f]',
    basePrice: BASE_PRICES.pro,
  },
  pro: {
    name: 'Pro',
    description: 'Unlimited AI Practice & Feedback',
    features: [
      'Unlimited AI Practice Tests',
      'Examiner-Level Detailed Feedback',
      'Advanced Pronunciation Coaching',
      'Personalized Study Roadmap',
    ],
    icon: Sparkles,
    color: 'from-[#d97757] to-[#e8956f]',
    basePrice: BASE_PRICES.pro,
  },
  ultra: {
    name: 'Ultra',
    description: 'Ultimate Mentorship Package',
    features: [
      'Everything in Pro Plan',
      '1-on-1 Personal Meeting with Developers',
      'All Premium Templates & E-books',
      'Direct Access to New Beta Features',
    ],
    icon: Crown,
    color: 'from-amber-500 to-yellow-400',
    basePrice: BASE_PRICES.ultra,
  }
};

const stripePromise = loadStripe(import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY || '');

const EmbeddedCheckoutForm = ({ 
  plan, 
  totalAmount, 
  onSuccess, 
  onError 
}: any) => {
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
      setProcessing(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <PaymentElement options={{ layout: 'accordion', business: { name: 'English AIdol' } }} />
      {message && <div className="text-sm text-red-600 bg-red-50 p-3 rounded-lg">{message}</div>}
      <button
        type="submit"
        disabled={!stripe || processing}
        className={`w-full bg-gradient-to-r ${plan.color} text-white font-semibold py-4 px-6 rounded-xl shadow-lg hover:shadow-xl transition-all disabled:opacity-70 flex items-center justify-center gap-2`}
      >
        {processing ? <Loader2 className="w-5 h-5 animate-spin" /> : <CreditCard className="w-5 h-5" />}
        Pay ${totalAmount}
      </button>
    </form>
  );
};

const Pay = () => {
  const query = useQuery();
  const planId = query.get('plan') || 'premium';
  const cancelled = query.get('cancelled');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const navigate = useNavigate();

  // State for billing selection
  const [billingCycle, setBillingCycle] = useState<1 | 3 | 6>(1);
  const [currency, setCurrency] = useState<'usd' | 'krw' | 'cny'>('usd');
  const [isSubscription, setIsSubscription] = useState(true);
  const [checkoutMode, setCheckoutMode] = useState<'embedded' | 'redirect'>('embedded');

  const plan = PLANS[planId as keyof typeof PLANS] || PLANS.premium;
  const isHttps = window.location.protocol === 'https:';

  // Calculate total price
  const getDiscount = (months: number) => {
    if (months === 6) return 0.30; // 30% off
    if (months === 3) return 0.15; // 15% off
    return 0;
  };
  
  // Exchange rates (approximate)
  const rates = { usd: 1, krw: 1350, cny: 7.2 };
  const symbols = { usd: '$', krw: '₩', cny: '¥' };
  
  const discount = getDiscount(billingCycle);
  const baseMonthlyPrice = Math.round(plan.basePrice * (1 - discount));
  
  // Convert to selected currency
  const monthlyPrice = Math.round(baseMonthlyPrice * rates[currency]);
  const totalAmount = monthlyPrice * billingCycle;
  const savings = Math.round((plan.basePrice * rates[currency]) * billingCycle - totalAmount);

  // Update subscription state when billing cycle changes
  useEffect(() => {
    if (billingCycle > 1) {
      setIsSubscription(false); // Multi-month is always one-time (to support Alipay/Kakao)
    } else {
      setIsSubscription(true); // Default to subscription for monthly
    }
  }, [billingCycle]);

  // Fetch embedded payment secret
  useEffect(() => {
    if (checkoutMode === 'embedded') {
      fetchClientSecret();
    }
  }, [checkoutMode, planId, billingCycle, currency]);

  const fetchClientSecret = async () => {
    setLoading(true);
    setError(null);
    setClientSecret(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setError('Please sign in');
        setTimeout(() => navigate('/auth'), 2000);
        return;
      }
      const { data, error: fnError } = await supabase.functions.invoke('create-embedded-payment', {
        body: { planId, months: billingCycle, currency }
      });
      if (fnError || !data?.clientSecret) throw new Error(fnError?.message || 'Init failed');
      setClientSecret(data.clientSecret);
    } catch (err: any) {
      console.error(err);
      setError('Failed to load payment form');
    } finally {
      setLoading(false);
    }
  };

  const handleRedirectCheckout = async () => {
    setLoading(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { navigate('/auth'); return; }
      
      const { data, error } = await supabase.functions.invoke('create-payment-intent', {
        body: {
          planId,
          months: billingCycle,
          currency,
          successUrl: `${window.location.origin}/dashboard?payment=success&plan=${planId}`,
          cancelUrl: `${window.location.origin}/pay?plan=${planId}&cancelled=true`,
        }
      });
      if (error || !data?.url) throw new Error('Checkout failed');
      window.location.href = data.url;
    } catch (err: any) {
      setError(err.message);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full font-sans bg-gray-50 flex items-center justify-center p-4 py-8">
      <div className="w-full max-w-5xl bg-white rounded-3xl shadow-xl overflow-hidden flex flex-col md:flex-row">
        
        {/* Left Panel */}
        <div className={`p-8 md:p-10 md:w-5/12 bg-gradient-to-br ${plan.color} text-white flex flex-col relative overflow-hidden`}>
          <div className="absolute inset-0 opacity-10 pattern-dots" />
          <button onClick={() => navigate(-1)} className="self-start inline-flex items-center gap-2 text-sm text-white/80 hover:text-white mb-8 z-10">
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
          <div className="flex-1 z-10">
            <div className="flex items-center gap-3 mb-4">
              <div className="p-2 rounded-xl bg-white/20 backdrop-blur-sm"><plan.icon className="w-6 h-6" /></div>
              <h1 className="text-3xl font-bold">{plan.name} Plan</h1>
            </div>
            <div className="flex items-baseline gap-1 mb-6">
              <span className="text-5xl font-bold tracking-tight">${monthlyPrice}</span>
              <span className="text-xl opacity-80">/mo</span>
            </div>
            <p className="text-lg opacity-90 mb-8">{plan.description}</p>
            <ul className="space-y-3">
              {plan.features.map((f, i) => (
                <li key={i} className="flex items-start gap-3">
                  <div className="p-1 rounded-full bg-white/20 mt-0.5"><Check className="w-3 h-3" /></div>
                  <span className="text-sm font-medium">{f}</span>
                </li>
              ))}
            </ul>
          </div>
          <div className="pt-6 border-t border-white/20 z-10 flex items-center gap-2 text-sm opacity-80">
            <Shield className="w-4 h-4" /> Secure encrypted payment
          </div>
        </div>

        {/* Right Panel */}
        <div className="p-8 md:p-10 md:w-7/12 bg-white flex flex-col">
          {/* Currency & Billing Header */}
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-2xl font-bold text-gray-900">Complete purchase</h2>
            <select
              value={currency}
              onChange={(e) => setCurrency(e.target.value as any)}
              className="px-3 py-2 rounded-lg border border-gray-200 text-sm font-medium bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="usd">🇺🇸 USD ($)</option>
              <option value="krw">🇰🇷 KRW (₩)</option>
              <option value="cny">🇨🇳 CNY (¥)</option>
            </select>
          </div>

          {/* Billing Cycle Selector */}
          <div className="grid grid-cols-3 gap-3 mb-8">
            {[1, 3, 6].map((m) => (
              <button
                key={m}
                onClick={() => setBillingCycle(m as 1|3|6)}
                className={`relative p-4 rounded-xl border-2 text-left transition-all ${
                  billingCycle === m ? 'border-blue-500 bg-blue-50' : 'border-gray-100 hover:border-gray-200'
                }`}
              >
                {m > 1 && (
                  <div className="absolute -top-3 right-2 bg-green-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm">
                    SAVE {m === 3 ? '15%' : '30%'}
                  </div>
                )}
                <div className="font-bold text-gray-900">{m === 1 ? 'Monthly' : `${m} Months`}</div>
                <div className="text-xs text-gray-500 font-medium mt-1">Auto-renews</div>
                <div className="text-sm text-gray-500 mt-1">{symbols[currency]}{Math.round((baseMonthlyPrice * rates[currency]))}/mo</div>
              </button>
            ))}
          </div>

          {/* Summary */}
          <div className="bg-gray-50 rounded-2xl p-5 mb-6">
            <div className="flex justify-between items-center mb-2">
              <span className="text-gray-600">Billing Cycle</span>
              <span className="font-medium text-gray-900">
                {billingCycle === 1 ? 'Monthly' : `Every ${billingCycle} Months`} (Recurring)
              </span>
            </div>
            <div className="flex justify-between items-center mb-2">
              <span className="text-gray-600">Plan Price</span>
              <span className="font-medium text-gray-900">{symbols[currency]}{Math.round(baseMonthlyPrice * rates[currency])} × {billingCycle}</span>
            </div>
            {savings > 0 && (
              <div className="flex justify-between items-center mb-2 text-green-600">
                <span>Savings</span>
                <span className="font-bold">-{symbols[currency]}{savings}</span>
              </div>
            )}
            <div className="border-t border-gray-200 my-3" />
            <div className="flex justify-between items-center">
              <span className="font-bold text-xl text-gray-900">Total</span>
              <span className="font-bold text-xl text-gray-900">{symbols[currency]}{totalAmount}</span>
            </div>
          </div>

          {/* Payment Method Toggle */}
          <div className="flex gap-4 mb-6 text-sm font-medium border-b border-gray-100">
            <button 
              onClick={() => setCheckoutMode('embedded')}
              className={`pb-2 border-b-2 transition-colors ${checkoutMode === 'embedded' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
            >
              Pay with Card / Wallet
            </button>
            <button 
              onClick={() => setCheckoutMode('redirect')}
              className={`pb-2 border-b-2 transition-colors ${checkoutMode === 'redirect' ? 'border-blue-500 text-blue-600' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
            >
              Stripe Checkout
            </button>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 bg-red-50 border border-red-100 text-red-600 p-4 rounded-xl text-sm flex gap-2 items-center">
              <Zap className="w-4 h-4" /> {error}
            </div>
          )}

          {/* Embedded Form */}
          {checkoutMode === 'embedded' && (
            <div className="flex-1 min-h-[300px]">
              {!isHttps && (
                <div className="bg-amber-50 text-amber-700 p-3 rounded-lg text-sm mb-4">
                  ⚠️ HTTPS required for embedded payments. Use <a href={`https://englishaidol.loca.lt/pay?plan=${planId}`} className="underline font-bold">Secure Tunnel</a> or switch to Stripe Checkout.
                </div>
              )}
              {loading && !clientSecret ? (
                <div className="flex justify-center py-12"><Loader2 className="w-8 h-8 animate-spin text-gray-300" /></div>
              ) : clientSecret ? (
                <Elements stripe={stripePromise} options={{ clientSecret, appearance: { theme: 'stripe' } }}>
                  <EmbeddedCheckoutForm plan={plan} totalAmount={totalAmount} onSuccess={() => navigate('/dashboard?payment=success')} onError={setError} />
                </Elements>
              ) : null}
            </div>
          )}

          {/* Redirect Button */}
          {checkoutMode === 'redirect' && (
            <div className="flex-1 flex flex-col justify-center">
              <button
                onClick={handleRedirectCheckout}
                disabled={loading}
                className={`w-full bg-gradient-to-r ${plan.color} text-white font-bold py-4 px-6 rounded-xl shadow-lg hover:shadow-xl hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2`}
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <CreditCard className="w-5 h-5" />}
                Continue to Stripe Checkout
              </button>
              <p className="text-center text-xs text-gray-400 mt-4">You'll be redirected to a secure payment page.</p>
            </div>
          )}

          <div className="mt-auto pt-6 text-center text-xs text-gray-400 flex items-center justify-center gap-1">
            <Lock className="w-3 h-3" /> Powered by Stripe
          </div>
        </div>
      </div>
    </div>
  );
};

export default Pay;
