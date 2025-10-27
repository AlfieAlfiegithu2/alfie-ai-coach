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
  const [email, setEmail] = useState<string>('');
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
    if (!error) navigate('/personal-page');
  };

  return (
    <div className="w-full max-w-2xl mx-auto bg-white rounded-2xl shadow-xl p-8">
      <div className="mb-8">
        <h1 className="text-3xl font-semibold text-gray-900 mb-2">Complete your purchase</h1>
        <p className="text-gray-600">Upgrade to Pro – $49/month</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        <LinkAuthenticationElement
          onChange={(e) => setEmail(e?.value?.email ?? '')}
          options={{ defaultValues: { email: email || '' } }}
        />

        <div>
          <label className="block text-sm font-medium text-gray-900 mb-3">Payment method</label>
          <PaymentElement options={{ layout: 'tabs', business: { name: 'English AIdol' } }} />
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
  );
};

const Pay = () => {
  const query = useQuery();
  const planId = query.get('plan') || 'premium';
  const [clientSecret, setClientSecret] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [stripeError, setStripeError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setError(null);
      try {
        const { data, error } = await supabase.functions.invoke('create-payment-intent', { body: { planId } });
        if (error || !data?.clientSecret) setError(error?.message || 'Failed to initialize payment');
        else setClientSecret(data.clientSecret);
      } catch (err: any) {
        console.error('Error creating payment intent:', err);
        setError(err.message || 'Failed to initialize payment');
      }
    })();
  }, [planId]);

  const stripePromise = useMemo(() => {
    try {
      const pk = import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY as string;
      if (!pk) {
        const msg = 'Stripe key not configured. Please check your environment variables.';
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
        colorPrimary: '#000000',
        colorBackground: '#ffffff',
        colorText: '#1f2937',
        colorTextSecondary: '#6b7280',
        colorDanger: '#ef4444',
        fontFamily: 'Inter, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial',
        borderRadius: '12px',
      },
    },
    fields: {
      billingDetails: { name: 'never', email: 'never', phone: 'never', address: 'never' },
    },
    loader: 'auto' as const,
  }), [clientSecret]);

  const returnUrl = `${window.location.origin}/personal-page?plan=${planId}`;

  const stripeKeyMissing = !import.meta.env.VITE_STRIPE_PUBLISHABLE_KEY;

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
        {(error || stripeKeyMissing) && (
          <div className="text-sm text-red-500 mb-4 text-center bg-red-50 p-4 rounded-xl">
            {stripeKeyMissing 
              ? "Payment configuration error: Stripe publishable key is missing. Please contact support." 
              : error}
          </div>
        )}
        {!stripeKeyMissing && clientSecret && stripePromise ? (
          <Elements stripe={stripePromise} options={options}>
            <CheckoutForm returnUrl={returnUrl} />
          </Elements>
        ) : !stripeKeyMissing ? (
          <div className="w-full max-w-2xl mx-auto bg-white rounded-2xl shadow-xl p-8">
            <div className="flex items-center justify-center py-12">
              <div className="text-center">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4" />
                <p className="text-gray-600">Loading payment form...</p>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
};

export default Pay;
