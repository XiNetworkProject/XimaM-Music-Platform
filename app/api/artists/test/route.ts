import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/lib/supabase';
import { diagnosticsEnabled } from '@/lib/diagnostics';

export async function GET(request: NextRequest) {
  if (!diagnosticsEnabled()) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  try {
    console.log('🧪 Test API Artists - Début');
    
    // Test 1: Vérifier la connexion Supabase
    console.log('🔍 Test 1: Connexion Supabase');
    const { data: testData, error: testError } = await supabase
      .from('profiles')
      .select('id, username')
      .limit(1);
    
    if (testError) {
      console.error('❌ Erreur connexion Supabase:', testError);
      return NextResponse.json({ error: 'Erreur connexion Supabase', details: testError }, { status: 500 });
    }
    
    console.log('✅ Connexion Supabase OK, données:', testData);
    
    // Test 2: Vérifier la structure de la table profiles
    console.log('🔍 Test 2: Structure table profiles');
    const { data: columnsData, error: columnsError } = await supabase
      .from('profiles')
      .select('*')
      .limit(1);
    
    if (columnsError) {
      console.error('❌ Erreur structure profiles:', columnsError);
      return NextResponse.json({ error: 'Erreur structure profiles', details: columnsError }, { status: 500 });
    }
    
    console.log('✅ Structure profiles OK, colonnes disponibles:', Object.keys(columnsData[0] || {}));
    
    // Test 3: Vérifier la table tracks
    console.log('🔍 Test 3: Table tracks');
    const { data: tracksData, error: tracksError } = await supabase
      .from('tracks')
      .select('id, creator_id')
      .limit(1);
    
    if (tracksError) {
      console.error('❌ Erreur table tracks:', tracksError);
      return NextResponse.json({ error: 'Erreur table tracks', details: tracksError }, { status: 500 });
    }
    
    console.log('✅ Table tracks OK, données:', tracksData);
    
    return NextResponse.json({
      success: true,
      message: 'Tous les tests sont passés',
      profiles: testData,
      tracks: tracksData,
      profileColumns: Object.keys(columnsData[0] || {})
    });
    
  } catch (error) {
    console.error('❌ Erreur générale test API:', error);
    return NextResponse.json(
      { error: 'Erreur générale test API', details: error },
      { status: 500 }
    );
  }
}
