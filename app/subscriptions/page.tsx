'use client';

import { useState, useMemo, useCallback } from 'react';
import Image from 'next/image';

export default function SubscriptionsPage() {
  const [billingCycle, setBillingCycle] = useState<'month' | 'year'>('year');

  const handleCheckout = useCallback(async (plan: 'pro' | 'premier') => {
    try {
      const res = await fetch('/api/subscriptions/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan, billingCycle }),
      });
      if (!res.ok) return;
      const { url } = await res.json();
      if (url) window.location.href = url;
    } catch (e) {
      // silencieux
    }
  }, [billingCycle]);

  const currentPlan = useMemo(() => ({
    name: 'Pro Plan',
    period: billingCycle === 'year' ? 'Year' : 'Month',
    nextBilling: 'Oct 7, 2025',
    credits: 2305,
  }), [billingCycle]);

  return (
    <div className="relative flex min-h-screen w-full flex-col items-center overflow-y-auto bg-[var(--bg)] text-[var(--text)]">
      <div className="absolute top-0 left-0 h-full w-full -z-10">
        <Image src="/auras-v2/Aura-1.png" alt="aura" fill priority className="object-cover" />
        <div className="absolute inset-0" style={{ background: 'linear-gradient(var(--surface-3) -69.77%, var(--bg) 53.4%)' }} />
      </div>

      <div className="relative z-10 w-full p-6">
        <div className="flex w-full flex-col gap-3">
          <div className="w-full rounded-2xl p-4 backdrop-blur-lg bg-white/5 border border-[var(--border)]">
            <div className="flex w-full flex-col items-center gap-4 lg:justify-between md:flex-row md:flex-wrap">
              <div className="space-between flex flex-row divide-x divide-white/10">
                <div className="items-left flex flex-col gap-1 px-4 first:pl-0 last:pr-0">
                  <span className="text-xs text-white/60">Current Plan</span>
                  <span className="text-sm text-white/90">{currentPlan.name}</span>
                </div>
                <div className="items-left flex flex-col gap-1 px-4 first:pl-0 last:pr-0">
                  <span className="text-xs text-white/60">Billing Period</span>
                  <span className="text-sm text-white/90">{currentPlan.period}</span>
                </div>
                <div className="items-left flex flex-col gap-1 px-4 first:pl-0 last:pr-0">
                  <span className="text-xs text-white/60">Next Billing Date</span>
                  <span className="text-sm text-white/90">{currentPlan.nextBilling}</span>
                </div>
                <div className="items-left flex flex-col gap-1 px-4 first:pl-0 last:pr-0">
                  <span className="text-xs text-white/60">Credits Remaining</span>
                  <span className="text-sm text-white/90">{currentPlan.credits}</span>
                </div>
              </div>

              <div className="flex flex-row justify-center gap-2">
                <button className="relative inline-block px-4 py-2 text-[15px] leading-[24px] rounded-full text-[var(--text)] bg-transparent border border-[var(--border)] hover:bg-[var(--surface-2)] transition">
                  Cancel subscription
                </button>
                <button className="relative inline-block px-4 py-2 text-[15px] leading-[24px] rounded-full text-[var(--text)] bg-transparent border border-[var(--border)] hover:bg-[var(--surface-2)] transition">
                  Update payment
                </button>
                <button className="relative inline-block px-4 py-2 text-[15px] leading-[24px] rounded-full text-[var(--bg)] bg-[var(--text)] hover:opacity-90 transition">
                  Buy more credits
                </button>
              </div>
            </div>
          </div>

          <div className="w-full text-center font-sans text-xs text-white/40">
            Need help? Email <a href="mailto:billing@suno.com" className="underline">billing@suno.com</a>.
          </div>
        </div>
      </div>

      <div className="relative z-10 mb-[120px] flex w-full max-w-[1280px] flex-col items-start gap-6 p-6">
        <div className="flex flex-col gap-24 w-full">
          <div className="mt-6 flex w-full flex-col gap-10 items-center">
            <h1 className="font-serif font-light text-center text-[28px] lg:text-[40px] leading-[48px] text-white/90">Manage your plan</h1>
            <span className="font-sans text-sm text-[var(--text-muted)]">Select the plan that best fits your needs</span>

            <div className="mt-4 flex w-full flex-col items-center gap-10">
              <div role="radiogroup" className="flex flex-row gap-4">
                <button type="button" role="radio" aria-checked={billingCycle==='month'} className="group flex cursor-pointer items-center gap-2 outline-none" onClick={() => setBillingCycle('month')}>
                  <div className="relative flex h-4 w-4 items-center justify-center rounded-full border border-white/30 bg-white/10">
                    <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" fill="currentColor" className={billingCycle==='month' ? 'opacity-100' : 'opacity-0'}>
                      <path d="M9.99 16.901a1 1 0 0 1-1.414 0L4.29 12.615c-.39-.39-.385-1.029.006-1.42.39-.39 1.029-.395 1.42-.005l3.567 3.568 8.468-8.468c.39-.39 1.03-.385 1.42.006.39.39.396 1.029.005 1.42z" />
                    </svg>
                  </div>
                  <label className="flex cursor-pointer items-center gap-1">Monthly</label>
                </button>
                <button type="button" role="radio" aria-checked={billingCycle==='year'} className="group flex cursor-pointer items-center gap-2 outline-none" onClick={() => setBillingCycle('year')}>
                  <div className="relative flex h-4 w-4 items-center justify-center rounded-full border border-white/30 bg-white/10">
                    <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" fill="currentColor" className={billingCycle==='year' ? 'opacity-100' : 'opacity-0'}>
                      <path d="M9.99 16.901a1 1 0 0 1-1.414 0L4.29 12.615c-.39-.39-.385-1.029.006-1.42.39-.39 1.029-.395 1.42-.005l3.567 3.568 8.468-8.468c.39-.39 1.03-.385 1.42.006.39.39.396 1.029.005 1.42z" />
                    </svg>
                  </div>
                  <label className="flex cursor-pointer items-center gap-1">Yearly<span className="ml-2 inline-flex items-center gap-1 rounded-xl px-2 py-0.5 text-[10px] font-medium uppercase bg-pink-500/30 text-white/90">save 20%</span></label>
                </button>
              </div>

              <div className="w-full grid grid-cols-1 min-[600px]:grid-cols-2 gap-6 items-stretch">
                {/* Pro */}
                <div className="flex h-full w-full flex-col rounded-3xl border border-[var(--border)] bg-white/5 p-6">
                  <div className="flex flex-col gap-6">
                    <div className="flex w-full flex-row items-center justify-between gap-2">
                      <h2 className="font-serif font-light text-[20px] lg:text-[24px] text-white/90">Pro Plan</h2>
                      <span className="inline-flex items-center gap-1 rounded-xl px-2 py-0.5 text-[10px] font-medium uppercase bg-pink-500 text-white">Most Popular</span>
                    </div>
                    <div className="text-sm text-white/60">Access to our best models and editing tools.</div>
                    <div className="flex flex-col">
                      <div className="flex w-full flex-row items-end gap-1 text-xl">{billingCycle==='year' ? '7,20 €' : '9 €'}<span className="text-sm font-medium text-white/60">/month</span></div>
                      <div className="h-8">
                        <div className="text-xs text-white/60">Taxes calculated at checkout</div>
                      </div>
                    </div>
                  </div>
                  <div className="mt-6">
                    <button onClick={() => handleCheckout('pro')} className="w-full px-8 py-4 text-[17px] leading-[24px] rounded-full text-black bg-white/80 backdrop-blur-lg hover:bg-white/90 transition">Change Commitment</button>
                  </div>
                  <ul className="mt-6 space-y-2 text-sm">
                    <li>• 2,500 credits/mo (up to 500 songs)</li>
                    <li>• Commercial use rights (while subscribed)</li>
                    <li>• Personas and advanced editing</li>
                    <li>• Stems up to 12 tracks</li>
                    <li>• Upload up to 8 min of audio</li>
                    <li>• Add vocals or instrumentals</li>
                    <li>• Early access to new features</li>
                    <li>• Add-on credits available</li>
                    <li>• Priority queue, up to 10 songs</li>
                  </ul>
                </div>

                {/* Premier */}
                <div className="flex h-full w-full flex-col rounded-3xl border border-[var(--border)] bg-white/5 p-6">
                  <div className="flex flex-col gap-6">
                    <div className="flex w-full flex-row items-center justify-between gap-2">
                      <h2 className="font-serif font-light text-[20px] lg:text-[24px] text-white/90">Premier Plan</h2>
                      <span className="inline-flex items-center gap-1 rounded-xl px-2 py-0.5 text-[10px] font-medium uppercase bg-white/20 text-white">Best Value</span>
                    </div>
                    <div className="text-sm text-white/60">Maximum credits and every feature unlocked.</div>
                    <div className="flex flex-col">
                      <div className="flex w-full flex-row items-end gap-1 text-xl">{billingCycle==='year' ? '22 €' : '25 €'}<span className="text-sm font-medium text-white/60">/month</span></div>
                      <div className="h-8">
                        <div className="text-xs text-white/60">Taxes calculated at checkout</div>
                      </div>
                    </div>
                  </div>
                  <div className="mt-6">
                    <button onClick={() => handleCheckout('premier')} className="w-full px-8 py-4 text-[17px] leading-[24px] rounded-full text-black bg-white/80 backdrop-blur-lg hover:bg-white/90 transition">Upgrade</button>
                  </div>
                  <ul className="mt-6 space-y-2 text-sm">
                    <li>• 10,000 credits/mo (up to 2,000 songs)</li>
                    <li>• All Pro features included</li>
                    <li>• Priority queue, up to 10 songs</li>
                    <li>• Full editing suite</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

//