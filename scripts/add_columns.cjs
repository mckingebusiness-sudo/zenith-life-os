const https = require('https');

const SUPABASE_URL = 'https://vkhwywnyehinjxadzcca.supabase.co';
const ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZraHd5d255ZWhpbmp4YWR6Y2NhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAxOTA1NTAsImV4cCI6MjA5NTc2NjU1MH0.Hej3h_MbrPLwWKvgg-l9z1A6H138nzlSaEvM7h-4tO0';

// Try using Supabase Management API to run SQL
// First let's try via the pg REST API
function makeRequest(path, method, body) {
  return new Promise((resolve, reject) => {
    const bodyStr = body ? JSON.stringify(body) : null;
    const options = {
      hostname: 'vkhwywnyehinjxadzcca.supabase.co',
      path,
      method,
      headers: {
        'apikey': ANON_KEY,
        'Authorization': `Bearer ${ANON_KEY}`,
        'Content-Type': 'application/json',
        'Prefer': 'return=representation',
      }
    };
    if (bodyStr) options.headers['Content-Length'] = Buffer.byteLength(bodyStr);

    const req = https.request(options, res => {
      let d = '';
      res.on('data', c => d += c);
      res.on('end', () => resolve({ status: res.statusCode, body: d }));
    });
    req.on('error', reject);
    if (bodyStr) req.write(bodyStr);
    req.end();
  });
}

async function main() {
  // Try inserting a test habit with habit_type to see current state
  console.log('Testing current DB columns...');
  
  // Test 1: Can we insert with habit_type?
  const testInsert = await makeRequest('/rest/v1/habits', 'POST', {
    title: '__column_test__',
    icon: '🧪',
    color: 'green',
    cadence: 'daily',
    target_per_period: 1,
    active_weekdays: [0,1,2,3,4,5,6],
    grace_days: 0,
    is_private: false,
    sort_order: 9999,
    user_id: '00000000-0000-0000-0000-000000000000',
    habit_type: 'good',
  });
  
  console.log('Insert with habit_type status:', testInsert.status);
  console.log('Response:', testInsert.body.substring(0, 300));
}

main().catch(console.error);
