const https = require('https');

const url = 'https://vkhwywnyehinjxadzcca.supabase.co/rest/v1/?apikey=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZraHd5d255ZWhpbmp4YWR6Y2NhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAxOTA1NTAsImV4cCI6MjA5NTc2NjU1MH0.Hej3h_MbrPLwWKvgg-l9z1A6H138nzlSaEvM7h-4tO0';

https.get(url, (res) => {
  let data = '';
  res.on('data', chunk => data += chunk);
  res.on('end', () => {
    const json = JSON.parse(data);
    console.log(JSON.stringify(json.definitions.habits.properties, null, 2));
  });
});
