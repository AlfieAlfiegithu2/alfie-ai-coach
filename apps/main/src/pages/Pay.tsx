import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, Crown, Sparkles, Check, Lock, Loader2, Zap, Clock, Tag } from 'lucide-react';

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
  currency,
  onSuccess, 
  onError 
}: any) => {
  const stripe = useStripe();
  const elements = useElements();
  const [processing, setProcessing] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const symbols = { usd: '$', krw: '₩', cny: '¥' };

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
      <PaymentElement 
        options={{ 
          layout: 'tabs', 
          business: { name: 'English AIdol' },
        }} 
      />
      {message && <div className="text-sm text-red-600 bg-red-50 p-3 rounded-lg flex items-center gap-2"><Zap className="w-4 h-4" /> {message}</div>}
      
      <div className="space-y-4">
        <button
          type="submit"
          disabled={!stripe || processing}
          className={`w-full bg-gradient-to-r ${plan.color} text-white font-semibold py-4 px-6 rounded-xl shadow-lg hover:shadow-xl transition-all disabled:opacity-70 flex items-center justify-center gap-2 transform active:scale-[0.98] duration-200`}
        >
          {processing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Lock className="w-4 h-4" />}
          Pay Securely {symbols[currency as keyof typeof symbols]}{totalAmount.toLocaleString()}
        </button>

        <p className="text-center text-xs text-[#8B6914] font-sans">
          By clicking pay, you read and agree to our{' '}
          <a href="/terms" className="underline hover:text-[#5D4E37] transition-colors" target="_blank" rel="noopener noreferrer">Terms</a>
          {' '}and{' '}
          <a href="/privacy" className="underline hover:text-[#5D4E37] transition-colors" target="_blank" rel="noopener noreferrer">Privacy Policy</a>.
        </p>
      </div>
      </form>
  );
};

