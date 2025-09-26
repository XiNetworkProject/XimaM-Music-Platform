import { NextRequest, NextResponse } from 'next/server';
import { supabaseAdmin } from '@/lib/supabase';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';

export const dynamic = 'force-dynamic';

type CountMap = Record<string, number>;

function topN(map: CountMap, n: number): string[] {
  return Object.entries(map)
    .sort((a, b) => b[1] - a[1])
    .slice(0, n)
    .map(([k]) => k)
    .filter(Boolean);
}

export async function GET(_req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    // Suggestions par défaut si non connecté
    if (!session?.user?.id) {
      return NextResponse.json({
        styles: ['pop', 'electronic', 'hip hop', 'lo-fi', 'house', 'ambient'],
        tags: ['catchy beats', 'emotional', 'dramatic builds', 'fast guitar', 'breathy vocals'],
      });
    }

    const userId = session.user.id as string;

    // Compteurs
    const styleCounts: CountMap = {};
    const tagCounts: CountMap = {};

    // 1) Historique IA de l'utilisateur: styles + tags depuis ai_tracks
    const { data: aiData, error: aiErr } = await supabaseAdmin
      .from('ai_tracks')
      .select(`
        style,
        tags,
        generation:ai_generations!inner(user_id)
      `)
      .eq('generation.user_id', userId)
      .order('created_at', { ascending: false })
      .limit(500);

    if (!aiErr && aiData) {
      for (const row of aiData as any[]) {
        const style: string | null = row.style || null;
        if (style) {
          // découper styles par virgules/espaces prudente
          style.split(/[,|]/).map((s: string) => s.trim().toLowerCase()).filter(Boolean).forEach((s: string) => {
            styleCounts[s] = (styleCounts[s] || 0) + 1;
          });
        }
        const tags: string[] | null = Array.isArray(row.tags) ? row.tags : null;
        if (tags) {
          tags.map((t: string) => (t || '').trim().toLowerCase()).filter(Boolean).forEach((t: string) => {
            tagCounts[t] = (tagCounts[t] || 0) + 1;
          });
        }
      }
    }

    // 2) Historique d'écoutes récentes (optionnel): récupérer derniers track_views et genres associés
    const { data: views, error: viewsErr } = await supabaseAdmin
      .from('track_views')
      .select('track_id')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
      .limit(200);

    if (!viewsErr && views && views.length) {
      const ids = Array.from(new Set(views.map((v: any) => v.track_id))).slice(0, 100);
      if (ids.length) {
        const { data: tracks, error: tracksErr } = await supabaseAdmin
          .from('tracks')
          .select('genre, style')
          .in('id', ids);
        if (!tracksErr && tracks) {
          for (const t of tracks as any[]) {
            const genreArr: string[] = Array.isArray(t.genre) ? t.genre : [];
            for (const g of genreArr) {
              const key = (g || '').toLowerCase();
              if (key) styleCounts[key] = (styleCounts[key] || 0) + 1;
            }
            const st = (t.style || '').toLowerCase();
            if (st) styleCounts[st] = (styleCounts[st] || 0) + 1;
          }
        }
      }
    }

    // 3) Popularité globale récente (30 jours)
    const since = new Date();
    since.setDate(since.getDate() - 30);
    const { data: globalAI, error: globalErr } = await supabaseAdmin
      .from('ai_tracks')
      .select('style,tags,created_at')
      .gte('created_at', since.toISOString())
      .order('created_at', { ascending: false })
      .limit(1000);

    const globalStyleCounts: CountMap = {};
    const globalTagCounts: CountMap = {};
    if (!globalErr && globalAI) {
      for (const row of globalAI as any[]) {
        const st: string | null = row.style || null;
        if (st) {
          st.split(/[,|]/).map((s: string) => s.trim().toLowerCase()).filter(Boolean).forEach((s: string) => {
            globalStyleCounts[s] = (globalStyleCounts[s] || 0) + 1;
          });
        }
        const tg: string[] | null = Array.isArray(row.tags) ? row.tags : null;
        if (tg) {
          tg.map((t: string) => (t || '').trim().toLowerCase()).filter(Boolean).forEach((t: string) => {
            globalTagCounts[t] = (globalTagCounts[t] || 0) + 1;
          });
        }
      }
    }

    // Combiner: score = 2*perso + 1*global
    const combinedStyle: CountMap = { ...globalStyleCounts };
    for (const k in styleCounts) {
      combinedStyle[k] = (combinedStyle[k] || 0) + 2 * styleCounts[k];
    }
    const combinedTags: CountMap = { ...globalTagCounts };
    for (const k in tagCounts) {
      combinedTags[k] = (combinedTags[k] || 0) + 2 * tagCounts[k];
    }

    const styles = topN(combinedStyle, 12);
    const tags = topN(combinedTags, 12);

    // fallback si vides
    const fallbackStyles = ['pop', 'electronic', 'hip hop', 'lo-fi', 'house', 'ambient'];
    const fallbackTags = ['catchy beats', 'emotional', 'dramatic builds', 'fast guitar', 'breathy vocals'];

    return NextResponse.json({
      styles: styles.length ? styles : fallbackStyles,
      tags: tags.length ? tags : fallbackTags,
    });
  } catch (e: any) {
    return NextResponse.json({
      styles: ['pop', 'electronic', 'hip hop', 'lo-fi', 'house', 'ambient'],
      tags: ['catchy beats', 'emotional', 'dramatic builds', 'fast guitar', 'breathy vocals'],
      error: e?.message || 'Erreur',
    });
  }
}


