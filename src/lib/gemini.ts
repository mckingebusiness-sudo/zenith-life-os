import { GoogleGenerativeAI } from "@google/generative-ai";

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY || "";
const genAI = new GoogleGenerativeAI(API_KEY);

// Mistral API as reliable fallback when Gemini key is not configured.
// SECURITY: never hardcode the key in the client bundle. Provide it via
// VITE_MISTRAL_API_KEY in your .env / .env.local (and in your deploy env).
const MISTRAL_API_KEY = import.meta.env.VITE_MISTRAL_API_KEY || "";

async function callMistralAPI(prompt: string, responseFormat?: "json"): Promise<string> {
  if (!MISTRAL_API_KEY) {
    throw new Error("Mistral API key is not configured (VITE_MISTRAL_API_KEY).");
  }

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 60000);
  
  try {
    const res = await fetch("https://api.mistral.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${MISTRAL_API_KEY}`,
      },
      signal: controller.signal,
      body: JSON.stringify({
        model: "mistral-large-latest",
        messages: [
          { role: "user", content: prompt },
        ],
        temperature: 0.7,
        max_tokens: 1500,
        top_p: 0.9,
        ...(responseFormat === "json" ? { response_format: { type: "json_object" } } : {}),
      }),
    });

    if (!res.ok) throw new Error(`Mistral HTTP ${res.status}`);
    const data = await res.json();
    return data.choices?.[0]?.message?.content ?? "";
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function generateMoodAnalysis(habitsData: any) {
  const fallbackData = {
    mood: {
      happy: "تنجز عاداتك بمتوسط 85%",
      tired: "أداؤك ينخفض بنسبة 60%",
      advice: "نصيحة: قلل عدد العادات الإلزامي في أيام التعب للحفاظ على السلسلة!"
    },
    time: {
      morning: 70,
      afternoon: 15,
      evening: 15,
      advice: "أنت شخص \"صباحي\"! حاول إنجاز أهم عاداتك قبل الساعة 10 صباحاً لضمان أعلى نسبة نجاح."
    }
  };

  const prompt = `أنت مساعد ذكي مدمج في تطبيق تتبع العادات (Zenith Life OS). 
قم بتحليل بيانات العادات والمزاج التالية للمستخدم وقدم إحصائيات واقعية وتخيلية ذكية لتأثير المزاج وأفضل وقت لإنجاز العادات بناءً على البيانات.
يجب أن تعيد الإجابة بصيغة JSON فقط، بدون أي نصوص إضافية، بالشكل التالي:
{
  "mood": {
    "happy": "نص قصير جدا يعبر عن نسبة الإنجاز في أيام السعادة والنشاط",
    "tired": "نص قصير جدا يعبر عن نسبة الإنجاز في أيام الإرهاق",
    "advice": "نصيحة عملية واحدة قصيرة عن المزاج"
  },
  "time": {
    "morning": نسبة مئوية (رقم صحيح),
    "afternoon": نسبة مئوية (رقم صحيح),
    "evening": نسبة مئوية (رقم صحيح),
    "advice": "نصيحة عملية بناء على أفضل وقت لك"
  }
}
مجموع morning و afternoon و evening يجب أن يكون 100.

بيانات المستخدم:
${JSON.stringify(habitsData, null, 2)}`;

  // Try Gemini first, then Mistral fallback
  if (API_KEY) {
    try {
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      const result = await model.generateContent(prompt);
      const text = result.response.text();
      const match = text.match(/\{[\s\S]*\}/);
      if (match) {
        return JSON.parse(match[0]);
      }
      return JSON.parse(text);
    } catch (error) {
      console.error("Gemini API error, falling back to Mistral:", error);
    }
  }

  // Mistral fallback
  try {
    const text = await callMistralAPI(prompt, "json");
    const match = text.match(/\{[\s\S]*\}/);
    if (match) {
      return JSON.parse(match[0]);
    }
    return JSON.parse(text);
  } catch (error) {
    console.error("Mistral API error:", error);
    return fallbackData;
  }
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timeoutId: ReturnType<typeof setTimeout>;
  const timeoutPromise = new Promise<T>((_, reject) => {
    timeoutId = setTimeout(() => reject(new Error("Timeout")), ms);
  });
  return Promise.race([
    promise.finally(() => clearTimeout(timeoutId)),
    timeoutPromise
  ]);
}

export async function generateComplexAnalyticsReport(promptText: string) {
  // Try Gemini first if key exists
  if (API_KEY) {
    try {
      const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
      const result = await withTimeout(model.generateContent(promptText), 60000) as any;
      const response = await result.response;
      return response.text();
    } catch (error) {
      console.error("Gemini API error, falling back to Mistral:", error);
    }
  }

  // Mistral fallback — always available
  try {
    const text = await withTimeout(callMistralAPI(promptText), 60000);
    return text;
  } catch (error) {
    console.error("Mistral API error:", error);
    throw new Error("حدث خطأ أثناء الاتصال بالذكاء الاصطناعي.");
  }
}
