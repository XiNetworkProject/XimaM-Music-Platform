const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function createAIGenerationsTable() {
  console.log('🚀 Vérification de la table ai_generations...\n');

  try {
    // 1. Vérifier si la table existe
    console.log('🔍 Vérification de la table...');
    const { error: checkError } = await supabase
      .from('ai_generations')
      .select('id')
      .limit(1);

    if (checkError && checkError.code === 'PGRST205') {
      console.log('❌ Table ai_generations n\'existe pas, création manuelle requise');
      console.log('\n📋 Instructions :');
      console.log('1. Allez sur https://supabase.com');
      console.log('2. Ouvrez votre projet');
      console.log('3. Allez dans "SQL Editor"');
      console.log('4. Exécutez ce code :');
      console.log(`
CREATE TABLE IF NOT EXISTS public.ai_generations (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    audio_url TEXT NOT NULL,
    prompt TEXT NOT NULL,
    duration INTEGER NOT NULL DEFAULT 30,
    model VARCHAR(50) NOT NULL DEFAULT 'audiocraft',
    style VARCHAR(50),
    quality VARCHAR(20) DEFAULT '256kbps',
    status VARCHAR(20) DEFAULT 'pending',
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_ai_generations_user_id ON ai_generations(user_id);
CREATE INDEX IF NOT EXISTS idx_ai_generations_created_at ON ai_generations(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_ai_generations_status ON ai_generations(status);

ALTER TABLE ai_generations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own ai generations" ON ai_generations
    FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "Users can create own ai generations" ON ai_generations
    FOR INSERT WITH CHECK (auth.uid() = user_id);
      `);
      return;
    }

    // 2. Vérifier que la table existe
    console.log('🔍 Vérification des données...');
    const { data: generations, error: generationsError } = await supabase
      .from('ai_generations')
      .select('id, user_id, prompt, created_at')
      .limit(5);

    if (generationsError) {
      console.error('❌ Erreur:', generationsError);
      return;
    }

    console.log(`✅ Table ai_generations existe !`);
    console.log(`📊 ${generations.length} générations trouvées:`);
    generations.forEach(gen => {
      console.log(`   - ${gen.prompt.substring(0, 30)}... (${gen.created_at})`);
    });

    // 3. Test de l'endpoint de génération
    console.log('\n🧪 Test de l\'endpoint de génération...');
    try {
      const testResponse = await fetch('http://localhost:3000/api/ai/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          prompt: 'Test de génération',
          duration: 30,
          style: 'pop'
        })
      });
      
      if (testResponse.ok) {
        const testData = await testResponse.json();
        console.log('✅ Endpoint de génération fonctionne !');
        console.log(`   📊 ID: ${testData.id}, URL: ${testData.audioUrl}`);
      } else {
        const errorData = await testResponse.json();
        console.log(`⚠️ Endpoint de génération: ${errorData.error}`);
      }
    } catch (e) {
      console.log('⚠️ Application non lancée ou endpoint non accessible');
    }

  } catch (error) {
    console.error('❌ Erreur générale:', error);
  }
}

// Exécuter si appelé directement
if (require.main === module) {
  createAIGenerationsTable();
}

module.exports = { createAIGenerationsTable };
