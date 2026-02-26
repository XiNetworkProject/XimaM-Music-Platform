import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/authOptions';
import { supabaseAdmin } from '@/lib/supabase';

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Non authentifié' }, { status: 401 });
    }

    const { audioUrl, publicId, title, duration, fileName } = await request.json();
    if (!audioUrl || !publicId) {
      return NextResponse.json({ error: 'audioUrl et publicId requis' }, { status: 400 });
    }

    const generationId = crypto.randomUUID();
    const taskId = `upload_${Math.random().toString(36).slice(2, 10)}`;

    // Créer une "génération" Upload
    const cleanFileName = typeof fileName === 'string' && fileName.trim().length > 0 ? fileName.trim() : null;
    const displayTitle = (typeof title === 'string' && title.trim().length > 0 ? title.trim() : cleanFileName) || 'Audio uploadé';

    const generationData: any = {
      id: generationId,
      user_id: session.user.id,
      task_id: taskId,
      status: 'completed',
      is_public: false,
      model: 'UPLOAD',
      prompt: '',
      metadata: { title: displayTitle, customMode: true, upload: true, fileName: cleanFileName },
      created_at: new Date().toISOString(),
    };

    const { error: genErr } = await supabaseAdmin.from('ai_generations').insert(generationData);
    if (genErr) {
      console.error('❌ Erreur insertion generation upload:', genErr);
      return NextResponse.json({ error: genErr.message }, { status: 500 });
    }

    // Insérer la track associée
    const trackData: any = {
      generation_id: generationId,
      title: displayTitle,
      audio_url: audioUrl,
      stream_audio_url: audioUrl,
      image_url: null,
      duration: Math.round(Number(duration) || 0),
      prompt: '',
      model_name: 'UPLOAD',
      tags: [],
      style: null,
      lyrics: null,
      source_links: JSON.stringify({
        cloudinary_public_id: publicId,
        resource_type: 'video',
        original_file_name: cleanFileName,
      }),
    };

    const { data: inserted, error: trErr } = await supabaseAdmin.from('ai_tracks').insert(trackData).select('*').single();
    if (trErr) {
      console.error('❌ Erreur insertion track upload:', trErr);
      return NextResponse.json({ error: trErr.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, generationId, track: inserted });
  } catch (e: any) {
    console.error('❌ Erreur upload-source:', e);
    return NextResponse.json({ error: e.message || 'Erreur serveur' }, { status: 500 });
  }
}


