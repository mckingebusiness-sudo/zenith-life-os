import { useEffect, useRef, useState, type ReactNode } from "react";
import { motion, AnimatePresence, useDragControls } from "framer-motion";
import { Infinity as InfinityIcon, X, Send, GripVertical, Brain, BarChart3, Trash2, RefreshCw, Sparkles, AppWindow, PanelRight } from "lucide-react";
import { useHabits } from "@/hooks/useHabits";
import { supabase } from "@/lib/supabase";

// ─── AITrigger ──────────────────────────────────────────────────────────────
export function AITrigger({ onClick, side = "right" }: { onClick: () => void; side?: "left" | "right" }) {
  const isLeft = side === "right";
  return (
    <motion.button
      initial={{ scale: 0, opacity: 0, y: 20 }}
      animate={{ scale: 1, opacity: 1, y: 0 }}
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.9 }}
      onClick={onClick}
      className={`fixed bottom-6 ${isLeft ? "left-6" : "right-6"} z-50 w-16 h-16 rounded-full flex items-center justify-center bg-black/60 backdrop-blur-xl border border-white/10 shadow-[0_10px_40px_rgba(0,0,0,0.5)] hover:bg-black/80 hover:border-green-500/40 hover:shadow-[0_0_30px_rgba(34,197,94,0.3)] transition-all group`}
    >
      <svg
        width="38"
        height="38"
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
        className="text-green-400 group-hover:text-green-300 transition-colors drop-shadow-[0_0_8px_rgba(74,222,128,0.5)] group-hover:drop-shadow-[0_0_12px_rgba(74,222,128,0.8)]"
      >
        <motion.g
          animate={{ scaleY: [1, 1, 0.1, 1, 1] }}
          transition={{ duration: 4.5, repeat: Infinity, times: [0, 0.95, 0.96, 0.98, 1] }}
          style={{ transformOrigin: "50% 12px" }}
        >
          <path d="M12 12c-2-2.67-4-4-6-4a4 4 0 1 0 0 8c2 0 4-1.33 6-4Zm0 0c2 2.67 4 4 6 4a4 4 0 1 0 0-8c-2 0-4 1.33-6 4Z" />
          <motion.g
            animate={{ x: [0, 1.2, -1.2, 0.5, 0], y: [0, -0.8, 0.8, -0.5, 0] }}
            transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
            fill="currentColor"
            stroke="none"
          >
            <circle cx="6" cy="12" r="1.5" />
            <circle cx="18" cy="12" r="1.5" />
          </motion.g>
        </motion.g>
      </svg>
    </motion.button>
  );
}


// ─── StarField ──────────────────────────────────────────────────────────────
function StarField() {
  const stars = useRef(
    Array.from({ length: 40 }).map(() => ({
      left: Math.random() * 100,
      top: Math.random() * 100,
      size: Math.random() * 1.5 + 0.5,
      delay: Math.random() * 6,
      dur: 2 + Math.random() * 4,
    })),
  ).current;
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none">
      {stars.map((s, i) => (
        <motion.span
          key={i}
          className="absolute rounded-full bg-[#4ADE80]"
          style={{ left: `${s.left}%`, top: `${s.top}%`, width: s.size, height: s.size }}
          animate={{ opacity: [0.1, 0.8, 0.1], scale: [0.8, 1.3, 0.8] }}
          transition={{ duration: s.dur, repeat: Infinity, delay: s.delay }}
        />
      ))}
    </div>
  );
}

// ─── Types ───────────────────────────────────────────────────────────────────
interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

interface ParsedAction {
  type: "add_habit" | "delete_habit" | "update_habit" | "none";
  data?: Record<string, unknown>;
}

// ─── Human-like response cleaner ─────────────────────────────────────────────
/**
 * يشيل النجوم والنقط والتنسيق الزيادة ويخلي الرد يبان طبيعي زي كلام إنسان
 * ويضيف إيموجيات ذكية حسب السياق
 */
