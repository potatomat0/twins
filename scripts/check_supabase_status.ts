const url = 'https://gkbcdqpkjxdjjgolvgeg.supabase.co/rest/v1/';
const key = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdrYmNkcXBranhkampnb2x2Z2VnIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTczNTY1OTQsImV4cCI6MjA3MjkzMjU5NH0.1vN3V6uGpmtVdo1GvMPUYOXtT_e96gnOrxJNaebbf98';

async function check() {
  try {
    console.log(`Checking ${url}...`);
    const res = await fetch(url, {
      headers: {
        'apikey': key,
        'Authorization': `Bearer ${key}`
      }
    });
    console.log(`Status: ${res.status} ${res.statusText}`);
    const text = await res.text();
    console.log('Body:', text.substring(0, 100));
  } catch (e) {
    console.error('Error:', e.message);
  }
}

check();
