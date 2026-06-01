import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.VITE_SUPABASE_URL, process.env.VITE_SUPABASE_ANON_KEY);

async function test() {
  // 1. login as the user or just insert? Wait, we can't insert without auth unless RLS is off or we use service_role.
  // We don't have service_role key.
  // We can try to authenticate? We don't have user's email/pass.
  // BUT we can use the supabase REST API to check the table schema using Swagger / openapi!
  const res = await fetch(`${process.env.VITE_SUPABASE_URL}/rest/v1/?apikey=${process.env.VITE_SUPABASE_ANON_KEY}`);
  const data = await res.json();
  console.log(JSON.stringify(data.definitions.habits, null, 2));
}

test();
