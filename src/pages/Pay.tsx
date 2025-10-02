import { useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js';
import { supabase } from '@/integrations/supabase/client';

function useQuery() {
  const { search } = useLocation();
  return useMemo(() => new URLSearchParams(search), [search]);
}

const CheckoutForm = ({ returnUrl }: { returnUrl: string }) => {
  const stripe = useStripe();
  const elements = useElements();
  const [submitting, setSubmitting] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!stripe || !elements) return;
    setSubmitting(true);
    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: { return_url: returnUrl },
      redirect: 'if_required',
    });
    setSubmitting(false);
    if (!error) {
      navigate('/personal-page');
    }
  };

  return (
    <form onSubmit={handleSubmit} className="max-w-md mx-auto p-6 bg-card rounded-2xl border border-border space-y-4">
      <PaymentElement options={{ layout: 'tabs' }} />
      <button
        type="submit"
        disabled={submitting || !stripe || !elements}
        className="w-full py-3 px-4 bg-primary text-primary-foreground font-medium rounded-xl hover:bg-primary/90"
      >
        {submitting ? 'Processing…' : 'Pay now'}
      </button>
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

  const options = useMemo(() => ({ clientSecret }), [clientSecret]);

  const returnUrl = `${window.location.origin}/personal-page?plan=${planId}`;

  return (
    <div className="min-h-screen w-full font-sans">
      <div className="fixed inset-0 bg-cover bg-center bg-no-repeat -z-10" style={{ backgroundImage: "url('/lovable-uploads/38d81cb0-fd21-4737-b0f5-32bc5d0ae774.png')" }} />
      <div className="fixed inset-0 bg-background/50 backdrop-blur-sm -z-10" />
      <div className="relative z-10 w-full min-h-screen flex flex-col items-center justify-center px-4 py-10">
        <h1 className="text-2xl font-semibold mb-6">Complete your purchase</h1>
        {error && <div className="text-sm text-red-500 mb-4">{error}</div>}
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


