import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, LinkAuthenticationElement, AddressElement, useElements, useStripe } from '@stripe/react-stripe-js';
import { supabase } from '@/integrations/supabase/client';
import { ArrowLeft, Check, Star, Users, BarChart3, Rocket } from 'lucide-react';

function useQuery() {
  const { search } = useLocation();
  return useMemo(() => new URLSearchParams(search), [search]);
}

// Minimal background helpers (no heavy image/mesh)
const CardDivider = () => (
  <div className="h-px w-full bg-gradient-to-r from-transparent via-black/10 to-transparent" />
);

const CheckoutForm = ({ returnUrl, planId }: { returnUrl: string; planId: string }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [submitting, setSubmitting] = useState(false);
  const [email, setEmail] = useState<string>("");
  const [currentStep, setCurrentStep] = useState(1);
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
    <div className="flex min-h-[700px] w-full">
      {/* Left sidebar - Plan summary (neutral background) */}
      <div className="w-1/2 relative flex flex-col overflow-hidden bg-white">
        <div className="relative z-10 flex flex-col h-full p-8">
          <div className="mb-4">
            <div className="flex items-center gap-3 text-slate-700">
              <div className="h-10 w-10 rounded-full border border-slate-200 flex items-center justify-center bg-white"><Rocket className="h-5 w-5" /></div>
              <div>
                <h1 className="text-2xl font-semibold tracking-tight">Upgrade Plan</h1>
                <p className="text-sm text-slate-500">Unlock premium AI capabilities</p>
              </div>
            </div>
          </div>

          {/* Steps */}
          <div className="space-y-3 mb-6">
            {[1, 2].map((step) => (
              <div key={step} className="flex items-center gap-3 text-slate-700">
                <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[11px] ${step < currentStep ? 'bg-emerald-500 text-white' : step === currentStep ? 'bg-black text-white' : 'bg-slate-100 text-slate-500'}`}>
                  {step < currentStep ? <Check className="h-4 w-4" /> : step}
                </div>
                <span className="text-sm">{step === 1 ? 'Payment Method' : 'Complete Payment'}</span>
              </div>
            ))}
          </div>

          {/* Price */}
          <div className="flex items-end gap-2 mb-4">
            <div className="text-4xl font-semibold tracking-tight">$50</div>
            <div className="text-slate-500 mb-1">/month</div>
          </div>
          <CardDivider />

          {/* Features grid */}
          <div className="grid grid-cols-2 gap-3 my-6 text-sm">
            <div className="flex items-center gap-2 text-slate-700"><Check className="h-4 w-4 text-emerald-500" />25,000 AI tokens/month</div>
            <div className="flex items-center gap-2 text-slate-700"><Check className="h-4 w-4 text-emerald-500" />Priority processing</div>
            <div className="flex items-center gap-2 text-slate-700"><Check className="h-4 w-4 text-emerald-500" />Advanced templates</div>
            <div className="flex items-center gap-2 text-slate-700"><Check className="h-4 w-4 text-emerald-500" />24/7 support</div>
            <div className="flex items-center gap-2 text-slate-700"><Check className="h-4 w-4 text-emerald-500" />Custom integrations</div>
            <div className="flex items-center gap-2 text-slate-700"><Check className="h-4 w-4 text-emerald-500" />API access</div>
            <div className="flex items-center gap-2 text-slate-700"><Check className="h-4 w-4 text-emerald-500" />Advanced analytics</div>
            <div className="flex items-center gap-2 text-slate-700"><Check className="h-4 w-4 text-emerald-500" />Multi-user workspace</div>
          </div>

          <CardDivider />

          {/* Extras */}
          <div className="mt-6 space-y-3 text-sm">
            <div className="flex items-start gap-3 text-slate-700">
              <Star className="h-4 w-4 text-yellow-500 mt-0.5" />
              <div>
                <p className="font-medium">Advanced AI Models</p>
                <p className="text-slate-500 text-xs">Access to top-tier model features</p>
              </div>
            </div>
            <div className="flex items-start gap-3 text-slate-700">
              <Users className="h-4 w-4 text-blue-500 mt-0.5" />
              <div>
                <p className="font-medium">Team Collaboration</p>
                <p className="text-slate-500 text-xs">Share and collaborate with teammates</p>
              </div>
            </div>
            <div className="flex items-start gap-3 text-slate-700">
              <BarChart3 className="h-4 w-4 text-emerald-500 mt-0.5" />
              <div>
                <p className="font-medium">Advanced Analytics</p>
                <p className="text-slate-500 text-xs">Detailed usage insights</p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Right side - Payment form */}
      <div className="w-1/2 bg-gray-50 p-8 flex flex-col">
        <form onSubmit={handleSubmit} className="space-y-6 flex-1 flex flex-col">
          <div>
            <LinkAuthenticationElement
              onChange={(e) => setEmail(e?.value?.email ?? '')}
              options={{ defaultValues: { email: email || '' } }}
            />
          </div>

          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-900 mb-3">
              Payment method
            </label>
            <PaymentElement 
              options={{ 
                layout: 'tabs',
                business: { name: 'English AIdol' }
              }} 
            />
          </div>

          <div>
            <AddressElement 
              options={{ 
                mode: 'billing',
                fields: { phone: 'always' }
              }} 
            />
          </div>

          <button
            type="submit"
            disabled={submitting || !stripe || !elements}
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-4 px-6 rounded-xl shadow-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {submitting ? 'Processing…' : 'Subscribe'}
          </button>

          <p className="text-xs text-gray-500 text-center">
            By subscribing, you authorise English AIdol to charge you according to the terms until you cancel.
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

  // Stripe publishable key - safe to expose in client-side code
  const stripePromise = useMemo(() => {
    const pk = 'pk_test_51QeeZZEHACZ6WVAT2gLBjcDm9tH2AjjHvq5YbjJfZk37YTyWEGm5T3AiGDSvhh9KnLDlmNzCbj7Z7n5gTqVJ8CUg00tB0jIRi5';
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
      <div className="w-full max-w-2xl">
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
          <Elements stripe={stripePromise} options={options}>
            <CheckoutForm returnUrl={returnUrl} planId={planId} />
          </Elements>
        ) : (
          <div className="w-full max-w-2xl mx-auto bg-white rounded-2xl shadow-xl p-8">
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
                <p className="text-gray-600">Loading payment form...</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Pay;


