const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '..', '.env.local') });
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceKey) {
  console.error('Variables Supabase manquantes: NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceKey, {
  auth: { autoRefreshToken: false, persistSession: false },
});

async function main() {
  const sqlPath = path.join(__dirname, 'create_editorial_collections_table.sql');
  const sql = fs.readFileSync(sqlPath, 'utf8');
  const { error } = await supabase.rpc('exec_sql', { sql });

  if (error) {
    console.error('Migration non appliquee via exec_sql.');
    console.error(error.message || error);
    console.error('\nexec_sql n est pas disponible sur ce projet Supabase.');
    console.error(`Copie le SQL depuis ${sqlPath} dans Supabase Dashboard > SQL Editor.`);
    process.exitCode = 1;
    return;
  }

  const { error: verifyError } = await supabase
    .from('editorial_collections')
    .select('id')
    .limit(1);

  if (verifyError) {
    console.error('Table creee mais verification impossible:', verifyError.message || verifyError);
    process.exitCode = 1;
    return;
  }

  console.log('Migration editorial_collections appliquee.');
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
