import { GoogleGenerativeAI } from "@google/generative-ai";

const API_KEY = import.meta.env.VITE_GEMINI_API_KEY || "";
const genAI = new GoogleGenerativeAI(API_KEY);

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

  if (!API_KEY) {
    return fallbackData;
  }

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
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

    const result = await model.generateContent(prompt);
    const text = result.response.text();
    const match = text.match(/\\{[\\s\\S]*\\}/);
    if (match) {
      return JSON.parse(match[0]);
    }
    return JSON.parse(text);
  } catch (error) {
    console.error("Gemini API error:", error);
    return fallbackData;
  }
}

export async function generateComplexAnalyticsReport(promptText: string) {
  if (!API_KEY) {
    return `مرحباً، أنا زينيث AI.
بناءً على الأرقام، أنت تبلي بلاءً حسناً هذا الشهر مقارنةً بالشهور السابقة.
نقاط قوتك هي التزامك في أيام العمل، ونقاط الضعف تكمن في عطلات نهاية الأسبوع.
نصيحتي: حاول تجهيز بيئتك لليوم التالي لتقليل الاحتكاك عند أداء العادات.
(أضف مفتاح VITE_GEMINI_API_KEY للحصول على تقرير ذكاء اصطناعي مفصل ودقيق!)`;
  }

  try {
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });
    const result = await model.generateContent(promptText);
    const response = await result.response;
    return response.text();
  } catch (error) {
    console.error("Gemini API error:", error);
    return "حدث خطأ أثناء الاتصال بالذكاء الاصطناعي. يرجى المحاولة لاحقاً.";
  }
}
