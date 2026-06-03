import { serve } from "https://deno.land/std@0.168.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.3'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }



  try {
    // 1. Verify user authentication
    const authHeader = req.headers.get('Authorization')
    if (!authHeader) {
      throw new Error("Missing Authorization header")
    }

    const supabaseClient = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_ANON_KEY') ?? '',
      { global: { headers: { Authorization: authHeader } } }
    )

    const { data: { user }, error: authError } = await supabaseClient.auth.getUser()
    
    if (authError || !user) {
      throw new Error("Unauthorized: Invalid JWT")
    }

    const body = await req.json()
    const { prompt, day_local } = body
    
    if (!prompt) {
      throw new Error("Missing prompt")
    }

    const apiKey = Deno.env.get('MISTRAL_API_KEY')
    if (!apiKey) {
      throw new Error("Missing MISTRAL_API_KEY environment variable")
    }

    // Support both raw prompt string and structured {system, messages} JSON
    let mistralMessages: { role: string; content: string }[];
    try {
      const parsed = typeof prompt === "string" ? JSON.parse(prompt) : prompt;
      if (parsed.system && Array.isArray(parsed.messages)) {
        mistralMessages = [
          { role: "system", content: parsed.system },
          ...parsed.messages,
        ];
      } else {
        mistralMessages = [{ role: "user", content: typeof prompt === "string" ? prompt : JSON.stringify(prompt) }];
      }
    } catch {
      // Raw string prompt fallback
      mistralMessages = [{ role: "user", content: String(prompt) }];
    }

    const res = await fetch("https://api.mistral.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: "mistral-large-latest",
        messages: mistralMessages,
        temperature: 0.78,
        max_tokens: 1200,
        top_p: 0.92,
      }),
    });

    if (!res.ok) {
      const errorText = await res.text();
      throw new Error(`Mistral API error: ${res.status} ${errorText}`);
    }

    const data = await res.json();

    const aiResponseContent = data.choices?.[0]?.message?.content || "";
    const targetDayLocal = day_local || new Date().toISOString().split('T')[0];

    try {
      const { data: currentUsage } = await supabaseClient
        .from('daily_ai_usage')
        .select('usage_count')
        .eq('user_id', user.id)
        .eq('day_local', targetDayLocal)
        .maybeSingle();

      const count = (currentUsage?.usage_count || 0) + 1;

      await supabaseClient
        .from('daily_ai_usage')
        .upsert({
          user_id: user.id,
          day_local: targetDayLocal,
          usage_count: count,
          latest_report: aiResponseContent
        }, { onConflict: 'user_id,day_local' });
    } catch (dbErr) {
      console.error("Failed to log AI usage:", dbErr);
    }

    return new Response(JSON.stringify(data), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })
  } catch (error: any) {
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 400,
    })
  }
})