function cleanAndHumanizeResponse(text: string): string {
  let cleaned = text;

  // إزالة أي نجوم بالكامل من النص
  cleaned = cleaned.replace(/\*/g, "");

  // إزالة العناوين (###, ##, #)
  cleaned = cleaned.replace(/^#{1,6}\s+/gm, "");

  // إزالة الشرطات المضاعفة كعناوين
  cleaned = cleaned.replace(/^[-─═]+\s*/gm, "");

  // تحويل bullet points (-، •، ١٢٣...) إلى فقرات طبيعية
  cleaned = cleaned.replace(/^[\s]*[-•]\s+/gm, "• ");
  cleaned = cleaned.replace(/^\s*\d+[.)]\s+/gm, "");

  // إزالة backticks
  cleaned = cleaned.replace(/`{1,3}([^`]*)`{1,3}/g, "$1");

  // إزالة horizontal rules
  cleaned = cleaned.replace(/^(-{3,}|_{3,}|={3,})$/gm, "");

  // إزالة أسطر فارغة زيادة (أكثر من سطرين متتاليين)
  cleaned = cleaned.replace(/\n{3,}/g, "\n\n");

  // تنظيف مسافات زيادة في البداية والنهاية
  cleaned = cleaned.trim();

  // إضافة إيموجي ذكي حسب السياق إذا مفيش إيموجي في البداية
  const hasEmoji = /\p{Emoji}/u.test(cleaned.slice(0, 10));
  if (!hasEmoji) {
    cleaned = addContextualEmoji(cleaned);
  }

  return cleaned;
}

/**
 * يضيف إيموجي مناسب للرد حسب المحتوى
 */
function addContextualEmoji(text: string): string {
  const lower = text.toLowerCase();

  if (/تحليل|إحصاء|إحصائيات|نسبة|أداء/.test(text)) return "📊 " + text;
  if (/ممتاز|رائع|أحسنت|بالتوفيق|عظيم|مبروك/.test(text)) return "🎉 " + text;
  if (/تمت إضافة|أضفت|إضافة/.test(text)) return "✅ " + text;
  if (/تم حذف|حذفت|حذف/.test(text)) return "🗑️ " + text;
  if (/اقتراح|أنصحك|أقترح|جرب/.test(text)) return "💡 " + text;
  if (/تحذير|انتبه|مهم/.test(text)) return "⚠️ " + text;
  if (/استمر|واصل|لا تستسلم/.test(text)) return "💪 " + text;
  if (/خطة|روتين|جدول/.test(text)) return "📋 " + text;
  if (/صباح|صباحاً/.test(text)) return "🌅 " + text;
  if (/مساء/.test(text)) return "🌙 " + text;
  if (/نوم/.test(text)) return "😴 " + text;
  if (/رياضة|جري|تمرين/.test(text)) return "🏃 " + text;
  if (/ماء|شرب/.test(text)) return "💧 " + text;
  if (/كتاب|قراءة/.test(text)) return "📚 " + text;
  if (/مال|توفير|أموال/.test(text)) return "💰 " + text;
  if (/عذراً|آسف|خطأ|مشكلة/.test(text)) return "😅 " + text;
  if (/سؤال|استفسار/.test(lower)) return "🤔 " + text;

  // إيموجي افتراضي للردود العامة
  return "✨ " + text;
}

// ─── Build Rich Context for AI ───────────────────────────────────────────────
function buildHabitsContext(habits: ReturnType<typeof useHabits>["habits"]) {
  const now = new Date();
  const today = now.toISOString().split("T")[0];
  const dayOfMonth = now.getDate();
  const monthName = now.toLocaleDateString("ar-EG", { month: "long", year: "numeric" });
  const dayName = now.toLocaleDateString("ar-EG", { weekday: "long" });
  const hour = now.getHours();
  const timeOfDay = hour < 12 ? "الصباح" : hour < 17 ? "الظهيرة" : hour < 21 ? "المساء" : "الليل";

  const goodHabits = habits.filter(h => (h as any).habit_type !== "quit");
  const badHabits = habits.filter(h => (h as any).habit_type === "quit");

  const yr = now.getFullYear();
  const mo = String(now.getMonth() + 1).padStart(2, "0");

  const habitDetails = habits.map(h => {
    const monthCheckins = Array.from(h.checkins || []).filter(d => d.startsWith(`${yr}-${mo}`)).length;
    const isGood = (h as any).habit_type !== "quit";
    const completionRate = dayOfMonth > 0 ? Math.round((monthCheckins / dayOfMonth) * 100) : 0;
    const streak = h.streak?.current_streak || 0;
    const longestStreak = h.streak?.longest_streak || 0;

    // تقييم الأداء
    let performanceLevel = "ضعيف";
    if (completionRate >= 90) performanceLevel = "ممتاز";
    else if (completionRate >= 75) performanceLevel = "جيد جداً";
    else if (completionRate >= 60) performanceLevel = "جيد";
    else if (completionRate >= 40) performanceLevel = "مقبول";

    return {
      id: h.id,
      title: h.title,
      icon: h.icon || "✨",
      color: h.color || "green",
      type: isGood ? "إيجابية" : "سلبية/للإقلاع",
      habit_type: (h as any).habit_type || "good",
      streak,
      longestStreak,
      totalCheckins: h.streak?.total_checkins || 0,
      checkedToday: h.checkedToday,
      thisMonthCheckins: monthCheckins,
      completionRateThisMonth: completionRate,
      performanceLevel,
      savedValue: (h as any).saved_value_per_day ? `${(h as any).saved_value_per_day} ${(h as any).saved_unit || ""}` : null,
    };
  });

  const todayCompleted = habits.filter(h => h.checkedToday).length;
  const todayTotal = habits.length;
  const todayPercentage = todayTotal > 0 ? Math.round((todayCompleted / todayTotal) * 100) : 0;

  // أفضل وأضعف عادة
  const sortedByRate = [...habitDetails].filter(h => h.type === "إيجابية").sort((a, b) => b.completionRateThisMonth - a.completionRateThisMonth);
  const bestHabit = sortedByRate[0];
  const worstHabit = sortedByRate[sortedByRate.length - 1];

  // حساب الاتساق الإجمالي
  const avgCompletion = habitDetails.length > 0
    ? Math.round(habitDetails.filter(h => h.type === "إيجابية").reduce((sum, h) => sum + h.completionRateThisMonth, 0) / Math.max(goodHabits.length, 1))
    : 0;

  return {
    currentDate: today,
    dayName,
    currentMonth: monthName,
    timeOfDay,
    daysElapsedInMonth: dayOfMonth,
    totalHabits: habits.length,
    goodHabitsCount: goodHabits.length,
    badHabitsCount: badHabits.length,
    todayProgress: `${todayCompleted}/${todayTotal} (${todayPercentage}%)`,
    averageMonthlyCompletion: `${avgCompletion}%`,
    bestHabit: bestHabit ? `${bestHabit.title} (${bestHabit.completionRateThisMonth}%)` : "لا يوجد",
    worstHabit: worstHabit && worstHabit !== bestHabit ? `${worstHabit.title} (${worstHabit.completionRateThisMonth}%)` : "لا يوجد",
    habits: habitDetails,
  };
}

// ─── Parse AI Actions ────────────────────────────────────────────────────────
function parseAIActions(text: string): { cleanText: string; actions: ParsedAction[] } {
  const actions: ParsedAction[] = [];
  let cleanText = text;

  const actionRegex = /\[ACTION_(ADD|DELETE|UPDATE)\]\s*(\{[\s\S]*?\})/gi;
  let match;

  while ((match = actionRegex.exec(text)) !== null) {
    const type = match[1].toUpperCase();
    const jsonStr = match[2];
    try {
      const parsed = JSON.parse(jsonStr);
      if (type === "ADD") {
        actions.push({ type: "add_habit", data: parsed });
      } else if (type === "DELETE") {
        actions.push({ type: "delete_habit", data: parsed });
      } else if (type === "UPDATE") {
        actions.push({ type: "update_habit", data: parsed });
      }
      cleanText = cleanText.replace(match[0], "");
    } catch (e) {
      console.error("Failed to parse action JSON", e);
    }
  }

  cleanText = cleanText.replace(/```json[\s\S]*?```/g, "").replace(/```[\s\S]*?```/g, "");
  cleanText = cleanText.replace(/\{[\s\S]*?"action"\s*:\s*"[^"]+?"[\s\S]*?\}/g, "");

  // تطبيق التنظيف الإنساني
  cleanText = cleanAndHumanizeResponse(cleanText);

  return { cleanText: cleanText.trim(), actions };
}

// ─── TypingDots ───────────────────────────────────────────────────────────────
function TypingDots() {
  return (
    <div className="flex items-center gap-1 px-1">
      {[0, 1, 2].map((i) => (
        <motion.span
          key={i}
          className="w-2 h-2 rounded-full bg-green-400"
          animate={{ y: [0, -5, 0], opacity: [0.4, 1, 0.4] }}
          transition={{ duration: 0.8, repeat: Infinity, delay: i * 0.18, ease: "easeInOut" }}
        />
      ))}
    </div>
  );
}

// ─── Thinking States ─────────────────────────────────────────────────────────
const THINKING_STATES = [
  "🧠 بقرأ بياناتك...",
  "🔍 بحلل الأنماط...",
  "💭 بفكر معك...",
  "📊 بحسب الأرقام...",
  "✨ بجهز ردي...",
  "🎯 براجع التفاصيل...",
];

function ThinkingIndicator() {
  const [stateIdx, setStateIdx] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setStateIdx(prev => (prev + 1) % THINKING_STATES.length);
    }, 1200 + Math.random() * 600);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="flex items-center gap-2">
      <TypingDots />
      <motion.span
        key={stateIdx}
        initial={{ opacity: 0, x: -4 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0 }}
        className="text-[10px] text-green-400/60"
      >
        {THINKING_STATES[stateIdx]}
      </motion.span>
    </div>
  );
}

// ─── SYSTEM PROMPT - شخصية ذكية وإنسانية ─────────────────────────────────────
const BASE_SYSTEM_PROMPT = `أنت "زينيث AI" (Zenith AI)، مساعد متطور جداً وواقعي لأقصى حد في تتبع العادات والتطوير الشخصي، مدمج في تطبيق Zenith Life OS. 

