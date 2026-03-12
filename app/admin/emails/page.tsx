'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  Mail, Send, Users, Search, X, Check, Loader2,
  Megaphone, Rocket, Bot, Heart, Star, Pencil,
  ChevronDown, Eye, AlertTriangle, Clock, CheckCircle2,
} from 'lucide-react';

type CampaignTemplate = 'announcement' | 'update' | 'studio' | 'reengagement' | 'star-academy' | 'custom';

const TEMPLATES: { id: CampaignTemplate; label: string; icon: typeof Mail; color: string; desc: string }[] = [
  { id: 'announcement', label: 'Annonce', icon: Megaphone, color: 'violet', desc: 'Annonce importante pour la communauté' },
  { id: 'update', label: 'Mise à jour', icon: Rocket, color: 'cyan', desc: 'Nouvelles fonctionnalités et améliorations' },
  { id: 'studio', label: 'Studio IA', icon: Bot, color: 'blue', desc: 'Promouvoir le studio de musique IA' },
  { id: 'reengagement', label: 'Réengagement', icon: Heart, color: 'pink', desc: 'Faire revenir les utilisateurs inactifs' },
  { id: 'star-academy', label: 'Star Academy', icon: Star, color: 'amber', desc: 'Actualités Star Academy TikTok' },
  { id: 'custom', label: 'Personnalisé', icon: Pencil, color: 'emerald', desc: 'Email libre avec ton propre contenu' },
];

const DEFAULTS: Record<CampaignTemplate, { subject: string; title: string; message: string; ctaLabel: string; ctaUrl: string }> = {
  announcement: {
    subject: 'Nouvelle annonce Synaura',
    title: 'Annonce importante',
    message: '',
    ctaLabel: 'Voir sur Synaura',
    ctaUrl: '/',
  },
  update: {
    subject: 'Nouveautés sur Synaura',
    title: 'Quoi de neuf ?',
    message: '',
    ctaLabel: 'Découvrir',
    ctaUrl: '/discover',
  },
  studio: {
    subject: 'Crée ta musique avec le Studio IA',
    title: 'Le Studio IA t\'attend',
    message: 'Génère des morceaux uniques en quelques clics grâce à notre studio de musique IA. Des milliers de styles, des paroles personnalisées, et une qualité studio.',
    ctaLabel: 'Ouvrir le Studio IA',
    ctaUrl: '/ai-generator',
  },
  reengagement: {
    subject: 'Tu nous manques sur Synaura',
    title: 'Ça fait un moment...',
    message: 'La communauté Synaura grandit chaque jour. De nouvelles musiques, de nouveaux artistes et des fonctionnalités inédites t\'attendent. Reviens voir ce qui a changé !',
    ctaLabel: 'Revenir sur Synaura',
    ctaUrl: '/discover',
  },
  'star-academy': {
    subject: 'Star Academy TikTok — Nouvelle info',
    title: 'Star Academy TikTok',
    message: '',
    ctaLabel: 'Voir la page',
    ctaUrl: '/star-academy-tiktok',
  },
  custom: {
    subject: '',
    title: '',
    message: '',
    ctaLabel: 'Voir sur Synaura',
    ctaUrl: '/',
  },
};

interface UserOption {
  id: string;
  email: string;
  name: string;
  username: string;
  avatar: string | null;
}

