const https = require('https');

const url = 'https://vkhwywnyehinjxadzcca.supabase.co/rest/v1/habits';
const anonKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZraHd5d255ZWhpbmp4YWR6Y2NhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAxOTA1NTAsImV4cCI6MjA5NTc2NjU1MH0.Hej3h_MbrPLwWKvgg-l9z1A6H138nzlSaEvM7h-4tO0';

const data = JSON.stringify({
  user_id: 'dummy-user-id', // RLS will likely fail this, but we will see the error message!
  title: 'Test Habit',
  cadence: 'daily',
  target_per_period: 1,
  active_weekdays: '{0,1,2,3,4,5,6}',
  grace_days: 0,
  icon: '✨',
  color: 'green',
  is_private: false,
  sort_order: 0
});

const options = {
  method: 'POST',
  headers: {
    'apikey': anonKey,
    'Authorization': `Bearer ${anonKey}`,
    'Content-Type': 'application/json',
    'Prefer': 'return=representation'
  }
};

const req = https.request(url, options, (res) => {
  let chunks = '';
  res.on('data', d => chunks += d);
  res.on('end', () => console.log('Response:', res.statusCode, chunks));
});

req.on('error', console.error);
req.write(data);
req.end();
