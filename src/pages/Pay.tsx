import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, LinkAuthenticationElement, AddressElement, useElements, useStripe } from '@stripe/react-stripe-js';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, Check } from 'lucide-react';

function useQuery() {
  const { search } = useLocation();
  return useMemo(() => new URLSearchParams(search), [search]);
}

// Simple animated gold gradient background
const AnimatedGoldBackground = () => {
  return (
    <div className="absolute inset-0 w-full h-full overflow-hidden">
      <div 
        className="absolute inset-0 opacity-90"
        style={{
          background: 'linear-gradient(135deg, #D4AF37 0%, #C5A028 25%, #B8941F 50%, #AA7F1A 75%, #9B6B15 100%)',
          animation: 'gradientShift 8s ease infinite'
        }}
      />
      <div 
        className="absolute inset-0 opacity-30"
        style={{
          background: 'radial-gradient(circle at 30% 50%, rgba(255,215,0,0.4) 0%, transparent 50%)',
          animation: 'pulse 6s ease-in-out infinite'
        }}
      />
      <style>{`
        @keyframes gradientShift {
          0%, 100% { filter: hue-rotate(0deg) brightness(1); }
          50% { filter: hue-rotate(10deg) brightness(1.1); }
        }
        @keyframes pulse {
          0%, 100% { opacity: 0.3; transform: scale(1); }
          50% { opacity: 0.5; transform: scale(1.1); }
        }
      `}</style>
    </div>
  );
};

