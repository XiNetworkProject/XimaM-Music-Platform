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
  const [checkoutUrl, setCheckoutUrl] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [code, setCode] = useState('');
  
  useEffect(() => {
    // Attendre l'action utilisateur pour lancer la redirection (afin de permettre la saisie du code promo)
    setLoading(false);
  }, [priceId]);

  if (error) return <div className="panel-suno border border-[var(--border)] rounded-2xl p-4 text-red-400">{error}</div>;
  
  return (
    <div className="panel-suno border border-[var(--border)] rounded-2xl p-6">
      <div className="flex flex-col sm:flex-row gap-3 items-center">
        <input
          value={code}
          onChange={e => setCode(e.target.value)}
          placeholder="Code promo (optionnel)"
          className="flex-1 w-full px-3 py-2 rounded-lg bg-white/5 border border-[var(--border)] text-white placeholder-white/50"
        />
        <button
          onClick={async () => {
            setLoading(true);
            try {
              const body: any = { priceId };
              if (code.trim()) body.promotionCode = code.trim();
              const res = await fetch('/api/billing/create-subscription', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
              const json = await res.json().catch(() => ({}));
              if (!res.ok || !json.checkoutUrl) {
                setError(json.error || 'Erreur initialisation paiement');
                setLoading(false);
                return;
              }
              window.location.href = json.checkoutUrl;
            } catch (e: any) {
              setError('Erreur réseau');
              setLoading(false);
            }
          }}
          className="px-4 py-2 rounded-lg bg-gradient-to-r from-[var(--color-primary)] to-[var(--color-accent)] text-white"
        >
          Appliquer et payer
        </button>
      </div>

      {loading && (
        <div className="mt-4 text-center">
          <div className="w-12 h-12 border-4 border-[var(--color-primary)] border-t-transparent rounded-full animate-spin mx-auto" />
          <div className="text-white/90 mt-2">Redirection vers le paiement sécurisé...</div>
          <div className="text-white/60 text-sm">Vous allez être redirigé vers Stripe</div>
        </div>
      )}
    </div>
  );
}