export default function AdminEmailsPage() {
  const [template, setTemplate] = useState<CampaignTemplate>('announcement');
  const [subject, setSubject] = useState(DEFAULTS.announcement.subject);
  const [title, setTitle] = useState(DEFAULTS.announcement.title);
  const [message, setMessage] = useState(DEFAULTS.announcement.message);
  const [ctaLabel, setCtaLabel] = useState(DEFAULTS.announcement.ctaLabel);
  const [ctaUrl, setCtaUrl] = useState(DEFAULTS.announcement.ctaUrl);
  const [target, setTarget] = useState<'all' | 'specific'>('all');
  const [selectedUsers, setSelectedUsers] = useState<UserOption[]>([]);
  const [userSearch, setUserSearch] = useState('');
  const [userResults, setUserResults] = useState<UserOption[]>([]);
  const [searchLoading, setSearchLoading] = useState(false);
  const [totalUsers, setTotalUsers] = useState(0);
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState<{ sent: number; failed: number; total: number } | null>(null);
  const [error, setError] = useState('');
  const [showConfirm, setShowConfirm] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [history, setHistory] = useState<any[]>([]);
  const [tab, setTab] = useState<'compose' | 'history'>('compose');
  const searchTimeout = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    fetch('/api/admin/emails?action=count')
      .then((r) => r.json())
      .then((d) => setTotalUsers(d.count || 0))
      .catch(() => {});
  }, []);

  useEffect(() => {
    if (tab === 'history') {
      fetch('/api/admin/emails?action=history')
        .then((r) => r.json())
        .then((d) => setHistory(d.campaigns || []))
        .catch(() => {});
    }
  }, [tab]);

  const handleTemplateChange = (t: CampaignTemplate) => {
    setTemplate(t);
    const d = DEFAULTS[t];
    setSubject(d.subject);
    setTitle(d.title);
    setMessage(d.message);
    setCtaLabel(d.ctaLabel);
    setCtaUrl(d.ctaUrl);
    setResult(null);
    setError('');
  };

  const searchUsers = useCallback((q: string) => {
    setUserSearch(q);
    if (searchTimeout.current) clearTimeout(searchTimeout.current);
    if (!q.trim()) { setUserResults([]); return; }
    searchTimeout.current = setTimeout(async () => {
      setSearchLoading(true);
      try {
        const res = await fetch(`/api/admin/emails?action=users&search=${encodeURIComponent(q)}`);
        const data = await res.json();
        setUserResults((data.users || []).filter((u: UserOption) => !selectedUsers.some((s) => s.id === u.id)));
      } catch {
        setUserResults([]);
      } finally {
        setSearchLoading(false);
      }
    }, 300);
  }, [selectedUsers]);

  const addUser = (u: UserOption) => {
    setSelectedUsers((prev) => [...prev, u]);
    setUserResults((prev) => prev.filter((x) => x.id !== u.id));
    setUserSearch('');
  };

  const removeUser = (id: string) => {
    setSelectedUsers((prev) => prev.filter((u) => u.id !== id));
  };

  const handleSend = async () => {
    setShowConfirm(false);
    setSending(true);
    setError('');
    setResult(null);
    try {
      const res = await fetch('/api/admin/emails', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          template,
          subject,
          title,
          message,
          ctaLabel,
          ctaUrl,
          target,
          userIds: target === 'specific' ? selectedUsers.map((u) => u.id) : undefined,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Erreur serveur');
      setResult({ sent: data.sent, failed: data.failed, total: data.total });
    } catch (e: any) {
      setError(e.message || 'Erreur lors de l\'envoi');
    } finally {
      setSending(false);
    }
  };

  const canSend = subject.trim() && title.trim() && message.trim() && (target === 'all' || selectedUsers.length > 0);
  const recipientCount = target === 'all' ? totalUsers : selectedUsers.length;
  const currentTemplate = TEMPLATES.find((t) => t.id === template)!;

  return (
    <div className="p-4 md:p-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-violet-500/15 border border-violet-500/20 flex items-center justify-center">
            <Mail className="w-5 h-5 text-violet-400" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-foreground-primary">Campagnes Email</h1>
            <p className="text-xs text-foreground-tertiary">{totalUsers} utilisateurs inscrits</p>
          </div>
        </div>
        <div className="flex gap-1 bg-background-tertiary rounded-xl p-1 border border-border-secondary">
          <button
            onClick={() => setTab('compose')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${tab === 'compose' ? 'bg-violet-500/20 text-violet-300' : 'text-foreground-tertiary hover:text-foreground-secondary'}`}
          >
            Composer
          </button>
          <button
            onClick={() => setTab('history')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition ${tab === 'history' ? 'bg-violet-500/20 text-violet-300' : 'text-foreground-tertiary hover:text-foreground-secondary'}`}
          >
            Historique
          </button>
        </div>
      </div>

      {tab === 'history' ? (
        <div className="space-y-3">
          {history.length === 0 ? (
            <div className="text-center py-16 text-foreground-tertiary text-sm">Aucune campagne envoyée</div>
          ) : (
            history.map((c: any, i: number) => (
              <div key={c.id || i} className="rounded-2xl border border-border-secondary bg-background-tertiary p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold uppercase tracking-wider text-violet-400">
                      {TEMPLATES.find((t) => t.id === c.template)?.label || c.template}
                    </span>
                    <span className="text-xs text-foreground-tertiary">→ {c.target === 'all' ? 'Tous' : 'Sélection'}</span>
                  </div>
                  <span className="text-[10px] text-foreground-tertiary">
                    {c.created_at ? new Date(c.created_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : ''}
                  </span>
                </div>
                <p className="text-sm font-semibold text-foreground-primary mb-1">{c.subject}</p>
                <p className="text-xs text-foreground-tertiary line-clamp-2">{c.message}</p>
                <div className="flex items-center gap-3 mt-3 text-[11px]">
                  <span className="text-emerald-400 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> {c.sent_count} envoyés</span>
                  {c.failed_count > 0 && <span className="text-red-400 flex items-center gap-1"><AlertTriangle className="w-3 h-3" /> {c.failed_count} échoués</span>}
                  <span className="text-foreground-tertiary flex items-center gap-1"><Users className="w-3 h-3" /> {c.recipient_count} destinataires</span>
                </div>
              </div>
            ))
          )}
        </div>
      ) : (
        <div className="space-y-5">
          {/* Template selector */}
          <div>
            <label className="text-xs font-semibold text-foreground-secondary mb-2 block">Type de campagne</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {TEMPLATES.map((t) => {
                const Icon = t.icon;
                const active = template === t.id;
                return (
                  <button
                    key={t.id}
                    onClick={() => handleTemplateChange(t.id)}
                    className={`relative flex items-center gap-2.5 p-3 rounded-xl border transition-all text-left ${
                      active
                        ? `border-${t.color}-500/40 bg-${t.color}-500/10 ring-1 ring-${t.color}-500/20`
                        : 'border-border-secondary bg-background-tertiary hover:border-border-secondary/80 hover:bg-overlay-on-primary'
                    }`}
                  >
                    <Icon className={`w-4 h-4 shrink-0 ${active ? `text-${t.color}-400` : 'text-foreground-tertiary'}`} />
                    <div className="min-w-0">
                      <div className={`text-xs font-bold ${active ? 'text-foreground-primary' : 'text-foreground-secondary'}`}>{t.label}</div>
                      <div className="text-[10px] text-foreground-tertiary truncate">{t.desc}</div>
                    </div>
                    {active && <div className={`absolute top-1.5 right-1.5 w-2 h-2 rounded-full bg-${t.color}-400`} />}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Target */}
          <div>
            <label className="text-xs font-semibold text-foreground-secondary mb-2 block">Destinataires</label>
            <div className="flex gap-2 mb-3">
              <button
                onClick={() => setTarget('all')}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border text-xs font-semibold transition ${
                  target === 'all'
                    ? 'border-violet-500/40 bg-violet-500/10 text-violet-300'
                    : 'border-border-secondary bg-background-tertiary text-foreground-secondary hover:bg-overlay-on-primary'
                }`}
              >
                <Users className="w-3.5 h-3.5" />
                Tous les utilisateurs ({totalUsers})
              </button>
              <button
                onClick={() => setTarget('specific')}
                className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl border text-xs font-semibold transition ${
                  target === 'specific'
                    ? 'border-violet-500/40 bg-violet-500/10 text-violet-300'
                    : 'border-border-secondary bg-background-tertiary text-foreground-secondary hover:bg-overlay-on-primary'
                }`}
              >
                <Search className="w-3.5 h-3.5" />
                Utilisateurs spécifiques
              </button>
            </div>

            {target === 'specific' && (
              <div className="space-y-2">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-foreground-tertiary" />
                  <input
                    type="text"
                    value={userSearch}
                    onChange={(e) => searchUsers(e.target.value)}
                    placeholder="Rechercher par nom, email ou username..."
                    className="w-full pl-9 pr-3 py-2.5 rounded-xl bg-background-tertiary border border-border-secondary text-sm text-foreground-primary placeholder:text-foreground-tertiary focus:outline-none focus:border-violet-500/40"
                  />
                  {searchLoading && <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-violet-400 animate-spin" />}
                </div>

                {userResults.length > 0 && (
                  <div className="rounded-xl border border-border-secondary bg-background-tertiary max-h-48 overflow-y-auto">
                    {userResults.map((u) => (
                      <button
                        key={u.id}
                        onClick={() => addUser(u)}
                        className="w-full flex items-center gap-3 px-3 py-2 hover:bg-overlay-on-primary transition text-left"
                      >
                        {u.avatar ? (
                          <img src={u.avatar} alt="" className="w-7 h-7 rounded-full object-cover" />
                        ) : (
                          <div className="w-7 h-7 rounded-full bg-violet-500/20 flex items-center justify-center text-[10px] font-bold text-violet-300">
                            {(u.name || u.username || '?')[0].toUpperCase()}
                          </div>
                        )}
                        <div className="min-w-0 flex-1">
                          <div className="text-xs font-semibold text-foreground-primary truncate">{u.name || u.username}</div>
                          <div className="text-[10px] text-foreground-tertiary truncate">{u.email}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                )}

                {selectedUsers.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {selectedUsers.map((u) => (
                      <span
                        key={u.id}
                        className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-violet-500/15 border border-violet-500/20 text-[11px] font-semibold text-violet-300"
                      >
                        {u.name || u.username}
                        <button onClick={() => removeUser(u.id)} className="hover:text-white transition">
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Form fields */}
          <div className="space-y-3">
            <div>
              <label className="text-xs font-semibold text-foreground-secondary mb-1 block">Objet de l'email</label>
              <input
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                placeholder="Objet..."
                className="w-full px-3 py-2.5 rounded-xl bg-background-tertiary border border-border-secondary text-sm text-foreground-primary placeholder:text-foreground-tertiary focus:outline-none focus:border-violet-500/40"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-foreground-secondary mb-1 block">Titre principal</label>
              <input
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Titre affiché dans le mail..."
                className="w-full px-3 py-2.5 rounded-xl bg-background-tertiary border border-border-secondary text-sm text-foreground-primary placeholder:text-foreground-tertiary focus:outline-none focus:border-violet-500/40"
              />
            </div>
            <div>
              <label className="text-xs font-semibold text-foreground-secondary mb-1 block">Message</label>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Contenu du mail..."
                rows={6}
                className="w-full px-3 py-2.5 rounded-xl bg-background-tertiary border border-border-secondary text-sm text-foreground-primary placeholder:text-foreground-tertiary focus:outline-none focus:border-violet-500/40 resize-y"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-foreground-secondary mb-1 block">Texte du bouton</label>
                <input
                  type="text"
                  value={ctaLabel}
                  onChange={(e) => setCtaLabel(e.target.value)}
                  placeholder="Voir sur Synaura"
                  className="w-full px-3 py-2.5 rounded-xl bg-background-tertiary border border-border-secondary text-sm text-foreground-primary placeholder:text-foreground-tertiary focus:outline-none focus:border-violet-500/40"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-foreground-secondary mb-1 block">Lien du bouton</label>
                <input
                  type="text"
                  value={ctaUrl}
                  onChange={(e) => setCtaUrl(e.target.value)}
                  placeholder="/discover"
                  className="w-full px-3 py-2.5 rounded-xl bg-background-tertiary border border-border-secondary text-sm text-foreground-primary placeholder:text-foreground-tertiary focus:outline-none focus:border-violet-500/40"
                />
              </div>
            </div>
          </div>

          {/* Result / Error */}
          {result && (
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/10 p-4 flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              <div>
                <p className="text-sm font-semibold text-emerald-300">{result.sent} email{result.sent > 1 ? 's' : ''} envoyé{result.sent > 1 ? 's' : ''} avec succès</p>
                {result.failed > 0 && (
                  <p className="text-xs text-red-400 mt-0.5">{result.failed} échoué{result.failed > 1 ? 's' : ''}</p>
                )}
              </div>
            </div>
          )}

          {error && (
            <div className="rounded-xl border border-red-500/20 bg-red-500/10 p-4 flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-red-400 shrink-0" />
              <p className="text-sm text-red-300">{error}</p>
            </div>
          )}

          {/* Actions */}
          <div className="flex items-center gap-3 pt-2">
            <button
              onClick={() => setShowPreview(true)}
              className="flex items-center gap-2 px-4 py-2.5 rounded-xl border border-border-secondary bg-background-tertiary text-foreground-secondary text-xs font-semibold hover:bg-overlay-on-primary transition"
            >
              <Eye className="w-3.5 h-3.5" />
              Prévisualiser
            </button>
            <button
              onClick={() => canSend && setShowConfirm(true)}
              disabled={!canSend || sending}
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-violet-500 to-blue-500 text-white text-xs font-bold hover:from-violet-400 hover:to-blue-400 disabled:opacity-40 disabled:cursor-not-allowed transition shadow-lg shadow-violet-500/20"
            >
              {sending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-3.5 h-3.5" />}
              {sending ? 'Envoi en cours...' : `Envoyer à ${recipientCount} utilisateur${recipientCount > 1 ? 's' : ''}`}
            </button>
          </div>
        </div>
      )}

      {/* Confirm modal */}
      {showConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-md rounded-2xl border border-border-secondary bg-[#0c0c14] p-6 shadow-2xl">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-amber-500/15 border border-amber-500/20 flex items-center justify-center">
                <AlertTriangle className="w-5 h-5 text-amber-400" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-foreground-primary">Confirmer l'envoi</h3>
                <p className="text-xs text-foreground-tertiary">Cette action est irréversible</p>
              </div>
            </div>
            <div className="rounded-xl bg-background-tertiary border border-border-secondary p-4 mb-4 space-y-2">
              <div className="flex items-center justify-between text-xs">
                <span className="text-foreground-tertiary">Template</span>
                <span className="text-foreground-primary font-semibold">{currentTemplate.label}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-foreground-tertiary">Objet</span>
                <span className="text-foreground-primary font-semibold truncate max-w-[200px]">{subject}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-foreground-tertiary">Destinataires</span>
                <span className="text-foreground-primary font-semibold">{recipientCount} utilisateur{recipientCount > 1 ? 's' : ''}</span>
              </div>
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowConfirm(false)}
                className="flex-1 px-4 py-2.5 rounded-xl border border-border-secondary bg-background-tertiary text-foreground-secondary text-xs font-semibold hover:bg-overlay-on-primary transition"
              >
                Annuler
              </button>
              <button
                onClick={handleSend}
                className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-gradient-to-r from-violet-500 to-blue-500 text-white text-xs font-bold hover:from-violet-400 hover:to-blue-400 transition"
              >
                <Send className="w-3.5 h-3.5" />
                Confirmer l'envoi
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Preview modal */}
      {showPreview && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <div className="w-full max-w-2xl max-h-[85vh] rounded-2xl border border-border-secondary bg-[#0c0c14] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-border-secondary">
              <div className="flex items-center gap-2">
                <Eye className="w-4 h-4 text-violet-400" />
                <span className="text-sm font-bold text-foreground-primary">Prévisualisation</span>
              </div>
              <button onClick={() => setShowPreview(false)} className="w-8 h-8 rounded-lg hover:bg-overlay-on-primary flex items-center justify-center transition">
                <X className="w-4 h-4 text-foreground-tertiary" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              <div className="text-xs text-foreground-tertiary mb-2">Objet : <strong className="text-foreground-primary">{subject}</strong></div>
              <div className="rounded-xl overflow-hidden border border-border-secondary">
                <EmailPreview template={template} title={title} message={message} ctaLabel={ctaLabel} ctaUrl={ctaUrl} />
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function EmailPreview({ template, title, message, ctaLabel, ctaUrl }: { template: CampaignTemplate; title: string; message: string; ctaLabel: string; ctaUrl: string }) {
  const colorMap: Record<string, [string, string]> = {
    announcement: ['#8b5cf6', '#ec4899'],
    update: ['#06b6d4', '#8b5cf6'],
    studio: ['#8b5cf6', '#3b82f6'],
    reengagement: ['#ec4899', '#f59e0b'],
    'star-academy': ['#7c3aed', '#00f2ea'],
    custom: ['#8b5cf6', '#ec4899'],
  };
  const [from, to] = colorMap[template] || colorMap.custom;

  return (
    <div style={{ background: '#0b0b12', padding: 16, fontFamily: 'Inter, Arial, sans-serif' }}>
      <div style={{ maxWidth: 560, margin: '0 auto', background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 16, overflow: 'hidden' }}>
        <div style={{ background: `linear-gradient(90deg, ${from}, ${to})`, height: 4 }} />
        <div style={{ padding: '24px 20px' }}>
          <div style={{ textAlign: 'center', marginBottom: 20 }}>
            <div style={{ color: '#fff', fontSize: 12, fontWeight: 700, letterSpacing: 2, opacity: 0.5 }}>SYNAURA</div>
          </div>
          <h1 style={{ margin: '0 0 10px', fontSize: 20, textAlign: 'center', color: '#fff' }}>{title || 'Titre...'}</h1>
          <p style={{ color: '#94a3b8', textAlign: 'center', margin: '0 0 16px', fontSize: 13 }}>Bonjour <strong style={{ color: '#fff' }}>Utilisateur</strong>,</p>
          <div style={{ color: '#cbd5e1', fontSize: 13, lineHeight: 1.7, marginBottom: 16, whiteSpace: 'pre-wrap' }}>{message || 'Message...'}</div>
          <div style={{ textAlign: 'center', margin: '20px 0' }}>
            <span style={{ display: 'inline-block', background: `linear-gradient(90deg, ${from}, ${to})`, color: '#fff', padding: '10px 24px', borderRadius: 10, fontWeight: 700, fontSize: 13 }}>
              {ctaLabel || 'Bouton'}
            </span>
          </div>
          <hr style={{ border: 'none', borderTop: '1px solid rgba(255,255,255,0.06)', margin: '16px 0' }} />
          <p style={{ margin: 0, color: '#64748b', fontSize: 10, textAlign: 'center' }}>
            Découvrir · Studio IA · Communauté<br />synaura.fr · contact.syn@synaura.fr
          </p>
        </div>
      </div>
    </div>
  );
}