const CheckoutForm = ({ returnUrl, planId }: { returnUrl: string; planId: string }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [submitting, setSubmitting] = useState(false);
  const [email, setEmail] = useState<string>("");
  const [currentStep, setCurrentStep] = useState(1);
  const [paymentMethod, setPaymentMethod] = useState<'stripe' | 'alipay'>('stripe');
  const navigate = useNavigate();
  const inStripeContext = !!stripe && !!elements;

  // Alipay is supported inside Stripe Payment Element when enabled on your Stripe account.
  // We no longer open a separate hosted checkout window.

  const handleStripeSubmit = async (e: React.FormEvent) => {
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

  const handleNext = () => {
    if (currentStep < 2) setCurrentStep(currentStep + 1);
  };

  const handlePrev = () => {
    if (currentStep > 1) setCurrentStep(currentStep - 1);
  };

  return (
    <div className="flex min-h-[700px] w-full">
      {/* Left sidebar - Order summary */}
      <div className="w-1/2 relative text-white flex flex-col overflow-hidden">
        <AnimatedGoldBackground />
        <div className="relative z-10 flex flex-col h-full p-8">
          <div className="mb-8">
            <h1 className="text-3xl font-light tracking-tight mb-2">Order Summary</h1>
            <p className="text-sm text-gray-200">Review your purchase details</p>
          </div>
          <div className="flex-1 flex flex-col justify-between">
            <div className="space-y-4 mb-8">
              {[1, 2].map((step) => (
                <div key={step} className="flex items-center space-x-3">
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-medium transition-all ${step < currentStep ? 'bg-green-500 text-white' : step === currentStep ? 'bg-black text-white' : 'bg-white/20 text-white'}`}>
                    {step < currentStep ? <Check className="w-4 h-4" /> : step}
                  </div>
                  <span className="text-sm">{step === 1 ? 'Payment Method' : 'Complete Payment'}</span>
                </div>
              ))}
            </div>
            <div className="bg-black/20 rounded-xl p-6 backdrop-blur-sm mb-6">
              <h3 className="font-medium mb-4 text-lg">Premium Plan</h3>
              <div className="space-y-3 text-sm">
                <div className="flex items-center space-x-2"><Check className="w-4 h-4" /><span className="text-gray-100">Unlimited access to all features</span></div>
                <div className="flex items-center space-x-2"><Check className="w-4 h-4" /><span className="text-gray-100">Priority customer support</span></div>
                <div className="flex items-center space-x-2"><Check className="w-4 h-4" /><span className="text-gray-100">Advanced analytics dashboard</span></div>
              </div>
            </div>
            <div className="bg-black/20 rounded-xl p-6 backdrop-blur-sm">
              <h3 className="font-medium mb-4">Payment Details</h3>
              <div className="space-y-3 text-sm">
                <div className="flex justify-between"><span className="text-gray-100">Premium Plan (30 days)</span><span>$9.99</span></div>
                <div className="border-t border-white/10 pt-3 flex justify-between font-medium text-lg"><span>Total</span><span>$9.99</span></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right content - Payment form */}
      <div className="w-1/2 bg-gray-50 flex flex-col">
        <div className="border-b border-gray-200 bg-white p-8">
          <h2 className="text-3xl font-light tracking-tight text-gray-900 mb-2">Secure Payment</h2>
          <p className="text-sm text-gray-600">Complete your purchase safely and securely</p>
        </div>

        <div className="flex-1 p-8">
          <div className="max-w-xl">
            {/* Step 1: Payment Method */}
            {currentStep === 1 && (
              <div className="space-y-6">
                <div className="mb-8">
                  <h3 className="text-xl font-medium text-gray-900 mb-2">Payment Method</h3>
                  <p className="text-sm text-gray-600">Choose how you'd like to pay</p>
                </div>

                <div className="space-y-3">
                  <label className={`flex items-center p-4 border-2 rounded-xl cursor-pointer bg-white transition-all ${
                    paymentMethod === 'stripe' ? 'border-black' : 'border-gray-200 hover:border-gray-300'
                  }`}>
                    <input 
                      type="radio" 
                      name="payment" 
                      value="stripe" 
                      checked={paymentMethod === 'stripe'}
                      onChange={() => setPaymentMethod('stripe')}
                      className="mr-3 text-black focus:ring-black"
                    />
                    <div className="flex items-center">
                      <span className="font-medium">Credit/Debit Card</span>
                    </div>
                  </label>
                  
                  <label className={`flex items-center p-4 border-2 rounded-xl cursor-pointer bg-white transition-all ${
                    paymentMethod === 'alipay' ? 'border-black' : 'border-gray-200 hover:border-gray-300'
                  }`}>
                    <input 
                      type="radio" 
                      name="payment" 
                      value="alipay" 
                      checked={paymentMethod === 'alipay'}
                      onChange={() => setPaymentMethod('alipay')}
                      className="mr-3 text-black focus:ring-black"
                    />
                    <div className="flex items-center">
                      <span className="font-medium">Alipay</span>
                    </div>
                  </label>
                </div>
              </div>
            )}

            {/* Step 2: Payment Details */}
            {currentStep === 2 && paymentMethod === 'stripe' && (
              <form onSubmit={handleStripeSubmit} className="space-y-6">
                <div className="mb-8">
                  <h3 className="text-xl font-medium text-gray-900 mb-2">Payment Details</h3>
                  <p className="text-sm text-gray-600">Enter your payment information</p>
                </div>

                <LinkAuthenticationElement
                  onChange={(e) => setEmail(e?.value?.email ?? '')}
                  options={{ defaultValues: { email: email || '' } }}
                />
                <PaymentElement options={{ layout: 'tabs', business: { name: 'English AIdol' } }} />
                <AddressElement options={{ mode: 'billing', fields: { phone: 'always' } }} />

                <button
                  type="submit"
                  disabled={submitting || !stripe || !elements}
                  className="w-full bg-black hover:bg-gray-800 text-white font-medium py-3 px-4 rounded-xl shadow-lg transition-colors disabled:opacity-50"
                >
                  {submitting ? 'Processing…' : 'Complete Payment'}
                </button>
                <p className="text-xs text-gray-600 text-center">Your payment is secured with industry-standard encryption.</p>
              </form>
            )}

            {/* Navigation */}
            <div className="flex justify-between items-center mt-8">
              {currentStep > 1 ? (
                <button
                  type="button"
                  onClick={handlePrev}
                  className="px-6 py-3 text-sm font-medium text-gray-600 hover:text-gray-900 transition"
                >
                  ← Back
                </button>
              ) : <div />}
              
              {currentStep === 1 && (
                <button
                  type="button"
                  onClick={handleNext}
                  disabled={submitting}
                  className="bg-black hover:bg-gray-800 text-white font-medium py-3 px-8 rounded-xl transition-colors disabled:opacity-50"
                >
                  {submitting ? 'Processing…' : 'Continue →'}
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
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
    if (!pk) return null;
    return loadStripe(pk);
  }, []);

  const options = useMemo(() => ({
    clientSecret,
    appearance: {
      theme: 'flat' as const,
      variables: {
        colorPrimary: '#000000',
        colorBackground: '#ffffff',
        colorText: '#1f2937',
        colorTextSecondary: '#6b7280',
        colorDanger: '#ef4444',
        fontFamily: 'Inter, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial',
        borderRadius: '12px'
      }
    },
    loader: 'auto' as const
  }), [clientSecret]);

  const returnUrl = `${window.location.origin}/personal-page?plan=${planId}`;

  return (
    <div className="min-h-screen w-full font-sans bg-gray-100 flex items-center justify-center p-4">
      <div className="w-full max-w-6xl">
        <div className="flex items-center gap-3 mb-6">
          <button
            type="button"
            onClick={() => window.history.back()}
            className="inline-flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="w-4 h-4" /> Back
          </button>
        </div>
        {error && <div className="text-sm text-red-500 mb-4 text-center bg-red-50 p-4 rounded-xl">{error}</div>}
        {clientSecret && stripePromise ? (
          <div className="bg-white rounded-3xl shadow-xl overflow-hidden">
            <Elements stripe={stripePromise} options={options}>
              <CheckoutForm returnUrl={returnUrl} planId={planId} />
            </Elements>
          </div>
        ) : (
          <div className="bg-white rounded-3xl shadow-xl overflow-hidden">
            <CheckoutForm returnUrl={returnUrl} planId={planId} />
          </div>
        )}
      </div>
    </div>
  );
};

export default Pay;