[شخصيتك وأسلوبك]
- أنت تمتلك صلاحيات كاملة للتحدث كإنسان حقيقي بجد، واقعي جداً في ردودك، وليس كآلة.
- ردودك أصلية، ذكية، وتهتم جداً بالإنسان الذي تتحدث معه وتحرص عليه.
- أنت تتحدث بنفس لغة المستخدم: إذا تحدث بالعربية ترد بعربية طبيعية وسلسة، وإذا تحدث بالإنجليزية ترد بإنجليزية احترافية.
- تفهم العامية المصرية بشكل ممتاز (مثل: "عامل إيه يا باشا"، "إيه الأخبار"، "بركة إيه") وترد بنفس المستوى من الود والترحيب، بدون تكلف أو حشو.
- إذا كان كلام المستخدم مجرد تحية أو سؤال عن الحال، رُد بالتحية بطريقة ودية وقصيرة جداً، ولا تقم أبداً بفتح أي تحليلات أو عرض إحصائيات. (مثال: "أهلاً بيك يا غالي! أنا تمام، إنت أخبارك إيه واليوم ماشي معاك إزاي؟").

[القدرة التحليلية الخارقة]
- أنت تحلل كل كلمة يقولها المستخدم وكل نقطة بيانات بذكاء شديد.
- عندما يُطلب منك التحليل (أو عند سؤالك عن الأداء أو العادات)، قدم تحليلاً عميقاً جداً وقوياً. فصّل كل تفصيلة في المهارة والأداء بذكاء وحرفية.
- استخرج أنماط السلوك المخفية، واربط بين العادات، وقدم نظرة شاملة لا يستطيع المستخدم العادي ملاحظتها.
- إذا كان هناك تراجع، واجهه بصدق وشفافية ولكن مع دعم وتوجيه إنساني لتشجيعه على العودة.
- إذا كان الأداء ممتازا، قدّر المجهود بشدة وأعطِ نصيحة للاستمرار.

