'use client';

import { useEffect, useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useStripe, useElements } from '@stripe/react-stripe-js';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '');

function InnerPayment({ priceId, customerId, onSuccess }: { priceId: string; customerId: string; onSuccess: () => void }) {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);


  const handleSubmit = async () => {
    if (!stripe || !elements) return;
    try {
      setLoading(true);
      const { setupIntent, error } = await stripe.confirmSetup({
        elements,
        confirmParams: { return_url: window.location.href },
        redirect: 'if_required',
      });
      if (error) {
        setError(error.message || 'Erreur de confirmation');
        setLoading(false);
        return;
      }
      const pm = setupIntent?.payment_method as string;
      const seti = setupIntent?.id as string;
      const res = await fetch('/api/billing/confirm-subscription', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ customerId, priceId, defaultPaymentMethod: pm, setupIntentId: seti }) });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setError(j.error || 'Erreur abonnement');
        setLoading(false);
        return;
      }
      onSuccess();
      setLoading(false);
    } catch (e: any) {
      setError(e?.message || 'Erreur inattendue');
      setLoading(false);
    }
  };

  return (
    <div className="panel-suno border border-[var(--border)] rounded-2xl p-4">
      {error && <div className="mb-3 text-sm text-red-400">{error}</div>}
      <PaymentElement />
      <button disabled={!stripe || loading} onClick={handleSubmit} className="mt-4 w-full rounded-xl px-4 py-2 bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-accent)] text-white disabled:opacity-60">
        {loading ? 'Traitement…' : 'Payer et activer'}
      </button>
    </div>
  );
}

export default function PaymentElementCard({ priceId, onSuccess }: { priceId: string; onSuccess: () => void }) {
  const [clientSecret, setClientSecret] = useState<string>('');
  const [customerId, setCustomerId] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  useEffect(() => {
    // seed client secret fetch once; InnerPayment will fetch but Elements needs options stable
    (async () => {
      try {
        const res = await fetch('/api/billing/create-subscription', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ priceId }) });
        if (!res.ok) {
          const j = await res.json().catch(() => ({}));
          setError(j.error || 'Erreur initialisation paiement');
          return;
        }
        const json = await res.json();
        setClientSecret(json.clientSecret);
        setCustomerId(json.customerId);
      } catch (e: any) {
        setError('Erreur réseau');
      }
    })();
  }, [priceId]);

  if (error) return <div className="panel-suno border border-[var(--border)] rounded-2xl p-4 text-red-400">{error}</div>;
  if (!clientSecret) return <div className="panel-suno border border-[var(--border)] rounded-2xl p-4 text-white/70">Initialisation…</div>;
  return (
    <Elements stripe={stripePromise} options={{ clientSecret }}>
      <InnerPayment priceId={priceId} customerId={customerId} onSuccess={onSuccess} />
    </Elements>
  );
}


