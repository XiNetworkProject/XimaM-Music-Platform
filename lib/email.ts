import 'server-only';

export interface SendEmailOptions {
  to: string;
  subject: string;
  html: string;
}

export async function getTransport() {
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    throw new Error('SMTP non configuré');
  }
  const nodemailer = (await import('nodemailer')).default;
  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: false,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
  });
}

function getLogoAttachment() {
  try {
    // Priorité: public/synaura_logotype.png
    const mainPath = `${process.cwd()}/public/synaura_logotype.png`;
    return [{ filename: 'synaura_logotype.png', path: mainPath, cid: 'synaura-logo', contentType: 'image/png' }];
  } catch {
    try {
      const fallback = `${process.cwd()}/public/email_logo.png`;
      return [{ filename: 'email_logo.png', path: fallback, cid: 'synaura-logo', contentType: 'image/png' }];
    } catch {
      return [] as any[];
    }
  }
}

export async function sendEmail(opts: SendEmailOptions) {
  const transporter = await getTransport();
  const from = process.env.SMTP_FROM || 'Synaura <no-reply@synaura.fr>';
  const replyTo = process.env.SMTP_REPLY_TO || 'Synaura <contact.syn@synaura.fr>';
  const attachments = getLogoAttachment();
  await transporter.sendMail({ from, replyTo, to: opts.to, subject: opts.subject, html: opts.html, attachments });
}

export function resetEmailTemplate({ code, link }: { code: string; link: string }) {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXTAUTH_URL || 'http://localhost:3000';
  // Utiliser URL PNG externe si fournie, sinon CID de la pièce jointe
  const logo = process.env.EMAIL_LOGO_URL || 'cid:synaura-logo';
  return `
  <div style="background:#0b0b12;color:#fff;font-family:Inter,Arial,sans-serif;padding:24px">
    <div style="max-width:560px;margin:0 auto;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:12px;padding:24px">
      <div style="text-align:center;margin-bottom:16px">
        <img src="${logo}" alt="Synaura" width="140" height="28" style="display:inline-block;opacity:.95"/>
      </div>
      <h2 style="margin:0 0 8px;font-size:18px">Réinitialisation de votre mot de passe</h2>
      <p style="margin:0 0 16px;color:#cbd5e1">Utilisez ce code pour réinitialiser votre mot de passe. Il expire dans 10 minutes.</p>
      <div style="text-align:center;margin:16px 0">
        <div style="display:inline-block;background:#111827;border:1px solid #374151;color:#fff;padding:10px 16px;border-radius:10px;font-weight:600;letter-spacing:2px">${code}</div>
      </div>
      <p style="margin:0 0 16px;color:#cbd5e1">Ou cliquez sur le bouton ci-dessous :</p>
      <div style="text-align:center;margin:16px 0">
        <a href="${link}" style="display:inline-block;background:linear-gradient(90deg,#8b5cf6,#ec4899);color:#fff;text-decoration:none;padding:10px 16px;border-radius:10px;font-weight:600">Réinitialiser mon mot de passe</a>
      </div>
      <p style="margin-top:16px;color:#94a3b8;font-size:12px">Si vous n'êtes pas à l'origine de cette demande, ignorez cet email.</p>
      <p style="margin-top:8px;color:#64748b;font-size:11px">Des questions ? <a href="mailto:contact.syn@synaura.fr" style="color:#8b5cf6;text-decoration:none">contact.syn@synaura.fr</a></p>
    </div>
  </div>`;
}

