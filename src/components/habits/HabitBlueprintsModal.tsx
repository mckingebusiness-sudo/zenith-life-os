import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Sparkles, Check } from "lucide-react";
import { Habit } from "@/hooks/useHabits";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  addHabit: (habit: Partial<Habit>) => Promise<void>;
};

const BLUEPRINTS = [
  {
    id: "morning",
    title: "روتين الصباح للتركيز العميق",
    icon: "🌅",
    color: "amber",
    description: "ابدأ يومك بأقوى طريقة ممكنة",
    habits: [
      { title: "القراءة 20 دقيقة", icon: "📚", color: "blue" },
      { title: "التأمل 10 دقائق", icon: "🧘‍♂️", color: "violet" },
      { title: "تمرين صباحي", icon: "💪", color: "orange" },
      { title: "شرب لتر ماء", icon: "💧", color: "cyan" },
    ],
  },
  {
    id: "sleep",
    title: "روتين الاسترخاء قبل النوم",
    icon: "🌙",
    color: "indigo",
    description: "نم أفضل وأنت مرتاح البال",
    habits: [
      { title: "تجنب الشاشات قبل النوم", icon: "📵", color: "red" },
      { title: "القراءة الخفيفة", icon: "📖", color: "emerald" },
      { title: "التأمل الليلي", icon: "🌙", color: "indigo" },
      { title: "النوم قبل 12", icon: "🛌", color: "purple" },
    ],
  },
  {
    id: "dev",
    title: "صحة المبرمج",
    icon: "💻",
    color: "green",
    description: "اعتنِ بجسمك أثناء العمل",
    habits: [
      { title: "تمارين العيون 20-20-20", icon: "👁️", color: "teal" },
      { title: "وقفة كل ساعة", icon: "🚶‍♂️", color: "lime" },
      { title: "شرب الماء", icon: "💧", color: "sky" },
      { title: "تمارين الظهر", icon: "🤸", color: "green" },
    ],
  },
  {
    id: "fitness",
    title: "رياضة وصحة بدنية",
    icon: "🏋️",
    color: "orange",
    description: "جسم قوي = عقل قوي",
    habits: [
      { title: "تمرين 30 دقيقة", icon: "🏋️", color: "orange" },
      { title: "المشي 10 آلاف خطوة", icon: "🚶", color: "lime" },
      { title: "تمارين الإطالة", icon: "🤸", color: "yellow" },
      { title: "شرب 3 لتر ماء", icon: "💧", color: "cyan" },
    ],
  },
  {
    id: "learning",
    title: "تطوير العقل والتعلم",
    icon: "🧠",
    color: "violet",
    description: "استثمر في عقلك كل يوم",
    habits: [
      { title: "قراءة 30 دقيقة", icon: "📚", color: "blue" },
      { title: "تعلم مهارة جديدة", icon: "🎯", color: "violet" },
      { title: "مراجعة الملاحظات", icon: "📝", color: "amber" },
      { title: "مشاهدة محاضرة", icon: "🎓", color: "indigo" },
    ],
  },
  {
    id: "mental",
    title: "الصحة النفسية والتوازن",
    icon: "❤️",
    color: "rose",
    description: "عقل صافٍ يصنع حياة أفضل",
    habits: [
      { title: "التأمل اليومي", icon: "🧘", color: "violet" },
      { title: "كتابة اليوميات", icon: "📓", color: "amber" },
      { title: "الامتنان 3 أشياء", icon: "🙏", color: "rose" },
      { title: "التنفس العميق", icon: "🌬️", color: "sky" },
    ],
  },
  {
    id: "productivity",
    title: "الإنتاجية والعمل",
    icon: "⚡",
    color: "yellow",
    description: "أنجز أكثر في وقت أقل",
    habits: [
      { title: "تحديد 3 أهداف اليوم", icon: "🎯", color: "green" },
      { title: "مراجعة البريد مرة واحدة", icon: "📧", color: "blue" },
      { title: "جلسة Pomodoro", icon: "🍅", color: "red" },
      { title: "مراجعة المهام", icon: "✅", color: "emerald" },
    ],
  },
  {
    id: "social",
    title: "العلاقات الاجتماعية",
    icon: "🤝",
    color: "pink",
    description: "العلاقات الجيدة أساس السعادة",
    habits: [
      { title: "التواصل مع صديق", icon: "📱", color: "blue" },
      { title: "رسالة شكر", icon: "💌", color: "pink" },
      { title: "قضاء وقت مع الأسرة", icon: "👨‍👩‍👧", color: "amber" },
      { title: "فعل خير واحد", icon: "💚", color: "green" },
    ],
  },
  {
    id: "quit",
    title: "الإقلاع عن العادات السيئة",
    icon: "🚫",
    color: "red",
    description: "تخلص من ما يضرك خطوة بخطوة",
    habits: [
      { title: "الإقلاع عن التدخين", icon: "🚬", color: "red", habit_type: "quit" },
      { title: "تجنب السكريات والمشروبات الغازية", icon: "🍭", color: "orange", habit_type: "quit" },
      { title: "تجنب السوشيال ميديا قبل النوم", icon: "📵", color: "purple", habit_type: "quit" },
      { title: "لا للوجبات السريعة", icon: "🍔", color: "amber", habit_type: "quit" },
      { title: "عدم السهر بعد 1 ص", icon: "🕛", color: "indigo", habit_type: "quit" },
    ],
  },
  {
    id: "wealth",
    title: "بناء الثروة والمال",
    icon: "💰",
    color: "emerald",
    description: "حرر مستقبلك المالي اليوم",
    habits: [
      { title: "مراجعة الميزانية والمصروفات", icon: "📊", color: "green" },
      { title: "توفير مبلغ يومي", icon: "🏦", color: "emerald" },
      { title: "قراءة في المال والاستثمار", icon: "📈", color: "teal" },
      { title: "تجنب الإنفاق العشوائي", icon: "🚫", color: "red", habit_type: "quit" },
    ],
  },
  {
    id: "spiritual",
    title: "الجانب الروحي والديني",
    icon: "🕌",
    color: "amber",
    description: "قوي صلتك بخالقك واشعر بالسكينة",
    habits: [
      { title: "الصلاة على وقتها", icon: "⏰", color: "emerald" },
      { title: "قراءة ورد قرآني (صفحتين)", icon: "📖", color: "amber" },
      { title: "أذكار الصباح والمساء", icon: "🤲", color: "blue" },
      { title: "الصدقة اليومية (ولو بالكلمة)", icon: "💖", color: "rose" },
    ],
  },
  {
    id: "focus",
    title: "التركيز العميق (Deep Work)",
    icon: "🎯",
    color: "blue",
    description: "أنجز أعمالك بدون تشتت",
    habits: [
      { title: "جلسة عمل عميق (90 دقيقة)", icon: "⏱️", color: "blue" },
      { title: "إيقاف إشعارات الهاتف وقت العمل", icon: "🔕", color: "indigo" },
      { title: "تجنب تصفح ريلز/تيك توك", icon: "📱", color: "red", habit_type: "quit" },
      { title: "تخطيط مهام الغد", icon: "📝", color: "teal" },
    ],
  },
  {
    id: "student",
    title: "الطالب المتفوق",
    icon: "🎓",
    color: "indigo",
    description: "عادات دراسية تضمن لك التفوق",
    habits: [
      { title: "مذاكرة 4 جلسات بومودورو", icon: "🍅", color: "red" },
      { title: "مراجعة ما تم دراسته اليوم", icon: "🔄", color: "blue" },
      { title: "حل اختبار قصير / تدريب", icon: "✍️", color: "orange" },
      { title: "لا لتأجيل المهام", icon: "⏰", color: "rose", habit_type: "quit" },
    ],
  },
  {
    id: "health",
    title: "تغذية صحية وحيوية",
    icon: "🥗",
    color: "lime",
    description: "جسمك هو محركك، زوده بالوقود الصحي",
    habits: [
      { title: "أكل حصة فواكه/خضار", icon: "🍎", color: "red" },
      { title: "تجنب السكر الأبيض تماماً", icon: "🧂", color: "slate", habit_type: "quit" },
      { title: "تحضير وجبة صحية في المنزل", icon: "🍳", color: "amber" },
      { title: "لا للأكل بعد 8 مساءً", icon: "🌙", color: "indigo", habit_type: "quit" },
    ],
  }
];

