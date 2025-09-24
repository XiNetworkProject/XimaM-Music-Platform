'use client';
import { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';

export const dynamic = 'force-dynamic';

function ResetPasswordInner() {
  const params = useSearchParams();
  const token = params.get('token') || '';
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      const res = await fetch('/api/auth/reset-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token, code: code.trim(), password, email: email.trim() })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || 'Erreur');
      setSuccess(true);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="panel-suno p-6 rounded-2xl border border-[var(--border)] text-center">
          <h1 className="text-xl font-bold mb-2">Mot de passe réinitialisé ✅</h1>
          <p className="text-white/70">Vous pouvez maintenant vous connecter avec votre nouveau mot de passe.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <form onSubmit={onSubmit} className="panel-suno p-6 rounded-2xl border border-[var(--border)] w-full max-w-md space-y-4">
        <h1 className="text-xl font-bold">Réinitialiser le mot de passe</h1>
        {!!error && <div className="text-red-400 text-sm">{error}</div>}
        <input className="input-suno" placeholder="Email" value={email} onChange={(e)=>setEmail(e.target.value)} />
        <input className="input-suno" placeholder="Code (6 chiffres)" value={code} onChange={(e)=>setCode(e.target.value)} />
        <input className="input-suno" type="password" placeholder="Nouveau mot de passe" value={password} onChange={(e)=>setPassword(e.target.value)} />
        <button disabled={loading} className="btn-suno w-full">{loading? 'En cours...' : 'Valider'}</button>
      </form>
    </div>
  );
}

export default function ResetPasswordAliasPage() {
  return (
    <Suspense fallback={<div className="min-h-[60vh] flex items-center justify-center text-white/70">Chargement…</div>}>
      <ResetPasswordInner />
    </Suspense>
  );
}