export function welcomeEmailTemplate({
  name,
  username,
  referrerName,
}: {
  name: string;
  username: string;
  referrerName?: string | null;
}) {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXTAUTH_URL || 'http://localhost:3000';
  const logo = process.env.EMAIL_LOGO_URL || 'cid:synaura-logo';

  const referralBlock = referrerName
    ? `<div style="background:rgba(139,92,246,0.12);border:1px solid rgba(139,92,246,0.3);border-radius:10px;padding:12px 16px;margin-bottom:16px;text-align:center">
        <span style="color:#c4b5fd;font-size:13px">Parrainé par <strong style="color:#a78bfa">${referrerName}</strong> — +50 crédits bonus !</span>
      </div>`
    : '';

  return `
  <div style="background:#0b0b12;color:#fff;font-family:Inter,Arial,sans-serif;padding:24px">
    <div style="max-width:560px;margin:0 auto;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:16px;padding:32px 24px">
      <div style="text-align:center;margin-bottom:24px">
        <img src="${logo}" alt="Synaura" width="140" height="28" style="display:inline-block;opacity:.95"/>
      </div>

      <h1 style="margin:0 0 8px;font-size:22px;text-align:center">Bienvenue sur Synaura, ${name} !</h1>
      <p style="margin:0 0 20px;color:#94a3b8;text-align:center;font-size:14px">Ton compte <strong style="color:#fff">@${username}</strong> est prêt.</p>

      ${referralBlock}

      <div style="background:linear-gradient(135deg,rgba(139,92,246,0.15),rgba(236,72,153,0.1));border:1px solid rgba(139,92,246,0.2);border-radius:12px;padding:16px;text-align:center;margin-bottom:20px">
        <div style="font-size:28px;font-weight:700;color:#fff;margin-bottom:4px">🎁 50 crédits offerts</div>
        <div style="color:#cbd5e1;font-size:13px">Commence à créer de la musique avec l'IA dès maintenant</div>
      </div>

      <div style="display:flex;gap:12px;margin-bottom:20px">
        <div style="flex:1;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:10px;padding:14px;text-align:center">
          <div style="font-size:20px;margin-bottom:4px">🎵</div>
          <div style="font-size:12px;color:#94a3b8">Découvrir</div>
        </div>
        <div style="flex:1;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:10px;padding:14px;text-align:center">
          <div style="font-size:20px;margin-bottom:4px">🤖</div>
          <div style="font-size:12px;color:#94a3b8">Studio IA</div>
        </div>
        <div style="flex:1;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:10px;padding:14px;text-align:center">
          <div style="font-size:20px;margin-bottom:4px">👥</div>
          <div style="font-size:12px;color:#94a3b8">Communauté</div>
        </div>
      </div>

      <div style="text-align:center;margin:24px 0 16px">
        <a href="${baseUrl}/discover" style="display:inline-block;background:linear-gradient(90deg,#8b5cf6,#ec4899);color:#fff;text-decoration:none;padding:12px 32px;border-radius:12px;font-weight:600;font-size:14px">Commencer à écouter</a>
      </div>

      <div style="text-align:center;margin-bottom:16px">
        <a href="${baseUrl}/ai-generator" style="display:inline-block;background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.15);color:#fff;text-decoration:none;padding:10px 24px;border-radius:10px;font-weight:500;font-size:13px">Ouvrir le Studio IA →</a>
      </div>

      <hr style="border:none;border-top:1px solid rgba(255,255,255,0.06);margin:20px 0"/>

      <p style="margin:0;color:#64748b;font-size:11px;text-align:center">
        Tu reçois cet email car tu viens de créer un compte sur <a href="${baseUrl}" style="color:#8b5cf6;text-decoration:none">Synaura</a>.<br/>
        Si ce n'est pas toi, ignore cet email.<br/><br/>
      Des questions ? <a href="mailto:contact.syn@synaura.fr" style="color:#8b5cf6;text-decoration:none">contact.syn@synaura.fr</a>
    </p>
    </div>
  </div>`;
}

// ─── Star Academy TikTok — Templates ───────────────────────────────────────

const SA_BASE = (content: string) => {
  const logo = process.env.EMAIL_LOGO_URL || 'cid:synaura-logo';
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://synaura.fr';
  return `
  <div style="background:#04020a;color:#fff;font-family:Inter,Arial,sans-serif;padding:24px">
    <div style="max-width:600px;margin:0 auto;background:linear-gradient(135deg,rgba(124,58,237,0.12),rgba(0,242,234,0.06));border:1px solid rgba(124,58,237,0.3);border-radius:16px;overflow:hidden">
      <!-- Header gradient bande -->
      <div style="background:linear-gradient(90deg,#7c3aed,#00f2ea,#ff2d55);height:4px"></div>
      <div style="padding:32px 28px">
        <div style="text-align:center;margin-bottom:20px">
          <img src="${logo}" alt="Synaura" width="130" height="26" style="display:inline-block;opacity:.9"/>
        </div>
        <div style="text-align:center;margin-bottom:8px">
          <span style="display:inline-block;background:linear-gradient(90deg,rgba(255,212,122,0.15),rgba(124,58,237,0.15));border:1px solid rgba(255,212,122,0.4);border-radius:20px;padding:4px 14px;font-size:11px;font-weight:700;color:#ffd47a;letter-spacing:1px;text-transform:uppercase">★ Star Academy TikTok × Synaura</span>
        </div>
        ${content}
        <hr style="border:none;border-top:1px solid rgba(255,255,255,0.06);margin:24px 0"/>
        <p style="margin:0;color:#64748b;font-size:11px;text-align:center">
          Synaura — Plateforme musicale collaborative<br/>
          <a href="${baseUrl}" style="color:#7c3aed;text-decoration:none">synaura.fr</a> · <a href="mailto:contact.syn@synaura.fr" style="color:#7c3aed;text-decoration:none">contact.syn@synaura.fr</a>
        </p>
      </div>
    </div>
  </div>`;
};

