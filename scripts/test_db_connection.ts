import { Client } from 'pg';

const passwords = [
  'Matkhausupabase1!',
  'matkhausupabase',
  'Matkhautwins1!'
];

const host = 'db.gkbcdqpkjxdjjgolvgeg.supabase.co';
const port = 5432;
const user = 'postgres';
const database = 'postgres';

async function testConnection(password: string) {
  const client = new Client({
    host,
    port,
    user,
    password,
    database,
    ssl: { rejectUnauthorized: false } // Required for Supabase
  });

  try {
    await client.connect();
    console.log(`✅ Success! Password is: ${password}`);
    await client.end();
    return password;
  } catch (err) {
    console.log(`❌ Failed: ${password} - ${err.message}`);
    await client.end();
    return null;
  }
}

async function main() {
  console.log('Testing database connections...');
  for (const pwd of passwords) {
    const success = await testConnection(pwd);
    if (success) {
      console.log('\n--- RESULT ---');
      console.log(`Connection String: postgresql://postgres:${encodeURIComponent(success)}@${host}:${port}/${database}`);
      process.exit(0);
    }
  }
  console.error('All passwords failed.');
  process.exit(1);
}

main();
