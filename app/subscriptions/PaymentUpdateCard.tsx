'use client';

import { useEffect, useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js';

const stripePromise = loadStripe(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY || '');

function Inner({ clientSecret, onSuccess }: { clientSecret: string; onSuccess: () => void }) {
  const stripe = useStripe();
  const elements = useElements();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async () => {
    if (!stripe || !elements) return;
    try {
      setLoading(true);
      const { setupIntent, error } = await stripe.confirmSetup({ elements, redirect: 'if_required' });
      if (error) {
        setError(error.message || 'Erreur de confirmation');
        setLoading(false);
        return;
      }
      if (setupIntent?.status === 'succeeded') {
        onSuccess();
      }
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
      <button disabled={!stripe || loading} onClick={submit} className="mt-4 w-full rounded-xl px-4 py-2 bg-white/10 ring-1 ring-white/15 text-white disabled:opacity-60">
        {loading ? 'Traitement…' : 'Enregistrer la carte'}
      </button>
    </div>
  );
}

export default function PaymentUpdateCard({ clientSecret, onSuccess }: { clientSecret: string; onSuccess: () => void }) {
  if (!clientSecret) return null;
  return (
    <Elements stripe={stripePromise} options={{ clientSecret }}>
      <Inner clientSecret={clientSecret} onSuccess={onSuccess} />
    </Elements>
  );
}