export function saConfirmationTemplate({
  name,
  trackingToken,
  tiktokHandle,
}: {
  name: string;
  trackingToken: string;
  tiktokHandle: string;
}) {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://synaura.fr';
  const trackUrl = `${baseUrl}/star-academy-tiktok/suivi?token=${trackingToken}`;
  return SA_BASE(`
    <h1 style="margin:16px 0 8px;font-size:22px;text-align:center">Candidature reçue !</h1>
    <p style="color:#94a3b8;text-align:center;margin:0 0 24px;font-size:14px">Bonjour <strong style="color:#fff">${name}</strong>, ta candidature Star Academy TikTok a bien été enregistrée.</p>

    <div style="background:rgba(255,212,122,0.08);border:1px solid rgba(255,212,122,0.25);border-radius:12px;padding:16px;margin-bottom:20px;text-align:center">
      <div style="font-size:13px;color:#ffd47a;margin-bottom:4px">Ton pseudo TikTok</div>
      <div style="font-size:18px;font-weight:700;color:#fff">${tiktokHandle}</div>
    </div>

    <div style="background:rgba(124,58,237,0.12);border:2px solid rgba(124,58,237,0.35);border-radius:16px;padding:20px;margin-bottom:20px;text-align:center">
      <div style="font-size:12px;color:#a78bfa;text-transform:uppercase;letter-spacing:2px;margin-bottom:10px;font-weight:600">Ton numéro de suivi</div>
      <div style="font-size:20px;font-weight:800;color:#fff;letter-spacing:3px;font-family:monospace;background:rgba(255,255,255,0.06);border-radius:8px;padding:10px 16px;display:inline-block">${trackingToken}</div>
      <div style="font-size:11px;color:#64748b;margin-top:10px">Conserve ce code précieusement — il te permet de suivre ta candidature à tout moment</div>
    </div>

    <p style="color:#cbd5e1;font-size:14px;line-height:1.6;margin:0 0 16px">Notre équipe va écouter ton CV vocal et examiner ton profil. Tu recevras un email dès que ta candidature change de statut.</p>

    <div style="text-align:center;margin:24px 0">
      <a href="${trackUrl}" style="display:inline-block;background:linear-gradient(90deg,#7c3aed,#00f2ea);color:#fff;text-decoration:none;padding:12px 28px;border-radius:12px;font-weight:700;font-size:14px">Suivre ma candidature →</a>
    </div>

    <div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.07);border-radius:10px;padding:12px 14px;margin-bottom:8px;font-size:11px;color:#64748b;word-break:break-all">
      Lien direct : <a href="${trackUrl}" style="color:#7c3aed">${trackUrl}</a>
    </div>

    <div style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:10px;padding:14px;font-size:12px;color:#94a3b8">
      <strong style="color:#fff;display:block;margin-bottom:6px">Prochaines étapes</strong>
      01 — Écoute de ton audio par notre équipe<br/>
      02 — Validation de ton profil<br/>
      03 — Invitation en Live TikTok si tu es retenu(e)<br/>
      04 — Épreuves progressives &amp; prime
    </div>
  `);
}