export function HabitBlueprintsModal({ isOpen, onClose, addHabit }: Props) {
  const [loading, setLoading] = useState<string | null>(null);
  const [done, setDone] = useState<string | null>(null);
  const [customBlueprints, setCustomBlueprints] = useState<any[]>([]);
  const [doneTimer, setDoneTimer] = useState<ReturnType<typeof setTimeout> | null>(null);

  // Load custom templates when modal opens
  useEffect(() => {
    if (isOpen) {
      void loadCustomBlueprints();
    }
  }, [isOpen]);

  useEffect(() => {
    return () => {
      if (doneTimer) clearTimeout(doneTimer);
    };
  }, [doneTimer]);

  const loadCustomBlueprints = async () => {
    try {
      const { data: authData } = await supabase.auth.getSession();
      if (!authData.session) {
        setCustomBlueprints([]);
        return;
      }

      const { data, error } = await supabase
        .from("habit_templates")
        .select("id, name, habits")
        .eq("user_id", authData.session.user.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      setCustomBlueprints((data || []).map((p: any) => ({
        id: p.id,
        title: p.name,
        icon: "⭐",
        color: "amber",
        description: "قالب مخصص",
        habits: (p.habits || []).map((h: any) => ({
          title: h.title,
          icon: h.icon,
          color: h.color,
          habit_type: h.type || h.habit_type || "good",
        })),
        isCustom: true,
      })));
    } catch (e) {
      console.error("Failed to load custom templates", e);
    }
  };

  const applyBlueprint = async (bp: typeof BLUEPRINTS[0] | any) => {
    setLoading(bp.id);
    try {
      toast.success(`جاري تطبيق القالب: ${bp.title}...`);
      for (let i = 0; i < bp.habits.length; i++) {
        const h = bp.habits[i];
        await addHabit({
          ...h,
          cadence: "daily",
          target_per_period: 1,
          active_weekdays: [0, 1, 2, 3, 4, 5, 6],
          grace_days: 0,
          is_private: false,
          sort_order: i,
        });
        // Small delay between saves to avoid DB conflicts
        await new Promise(r => setTimeout(r, 200));
      }
      toast.success(`تم إضافة عادات ${bp.title} بنجاح!`);
      setDone(bp.id);
      if (doneTimer) clearTimeout(doneTimer);
      const timer = setTimeout(() => {
        setDone(null);
      }, 1500);
      setDoneTimer(timer);
    } catch (e) {
      console.error(e);
      toast.error('حدث خطأ أثناء إضافة العادات — حاول مرة أخرى');
    } finally {
      setLoading(null);
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md"
        onClick={(e) => e.target === e.currentTarget && onClose()}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="glass rounded-3xl w-full max-w-2xl border border-border overflow-hidden"
        >
          {/* Header */}
          <div className="p-6 border-b border-border flex items-center justify-between relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-r from-green-500/10 to-blue-500/10" />
            <div className="relative flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-green-500/20 to-emerald-500/10 flex items-center justify-center">
                <Sparkles size={18} className="text-green-400" />
              </div>
              <div>
                <h2 className="text-lg font-bold text-foreground">قوالب العادات الجاهزة</h2>
                <p className="text-xs text-foreground/50">أضف حزمة عادات كاملة بضغطة واحدة</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="relative w-8 h-8 rounded-xl bg-foreground/5 hover:bg-foreground/10 flex items-center justify-center transition"
            >
              <X size={16} className="text-foreground/60" />
            </button>
          </div>

          {/* Blueprints */}
          <div className="p-6 overflow-y-auto max-h-[70vh]">
            <div className="grid grid-cols-2 gap-4">
            {[...customBlueprints, ...BLUEPRINTS].map((bp) => (
              <motion.div
                key={bp.id}
                whileHover={{ scale: 1.01 }}
                className="border border-border rounded-2xl p-5 bg-foreground/[0.04] hover:bg-foreground/[0.05] transition group"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="text-3xl">{bp.icon}</div>
                    <div>
                      <h3 className="font-bold text-foreground text-sm">{bp.title}</h3>
                      <p className="text-xs text-foreground/50 mt-0.5">{bp.description}</p>
                    </div>
                  </div>
                  <motion.button
                    whileTap={{ scale: 0.95 }}
                    onClick={() => applyBlueprint(bp)}
                    disabled={!!loading}
                    className={`shrink-0 px-4 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 ${
                      done === bp.id
                        ? "bg-green-500/20 text-green-400 border border-green-500/30"
                        : "bg-gradient-to-r from-green-600 to-emerald-600 text-foreground shadow-lg shadow-green-900/30"
                    }`}
                  >
                    {done === bp.id ? (
                      <><Check size={13} /> تمت الإضافة</>
                    ) : loading === bp.id ? (
                      <div className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <><Sparkles size={13} /> تطبيق</>
                    )}
                  </motion.button>
                </div>

                {/* Habit chips */}
                <div className="flex flex-wrap gap-1.5 mt-3">
                  {bp.habits.map((h: any) => (
                    <span
                      key={h.title}
                      className="text-[10px] px-2 py-0.5 rounded-full bg-foreground/5 border border-border text-foreground/60"
                    >
                      {h.icon} {h.title}
                    </span>
                  ))}
                </div>
              </motion.div>
            ))}
            </div>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
