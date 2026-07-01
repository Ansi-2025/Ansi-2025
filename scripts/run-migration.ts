import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';
import * as path from 'path';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseServiceKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function runMigration(filePath) {
  try {
    const sql = fs.readFileSync(filePath, 'utf-8');
    
    console.log('Executando migration:', path.basename(filePath));
    console.log('SQL:', sql.substring(0, 200) + '...\n');
    
    const { error } = await supabase.rpc('exec_sql', { sql_query: sql }).catch(async () => {
      // Se rpc não funcionar, vamos tentar de outra forma
      // Supabase não expõe exec_sql diretamente via cliente JS
      // Precisamos de um endpoint customizado
      throw new Error('RPC exec_sql não disponível. Use Supabase CLI ou painel.');
    });
    
    if (error) {
      console.error('Erro ao executar migration:', error.message);
      return false;
    }
    
    console.log('✓ Migration executada com sucesso!');
    return true;
  } catch (error) {
    console.error('Erro:', error.message);
    return false;
  }
}

async function main() {
  const migrationFile = './supabase/migrations/20260630240000_fix_pedido_status_enum.sql';
  await runMigration(migrationFile);
}

main();
