import { NextResponse } from 'next/server';
import { getTransport } from '@/lib/email';
import path from 'path';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || 'https://synaura.fr';
    const synauraLogo = process.env.EMAIL_LOGO_URL || 'cid:synaura-logo';

    const card = (icon: string, title: string, desc: string) => `
      <tr><td style="padding:0 0 12px">
        <table width="100%" cellpadding="0" cellspacing="0" style="background:#1a1128;border:1px solid rgba(255,255,255,0.08);border-radius:12px">
          <tr><td style="padding:16px">
            <table cellpadding="0" cellspacing="0"><tr>
              <td style="vertical-align:top;padding-right:12px;font-size:22px">${icon}</td>
              <td>
                <div style="font-size:14px;font-weight:600;color:#fff;margin-bottom:4px">${title}</div>
                <div style="font-size:12px;color:rgba(255,255,255,0.45);line-height:1.5">${desc}</div>
              </td>
            </tr></table>
          </td></tr>
        </table>
      </td></tr>`;

    const html = `
    <div style="background:#0f0a1a;color:#fff;font-family:Inter,Arial,Helvetica,sans-serif;padding:16px">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;margin:0 auto;background:#150f22;border:1px solid rgba(255,255,255,0.08);border-radius:20px;overflow:hidden">

        <!-- Header -->
        <tr><td style="background:linear-gradient(135deg,#2d1b69,#1e1145);padding:36px 24px 28px;text-align:center;border-bottom:1px solid rgba(255,255,255,0.06)">
          <img src="cid:alertemps-logo" alt="Alertemps" style="height:44px;width:auto;margin-bottom:14px" /><br/>
          <span style="font-size:26px;font-weight:800;color:#fff">Dashboard V3.5</span><br/>
          <span style="font-size:13px;color:rgba(255,255,255,0.45);margin-top:6px;display:inline-block">Nouvelle interface &bull; Nouvelles fonctionnalites</span>
        </td></tr>

        <tr><td style="padding:28px 24px">

          <!-- Intro -->
          <p style="color:rgba(255,255,255,0.65);font-size:14px;line-height:1.7;margin:0 0 24px">
            Le tableau de bord Alertemps a ete entierement repense. Nouvelle DA inspiree Apple/iOS avec les couleurs Synaura. Voici les nouveautes.
          </p>

          <!-- DA -->
          <table width="100%" cellpadding="0" cellspacing="0" style="background:rgba(139,92,246,0.1);border:1px solid rgba(139,92,246,0.25);border-radius:14px;margin-bottom:24px">
            <tr><td style="padding:18px">
              <div style="font-size:15px;font-weight:700;color:#c4b5fd;margin-bottom:10px">Nouvelle Direction Artistique</div>
              <div style="font-size:13px;color:rgba(255,255,255,0.55);line-height:1.9">
                &bull; Style Apple/iOS : surfaces epurees, coins genereux<br/>
                &bull; Palette Synaura : violet, indigo, blanc<br/>
                &bull; Navigation segmented control (pills)<br/>
                &bull; Logo officiel Alertemps integre<br/>
                &bull; Interface aeree et lisible
              </div>
            </td></tr>
          </table>

          <!-- Features - 1 colonne -->
          <div style="font-size:17px;font-weight:700;color:#fff;margin-bottom:14px">Fonctionnalites</div>
          <table width="100%" cellpadding="0" cellspacing="0">
            ${card('&#9993;&#65039;', "Gestion d'equipe", 'Invitez des membres par email, gerez les roles : admin, moderateur, contributeur.')}
            ${card('&#128276;', 'Alertes meteo', '4 niveaux de severite (info, attention, alerte, danger), regions ciblees, expiration auto.')}
            ${card('&#128172;', 'Commentaires & reactions', 'Communaute : reponses imbriquees, likes, moderation des bulletins.')}
            ${card('&#128200;', 'Analytics avances', 'Vues par jour (7/30/90j), repartition par source, KPIs en temps reel.')}
            ${card('&#128196;', '8 modeles de bulletin', 'Classique, vigilance, week-end, orages, froid, canicule, bilan hebdo, special.')}
            ${card('&#128197;', 'Programmation', 'Brouillons, publication programmee date/heure, publication automatique.')}
          </table>

          <!-- Pages -->
          <table width="100%" cellpadding="0" cellspacing="0" style="background:#1a1128;border:1px solid rgba(255,255,255,0.08);border-radius:12px;margin-bottom:20px">
            <tr><td style="padding:16px">
              <div style="font-size:13px;font-weight:600;color:rgba(255,255,255,0.5);margin-bottom:8px">Pages redesignees</div>
              <div style="font-size:13px;color:rgba(255,255,255,0.5);line-height:2">
                &#10003; Dashboard admin complet<br/>
                &#10003; Page publique meteo<br/>
                &#10003; Page de connexion<br/>
                &#10003; Page detail bulletin
              </div>
            </td></tr>
          </table>

          <!-- Parametres -->
          <table width="100%" cellpadding="0" cellspacing="0" style="background:rgba(139,92,246,0.08);border:1px solid rgba(139,92,246,0.15);border-radius:12px;margin-bottom:28px">
            <tr><td style="padding:16px">
              <div style="font-size:14px;font-weight:600;color:#c4b5fd;margin-bottom:6px">Nouveau : Parametres fonctionnels</div>
              <div style="font-size:12px;color:rgba(255,255,255,0.45);line-height:1.6">
                Les toggles de l'onglet Parametres sont connectes a la BDD : notifications auto lors d'un nouveau bulletin et resume quotidien par email, avec sauvegarde en temps reel.
              </div>
            </td></tr>
          </table>

          <!-- CTA -->
          <table width="100%" cellpadding="0" cellspacing="0">
            <tr><td style="text-align:center;padding:0 0 12px">
              <a href="${baseUrl}/meteo/login" style="display:inline-block;background:#8b5cf6;color:#fff;text-decoration:none;padding:14px 36px;border-radius:14px;font-weight:600;font-size:15px">Acceder au Dashboard</a>
            </td></tr>
            <tr><td style="text-align:center;padding:0 0 8px">
              <a href="${baseUrl}/meteo" style="color:#8b5cf6;text-decoration:none;font-size:13px">Voir la page meteo publique &rarr;</a>
            </td></tr>
          </table>

        </td></tr>

        <!-- Footer -->
        <tr><td style="border-top:1px solid rgba(255,255,255,0.06);padding:20px 24px;text-align:center">
          <img src="${synauraLogo}" alt="Synaura" width="100" height="20" style="display:inline-block;opacity:.6;margin-bottom:8px"/><br/>
          <span style="color:rgba(255,255,255,0.25);font-size:11px">
            Alertemps V3.5 &bull; Integre a Synaura<br/>
            <a href="mailto:contact.syn@synaura.fr" style="color:#8b5cf6;text-decoration:none">contact.syn@synaura.fr</a>
          </span>
        </td></tr>

      </table>
    </div>`;

    const transporter = await getTransport();
    const from = process.env.SMTP_FROM || 'Synaura <no-reply@synaura.fr>';
    const replyTo = process.env.SMTP_REPLY_TO || 'Synaura <contact.syn@synaura.fr>';

    const alertempsLogoPath = path.join(process.cwd(), 'public', 'images', 'alertemps-logo.png');
    const synauraLogoPath = path.join(process.cwd(), 'public', 'synaura_logotype.png');

    const attachments = [
      { filename: 'alertemps-logo.png', path: alertempsLogoPath, cid: 'alertemps-logo', contentType: 'image/png' },
      { filename: 'synaura_logotype.png', path: synauraLogoPath, cid: 'synaura-logo', contentType: 'image/png' },
    ];

    await transporter.sendMail({
      from,
      replyTo,
      to: 'vermeulenmaxime50@gmail.com',
      subject: 'Alertemps V3.5 — Nouveau Dashboard & Nouvelles Fonctionnalites',
      html,
      attachments,
    });

    return NextResponse.json({ success: true, message: 'Email envoye' });
  } catch (e: any) {
    console.error('Erreur envoi email presentation:', e);
    return NextResponse.json({ error: e.message || 'Erreur envoi' }, { status: 500 });
  }
}
