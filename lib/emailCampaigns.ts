import 'server-only';

export type CampaignTemplate =
  | 'announcement'
  | 'update'
  | 'studio'
  | 'reengagement'
  | 'star-academy'
  | 'custom';

export interface CampaignOptions {
  template: CampaignTemplate;
  subject: string;
  title: string;
  message: string;
  ctaLabel?: string;
  ctaUrl?: string;
  recipientName?: string;
}

export const CAMPAIGN_PRESETS: Record<
  CampaignTemplate,
  { label: string; emoji: string; defaultSubject: string; defaultTitle: string; defaultMessage: string; defaultCta: string; defaultCtaUrl: string; accentFrom: string; accentTo: string }
> = {
  announcement: {
    label: 'Annonce',
    emoji: '📢',
    defaultSubject: 'Nouvelle annonce Synaura',
    defaultTitle: 'Annonce importante',
    defaultMessage: '',
    defaultCta: 'Voir sur Synaura',
    defaultCtaUrl: '/',
    accentFrom: '#8b5cf6',
    accentTo: '#ec4899',
  },
  update: {
    label: 'Mise à jour',
    emoji: '🚀',
    defaultSubject: 'Nouveautés sur Synaura',
    defaultTitle: 'Quoi de neuf ?',
    defaultMessage: '',
    defaultCta: 'Découvrir',
    defaultCtaUrl: '/discover',
    accentFrom: '#06b6d4',
    accentTo: '#8b5cf6',
  },
  studio: {
    label: 'Studio IA',
    emoji: '🤖',
    defaultSubject: 'Crée ta musique avec le Studio IA',
    defaultTitle: 'Le Studio IA t\'attend',
    defaultMessage: 'Génère des morceaux uniques en quelques clics grâce à notre studio de musique IA. Des milliers de styles, des paroles personnalisées, et une qualité studio.',
    defaultCta: 'Ouvrir le Studio IA',
    defaultCtaUrl: '/ai-generator',
    accentFrom: '#8b5cf6',
    accentTo: '#3b82f6',
  },
  reengagement: {
    label: 'Réengagement',
    emoji: '💜',
    defaultSubject: 'Tu nous manques sur Synaura',
    defaultTitle: 'Ça fait un moment...',
    defaultMessage: 'La communauté Synaura grandit chaque jour. De nouvelles musiques, de nouveaux artistes et des fonctionnalités inédites t\'attendent. Reviens voir ce qui a changé !',
    defaultCta: 'Revenir sur Synaura',
    defaultCtaUrl: '/discover',
    accentFrom: '#ec4899',
    accentTo: '#f59e0b',
  },
  'star-academy': {
    label: 'Star Academy',
    emoji: '⭐',
    defaultSubject: 'Star Academy TikTok — Nouvelle info',
    defaultTitle: 'Star Academy TikTok',
    defaultMessage: '',
    defaultCta: 'Voir la page',
    defaultCtaUrl: '/star-academy-tiktok',
    accentFrom: '#7c3aed',
    accentTo: '#00f2ea',
  },
  custom: {
    label: 'Personnalisé',
    emoji: '✉️',
    defaultSubject: '',
    defaultTitle: '',
    defaultMessage: '',
    defaultCta: 'Voir sur Synaura',
    defaultCtaUrl: '/',
    accentFrom: '#8b5cf6',
    accentTo: '#ec4899',
  },
};

function escapeHtml(str: string) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function nl2br(str: string) {
  return escapeHtml(str).replace(/\n/g, '<br/>');
}

