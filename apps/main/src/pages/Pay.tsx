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
    <div className="min-h-screen w-full font-serif bg-[#FEF9E7] flex items-center justify-center p-4 py-8">
      <div className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        
        {/* Left Panel - Plan Details */}
        <div className="lg:col-span-5 flex flex-col gap-6 order-2 lg:order-1">
          <div className="bg-[#FEF9E7] rounded-3xl p-8 shadow-sm border border-[#E8D5A3] relative overflow-hidden group hover:shadow-md transition-all duration-500">
             
             <button onClick={() => navigate(-1)} className="inline-flex items-center gap-2 text-sm text-[#8B6914] hover:text-[#5D4E37] mb-8 transition-colors font-medium">
                <ArrowLeft className="w-4 h-4" /> Back to Plans
             </button>

             <div className="flex items-center gap-4 mb-6">
                <div>
                  <h1 className="text-3xl font-bold text-[#5D4E37] tracking-tight">{plan.name} Plan</h1>
                </div>
             </div>

             <div className="mb-8">
               <div className="flex items-baseline gap-1">
                  <span className="text-5xl font-bold text-[#5D4E37] font-sans">{symbols[currency]}{monthlyPrice}</span>
                  <span className="text-[#8B6914] font-medium font-sans">/mo</span>
               </div>
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
          
          <div className="bg-[#FDF6E3] rounded-2xl p-6 border border-[#E8D5A3]/50 text-center">
             <div className="flex justify-center gap-6 opacity-40 grayscale hover:grayscale-0 transition-all duration-500 mb-4">
                {/* Placeholder logos for visual trust - simplified SVGs or icons */}
                <div className="h-6 w-10 bg-[#E8D5A3] rounded"></div>
                <div className="h-6 w-10 bg-[#E8D5A3] rounded"></div>
                <div className="h-6 w-10 bg-[#E8D5A3] rounded"></div>
                <div className="h-6 w-10 bg-[#E8D5A3] rounded"></div>
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
                   <p className="text-sm text-[#8B6914] mt-1 font-sans">Choose your billing cycle and currency</p>
                </div>
                
                {/* Currency Selector */}
                <div className="flex items-center gap-2 bg-[#FEF9E7] rounded-lg p-1 border border-[#E8D5A3] shadow-sm">
                   <Globe className="w-4 h-4 text-[#8B6914] ml-2" />
                   <select
                    value={currency}
                    onChange={(e) => setCurrency(e.target.value as any)}
                    className="bg-transparent text-sm font-medium text-[#5D4E37] focus:outline-none py-1 pr-2 cursor-pointer font-sans"
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
               <label className="block text-sm font-semibold text-[#5D4E37] mb-3 flex items-center gap-2 font-sans">
                 <Clock className="w-4 h-4 text-[#A68B5B]" /> Billing Cycle
               </label>
               <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                 {[1, 3, 6].map((m) => (
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
                         SAVE {m === 3 ? '15%' : '30%'}
                       </div>
                     )}
                     <div className={`font-bold text-lg mb-1 ${billingCycle === m ? 'text-[#5D4E37]' : 'text-[#8B6914]'}`}>
                       {m === 1 ? 'Monthly' : `${m} Months`}
                     </div>
                     <div className="text-xs text-[#A68B5B] font-medium">
                       {billingCycle > 1 ? 'One-time payment' : 'Auto-renews'}
                     </div>
                     <div className="mt-2 text-sm font-bold text-[#5D4E37]">
                       {symbols[currency]}{Math.round((baseMonthlyPrice * rates[currency]))}<span className="text-xs font-normal text-[#8B6914]">/mo</span>
                     </div>
                   </button>
                 ))}
               </div>
            </div>

            {/* Summary Box */}
            <div className="bg-[#FDF6E3] rounded-2xl p-5 border border-[#E8D5A3] mb-8 font-sans">
               <div className="space-y-3">
                  <div className="flex justify-between text-sm">
                     <span className="text-[#8B6914]">Subtotal ({billingCycle} months)</span>
                     <span className="font-medium text-[#5D4E37]">{symbols[currency]}{fullPrice.toLocaleString()}</span>
                  </div>
                  {savings > 0 && (
                    <div className="flex justify-between text-sm text-[#A68B5B]">
                       <span>Discount Savings</span>
                       <span className="font-bold">-{symbols[currency]}{savings.toLocaleString()}</span>
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

            {/* Payment Method Tabs */}
            <div className="mb-6">
              <label className="block text-sm font-semibold text-[#5D4E37] mb-3 font-sans">Payment Method</label>
              <div className="flex p-1 bg-[#FDF6E3] rounded-xl mb-4 border border-[#E8D5A3]">
                 <button
                   onClick={() => setCheckoutMode('embedded')}
                   className={`flex-1 py-2.5 text-sm font-medium rounded-lg transition-all font-sans ${
                     checkoutMode === 'embedded' 
                     ? 'bg-[#FEF9E7] text-[#5D4E37] shadow-sm border border-[#E8D5A3]' 
                     : 'text-[#8B6914] hover:text-[#5D4E37]'
                   }`}
                 >
                   Card / Digital Wallet
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
                  {!isHttps && (
                    <div className="bg-[#FEF9E7] border border-[#E8D5A3] text-[#8B6914] p-4 rounded-xl text-sm mb-6 flex gap-3">
                      <Lock className="w-5 h-5 shrink-0 text-[#A68B5B]" />
                      <div>
                        <p className="font-bold mb-1 font-serif text-[#5D4E37]">HTTPS Connection Required</p>
                         <p>For security, embedded payments require HTTPS. Use the <a href={`https://englishaidol.loca.lt/pay?plan=${planId}`} className="underline font-bold text-[#5D4E37]">secure tunnel</a> or switch to Stripe Checkout.</p>
                      </div>
                    </div>
                  )}
                  
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
                 <div className="w-16 h-16 bg-[#FDF6E3] rounded-full flex items-center justify-center mx-auto mb-4 border border-[#E8D5A3]">
                    <ShieldCheck className="w-8 h-8 text-[#A68B5B]" />
                 </div>
                 <h3 className="text-lg font-bold text-[#5D4E37] mb-2 font-serif">Redirect to Stripe</h3>
                 <p className="text-[#8B6914] text-sm mb-6 max-w-sm mx-auto font-sans">You will be redirected to Stripe's hosted payment page to complete your purchase securely.</p>
                 <button
                    onClick={handleRedirectCheckout}
                    disabled={loading}
                    className={`w-full bg-[#A68B5B] text-white font-bold py-4 px-6 rounded-xl shadow-lg hover:shadow-[#A68B5B]/30 hover:-translate-y-0.5 transition-all flex items-center justify-center gap-2 font-sans`}
                  >
                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Lock className="w-5 h-5" />}
                    Continue to Stripe Checkout
                  </button>
               </div>
            )}
            
            <div className="mt-8 pt-6 border-t border-[#E8D5A3] flex items-center justify-between text-xs text-[#8B6914]">
               <div className="flex gap-2">
                 <span>Terms</span>
                 <span>Privacy</span>
               </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default Pay;
