import { Client } from 'pg';

const connectionString = 'postgresql://postgres:Matkhautwins1!@db.gkbcdqpkjxdjjgolvgeg.supabase.co:5432/postgres';

const client = new Client({
  connectionString,
  ssl: { rejectUnauthorized: false }
});

const tablesToCheck = ['profiles', 'matches', 'match_events', 'messages', 'notifications'];

async function inspect() {
  try {
    await client.connect();
    console.log('Connected to Database. Fetching Policies...\n');

    for (const table of tablesToCheck) {
      console.log(`--- TABLE: public.${table} ---`);
      
      const res = await client.query(`
        SELECT policyname, cmd, qual, with_check
        FROM pg_policies
        WHERE schemaname = 'public' AND tablename = $1
        ORDER BY policyname;
      `, [table]);

      if (res.rows.length === 0) {
        console.log('  (No policies found)');
      }

      res.rows.forEach(row => {
        console.log(`  Policy: ${row.policyname} (${row.cmd})`);
        console.log(`    USING:      ${row.qual}`);
        console.log(`    WITH CHECK: ${row.with_check}`);
      });
      console.log('');
    }

    // Check Indexes specifically for Performance
    console.log('\n--- INDEXES ---');
    const idxRes = await client.query(`
      SELECT tablename, indexname, indexdef
      FROM pg_indexes
      WHERE schemaname = 'public' 
      AND tablename = ANY($1)
      ORDER BY tablename, indexname;
    `, [tablesToCheck]);
    
    idxRes.rows.forEach(row => {
      console.log(`${row.tablename} -> ${row.indexname}`);
      // console.log(`  ${row.indexdef}`);
    });

  } catch (err) {
    console.error('Inspection error:', err);
  } finally {
    await client.end();
  }
}

inspect();
