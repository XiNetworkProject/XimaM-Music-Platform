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
    <div className="rounded-[1.5rem] border border-[#dccfbb] bg-white p-4">
      {error && <div className="mb-3 rounded-2xl border border-red-500/20 bg-red-500/10 px-3 py-2 text-sm font-bold text-red-700">{error}</div>}
      <PaymentElement />
      <button disabled={!stripe || loading} onClick={handleSubmit} className="mt-4 h-11 w-full rounded-2xl bg-[#171313] px-4 text-sm font-black text-white transition hover:scale-[1.01] disabled:opacity-60">
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

  if (error) return <div className="rounded-[1.5rem] border border-red-500/20 bg-red-500/10 p-4 text-sm font-bold text-red-700">{error}</div>;
  
  return (
    <div className="rounded-[1.5rem] border border-[#dccfbb] bg-white/72 p-4 sm:p-5">
      <div className="flex flex-col sm:flex-row gap-3 items-center">
        <input
          value={code}
          onChange={e => setCode(e.target.value)}
          placeholder="Code promo (optionnel)"
          className="h-11 w-full flex-1 rounded-2xl border border-[#dccfbb] bg-white px-4 text-sm font-semibold text-[#171313] outline-none placeholder:text-black/28 focus:border-[#ff6f61] focus:ring-4 focus:ring-[#ff6f61]/14"
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
          className="h-11 rounded-2xl bg-[#171313] px-5 text-sm font-black text-white transition hover:scale-[1.01]"
        >
          Payer
        </button>
      </div>

      {loading && (
        <div className="mt-4 text-center">
          <div className="w-10 h-10 border-4 border-[#171313]/25 border-t-[#171313] rounded-full animate-spin mx-auto" />
          <div className="mt-2 text-sm font-black text-[#171313]">Redirection vers le paiement sécurisé...</div>
          <div className="text-xs font-semibold text-black/42">Tu vas être redirigé vers Stripe</div>
        </div>
      )}
    </div>
  );
}


