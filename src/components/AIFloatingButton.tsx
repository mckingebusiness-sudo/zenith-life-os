import { useEffect, useRef, useState, type ReactNode } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Infinity as InfinityIcon, X, Send, GripVertical, Brain, BarChart3, Trash2, RefreshCw } from "lucide-react";
import { useHabits } from "@/hooks/useHabits";
import { calculateTodayProgress } from "@/lib/habitCalculations";

// ─── AITrigger ──────────────────────────────────────────────────────────────
export function AITrigger({ onClick }: { onClick: () => void }) {
  return (
    <motion.button
      initial={{ scale: 0, opacity: 0, rotate: -180 }}
      animate={{ scale: 1, opacity: 1, rotate: 0 }}
      whileHover={{ scale: 1.08 }}
      whileTap={{ scale: 0.92 }}
      onClick={onClick}
      className="fixed bottom-6 right-6 z-50 w-16 h-16 rounded-full flex items-center justify-center group"
      style={{
        background: "radial-gradient(circle at 30% 30%, #1a2e22, #030504 70%)",
        border: "1.5px solid rgba(74,222,128,0.55)",
        boxShadow:
          "0 0 40px rgba(34,197,94,0.45), 0 0 80px rgba(34,197,94,0.18), inset 0 0 16px rgba(74,222,128,0.15)",
      }}
    >
      <motion.span
        className="absolute inset-0 rounded-full"
        style={{ border: "1px solid rgba(74,222,128,0.4)" }}
        animate={{ scale: [1, 1.35, 1], opacity: [0.7, 0, 0.7] }}
        transition={{ duration: 2.4, repeat: Infinity, ease: "easeOut" }}
      />
      <motion.span
        animate={{ rotate: 360 }}
        transition={{ duration: 12, repeat: Infinity, ease: "linear" }}
        className="absolute inset-1.5 rounded-full border border-dashed border-green-500/40"
      />
      <motion.div
        animate={{ y: [0, -2, 0] }}
        transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut" }}
        className="relative z-10"
      >
        <InfinityIcon size={26} className="text-[#4ADE80] drop-shadow-[0_0_8px_rgba(74,222,128,0.9)]" strokeWidth={2.4} />
      </motion.div>
      <span className="absolute bottom-full mb-2 right-0 whitespace-nowrap text-[11px] text-muted-foreground opacity-0 group-hover:opacity-100 transition">
        زينيث AI · ⌘J
      </span>
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

// ─── Build Rich Context for AI ───────────────────────────────────────────────
function buildHabitsContext(habits: ReturnType<typeof useHabits>["habits"]) {
  const now = new Date();
  const today = now.toISOString().split("T")[0];
  const dayOfMonth = now.getDate();
  const monthName = now.toLocaleDateString("ar-EG", { month: "long", year: "numeric" });

  const goodHabits = habits.filter(h => (h as any).habit_type !== "quit");
  const badHabits = habits.filter(h => (h as any).habit_type === "quit");

  // Calculate this month's checkins for each habit
  const yr = now.getFullYear();
  const mo = String(now.getMonth() + 1).padStart(2, "0");

  const habitDetails = habits.map(h => {
    const monthCheckins = Array.from(h.checkins || []).filter(d => d.startsWith(`${yr}-${mo}`)).length;
    const isGood = (h as any).habit_type !== "quit";
    const completionRate = dayOfMonth > 0 ? Math.round((monthCheckins / dayOfMonth) * 100) : 0;
    return {
      id: h.id,
      title: h.title,
      type: isGood ? "good" : "bad/quit",
      streak: h.streak?.current_streak || 0,
      longestStreak: h.streak?.longest_streak || 0,
      totalCheckins: h.streak?.total_checkins || 0,
      avoidedToday: !!(h as any).avoidedToday,
      checkedToday: h.habit_type === 'quit' ? !h.relapsedToday : !!h.checkedToday,
      thisMonthCheckins: monthCheckins,
      completionRateThisMonth: `${completionRate}%`,
      savedValue: (h as any).saved_value_per_day ? `${(h as any).saved_value_per_day} ${(h as any).saved_unit || ""}` : null,
    };
  });

  const { totalHabits: todayTotal, handledCount: todayCompleted } = calculateTodayProgress(habits);

  return {
    currentDate: today,
    currentMonth: monthName,
    daysElapsedInMonth: dayOfMonth,
    totalHabits: habits.length,
    goodHabitsCount: goodHabits.length,
    badHabitsCount: badHabits.length,
    todayProgress: `${todayCompleted}/${todayTotal}`,
    habits: habitDetails,
  };
}

// ─── Parse AI Actions ────────────────────────────────────────────────────────
function parseAIActions(text: string): { cleanText: string; actions: ParsedAction[] } {
  const actions: ParsedAction[] = [];
  let cleanText = text;

  // Improved pattern: supports nested JSON objects like {"updates":{"title":"x"}}
  const actionRegex = /\[ACTION_(ADD|DELETE|UPDATE)\]\s*(\{(?:[^{}]|\{[^{}]*\})*\})/gi;
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

  // Fallback cleanup for raw JSON just in case AI still spits it out
  cleanText = cleanText.replace(/```json[\s\S]*?```/g, "").replace(/```[\s\S]*?```/g, "");
  // Try to clean up stray raw JSON objects that look like our actions
  cleanText = cleanText.replace(/\{[\s\S]*?"action"\s*:\s*"[^"]+?"[\s\S]*?\}/g, "");

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

// ─── SYSTEM PROMPT ───────────────────────────────────────────────────────────
const SYSTEM_PROMPT = `أنت زينيث AI — المساعد الذكي لتطبيق Zenith Life OS لتتبع العادات والإنتاجية.

قواعد صارمة:
- تحدث بالعربية فقط.
- ردودك مختصرة ومباشرة (2-4 جمل بحد أقصى).
- ممنوع منعاً باتاً عرض أي كود أو JSON للمستخدم. يجب أن يكون الرد نصياً طبيعياً فقط.
- أسلوبك: مهني، مشجع، مختصر، مثل مدرب شخصي محترف.

للقيام بإجراءات (إضافة/حذف/تعديل عادة)، لا تخبر المستخدم أنك تنفذ كود، بل رُد بشكل طبيعي (مثلاً: "تمت إضافة العادة بنجاح!") ثم ضع السطر السحري التالي في **نهاية ردك تماماً وفي سطر جديد**:

لإضافة عادة إيجابية:
[ACTION_ADD] {"title":"اسم العادة","icon":"🚀","color":"green","habit_type":"good"}

لإضافة عادة سيئة (تجنب):
[ACTION_ADD] {"title":"اسم العادة السيئة","icon":"🚫","color":"red","habit_type":"quit"}

للحذف:
[ACTION_DELETE] {"title":"اسم العادة"}

للتعديل (استخدم الـ title الدقيق للعادة من قائمة العادات، ولا تستخدم الـ id):
[ACTION_UPDATE] {"title":"اسم العادة الحالي","updates":{"title":"العنوان الجديد","icon":"🎯"}}

- احسب نسبة الإنجاز الإجمالية بناءً على (الأيام المنقضية من الشهر) وليس الشهر كاملاً.
- عند التعديل، حدد العادة دائماً بـ "title" الدقيق كما يظهر في قائمة العادات التي تراها.`;

const MISTRAL_API_KEY = "t1TpbGo6LWp1S8N2JoDWB7aZy0cvzV7b";

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

// ─── AIPanel ─────────────────────────────────────────────────────────────────
export default function AIPanel({
  open,
  onClose,
  onAddHabit,
  onDeleteHabit,
  onUpdateHabit,
}: {
  open: boolean;
  onClose: () => void;
  onAddHabit?: (habit: { title: string; icon: string; color: string; habit_type?: string }) => Promise<void>;
  onDeleteHabit?: (title: string) => Promise<void>;
  onUpdateHabit?: (id: string, updates: Partial<any>) => Promise<void>;
}) {
  const [width, setWidth] = useState(480);
  const dragging = useRef(false);
  const [isDragging, setIsDragging] = useState(false);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [msgCount, setMsgCount] = useState(getMsgCount);
  const [toast, setToast] = useState<string | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

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

  const executeActions = async (actions: ParsedAction[]) => {
    for (const action of actions) {
      try {
        if (action.type === "add_habit" && onAddHabit && action.data) {
          await onAddHabit({
            title: String(action.data.title || ""),
            icon: String(action.data.icon || "✨"),
            color: String(action.data.color || "green"),
            habit_type: String(action.data.habit_type || "good"),
          });
          showToast(`✅ تمت إضافة: ${action.data.title}`);
          await new Promise(resolve => setTimeout(resolve, 400));
        }
        if (action.type === "delete_habit" && onDeleteHabit && action.data) {
          const title = String(action.data.title || "");
          if (title) {
            await onDeleteHabit(title);
            showToast(`🗑 تم حذف: ${title}`);
          }
        }
        if (action.type === "update_habit" && onUpdateHabit && action.data) {
          // Support both id-based (old) and title-based (new) update
          let habitId = String(action.data.id || "");
          const titleKey = String(action.data.title || "");
          
          // If title is provided instead of/in addition to id, resolve id from habits list
          if (titleKey && (!habitId || habitId === "habit-id" || habitId === "")) {
            const found = habits.find(h => 
              h.title.toLowerCase().trim() === titleKey.toLowerCase().trim() ||
              h.title.toLowerCase().includes(titleKey.toLowerCase())
            );
            if (found) habitId = found.id;
          }
          
          const updates = action.data.updates as Record<string, unknown>;
          if (habitId && updates) {
            await onUpdateHabit(habitId, updates);
            showToast(`✏️ تم تعديل: ${titleKey || habitId}`);
          } else {
            showToast(`⚠️ لم أجد العادة للتعديل`);
          }
        }
      } catch (e) {
        console.error("Action failed:", e);
      }
    }
  };

  const callMistral = async (msgs: ChatMessage[], contextOverride?: string) => {
    const context = contextOverride || JSON.stringify(buildHabitsContext(habits), null, 2);
    const systemWithContext = SYSTEM_PROMPT + `\n\n[بيانات المستخدم الحالية - استخدمها في كل ردودك]:\n${context}`;

    const res = await fetch("https://api.mistral.ai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${MISTRAL_API_KEY}`,
      },
      body: JSON.stringify({
        model: "mistral-large-latest",
        messages: [
          { role: "system", content: systemWithContext },
          ...msgs.map(m => ({ role: m.role, content: m.content })),
        ],
        temperature: 0.65,
        max_tokens: 900,
      }),
    });

    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return data.choices?.[0]?.message?.content ?? "عذراً، حدث خطأ.";
  };

  const sendMessage = async (text: string) => {
    const trimmed = text.trim();
    if (!trimmed || isLoading) return;
    if (msgCount >= MSG_LIMIT) {
      showToast("وصلت للحد الأقصى من الرسائل اليوم");
      return;
    }

    const userMsg: ChatMessage = { role: "user", content: trimmed };
    const newMessages = [...messages, userMsg];
    setMessages(newMessages);
    setInput("");
    setIsLoading(true);
    const count = incrementMsgCount();
    setMsgCount(count);

    try {
      const raw = await callMistral(newMessages);
      const { cleanText, actions } = parseAIActions(raw);

      setMessages(prev => [...prev, { role: "assistant", content: cleanText || "تم." }]);
      if (actions.length > 0) {
        await executeActions(actions);
      }
    } catch {
      setMessages(prev => [...prev, { role: "assistant", content: "تعذر الاتصال بالخادم. حاول مرة أخرى." }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeepAnalysis = async () => {
    if (isAnalyzing) return;
    setIsAnalyzing(true);

    const ctx = buildHabitsContext(habits);
    const analysisPrompt = `قم بتحليل شامل ومعمق لأداء المستخدم. لديك البيانات الكاملة التالية:
- عدد العادات: ${ctx.totalHabits} (${ctx.goodHabitsCount} جيدة، ${ctx.badHabitsCount} سيئة للإقلاع)
- الشهر الحالي: ${ctx.currentMonth}، الأيام المنقضية: ${ctx.daysElapsedInMonth}
- إنجاز اليوم: ${ctx.todayProgress}
- تفاصيل العادات: ${JSON.stringify(ctx.habits)}

اكتب تحليلاً مهنياً يشمل:
1. نسبة الإنجاز الإجمالية مقارنة بالأيام المنقضية
2. أفضل عادة وأضعف عادة هذا الشهر
3. تحليل العادات السيئة (هل يتجنبها؟)
4. توصيتان عمليتان محددتان لتحسين الأداء
5. تقييم الاتساق في الأسبوع الأخير

الرد يجب أن يكون مهنياً ومباشراً بدون زخارف مفرطة.`;

    const analysisMsg: ChatMessage = { role: "user", content: "اطلب تحليلاً شاملاً لأدائي" };
    const newMessages = [...messages, analysisMsg];
    setMessages(newMessages);

    try {
      const raw = await callMistral([{ role: "user", content: analysisPrompt }]);
      const { cleanText } = parseAIActions(raw);
      setMessages(prev => [...prev, { role: "assistant", content: cleanText }]);
    } catch {
      setMessages(prev => [...prev, { role: "assistant", content: "تعذر إجراء التحليل. حاول مرة أخرى." }]);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage(input);
    }
  };

  const hasMessages = messages.length > 0;

  return (
    <AnimatePresence initial={false}>
      {open && (
        <motion.aside
          key="ai-panel"
          initial={{ width: 0, opacity: 0 }}
          animate={{ width, opacity: 1 }}
          exit={{ width: 0, opacity: 0 }}
          transition={{ type: "spring", damping: 26, stiffness: 220 }}
          className="relative shrink-0 h-screen sticky top-0 overflow-hidden"
          style={{
            background: "radial-gradient(ellipse 600px 400px at 50% 0%, rgba(34,197,94,0.10), transparent 60%), #020403",
          }}
        >
          {/* Left divider glow */}
          <div
            className="pointer-events-none absolute inset-y-0 left-0 w-px z-20"
            style={{
              background: "linear-gradient(180deg, transparent 0%, rgba(74,222,128,0.35) 30%, rgba(74,222,128,0.45) 50%, rgba(74,222,128,0.35) 70%, transparent 100%)",
              boxShadow: "0 0 6px rgba(74,222,128,0.25)",
            }}
          />

          {/* Drag handle */}
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

          <div style={{ width }} className="relative z-10 h-full flex flex-col p-4 gap-3">
            {/* Header */}
            <div className="flex items-center justify-between shrink-0 pt-1">
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
                  <div className="text-[10px] text-muted-foreground flex items-center gap-1.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse" />
                    يصل لكل بيانات عاداتك
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
                  title="تحليل شامل لكل عاداتك"
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
                  {isAnalyzing ? "تحليل..." : "تحليل شامل"}
                </motion.button>
                <button
                  onClick={onClose}
                  className="w-8 h-8 rounded-lg hover:bg-foreground/10 flex items-center justify-center transition"
                >
                  <X size={15} />
                </button>
              </div>
            </div>

            {/* Stats bar */}
            <div className="flex items-center justify-between shrink-0 px-1 border-b border-green-500/10 pb-2">
              <span className="text-[10px] text-muted-foreground">
                {habits.length} عادة · {habits.filter(h => h.checkedToday || h.frozenToday || (h.habit_type === 'quit' && !h.relapsedToday)).length}/{habits.length} اليوم
              </span>
              <span className="text-[10px] text-muted-foreground">
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
                  <div className="text-[20px] font-bold" style={{ color: "#4ADE80" }}>
                    كيف أقدر أساعدك؟
                  </div>
                  <div className="text-[11px] text-muted-foreground max-w-[200px] leading-relaxed">
                    أضف عادات، احذفها، أو اطلب تحليلاً شاملاً لأدائك
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
                          }
                        : {
                            background: "rgba(10,18,12,0.9)",
                            border: "1px solid rgba(74,222,128,0.18)",
                            color: "#d1fae5",
                            borderRadius: "4px 18px 18px 18px",
                            boxShadow: "0 4px 18px rgba(0,0,0,0.4)",
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
                    <TypingDots />
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
                    className="px-3 py-1.5 rounded-full text-[11px] bg-foreground/[0.05] border border-green-500/15 hover:border-green-400/60 hover:text-[#4ADE80] transition"
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
                  className="flex-1 bg-transparent outline-none text-[13px] placeholder:text-muted-foreground resize-none leading-relaxed py-1 px-1 max-h-32"
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
                  <Send size={15} className={input.trim() && !isLoading ? "text-foreground" : "text-muted-foreground"} />
                </motion.button>
              </div>
              <div className="text-[10px] text-muted-foreground mt-1.5 text-center">
                Ctrl+Enter للإرسال · {msgCount}/{MSG_LIMIT} رسائل اليوم
              </div>
            </motion.div>
          </div>
        </motion.aside>
      )}
    </AnimatePresence>
  );
}

export type _Bubble = ReactNode;