export function saAcceptedTemplate({
  name,
  trackingToken,
  tiktokHandle,
  synauraUsername,
}: {
  name: string;
  trackingToken: string;
  tiktokHandle: string;
  synauraUsername?: string | null;
}) {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://synaura.fr';
  const trackUrl = `${baseUrl}/star-academy-tiktok/suivi?token=${trackingToken}`;
  const premiumBlock = synauraUsername
    ? `<div style="background:linear-gradient(135deg,rgba(139,92,246,0.2),rgba(0,242,234,0.1));border:1px solid rgba(124,58,237,0.4);border-radius:12px;padding:18px;margin:20px 0;text-align:center">
        <div style="font-size:14px;font-weight:700;color:#c4b5fd;margin-bottom:4px">1 mois Premium Synaura offert</div>
        <div style="color:#94a3b8;font-size:13px">Activ&eacute; sur ton compte <strong style="color:#fff">@${synauraUsername}</strong></div>
      </div>`
    : '';
  return SA_BASE(`
    <h1 style="margin:16px 0 8px;font-size:24px;text-align:center">F&eacute;licitations, tu es retenu(e) !</h1>
    <p style="color:#94a3b8;text-align:center;margin:0 0 20px;font-size:14px">Bonjour <strong style="color:#fff">${name}</strong>, ta candidature a &eacute;t&eacute; <strong style="color:#ffd47a">retenue</strong> pour Star Academy TikTok &times; Synaura.</p>

    <div style="background:rgba(255,212,122,0.1);border:1px solid rgba(255,212,122,0.35);border-radius:12px;padding:16px;margin-bottom:20px;text-align:center">
      <div style="font-size:13px;color:#ffd47a;margin-bottom:4px">Candidat retenu</div>
      <div style="font-size:18px;font-weight:700;color:#fff">${tiktokHandle}</div>
    </div>

    ${premiumBlock}

    <p style="color:#cbd5e1;font-size:14px;line-height:1.6;margin:0 0 16px">Un membre de notre &eacute;quipe te contactera tr&egrave;s bient&ocirc;t pour t'indiquer la date et l'heure de ton passage en Live TikTok. Reste disponible et pr&eacute;pare-toi !</p>

    <div style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:10px;padding:14px;font-size:12px;color:#94a3b8;margin-bottom:20px">
      <strong style="color:#fff;display:block;margin-bottom:6px">Et si tu gagnes ?</strong>
      Les gagnants du Live TikTok recevront 3 mois d'abonnement Premium Synaura en plus.
    </div>

    <div style="text-align:center;margin:24px 0">
      <a href="${trackUrl}" style="display:inline-block;background:linear-gradient(90deg,#ffd47a,#ff2d55);color:#fff;text-decoration:none;padding:12px 28px;border-radius:12px;font-weight:700;font-size:14px">Voir ma candidature &rarr;</a>
    </div>
  `);
}

export function saWinnerTemplate({
  name,
  trackingToken,
  tiktokHandle,
  synauraUsername,
}: {
  name: string;
  trackingToken: string;
  tiktokHandle: string;
  synauraUsername?: string | null;
}) {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://synaura.fr';
  const trackUrl = `${baseUrl}/star-academy-tiktok/suivi?token=${trackingToken}`;
  const premiumBlock = synauraUsername
    ? `<div style="background:linear-gradient(135deg,rgba(245,158,11,0.25),rgba(236,72,153,0.15));border:1px solid rgba(245,158,11,0.5);border-radius:12px;padding:20px;margin:20px 0;text-align:center">
        <div style="font-size:32px;margin-bottom:8px">3 MOIS</div>
        <div style="font-size:14px;font-weight:700;color:#fcd34d;margin-bottom:4px">Premium Synaura offerts</div>
        <div style="color:#94a3b8;font-size:13px">Activ&eacute;s sur ton compte <strong style="color:#fff">@${synauraUsername}</strong></div>
      </div>`
    : `<div style="background:linear-gradient(135deg,rgba(245,158,11,0.15),rgba(236,72,153,0.1));border:1px solid rgba(245,158,11,0.3);border-radius:12px;padding:16px;margin:20px 0;text-align:center">
        <div style="font-size:14px;font-weight:700;color:#fcd34d;">3 mois Premium Synaura offerts</div>
        <div style="color:#94a3b8;font-size:12px;margin-top:4px">Contacte-nous pour activer ta r&eacute;compense.</div>
      </div>`;
  return SA_BASE(`
    <h1 style="margin:16px 0 8px;font-size:26px;text-align:center;background:linear-gradient(90deg,#fbbf24,#f59e0b);-webkit-background-clip:text;-webkit-text-fill-color:transparent">Tu as gagn&eacute; !</h1>
    <p style="color:#94a3b8;text-align:center;margin:0 0 20px;font-size:14px">Bonjour <strong style="color:#fff">${name}</strong>, tu es <strong style="color:#fbbf24">Gagnant(e)</strong> de Star Academy TikTok &times; Synaura. Bravo !</p>

    <div style="background:rgba(245,158,11,0.12);border:1px solid rgba(245,158,11,0.4);border-radius:12px;padding:16px;margin-bottom:20px;text-align:center">
      <div style="font-size:13px;color:#fbbf24;margin-bottom:4px">Gagnant(e)</div>
      <div style="font-size:18px;font-weight:700;color:#fff">${tiktokHandle}</div>
    </div>

    ${premiumBlock}

    <p style="color:#cbd5e1;font-size:14px;line-height:1.6;margin:0 0 16px">Toute l'&eacute;quipe Synaura et Mixx Party te f&eacute;licite. Ta r&eacute;compense sera activ&eacute;e dans les prochaines heures. Merci pour ta performance en live !</p>

    <div style="text-align:center;margin:24px 0">
      <a href="${trackUrl}" style="display:inline-block;background:linear-gradient(90deg,#f59e0b,#ec4899);color:#fff;text-decoration:none;padding:12px 28px;border-radius:12px;font-weight:700;font-size:14px">Voir ma candidature &rarr;</a>
    </div>
  `);
}

