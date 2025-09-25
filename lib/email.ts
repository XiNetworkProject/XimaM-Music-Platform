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
    const path = `${process.cwd()}/public/synaura_symbol.svg`;
    return [{ filename: 'synaura_symbol.svg', path, cid: 'synaura-logo', contentType: 'image/svg+xml' }];
  } catch {
    return [] as any[];
  }
}

export async function sendEmail(opts: SendEmailOptions) {
  const transporter = await getTransport();
  const from = process.env.SMTP_FROM || 'Synaura <no-reply@synaura.fr>';
  const attachments = getLogoAttachment();
  await transporter.sendMail({ from, to: opts.to, subject: opts.subject, html: opts.html, attachments });
}

export function resetEmailTemplate({ code, link }: { code: string; link: string }) {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || process.env.NEXTAUTH_URL || 'http://localhost:3000';
  const logo = 'cid:synaura-logo';
  return `
  <div style="background:#0b0b12;color:#fff;font-family:Inter,Arial,sans-serif;padding:24px">
    <div style="max-width:560px;margin:0 auto;background:rgba(255,255,255,0.04);border:1px solid rgba(255,255,255,0.08);border-radius:12px;padding:24px">
      <div style="text-align:center;margin-bottom:12px">
        <img src="${logo}" alt="Synaura" width="56" height="56" style="display:inline-block;opacity:.95"/>
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
    </div>
  </div>`;
}