export function buildCampaignEmail(opts: CampaignOptions): string {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXTAUTH_URL || 'https://synaura.fr';
  const logo = process.env.EMAIL_LOGO_URL || 'cid:synaura-logo';
  const preset = CAMPAIGN_PRESETS[opts.template];
  const accentFrom = preset.accentFrom;
  const accentTo = preset.accentTo;

  const ctaLabel = opts.ctaLabel || preset.defaultCta;
  const ctaRawUrl = opts.ctaUrl || preset.defaultCtaUrl;
  const ctaUrl = ctaRawUrl.startsWith('http') ? ctaRawUrl : `${baseUrl}${ctaRawUrl.startsWith('/') ? '' : '/'}${ctaRawUrl}`;

  const greeting = opts.recipientName ? `Bonjour <strong style="color:#fff">${escapeHtml(opts.recipientName)}</strong>,` : '';

  const featureBlocks: Record<string, string> = {
    studio: `
      <div style="display:flex;gap:10px;margin:20px 0">
        <div style="flex:1;background:rgba(139,92,246,0.12);border:1px solid rgba(139,92,246,0.25);border-radius:10px;padding:14px;text-align:center">
          <div style="font-size:22px;margin-bottom:4px">🎵</div>
          <div style="font-size:12px;font-weight:600;color:#c4b5fd">Génération</div>
          <div style="font-size:10px;color:#94a3b8;margin-top:2px">Créer un morceau en 1 clic</div>
        </div>
        <div style="flex:1;background:rgba(59,130,246,0.12);border:1px solid rgba(59,130,246,0.25);border-radius:10px;padding:14px;text-align:center">
          <div style="font-size:22px;margin-bottom:4px">🎤</div>
          <div style="font-size:12px;font-weight:600;color:#93c5fd">Paroles</div>
          <div style="font-size:10px;color:#94a3b8;margin-top:2px">Écris ou laisse l'IA faire</div>
        </div>
        <div style="flex:1;background:rgba(236,72,153,0.12);border:1px solid rgba(236,72,153,0.25);border-radius:10px;padding:14px;text-align:center">
          <div style="font-size:22px;margin-bottom:4px">🔄</div>
          <div style="font-size:12px;font-weight:600;color:#f9a8d4">Remix</div>
          <div style="font-size:10px;color:#94a3b8;margin-top:2px">Remixe tes morceaux</div>
        </div>
      </div>`,
    reengagement: `
      <div style="background:linear-gradient(135deg,rgba(236,72,153,0.12),rgba(245,158,11,0.08));border:1px solid rgba(236,72,153,0.25);border-radius:12px;padding:18px;margin:20px 0;text-align:center">
        <div style="font-size:15px;font-weight:700;color:#f9a8d4;margin-bottom:6px">Ce qui t'attend</div>
        <div style="color:#cbd5e1;font-size:13px;line-height:1.6">
          🎵 Nouvelles musiques publiées<br/>
          🤖 Studio IA amélioré<br/>
          👥 Communauté grandissante<br/>
          ⭐ Événements exclusifs
        </div>
      </div>`,
  };

  const extraBlock = featureBlocks[opts.template] || '';

  return `
  <div style="background:#0b0b12;color:#fff;font-family:Inter,Arial,sans-serif;padding:24px">
    <div style="max-width:600px;margin:0 auto;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:16px;overflow:hidden">
      <div style="background:linear-gradient(90deg,${accentFrom},${accentTo});height:4px"></div>
      <div style="padding:32px 28px">
        <div style="text-align:center;margin-bottom:24px">
          <img src="${logo}" alt="Synaura" width="140" height="28" style="display:inline-block;opacity:.95"/>
        </div>

        <h1 style="margin:0 0 12px;font-size:22px;text-align:center;color:#fff">${escapeHtml(opts.title)}</h1>

        ${greeting ? `<p style="color:#94a3b8;text-align:center;margin:0 0 20px;font-size:14px">${greeting}</p>` : ''}

        <div style="color:#cbd5e1;font-size:14px;line-height:1.7;margin:0 0 16px">${nl2br(opts.message)}</div>

        ${extraBlock}

        <div style="text-align:center;margin:28px 0 20px">
          <a href="${ctaUrl}" style="display:inline-block;background:linear-gradient(90deg,${accentFrom},${accentTo});color:#fff;text-decoration:none;padding:12px 32px;border-radius:12px;font-weight:700;font-size:14px">${escapeHtml(ctaLabel)}</a>
        </div>

        <hr style="border:none;border-top:1px solid rgba(255,255,255,0.06);margin:24px 0"/>

        <div style="text-align:center">
          <div style="margin-bottom:12px">
            <a href="${baseUrl}/discover" style="color:#94a3b8;text-decoration:none;font-size:12px;margin:0 8px">Découvrir</a>
            <a href="${baseUrl}/ai-generator" style="color:#94a3b8;text-decoration:none;font-size:12px;margin:0 8px">Studio IA</a>
            <a href="${baseUrl}/community" style="color:#94a3b8;text-decoration:none;font-size:12px;margin:0 8px">Communauté</a>
          </div>
          <p style="margin:0;color:#64748b;font-size:11px">
            Tu reçois cet email car tu as un compte sur <a href="${baseUrl}" style="color:#8b5cf6;text-decoration:none">Synaura</a>.<br/>
            <a href="mailto:contact.syn@synaura.fr" style="color:#8b5cf6;text-decoration:none">contact.syn@synaura.fr</a>
          </p>
        </div>
      </div>
    </div>
  </div>`;
}