export function saRejectedTemplate({
  name,
  trackingToken,
}: {
  name: string;
  trackingToken: string;
}) {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://synaura.fr';
  const trackUrl = `${baseUrl}/star-academy-tiktok/suivi?token=${trackingToken}`;
  return SA_BASE(`
    <h1 style="margin:16px 0 8px;font-size:22px;text-align:center">Résultat de ta candidature</h1>
    <p style="color:#94a3b8;text-align:center;margin:0 0 20px;font-size:14px">Bonjour <strong style="color:#fff">${name}</strong>,</p>

    <p style="color:#cbd5e1;font-size:14px;line-height:1.6;margin:0 0 16px">Nous avons examiné ta candidature avec attention. Malheureusement, nous ne pouvons pas te retenir pour cette session de Star Academy TikTok.</p>

    <p style="color:#cbd5e1;font-size:14px;line-height:1.6;margin:0 0 20px">Cela ne remet pas en cause ton talent — le niveau des candidatures était très élevé. Continue à créer et à te démarquer sur TikTok et Synaura.</p>

    <div style="background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:10px;padding:14px;font-size:13px;color:#94a3b8;text-align:center">
      Publie ta musique sur Synaura →
      <a href="${baseUrl}/publish" style="display:inline-block;margin-top:8px;background:rgba(124,58,237,0.2);border:1px solid rgba(124,58,237,0.4);color:#c4b5fd;text-decoration:none;padding:8px 18px;border-radius:8px;font-size:12px">synaura.fr/publish</a>
    </div>

    <div style="text-align:center;margin:20px 0">
      <a href="${trackUrl}" style="color:#7c3aed;text-decoration:none;font-size:13px">Voir ta candidature →</a>
    </div>
  `);
}

export function saReviewingTemplate({
  name,
  trackingToken,
}: {
  name: string;
  trackingToken: string;
}) {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://synaura.fr';
  const trackUrl = `${baseUrl}/star-academy-tiktok/suivi?token=${trackingToken}`;
  return SA_BASE(`
    <h1 style="margin:16px 0 8px;font-size:22px;text-align:center">Ta candidature est en cours d'écoute 🎧</h1>
    <p style="color:#94a3b8;text-align:center;margin:0 0 20px;font-size:14px">Bonjour <strong style="color:#fff">${name}</strong>,</p>

    <p style="color:#cbd5e1;font-size:14px;line-height:1.6;margin:0 0 20px">Bonne nouvelle — notre équipe a commencé à examiner ton profil et à écouter ton CV vocal. Tu recevras une réponse définitive très bientôt.</p>

    <div style="text-align:center;margin:24px 0">
      <a href="${trackUrl}" style="display:inline-block;background:linear-gradient(90deg,#7c3aed,#00f2ea);color:#fff;text-decoration:none;padding:12px 28px;border-radius:12px;font-weight:700;font-size:14px">Suivre ma candidature →</a>
    </div>
  `);
}

