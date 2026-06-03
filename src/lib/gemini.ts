import { supabase } from "./supabase";

export async function generateMoodAnalysis(habitsData: any) {
  try {
    const prompt = `Analyze this user's habits and daily mood, and provide a short JSON response exactly in this format:
    {
      "mood": { "happy": "String observation about happy days", "tired": "String observation about tired days", "advice": "Short advice string" },
      "time": { "morning": Number (0-100), "afternoon": Number (0-100), "evening": Number (0-100), "advice": "Short advice string" }
    }
    
    Data:
    ${JSON.stringify(habitsData)}
    
    Respond ONLY with valid JSON. Do not include markdown formatting like \`\`\`json.`;

    const { data, error } = await supabase.functions.invoke('analyze-habits', {
      body: { prompt }
    });
    
    if (error) throw error;
    if (data?.choices?.[0]?.message?.content) {
      try {
        const parsed = JSON.parse(data.choices[0].message.content.trim());
        return parsed;
      } catch (parseError) {
        console.error("Failed to parse AI JSON response:", data.choices[0].message.content);
        return null;
      }
    }
  } catch (error) {
    console.error("AI Edge function error:", error);
  }
  return null;
}

export async function generateComplexAnalyticsReport(promptText: string) {
  try {
    const { data, error } = await supabase.functions.invoke('analyze-habits', {
      body: { prompt: promptText }
    });
    
    if (error) throw error;
    
    // Extract the text from Mistral API response format
    const resultText = data?.choices?.[0]?.message?.content;
    return resultText || "لم يتم استلام تقرير.";
  } catch (error) {
    console.error("AI Edge function error:", error);
    throw new Error("حدث خطأ أثناء الاتصال بالذكاء الاصطناعي.");
  }
}

export async function generateDashboardInsight(habitsData: any) {
  try {
    const prompt = `أنت مساعد شخصي ذكي في تطبيق Zenith Life OS.
بناءً على هذه البيانات، أعطني استنتاج أو نصيحة واحدة فقط، دقيقة ومباشرة ومبنية على الأرقام المعطاة (سطر واحد كحد أقصى).
البيانات:
${JSON.stringify(habitsData)}

اكتب النصيحة باللغة العربية فقط، بدون أي مقدمات أو تنسيق إضافي أو علامات اقتباس.`;

    const { data, error } = await supabase.functions.invoke('analyze-habits', {
      body: { prompt }
    });
    
    if (error) throw error;
    return data?.choices?.[0]?.message?.content?.trim() || null;
  } catch (error) {
    console.error("AI Edge function error:", error);
  }
  return null;
}

