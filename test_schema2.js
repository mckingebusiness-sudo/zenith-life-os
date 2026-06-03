async function test() {
  const url = 'https://vkhwywnyehinjxadzcca.supabase.co/rest/v1/?apikey=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZraHd5d255ZWhpbmp4YWR6Y2NhIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODAxOTA1NTAsImV4cCI6MjA5NTc2NjU1MH0.Hej3h_MbrPLwWKvgg-l9z1A6H138nzlSaEvM7h-4tO0';
  const res = await fetch(url);
  const data = await res.json();
  console.log(Object.keys(data));
  console.log(JSON.stringify(data.definitions?.habits, null, 2));
}

test();
