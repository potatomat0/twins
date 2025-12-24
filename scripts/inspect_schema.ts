import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://gkbcdqpkjxdjjgolvgeg.supabase.co';
const serviceKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdrYmNkcXBranhkampnb2x2Z2VnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc1NzM1NjU5NCwiZXhwIjoyMDcyOTMyNTk0fQ.Exxt1zhg8qnNv260sJPefLrwdFf-XqB4QtAdm2EotO8';

const supabase = createClient(supabaseUrl, serviceKey);

async function run() {
  console.log('--- TABLES & COLUMNS ---');
  const { data: tables, error: tableError } = await supabase
    .from('information_schema.tables')
    .select('table_name')
    .eq('table_schema', 'public');

  if (tableError) {
    console.error('Error fetching tables:', tableError);
    return;
  }

  if (!tables) return;

  for (const t of tables) {
    console.log(`
Table: ${t.table_name}`);
    const { data: columns } = await supabase
      .from('information_schema.columns')
      .select('column_name, data_type, is_nullable, column_default')
      .eq('table_schema', 'public')
      .eq('table_name', t.table_name)
      .order('ordinal_position');
    
    if (columns) {
        columns.forEach(c => {
            console.log(`  - ${c.column_name} (${c.data_type}, ${c.is_nullable === 'YES' ? 'null' : 'not null'}) default: ${c.column_default}`);
        });
    }
  }

  console.log('\n--- VIEWS ---');
   const { data: views } = await supabase
    .from('information_schema.views')
    .select('table_name')
    .eq('table_schema', 'public');
    
    if (views) {
        views.forEach(v => console.log(`  - ${v.table_name}`));
    }
}

run();