const Pay = () => {
  const query = useQuery();
  const initialPlanId = query.get('plan') || 'premium';
  const cancelled = query.get('cancelled');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const navigate = useNavigate();

  // State for billing selection
  const [selectedPlan, setSelectedPlan] = useState<'pro' | 'ultra'>(initialPlanId === 'ultra' ? 'ultra' : 'pro');
  const [billingCycle, setBillingCycle] = useState<1 | 3 | 6>(1);
  const [isSubscription, setIsSubscription] = useState(true);
  const [checkoutMode, setCheckoutMode] = useState<'embedded' | 'redirect'>('embedded'); // embedded = pay here, redirect = stripe checkout
  const [couponCode, setCouponCode] = useState('');
  const [currency, setCurrency] = useState<'usd' | 'krw'>('usd'); // USD or KRW for Korean payment methods

  const plan = PLANS[selectedPlan];
  const planId = selectedPlan === 'pro' ? 'premium' : 'ultra'; // API uses 'premium' for pro
  const isHttps = window.location.protocol === 'https:';

  // Calculate total price - Fixed logic
  const getDiscountPercent = (months: number) => {
    if (months === 6) return 30; // 30% off
    if (months === 3) return 15; // 15% off
    return 0;
  };
  
  const symbols = { usd: '$', krw: '₩' };
  const rates = { usd: 1, krw: 1350 }; // Approximate exchange rate
  
  const discountPercent = getDiscountPercent(billingCycle);
  const monthlyBasePrice = plan.basePrice; // Base price in USD without discount
  const fullPriceUSD = monthlyBasePrice * billingCycle; // Full price in USD without discount
  const discountAmountUSD = Math.round(fullPriceUSD * (discountPercent / 100));
  const totalAmountUSD = fullPriceUSD - discountAmountUSD;
  
  // Convert to selected currency
  const fullPrice = Math.round(fullPriceUSD * rates[currency]);
  const discountAmount = Math.round(discountAmountUSD * rates[currency]);
  const totalAmount = Math.round(totalAmountUSD * rates[currency]);
  const effectiveMonthlyPrice = Math.round(totalAmount / billingCycle);

  // Update subscription state when billing cycle changes
  useEffect(() => {
    if (billingCycle > 1) {
      setIsSubscription(false); // Multi-month is always one-time
    } else {
      setIsSubscription(true); // Default to subscription for monthly
    }
  }, [billingCycle]);

  // Fetch embedded payment secret
  useEffect(() => {
    if (checkoutMode === 'embedded') {
      fetchClientSecret();
    }
  }, [checkoutMode, selectedPlan, billingCycle, currency]);

  const fetchClientSecret = async () => {
    setLoading(true);
    setError(null);
    setClientSecret(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
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
    <div className="min-h-screen w-full font-serif bg-[#FEF9E7] flex items-center justify-center p-4 py-8">
      <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Panel - Plan Details */}
        <div className="lg:col-span-5 flex flex-col gap-6 order-2 lg:order-1">
          <div className="bg-[#FEF9E7] rounded-3xl p-8 shadow-sm border border-[#E8D5A3] relative overflow-hidden group hover:shadow-md transition-all duration-500">
             
             <button onClick={() => navigate(-1)} className="inline-flex items-center gap-2 text-sm text-[#8B6914] hover:text-[#5D4E37] mb-6 transition-colors font-medium">
                <ArrowLeft className="w-4 h-4" /> Back to Plans
             </button>

             {/* Plan Selector */}
             <div className="mb-6">
               <label className="block text-sm font-semibold text-[#5D4E37] mb-3 font-sans">Select Plan</label>
               <div className="grid grid-cols-2 gap-3">
                 <button
                   onClick={() => setSelectedPlan('pro')}
                   className={`p-4 rounded-xl border-2 transition-all text-left ${
                     selectedPlan === 'pro'
                       ? 'border-[#d97757] bg-gradient-to-br from-[#d97757]/10 to-[#e8956f]/10'
                       : 'border-[#E8D5A3] hover:border-[#d97757]/50'
                   }`}
                 >
                   <div className="flex items-center gap-2 mb-1">
                     <Sparkles className={`w-4 h-4 ${selectedPlan === 'pro' ? 'text-[#d97757]' : 'text-[#A68B5B]'}`} />
                     <span className={`font-bold ${selectedPlan === 'pro' ? 'text-[#d97757]' : 'text-[#5D4E37]'}`}>Pro</span>
                   </div>
                   <span className="text-sm text-[#8B6914]">${BASE_PRICES.pro}/mo</span>
                 </button>
                 <button
                   onClick={() => setSelectedPlan('ultra')}
                   className={`p-4 rounded-xl border-2 transition-all text-left ${
                     selectedPlan === 'ultra'
                       ? 'border-amber-500 bg-gradient-to-br from-amber-500/10 to-yellow-400/10'
                       : 'border-[#E8D5A3] hover:border-amber-500/50'
                   }`}
                 >
                   <div className="flex items-center gap-2 mb-1">
                     <Crown className={`w-4 h-4 ${selectedPlan === 'ultra' ? 'text-amber-500' : 'text-[#A68B5B]'}`} />
                     <span className={`font-bold ${selectedPlan === 'ultra' ? 'text-amber-600' : 'text-[#5D4E37]'}`}>Ultra</span>
                   </div>
                   <span className="text-sm text-[#8B6914]">${BASE_PRICES.ultra}/mo</span>
                 </button>
               </div>
             </div>

             <div className="flex items-center gap-4 mb-6">
                <div>
                  <h1 className="text-3xl font-bold text-[#5D4E37] tracking-tight">{plan.name} Plan</h1>
                </div>
             </div>

             <div className="mb-8">
               <div className="flex items-baseline gap-1">
                  <span className="text-5xl font-bold text-[#5D4E37] font-sans">{symbols[currency]}{effectiveMonthlyPrice.toLocaleString()}</span>
                  <span className="text-[#8B6914] font-medium font-sans">/mo</span>
               </div>
               {discountPercent > 0 && (
                 <p className="text-sm text-[#A68B5B] mt-1 font-sans">
                   <span className="line-through">{symbols[currency]}{Math.round(monthlyBasePrice * rates[currency]).toLocaleString()}/mo</span>
                   <span className="ml-2 text-green-600 font-medium">{discountPercent}% off</span>
                 </p>
               )}
               <p className="text-base text-[#8B6914] mt-3 leading-relaxed">{plan.description}</p>
             </div>

             <div className="space-y-4">
                {plan.features.map((f, i) => (
                  <div key={i} className="flex items-start gap-3 p-3 rounded-xl hover:bg-[#FDF6E3] transition-colors border border-transparent hover:border-[#E8D5A3]/30">
                    <div className="p-1 rounded-full bg-[#E8D5A3] mt-0.5 shrink-0">
                      <Check className="w-3 h-3 text-[#5D4E37]" />
                    </div>
                    <span className="text-sm font-medium text-[#5D4E37] leading-tight">{f}</span>
                  </div>
                ))}
             </div>
          </div>
        </div>

        {/* Right Panel - Checkout */}
        <div className="lg:col-span-7 bg-[#FEF9E7] rounded-3xl shadow-xl shadow-[#E8D5A3]/20 border border-[#E8D5A3] overflow-hidden flex flex-col order-1 lg:order-2">
          
          {/* Header */}
          <div className="p-8 border-b border-[#E8D5A3] bg-[#FDF6E3]/50">
             <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                   <h2 className="text-xl font-bold text-[#5D4E37] flex items-center gap-2 font-serif">
                     Complete Payment
                   </h2>
                   <p className="text-sm text-[#8B6914] mt-1 font-sans">Choose your billing cycle</p>
                </div>
             </div>
          </div>

          <div className="p-8">
            {/* Billing Cycle Selector */}
            <div className="mb-8">
               <label className="block text-sm font-semibold text-[#5D4E37] mb-3 flex items-center gap-2 font-sans">
                 <Clock className="w-4 h-4 text-[#A68B5B]" /> Billing Cycle
               </label>
               <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                 {[1, 3, 6].map((m) => {
                   const cycleDiscount = getDiscountPercent(m);
                   const cycleTotalUSD = monthlyBasePrice * m * (1 - cycleDiscount / 100);
                   const cycleMonthlyConverted = Math.round((cycleTotalUSD / m) * rates[currency]);
                   return (
                   <button
                     key={m}
                     onClick={() => setBillingCycle(m as 1|3|6)}
                     className={`relative p-4 rounded-xl border transition-all text-left group font-sans ${
                       billingCycle === m 
                        ? `border-[#A68B5B] bg-[#FDF6E3] ring-1 ring-[#A68B5B]/30` 
                        : 'border-[#E8D5A3] hover:border-[#A68B5B] hover:bg-[#FDF6E3]/50'
                     }`}
                   >
                     {m > 1 && (
                       <div className="absolute -top-2.5 right-3 bg-[#A68B5B] text-white text-[10px] font-bold px-2 py-0.5 rounded-full shadow-sm tracking-wide">
                         SAVE {cycleDiscount}%
                       </div>
                     )}
                     <div className={`font-bold text-lg mb-1 ${billingCycle === m ? 'text-[#5D4E37]' : 'text-[#8B6914]'}`}>
                       {m === 1 ? 'Monthly' : `${m} Months`}
                     </div>
                     <div className="text-xs text-[#A68B5B] font-medium">
                       {m > 1 ? 'One-time payment' : 'Auto-renews'}
                     </div>
                     <div className="mt-2 text-sm font-bold text-[#5D4E37]">
                       {symbols[currency]}{cycleMonthlyConverted.toLocaleString()}<span className="text-xs font-normal text-[#8B6914]">/mo</span>
                     </div>
                   </button>
                   );
                 })}
               </div>
            </div>

            {/* Summary Box */}
            <div className="bg-[#FDF6E3] rounded-2xl p-5 border border-[#E8D5A3] mb-8 font-sans">
               <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                     <span className="text-[#8B6914]">Subtotal ({billingCycle} month{billingCycle > 1 ? 's' : ''})</span>
                     <span className="font-medium text-[#5D4E37]">{symbols[currency]}{fullPrice.toLocaleString()}</span>
                  </div>
                  {discountAmount > 0 && (
                    <div className="flex justify-between text-sm text-green-600">
                       <span>Discount ({discountPercent}% off)</span>
                       <span className="font-bold">-{symbols[currency]}{discountAmount.toLocaleString()}</span>
                    </div>
                  )}
                  <div className="border-t border-[#E8D5A3] pt-3 flex justify-between items-center">
                     <span className="font-bold text-lg text-[#5D4E37]">Total Due</span>
                     <div className="text-right">
                       <span className="font-bold text-2xl text-[#5D4E37]">{symbols[currency]}{totalAmount.toLocaleString()}</span>
                       <p className="text-[10px] text-[#8B6914] font-medium uppercase tracking-wider">
                         {currency.toUpperCase()}
                       </p>
                     </div>
                  </div>
               </div>
            </div>

            {/* Coupon Code Input */}
            <div className="mb-6">
              <label className="block text-sm font-semibold text-[#5D4E37] mb-3 font-sans flex items-center gap-2">
                <Tag className="w-4 h-4 text-[#A68B5B]" /> Discount Code (Optional)
              </label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={couponCode}
                  onChange={(e) => setCouponCode(e.target.value.toUpperCase())}
                  placeholder="Enter coupon code"
                  className="flex-1 px-4 py-3 rounded-xl border border-[#E8D5A3] bg-[#FEF9E7] text-[#5D4E37] placeholder-[#A68B5B]/60 focus:outline-none focus:ring-2 focus:ring-[#A68B5B]/30 focus:border-[#A68B5B] font-sans text-sm"
                />
                <button
                  type="button"
                  className="px-5 py-3 rounded-xl border border-[#E8D5A3] bg-[#FDF6E3] text-[#5D4E37] font-medium text-sm hover:bg-[#E8D5A3]/30 transition-colors font-sans"
                >
                  Apply
                </button>
              </div>
            </div>

            {/* Payment Method Tabs */}
            <div className="mb-6">
              <label className="block text-sm font-semibold text-[#5D4E37] mb-3 font-sans">Payment Method</label>
              
              {/* Currency / Region Selector */}
              <div className="flex p-1 bg-[#FDF6E3] rounded-xl mb-4 border border-[#E8D5A3]">
                 <button
                   onClick={() => setCurrency('usd')}
                   className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition-all font-sans ${
                     currency === 'usd' 
                     ? 'bg-[#FEF9E7] text-[#5D4E37] shadow-sm border border-[#E8D5A3]' 
                     : 'text-[#8B6914] hover:text-[#5D4E37]'
                   }`}
                 >
                   🌍 International (USD)
                 </button>
                 <button
                   onClick={() => setCurrency('krw')}
                   className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition-all font-sans ${
                     currency === 'krw' 
                     ? 'bg-[#FEF9E7] text-[#5D4E37] shadow-sm border border-[#E8D5A3]' 
                     : 'text-[#8B6914] hover:text-[#5D4E37]'
                   }`}
                 >
                   🇰🇷 Korea (KRW)
                 </button>
              </div>
              {currency === 'krw' && (
                <p className="text-xs text-[#8B6914] font-sans mb-4">
                  Kakao Pay, Naver Pay, Korean Cards available
                </p>
              )}

              {/* Checkout Mode Selector */}
              <div className="flex p-1 bg-[#FDF6E3] rounded-xl mb-4 border border-[#E8D5A3]">
                 <button
                   onClick={() => setCheckoutMode('embedded')}
                   className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition-all font-sans ${
                     checkoutMode === 'embedded' 
                     ? 'bg-[#FEF9E7] text-[#5D4E37] shadow-sm border border-[#E8D5A3]' 
                     : 'text-[#8B6914] hover:text-[#5D4E37]'
                   }`}
                 >
                   Pay Here
                 </button>
                 <button
                   onClick={() => setCheckoutMode('redirect')}
                   className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition-all font-sans ${
                     checkoutMode === 'redirect' 
                     ? 'bg-[#FEF9E7] text-[#5D4E37] shadow-sm border border-[#E8D5A3]' 
                     : 'text-[#8B6914] hover:text-[#5D4E37]'
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
                  {loading && !clientSecret ? (
                     <div className="flex flex-col items-center justify-center py-12 text-[#8B6914] gap-3">
                        <Loader2 className="w-8 h-8 animate-spin text-[#A68B5B]" />
                        <span className="text-sm font-medium">Initializing secure checkout...</span>
                     </div>
                  ) : clientSecret ? (
                     <Elements stripe={stripePromise} options={{ 
                        clientSecret, 
                        appearance: { 
                          theme: 'flat',
                          variables: {
                            colorPrimary: '#A68B5B',
                            colorBackground: '#FEF9E7',
                            colorText: '#5D4E37',
                            colorDanger: '#ef4444',
                            borderRadius: '12px',
                            fontFamily: 'ui-sans-serif, system-ui, sans-serif',
                          },
                          rules: {
                            '.Label': {
                              marginBottom: '8px',
                            },
                            '.Tab--selected': {
                              borderColor: '#A68B5B',
                              boxShadow: '0 0 0 1px #A68B5B',
                            },
                            '.Link': {
                              display: 'none',
                            },
                          }
                        } 
                     }}>
                        <EmbeddedCheckoutForm plan={plan} totalAmount={totalAmount} currency={currency} onSuccess={() => navigate('/dashboard?payment=success')} onError={setError} />
                     </Elements>
                  ) : null}
               </div>
            )}

            {checkoutMode === 'redirect' && (
               <div className="text-center py-6 animate-in fade-in zoom-in-95 duration-300">
                 <p className="text-[#8B6914] text-sm mb-6 max-w-sm mx-auto font-sans">
                   {currency === 'krw' 
                     ? 'Pay with Kakao Pay, Naver Pay, Korean Cards, and more via Stripe.'
                     : 'Pay with Credit/Debit Cards, Google Pay, Apple Pay, and more via Stripe.'}
                 </p>
                 <button
                    onClick={handleRedirectCheckout}
                    disabled={loading}
                    className={`w-full bg-[#A68B5B] text-white font-bold py-4 px-6 rounded-xl shadow-lg hover:shadow-[#A68B5B]/30 hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2 font-sans`}
                  >
                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Lock className="w-5 h-5" />}
                    Pay {symbols[currency]}{totalAmount.toLocaleString()}
                  </button>
                  <p className="text-center text-xs text-[#8B6914] font-sans mt-4">
                    By clicking, you read and agree to our{' '}
                    <a href="/terms" className="underline hover:text-[#5D4E37] transition-colors" target="_blank" rel="noopener noreferrer">Terms</a>
                    {' '}and{' '}
                    <a href="/privacy" className="underline hover:text-[#5D4E37] transition-colors" target="_blank" rel="noopener noreferrer">Privacy Policy</a>.
                  </p>
               </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};

export default Pay;