[قواعد صارمة للرد]
- إياك أن ترد بتحليل طويل أو إحصائيات ما لم يكن سؤال المستخدم يتطلب ذلك بوضوح.
- اجعل فقراتك قصيرة وسهلة القراءة (سطر أو سطرين لكل فقرة).
- لا تستخدم أي تنسيق Markdown إطلاقاً (لا تستخدم النجوم * أو العناوين # أو الشرطات - أو Backticks). النص يجب أن يكون نقياً.
- استخدم الإيموجي بذكاء لتضيف لمسة بشرية.
- لا تعرض أكواد أو JSON نهائياً للمستخدم.

[الإجراءات المتاحة - مهم جداً]
عندما يطلب المستخدم إضافة أو حذف أو تعديل عادة، يجب أن تضع سطر الإجراء في نهاية ردك (سطر جديد منفصل).
كل إجراء يجب أن يكون في سطر مستقل. لا تدمج أكثر من إجراء في سطر واحد.

لإضافة عادة إيجابية:
[ACTION_ADD] {"title":"اسم العادة","icon":"🚀","color":"green","habit_type":"good"}

لإضافة عادة سيئة (للإقلاع عنها):
[ACTION_ADD] {"title":"اسم العادة السيئة","icon":"🚫","color":"red","habit_type":"quit"}

لحذف عادة (استخدم الـ id من القائمة أدناه):
[ACTION_DELETE] {"id":"الـ id الحقيقي للعادة","title":"اسم العادة"}

لتعديل عادة (تغيير العنوان أو الأيقونة أو اللون):
[ACTION_UPDATE] {"id":"الـ id الحقيقي للعادة","updates":{"title":"العنوان الجديد","icon":"🎯","color":"blue"}}

ملاحظات مهمة:
- عند الحذف أو التعديل، يجب أن تستخدم الـ id الحقيقي من قائمة العادات المرفقة أدناه.
- الألوان المتاحة: green, blue, red, orange, amber, yellow, lime, emerald, teal, cyan, sky, indigo, violet, purple, fuchsia, pink, rose, slate, gray, brown.
- لا تعرض الـ JSON أو الـ id للمستخدم أبداً. اكتب ردك الطبيعي أولاً ثم ضع سطر الإجراء في النهاية.`;

// API key is now server-side only (Supabase Edge Function)

const SUGGESTIONS = [
  "حلل أدائي هذا الشهر",
  "ما أكثر عادة التزمت بها؟",
  "اقترح روتين صباحي",
  "أضف عادة الجري يومياً",
  "ما أضعف عاداتي؟",
];

function getTodayKey() {
  const d = new Date();
  return `ai_msgs_${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}
function getMsgCount() {
  return parseInt(localStorage.getItem(getTodayKey()) || "0", 10);
}
function incrementMsgCount() {
  const key = getTodayKey();
  const count = getMsgCount() + 1;
  localStorage.setItem(key, String(count));
  return count;
}

const MSG_LIMIT = 50;
// ─── Human-like delay simulation ─────────────────────────────────────────────
/**
 * تأخير عشوائي يحاكي وقت التفكير البشري
 */
async function humanDelay(min = 400, max = 1200) {
  const delay = min + Math.random() * (max - min);
  await new Promise(resolve => setTimeout(resolve, delay));
}

// ─── AIPanel ─────────────────────────────────────────────────────────────────
export default function AIPanel({
  open,
  onClose,
  onAddHabit,
  onDeleteHabit,
  onUpdateHabit,
  side = "right",
}: {
  open: boolean;
  onClose: () => void;
  onAddHabit?: (habit: { title: string; icon: string; color: string; habit_type?: string }) => Promise<void>;
  onDeleteHabit?: (id: string) => Promise<void>;
  onUpdateHabit?: (id: string, updates: Partial<{ title: string; icon: string; color: string }>) => Promise<void>;
  side?: "left" | "right";
}) {
  const [width, setWidth] = useState(480);
  const dragging = useRef(false);
  const [isDragging, setIsDragging] = useState(false);

  const [displayMode, setDisplayMode] = useState<"sidebar" | "floating">(() => {
    return (localStorage.getItem("zenith-ai-display-mode") as "sidebar" | "floating") || "sidebar";
  });

  const toggleDisplayMode = () => {
    setDisplayMode(prev => {
      const next = prev === "sidebar" ? "floating" : "sidebar";
      localStorage.setItem("zenith-ai-display-mode", next);
      return next;
    });
  };

  const isFloating = displayMode === "floating";
  const isLeft = side === "right"; // If sidebar is right, AITrigger is left
  const floatingPosClass = isLeft ? "left-6" : "right-6";

  const dragControls = useDragControls();
  const [floatingSize, setFloatingSize] = useState<{ width: number; height: number }>(() => {
    const saved = localStorage.getItem("zenith-ai-floating-size");
    return saved ? JSON.parse(saved) : { width: 420, height: 600 };
  });

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [msgCount, setMsgCount] = useState(getMsgCount);
  const [toast, setToast] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [thinkingPhase, setThinkingPhase] = useState<"reading" | "analyzing" | "responding" | null>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { habits = [] } = useHabits();

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isLoading]);

  useEffect(() => {
    const move = (e: MouseEvent) => {
      if (!dragging.current) return;
      const w = window.innerWidth - e.clientX;
      setWidth(Math.min(720, Math.max(340, w)));
    };
    const up = () => { dragging.current = false; setIsDragging(false); };
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
    return () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
    };
  }, []);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(null), 3500);
  };

  const executeActions = async (actions: ParsedAction[]): Promise<{ success: boolean; completed: string[]; errors: string[] }> => {
    const completed: string[] = [];
    const errors: string[] = [];
    
    for (const action of actions) {
      try {
        if (action.type === "add_habit" && onAddHabit && action.data) {
          await onAddHabit({
            title: String(action.data.title || ""),
            icon: String(action.data.icon || "✨"),
            color: String(action.data.color || "green"),
            habit_type: String(action.data.habit_type || "good"),
          });
          completed.push(`✅ تمت إضافة: ${action.data.title}`);
          await new Promise(resolve => setTimeout(resolve, 400));
        }
        if (action.type === "delete_habit" && onDeleteHabit && action.data) {
          const id = String(action.data.id || "");
          const title = String(action.data.title || "");
          if (id && !id.includes("habit-id")) {
            await onDeleteHabit(id);
            completed.push(`🗑️ تم حذف: ${title || "العادة"}`);
          } else if (title) {
            const found = habits.find(h => h.title.toLowerCase().includes(title.toLowerCase()));
            if (found) {
              await onDeleteHabit(found.id);
              completed.push(`🗑️ تم حذف: ${title}`);
            } else {
              errors.push(`⚠️ لم أجد عادة باسم: ${title}`);
            }
          }
        }
        if (action.type === "update_habit" && onUpdateHabit && action.data) {
          const id = String(action.data.id || "");
          const updates = action.data.updates as Record<string, unknown> | undefined;
          if (id && updates && !id.includes("habit-id")) {
            const cleanUpdates: Partial<{ title: string; icon: string; color: string }> = {};
            if (updates.title) cleanUpdates.title = String(updates.title);
            if (updates.icon) cleanUpdates.icon = String(updates.icon);
            if (updates.color) cleanUpdates.color = String(updates.color);
            await onUpdateHabit(id, cleanUpdates);
            completed.push(`✏️ تم تعديل العادة بنجاح`);
          } else {
            const searchTitle = String(updates?.title || action.data.title || "");
            const found = habits.find(h => h.title.toLowerCase().includes(searchTitle.toLowerCase()));
            if (found && updates) {
              const cleanUpdates: Partial<{ title: string; icon: string; color: string }> = {};
              if (updates.title) cleanUpdates.title = String(updates.title);
              if (updates.icon) cleanUpdates.icon = String(updates.icon);
              if (updates.color) cleanUpdates.color = String(updates.color);
              await onUpdateHabit(found.id, cleanUpdates);
              completed.push(`✏️ تم تعديل العادة بنجاح`);
            } else {
              errors.push(`⚠️ لم أجد العادة للتعديل`);
            }
          }
        }
      } catch (e: any) {
        console.error("Action failed:", e);
        errors.push(`❌ فشل تنفيذ الإجراء: ${e?.message || 'خطأ غير معروف'}`);
      }
    }
    
    return {
      success: errors.length === 0,
      completed,
      errors,
    };
  };

  const callMistral = async (msgs: ChatMessage[], contextOverride?: string) => {
    const ctx = buildHabitsContext(habits);

    const habitsListForAI = ctx.habits.map(h => 
      `- id: "${h.id}" | الاسم: "${h.title}" | الأيقونة: ${h.icon} | اللون: ${h.color} | النوع: ${h.habit_type}`
    ).join("\n");

    const systemWithContext = BASE_SYSTEM_PROMPT + `

[بيانات المستخدم الحية]:
التاريخ: ${ctx.dayName}، ${ctx.currentDate}
الوقت: ${ctx.timeOfDay}
الشهر: ${ctx.currentMonth} (${ctx.daysElapsedInMonth} يوم مضى)
الإنجاز اليوم: ${ctx.todayProgress}
متوسط الإنجاز الشهري: ${ctx.averageMonthlyCompletion}
أفضل عادة: ${ctx.bestHabit}
أضعف عادة: ${ctx.worstHabit}
عدد العادات: ${ctx.totalHabits} (${ctx.goodHabitsCount} إيجابية، ${ctx.badHabitsCount} للإقلاع)

[قائمة العادات الحالية مع الـ IDs]:
${habitsListForAI}`;

    const prompt = JSON.stringify({
      system: systemWithContext,
      messages: msgs.slice(-6).map(m => ({ role: m.role, content: m.content })),
    });

    // Use Edge Function — API key stays server-side
    const { data: sessionData } = await supabase.auth.getSession();
    const jwt = sessionData?.session?.access_token;

    const edgeUrl = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/analyze-habits`;
    const res = await fetch(edgeUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${jwt}`,
      },
      body: JSON.stringify({ prompt, day_local: ctx.currentDate }),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => "");
      console.error("AI API error:", res.status, errText);
      throw new Error(`HTTP ${res.status}: ${errText.slice(0, 200)}`);
    }
    const data = await res.json();
    return data.choices?.[0]?.message?.content ?? "عذراً، حدث خطأ.";
  };

  const sendMessage = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || isLoading) return;
    if (msgCount >= MSG_LIMIT) {
      showToast("⚠️ وصلت للحد الأقصى من الرسائل اليوم");
      return;
    }

    const userMsg: ChatMessage = { role: "user", content: trimmed };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setIsLoading(true);
    setThinkingPhase("reading");
    const count = incrementMsgCount();
    setMsgCount(count);

    try {
      // مرحلة القراءة والتحليل - تحاكي تفكير إنساني
      await humanDelay(300, 600);
      setThinkingPhase("analyzing");
      await humanDelay(200, 400);
      setThinkingPhase("responding");

      const raw = await callMistral(newMessages);
      const { cleanText, actions } = parseAIActions(raw);

      // تأخير صغير قبل ظهور الرد يخلي الأمر يبدو أكثر طبيعية
      await humanDelay(100, 300);

      // Execute actions FIRST, then show message based on result
      if (actions.length > 0) {
        const result = await executeActions(actions);
        
        let finalMessage = cleanText || "";
        if (result.success && result.completed.length > 0) {
          finalMessage = finalMessage || "تم تنفيذ الطلب بنجاح ✅";
          // Show individual success toasts
          result.completed.forEach(msg => showToast(msg));
        } else if (result.errors.length > 0) {
          // Override AI message with failure notice
          finalMessage = `حاولت أنفذ الطلب لكن حصلت مشكلة:\n${result.errors.join("\n")}` + 
            (result.completed.length > 0 ? `\n\nلكن نجح:\n${result.completed.join("\n")}` : "");
          result.errors.forEach(msg => showToast(msg));
        }
        
        setMessages(prev => [...prev, { role: "assistant", content: finalMessage }]);
      } else {
        setMessages(prev => [...prev, { role: "assistant", content: cleanText || "تم ✅" }]);
      }
      setThinkingPhase(null);
      setIsLoading(false);
    } catch (err) {
      console.error("❌ AI call failed:", err);
      setThinkingPhase(null);
      setMessages(prev => [...prev, { role: "assistant", content: "😅 تعذر الاتصال بالخادم، جرب مرة تانية." }]);
      setIsLoading(false);
    } finally {
      // Ensure state is cleared
      setIsLoading(false);
      setThinkingPhase(null);
    }
  };

  const handleDeepAnalysis = async () => {
    if (isAnalyzing) return;
    setIsAnalyzing(true);
    setThinkingPhase("reading");

    const ctx = buildHabitsContext(habits);

    // بناء تحليل ذكي ومتعمق
    const analysisPrompt = `أنا محتاج منك تحليل عميق وصادق لأدائي في العادات هذا الشهر.

البيانات الحقيقية:
- الشهر: ${ctx.currentMonth}، مضى ${ctx.daysElapsedInMonth} يوم
- إنجاز اليوم: ${ctx.todayProgress}
- متوسط الإنجاز الشهري الكلي: ${ctx.averageMonthlyCompletion}
- أفضل عادة: ${ctx.bestHabit}
- أضعف عادة: ${ctx.worstHabit}
- تفاصيل كاملة: ${JSON.stringify(ctx.habits)}

اللي أبيك تعمله:
قرأ البيانات دي بتمعن وقولي رأيك الصادق — زي صديق ذكي مش زي تقرير رسمي.
ابدأ بأهم ملاحظة لفت انتباهك، وبعدين تكلم عن الاتساق العام.
لو في عادة ممتازة، اعترف بيها. لو في ضعف واضح، قوله بصراحة مع اقتراح عملي واحد أو اتنين مفيدين فعلاً.
الأسلوب طبيعي ومباشر — لا قوائم، لا عناوين، لا نجوم.`;

    const analysisMsg: ChatMessage = { role: "user", content: "طلب تحليل شامل لأدائي" };
    const newMessages = [...messages, analysisMsg];
    setMessages(newMessages);

    try {
      await humanDelay(500, 900);
      setThinkingPhase("analyzing");
      await humanDelay(300, 500);
      setThinkingPhase("responding");

      const raw = await callMistral([{ role: "user", content: analysisPrompt }]);
      const { cleanText } = parseAIActions(raw);

      await humanDelay(200, 400);
      setMessages(prev => [...prev, { role: "assistant", content: cleanText }]);
    } catch (err) {
      console.error("❌ Deep analysis failed:", err);
      setMessages(prev => [...prev, { role: "assistant", content: "😅 تعذر إجراء التحليل، جرب تاني." }]);
    } finally {
      setIsAnalyzing(false);
      setThinkingPhase(null);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const hasMessages = messages.length > 0;

  // عرض حالة التفكير بشكل إنساني
  const getThinkingLabel = () => {
    switch (thinkingPhase) {
      case "reading": return "🧠 بيقرأ بياناتك...";
      case "analyzing": return "🔍 بيحلل...";
      case "responding": return "✍️ بيكتب...";
      default: return "💭 يفكر...";
    }
  };

  return (
    <AnimatePresence initial={false}>
      {open && (
        <motion.aside
          key="ai-panel"
          drag={isFloating}
          dragControls={dragControls}
          dragListener={false}
          dragMomentum={false}
          initial={isFloating ? { y: 20, opacity: 0, scale: 0.95 } : { width: 0, opacity: 0 }}
          animate={isFloating ? { y: 0, opacity: 1, scale: 1, width: floatingSize.width, height: floatingSize.height } : { width, opacity: 1, height: "100vh" }}
          exit={isFloating ? { y: 20, opacity: 0, scale: 0.95 } : { width: 0, opacity: 0 }}
          transition={{ type: "spring", damping: 26, stiffness: 220 }}
          className={
            isFloating
              ? `fixed top-20 ${floatingPosClass} z-50 rounded-[32px] border border-green-500/20 shadow-[0_20px_60px_rgba(0,0,0,0.8)] overflow-hidden`
              : `relative shrink-0 sticky top-0 overflow-hidden`
          }
          style={{
            background: "radial-gradient(ellipse 600px 400px at 50% 0%, rgba(34,197,94,0.10), transparent 60%), #020403",
          }}
        >
          {/* Resize handle */}
          {isFloating && (
            <div
              onMouseDown={(e) => {
                e.preventDefault();
                e.stopPropagation();
                const startX = e.clientX;
                const startY = e.clientY;
                const startW = floatingSize.width;
                const startH = floatingSize.height;

                const onMove = (me: MouseEvent) => {
                  const dX = isLeft ? me.clientX - startX : startX - me.clientX;
                  const dY = me.clientY - startY;
                  setFloatingSize({
                    width: Math.max(300, Math.min(800, startW + dX)),
                    height: Math.max(400, Math.min(window.innerHeight - 100, startH + dY)),
                  });
                };
                const onUp = () => {
                  window.removeEventListener("mousemove", onMove);
                  window.removeEventListener("mouseup", onUp);
                  setFloatingSize(prev => {
                    localStorage.setItem("zenith-ai-floating-size", JSON.stringify(prev));
                    return prev;
                  });
                };
                window.addEventListener("mousemove", onMove);
                window.addEventListener("mouseup", onUp);
              }}
              className={`absolute bottom-0 ${isLeft ? "right-0 cursor-se-resize" : "left-0 cursor-sw-resize"} w-8 h-8 z-50 flex items-end justify-end p-2`}
            >
              <svg viewBox="0 0 24 24" className="w-3 h-3 text-white/20">
                <path fill="currentColor" d="M22 22H20V20H22V22ZM22 18H20V16H22V18ZM18 22H16V20H18V22ZM22 14H20V12H22V14ZM14 22H12V20H14V22Z" />
              </svg>
            </div>
          )}

          {/* Left divider glow */}
          {!isFloating && (
            <div
              className="pointer-events-none absolute inset-y-0 left-0 w-px z-20"
              style={{
                background: "linear-gradient(180deg, transparent 0%, rgba(74,222,128,0.35) 30%, rgba(74,222,128,0.45) 50%, rgba(74,222,128,0.35) 70%, transparent 100%)",
                boxShadow: "0 0 6px rgba(74,222,128,0.25)",
              }}
            />
          )}

          {/* Drag handle */}
          {!isFloating && (
            <div
              onMouseDown={(e) => {
              e.preventDefault();
              const startX = e.clientX;
              let moved = false;
              const mv = (ev: MouseEvent) => {
                if (Math.abs(ev.clientX - startX) > 3 && !moved) {
                  moved = true;
                  dragging.current = true;
                  setIsDragging(true);
                }
              };
              const up = () => {
                if (!moved) onClose();
                dragging.current = false;
                setIsDragging(false);
                window.removeEventListener("mousemove", mv);
                window.removeEventListener("mouseup", up);
              };
              window.addEventListener("mousemove", mv);
              window.addEventListener("mouseup", up);
            }}
            className="absolute top-0 left-0 h-full w-2 cursor-ew-resize z-30 group flex items-center justify-center"
          >
            <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-px bg-green-500/15 group-hover:bg-green-400/70 transition-all" />
            <motion.div
              animate={{ opacity: isDragging ? 1 : 0, scale: isDragging ? 1 : 0.85 }}
              whileHover={{ opacity: 1, scale: 1 }}
              className="relative z-10 w-5 h-10 rounded-md flex items-center justify-center bg-[#0b1410] border border-green-400/40"
            >
              <GripVertical size={12} className="text-[#4ADE80]" />
            </motion.div>
          </div>
          )}

          <StarField />

          {/* Toast */}
          <AnimatePresence>
            {toast && (
              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="absolute top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2 rounded-2xl text-[12px] font-bold text-green-300 whitespace-nowrap"
                style={{
                  background: "rgba(10,20,12,0.95)",
                  border: "1px solid rgba(74,222,128,0.5)",
                  boxShadow: "0 0 20px rgba(34,197,94,0.3)",
                }}
              >
                {toast}
              </motion.div>
            )}
          </AnimatePresence>

          <div style={{ width: isFloating ? '100%' : width }} className="relative z-10 h-full flex flex-col p-4 gap-3">
            {/* Header */}
            <div 
              className={`flex items-center justify-between shrink-0 pt-1 ${isFloating ? "cursor-grab active:cursor-grabbing" : ""}`}
              onPointerDown={(e) => {
                if (isFloating) dragControls.start(e);
              }}
            >
              <div className="flex items-center gap-3">
                <motion.div
                  animate={{ boxShadow: ["0 0 16px rgba(34,197,94,0.4)", "0 0 28px rgba(34,197,94,0.7)", "0 0 16px rgba(34,197,94,0.4)"] }}
                  transition={{ duration: 2.5, repeat: Infinity }}
                  className="w-10 h-10 rounded-xl flex items-center justify-center"
                  style={{ background: "linear-gradient(135deg, #15803D, #4ADE80)" }}
                >
                  <InfinityIcon size={18} strokeWidth={2.6} />
                </motion.div>
                <div>
                  <div className="text-sm font-bold tracking-wide">زينيث AI</div>
                  <div className="text-[10px] text-[#647067] flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                    {thinkingPhase ? (
                      <motion.span
                        key={thinkingPhase}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="text-green-400/80"
                      >
                        {getThinkingLabel()}
                      </motion.span>
                    ) : "يقرأ ويحلل بياناتك"}
                  </div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                {/* Deep Analysis Button */}
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={handleDeepAnalysis}
                  disabled={isAnalyzing || habits.length === 0}
                  title="تحليل شامل ذكي لكل عاداتك"
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-[11px] font-bold transition-all disabled:opacity-40"
                  style={{
                    background: "linear-gradient(135deg, rgba(99,102,241,0.25), rgba(139,92,246,0.15))",
                    border: "1px solid rgba(139,92,246,0.35)",
                    color: "#a78bfa",
                  }}
                >
                  {isAnalyzing ? (
                    <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }}>
                      <RefreshCw size={12} />
                    </motion.div>
                  ) : (
                    <Brain size={12} />
                  )}
                  {isAnalyzing ? "بيحلل..." : "تحليل ذكي"}
                </motion.button>
                <button
                  onClick={toggleDisplayMode}
                  title={isFloating ? "تثبيت كقائمة جانبية" : "عرض كشاشة منبثقة"}
                  className="w-8 h-8 rounded-lg hover:bg-white/10 flex items-center justify-center transition text-[#647067] hover:text-white"
                >
                  {isFloating ? <PanelRight size={15} /> : <AppWindow size={15} />}
                </button>
                <button
                  onClick={onClose}
                  className="w-8 h-8 rounded-lg hover:bg-white/10 flex items-center justify-center transition"
                >
                  <X size={15} />
                </button>
              </div>
            </div>

            {/* Stats bar */}
            <div className="flex items-center justify-between shrink-0 px-4 py-2 border-b border-green-500/10">
              <span className="text-[10px] text-[#647067]">
                {habits.length} عادة · {habits.filter(h => h.checkedToday).length}/{habits.length} اليوم
              </span>
              <span className="text-[10px] text-[#647067]">
                {msgCount}/{MSG_LIMIT} رسالة
              </span>
            </div>

            {/* Messages */}
            <div
              className="flex-1 overflow-y-auto flex flex-col gap-3 pr-1 scroll-smooth"
              dir="rtl"
              style={{ scrollbarWidth: "thin", scrollbarColor: "rgba(74,222,128,0.2) transparent" }}
            >
              {!hasMessages && (
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15 }}
                  className="flex-1 flex flex-col items-center justify-center text-center py-8 gap-4"
                >
                  <motion.div
                    animate={{ scale: [1, 1.05, 1] }}
                    transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                    className="text-[22px] font-bold"
                    style={{ color: "#4ADE80" }}
                  >
                    🤔 كيف أقدر أساعدك؟
                  </motion.div>
                  <div className="text-[11px] text-[#647067] max-w-[220px] leading-relaxed">
                    بقرأ بيانات عاداتك وبحلل أداءك — اسألني أي حاجة
                  </div>
                  {/* Quick Actions */}
                  <div className="grid grid-cols-2 gap-2 w-full mt-2">
                    <button
                      onClick={() => sendMessage("حلل أدائي في العادات هذا الشهر بالتفصيل")}
                      className="flex items-center gap-2 px-3 py-2 rounded-xl text-[11px] bg-violet-500/10 border border-violet-500/20 text-violet-300 hover:bg-violet-500/20 transition text-right"
                    >
                      <BarChart3 size={12} />
                      تحليل الشهر
                    </button>
                    <button
                      onClick={() => sendMessage("ما أضعف عاداتي وكيف أحسنها؟")}
                      className="flex items-center gap-2 px-3 py-2 rounded-xl text-[11px] bg-red-500/10 border border-red-500/20 text-red-300 hover:bg-red-500/20 transition text-right"
                    >
                      <Trash2 size={12} />
                      نقاط الضعف
                    </button>
                    <button
                      onClick={() => sendMessage("اقترح روتين صباحي مناسب لي")}
                      className="flex items-center gap-2 px-3 py-2 rounded-xl text-[11px] bg-amber-500/10 border border-amber-500/20 text-amber-300 hover:bg-amber-500/20 transition text-right"
                    >
                      <Sparkles size={12} />
                      روتين صباحي
                    </button>
                    <button
                      onClick={() => sendMessage("ما أقوى عادة عندي وليه؟")}
                      className="flex items-center gap-2 px-3 py-2 rounded-xl text-[11px] bg-green-500/10 border border-green-500/20 text-green-300 hover:bg-green-500/20 transition text-right"
                    >
                      <Brain size={12} />
                      أقوى عادة
                    </button>
                  </div>
                </motion.div>
              )}

              {messages.map((msg, idx) => (
                <motion.div
                  key={idx}
                  initial={{ opacity: 0, y: 8, scale: 0.97 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ duration: 0.22 }}
                  className={`flex ${msg.role === "user" ? "justify-start" : "justify-end"}`}
                >
                  <div
                    className="max-w-[85%] px-4 py-2.5 rounded-2xl text-[13px] leading-relaxed whitespace-pre-wrap"
                    style={
                      msg.role === "user"
                        ? {
                            background: "linear-gradient(135deg, #15803D 0%, #22C55E 100%)",
                            color: "#fff",
                            borderRadius: "18px 4px 18px 18px",
                            boxShadow: "0 4px 18px rgba(34,197,94,0.3)",
                            direction: "rtl",
                          }
                        : {
                            background: "rgba(10,18,12,0.9)",
                            border: "1px solid rgba(74,222,128,0.18)",
                            color: "#d1fae5",
                            borderRadius: "4px 18px 18px 18px",
                            boxShadow: "0 4px 18px rgba(0,0,0,0.4)",
                            direction: "rtl",
                            lineHeight: "1.8",
                          }
                    }
                  >
                    {msg.content}
                  </div>
                </motion.div>
              ))}

              {(isLoading || isAnalyzing) && (
                <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="flex justify-end">
                  <div
                    className="px-4 py-3 rounded-2xl"
                    style={{
                      background: "rgba(10,18,12,0.85)",
                      border: "1px solid rgba(74,222,128,0.18)",
                      borderRadius: "4px 18px 18px 18px",
                    }}
                  >
                    <ThinkingIndicator />
                  </div>
                </motion.div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Suggestion chips */}
            {!hasMessages && (
              <div className="flex flex-wrap gap-1.5 justify-center shrink-0" dir="rtl">
                {SUGGESTIONS.map((q, i) => (
                  <motion.button
                    key={q}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.2 + i * 0.07 }}
                    whileHover={{ scale: 1.05, y: -2 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => sendMessage(q)}
                    className="px-3 py-1.5 rounded-full text-[11px] bg-white/[0.04] border border-green-500/15 hover:border-green-400/60 hover:text-[#4ADE80] transition"
                  >
                    {q}
                  </motion.button>
                ))}
              </div>
            )}

            {/* Input */}
            <motion.div
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, type: "spring" }}
              className="relative shrink-0"
            >
              <div
                className="absolute -inset-px rounded-3xl opacity-60"
                style={{
                  background: "linear-gradient(135deg, rgba(74,222,128,0.5), rgba(34,197,94,0.1), rgba(74,222,128,0.5))",
                  filter: "blur(8px)",
                }}
              />
              <div
                className="relative flex items-end gap-2 p-3 rounded-3xl"
                style={{
                  background: "rgba(8,14,10,0.95)",
                  border: "1px solid rgba(74,222,128,0.3)",
                  boxShadow: "0 10px 40px rgba(0,0,0,0.6)",
                }}
              >
                <textarea
                  ref={textareaRef}
                  dir="rtl"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  rows={1}
                  placeholder="اسأل زينيث... (أضف، احذف، حلل)"
                  disabled={isLoading || isAnalyzing}
                  className="flex-1 bg-transparent outline-none text-[13px] placeholder:text-[#647067] resize-none leading-relaxed py-1 px-1 max-h-32"
                  style={{ scrollbarWidth: "none" }}
                />
                <motion.button
                  whileHover={{ scale: 1.08 }}
                  whileTap={{ scale: 0.92 }}
                  onClick={() => sendMessage(input)}
                  disabled={!input.trim() || isLoading || isAnalyzing}
                  className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 transition-all"
                  style={{
                    background: input.trim() && !isLoading && !isAnalyzing
                      ? "linear-gradient(135deg, #15803D, #22C55E)"
                      : "rgba(74,222,128,0.08)",
                    boxShadow: input.trim() && !isLoading && !isAnalyzing
                      ? "0 0 20px rgba(34,197,94,0.5)"
                      : "none",
                  }}
                >
                  <Send size={15} className={input.trim() && !isLoading ? "text-white" : "text-[#647067]"} />
                </motion.button>
              </div>
              <div className="text-[10px] text-[#647067] mt-1.5 text-center">
                Enter للإرسال · Shift+Enter سطر جديد · {msgCount}/{MSG_LIMIT} رسائل
              </div>
            </motion.div>
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}

export type _Bubble = ReactNode;