import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, Crown, Sparkles, Check, Shield, Lock, CreditCard, Loader2, Zap, Globe, Clock, ShieldCheck } from 'lucide-react';

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
    shadowColor: 'shadow-[#d97757]/20',
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
    shadowColor: 'shadow-[#d97757]/20',
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
    shadowColor: 'shadow-amber-500/20',
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
      <PaymentElement options={{ layout: 'tabs', business: { name: 'English AIdol' } }} />
      {message && <div className="text-sm text-red-600 bg-red-50 p-3 rounded-lg flex items-center gap-2"><Zap className="w-4 h-4" /> {message}</div>}
      <button
        type="submit"
        disabled={!stripe || processing}
        className={`w-full bg-gradient-to-r ${plan.color} text-white font-semibold py-4 px-6 rounded-xl shadow-lg hover:shadow-xl transition-all disabled:opacity-70 flex items-center justify-center gap-2 transform active:scale-[0.98] duration-200`}
      >
        {processing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Lock className="w-4 h-4" />}
        Pay Securely ${totalAmount}
      </button>
      <div className="flex items-center justify-center gap-2 text-xs text-gray-400">
        <ShieldCheck className="w-3 h-3" />
        <span>Payments processed securely by Stripe</span>
      </div>
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
  const fullPrice = Math.round((plan.basePrice * rates[currency]) * billingCycle);
  const savings = fullPrice - totalAmount;

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
        // Allow browsing payment page without being logged in, but prompt on payment attempt?
        // Actually, better to require auth for linking payment to user.
        // For now, redirect to auth if not logged in after a short delay
        setTimeout(() => navigate('/auth'), 500);
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
    <div className="min-h-screen w-full font-sans bg-[#F5F7FA] flex items-center justify-center p-4 py-8">
      <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Panel - Plan Details */}
        <div className="lg:col-span-5 flex flex-col gap-6 order-2 lg:order-1">
          <div className={`bg-white rounded-3xl p-8 shadow-sm border border-white/50 relative overflow-hidden group hover:shadow-md transition-all duration-500`}>
             <div className={`absolute top-0 left-0 w-full h-2 bg-gradient-to-r ${plan.color}`} />
             
             <button onClick={() => navigate(-1)} className="inline-flex items-center gap-2 text-sm text-gray-500 hover:text-gray-900 mb-8 transition-colors">
                <ArrowLeft className="w-4 h-4" /> Back to Plans
             </button>

             <div className="flex items-center gap-4 mb-6">
                <div className={`p-3 rounded-2xl bg-gradient-to-br ${plan.color} text-white shadow-lg shadow-orange-500/20`}>
                  <plan.icon className="w-8 h-8" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-gray-900">{plan.name} Plan</h1>
                  <p className="text-sm text-gray-500">Premium Subscription</p>
                </div>
             </div>

             <div className="mb-8">
               <div className="flex items-baseline gap-1">
                  <span className="text-4xl font-bold text-gray-900">{symbols[currency]}{monthlyPrice}</span>
                  <span className="text-gray-500 font-medium">/mo</span>
               </div>
               <p className="text-sm text-gray-500 mt-2">{plan.description}</p>
             </div>

             <div className="space-y-4">
                {plan.features.map((f, i) => (
                  <div key={i} className="flex items-start gap-3 p-3 rounded-xl hover:bg-gray-50 transition-colors">
                    <div className={`p-1 rounded-full bg-gradient-to-br ${plan.color} mt-0.5 shrink-0`}>
                      <Check className="w-3 h-3 text-white" />
                    </div>
                    <span className="text-sm font-medium text-gray-700 leading-tight">{f}</span>
                  </div>
                ))}
             </div>
          </div>
          
          <div className="bg-white/50 rounded-2xl p-6 border border-white/60 backdrop-blur-sm text-center">
             <div className="flex justify-center gap-6 opacity-40 grayscale hover:grayscale-0 transition-all duration-500 mb-4">
                {/* Placeholder logos for visual trust - simplified SVGs or icons */}
                <div className="h-6 w-10 bg-slate-400 rounded"></div>
                <div className="h-6 w-10 bg-slate-400 rounded"></div>
                <div className="h-6 w-10 bg-slate-400 rounded"></div>
                <div className="h-6 w-10 bg-slate-400 rounded"></div>
             </div>
             <div className="flex items-center justify-center gap-2 text-sm text-gray-500 font-medium">
                <ShieldCheck className="w-4 h-4 text-green-600" />
                <span>Bank-level encryption via Stripe</span>
             </div>
          </div>
        </div>

        {/* Right Panel - Checkout */}
        <div className="lg:col-span-7 bg-white rounded-3xl shadow-xl shadow-gray-200/50 border border-gray-100 overflow-hidden flex flex-col order-1 lg:order-2">
          
          {/* Header */}
          <div className="p-8 border-b border-gray-100 bg-gray-50/30">
             <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                   <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                     Complete Payment
                     <span className="text-xs font-normal px-2 py-0.5 rounded-full bg-blue-50 text-blue-600 border border-blue-100">Secure</span>
                   </h2>
                   <p className="text-sm text-gray-500 mt-1">Choose your billing cycle and currency</p>
                </div>
                
                {/* Currency Selector */}
                <div className="flex items-center gap-2 bg-white rounded-lg p-1 border border-gray-200 shadow-sm">
                   <Globe className="w-4 h-4 text-gray-400 ml-2" />
                   <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value as any)}
                    className="bg-transparent text-sm font-medium text-gray-700 focus:outline-none py-1 pr-2 cursor-pointer"
                   >
                    <option value="usd">USD ($)</option>
                    <option value="krw">KRW (₩)</option>
                    <option value="cny">CNY (¥)</option>
                   </select>
                </div>
             </div>
          </div>

          <div className="p-8">
            {/* Billing Cycle Selector */}
            <div className="mb-8">
               <label className="block text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
                 <Clock className="w-4 h-4 text-gray-400" /> Billing Cycle
               </label>
               <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                 {[1, 3, 6].map((m) => (
                   <button
                     key={m}
                     onClick={() => setBillingCycle(m as 1|3|6)}
                     className={`relative p-4 rounded-xl border transition-all text-left group ${
                       billingCycle === m 
                        ? `border-orange-500 bg-orange-50 ring-1 ring-orange-500/20` 
                        : 'border-gray-200 hover:border-orange-200 hover:bg-gray-50'
                     }`}
                   >
                     {m > 1 && (
                       <div className="absolute -top-2.5 right-3 bg-green-500 text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm tracking-wide">
                         SAVE {m === 3 ? '15%' : '30%'}
                       </div>
                     )}
                     <div className={`font-bold text-lg mb-1 ${billingCycle === m ? 'text-orange-700' : 'text-gray-900'}`}>
                       {m === 1 ? 'Monthly' : `${m} Months`}
                     </div>
                     <div className="text-xs text-gray-500 font-medium">
                       {billingCycle > 1 ? 'One-time payment' : 'Auto-renews'}
                     </div>
                     <div className="mt-2 text-sm font-bold text-gray-900">
                       {symbols[currency]}{Math.round((baseMonthlyPrice * rates[currency]))}<span className="text-xs font-normal text-gray-500">/mo</span>
                     </div>
                   </button>
                 ))}
               </div>
            </div>

            {/* Summary Box */}
            <div className="bg-slate-50 rounded-2xl p-5 border border-slate-100 mb-8">
               <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                     <span className="text-slate-600">Subtotal ({billingCycle} months)</span>
                     <span className="font-medium text-slate-900">{symbols[currency]}{fullPrice.toLocaleString()}</span>
                  </div>
                  {savings > 0 && (
                    <div className="flex justify-between text-sm text-green-600">
                       <span>Discount Savings</span>
                       <span className="font-bold">-{symbols[currency]}{savings.toLocaleString()}</span>
                    </div>
                  )}
                  <div className="border-t border-slate-200 pt-3 flex justify-between items-center">
                     <span className="font-bold text-lg text-slate-900">Total Due</span>
                     <div className="text-right">
                       <span className="font-bold text-2xl text-slate-900">{symbols[currency]}{totalAmount.toLocaleString()}</span>
                       <p className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">
                         {currency.toUpperCase()}
                       </p>
                     </div>
                  </div>
               </div>
            </div>

            {/* Payment Method Tabs */}
            <div className="mb-6">
              <label className="block text-sm font-semibold text-gray-700 mb-3">Payment Method</label>
              <div className="flex p-1 bg-gray-100 rounded-xl mb-4">
                 <button
                   onClick={() => setCheckoutMode('embedded')}
                   className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition-all ${
                     checkoutMode === 'embedded' 
                     ? 'bg-white text-gray-900 shadow-sm' 
                     : 'text-gray-500 hover:text-gray-700'
                   }`}
                 >
                   Card / Digital Wallet
                 </button>
                 <button
                   onClick={() => setCheckoutMode('redirect')}
                   className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition-all ${
                     checkoutMode === 'redirect' 
                     ? 'bg-white text-gray-900 shadow-sm' 
                     : 'text-gray-500 hover:text-gray-700'
                   }`}
                 >
                   Stripe Checkout
                 </button>
              </div>
            </div>

            {/* Error Display */}
            {error && (
               <div className="mb-6 bg-red-50 border border-red-100 text-red-600 p-4 rounded-xl text-sm flex gap-3 items-start animate-in fade-in slide-in-from-top-2">
                 <Zap className="w-5 h-5 shrink-0 mt-0.5" /> 
                 <span>{error}</span>
               </div>
            )}

            {/* Payment Forms */}
            {checkoutMode === 'embedded' && (
               <div className="animate-in fade-in zoom-in-95 duration-300">
                  {!isHttps && (
                    <div className="bg-amber-50 border border-amber-100 text-amber-800 p-4 rounded-xl text-sm mb-6 flex gap-3">
                      <Lock className="w-5 h-5 shrink-0 text-amber-600" />
                      <div>
                        <p className="font-bold mb-1">HTTPS Connection Required</p>
                         <p>For security, embedded payments require HTTPS. Use the <a href={`https://englishaidol.loca.lt/pay?plan=${planId}`} className="underline font-bold text-amber-900">secure tunnel</a> or switch to Stripe Checkout.</p>
                      </div>
                    </div>
                  )}
                  
                  {loading && !clientSecret ? (
                     <div className="flex flex-col items-center justify-center py-12 text-gray-400 gap-3">
                        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
                        <span className="text-sm font-medium">Initializing secure checkout...</span>
                     </div>
                  ) : clientSecret ? (
                     <Elements stripe={stripePromise} options={{ 
                        clientSecret, 
                        appearance: { 
                          theme: 'stripe',
                          variables: {
                            colorPrimary: '#f97316',
                            colorBackground: '#ffffff',
                            colorText: '#1f2937',
                            colorDanger: '#ef4444',
                            borderRadius: '12px',
                          }
                        } 
                     }}>
                        <EmbeddedCheckoutForm plan={plan} totalAmount={totalAmount} onSuccess={() => navigate('/dashboard?payment=success')} onError={setError} />
                     </Elements>
                  ) : null}
               </div>
            )}

            {checkoutMode === 'redirect' && (
               <div className="text-center py-8 animate-in fade-in zoom-in-95 duration-300">
                 <div className="w-16 h-16 bg-blue-50 rounded-full flex items-center justify-center mx-auto mb-4">
                    <ShieldCheck className="w-8 h-8 text-blue-600" />
                 </div>
                 <h3 className="text-lg font-bold text-gray-900 mb-2">Redirect to Stripe</h3>
                 <p className="text-gray-500 text-sm mb-6 max-w-sm mx-auto">You will be redirected to Stripe's hosted payment page to complete your purchase securely.</p>
                 <button
                    onClick={handleRedirectCheckout}
                    disabled={loading}
                    className={`w-full bg-[#635BFF] text-white font-bold py-4 px-6 rounded-xl shadow-lg hover:shadow-indigo-500/30 hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2`}
                  >
                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Lock className="w-5 h-5" />}
                    Continue to Stripe Checkout
                  </button>
               </div>
            )}
            
            <div className="mt-8 pt-6 border-t border-gray-100 flex items-center justify-between text-xs text-gray-400">
               <div className="flex gap-2">
                 <span>Terms</span>
                 <span>Privacy</span>
               </div>
               <div className="flex items-center gap-1">
                 <Lock className="w-3 h-3" />
                 <span>256-bit SSL Encryption</span>
               </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default Pay;
