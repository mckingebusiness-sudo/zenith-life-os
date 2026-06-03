import { useState, useEffect, useMemo } from "react";
import { X, Sparkles } from "lucide-react";
import { Habit, HabitColor, HabitCadence } from "@/hooks/useHabits";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";

type Props = {
  isOpen: boolean;
  onClose: () => void;
  onSave: (habit: Partial<Habit>) => Promise<void>;
  habit?: Habit | null;
};

const COLORS: { id: HabitColor; hex: string; name: string }[] = [
  // Red & Pink
  { id: "red", hex: "#EF4444", name: "أحمر" },
  { id: "rose", hex: "#F43F5E", name: "وردي فاتح" },
  { id: "pink", hex: "#EC4899", name: "وردي" },
  { id: "fuchsia", hex: "#D946EF", name: "فوشيا" },
  { id: "crimson", hex: "#DC143C", name: "قرمزي" },
  
  // Purple & Blue
  { id: "purple", hex: "#A855F7", name: "بنفسجي" },
  { id: "violet", hex: "#8B5CF6", name: "بنفسجي فاتح" },
  { id: "indigo", hex: "#6366F1", name: "نيلي" },
  { id: "blue", hex: "#3B82F6", name: "أزرق" },
  { id: "sky", hex: "#0EA5E9", name: "سماوي فاتح" },
  { id: "cyan", hex: "#06B6D4", name: "سماوي" },
  
  // Green & Yellow
  { id: "teal", hex: "#14B8A6", name: "مخضر" },
  { id: "emerald", hex: "#10B981", name: "زمردي" },
  { id: "green", hex: "#22C55E", name: "أخضر" },
  { id: "lime", hex: "#84CC16", name: "ليموني" },
  { id: "yellow", hex: "#EAB308", name: "أصفر" },
  { id: "amber", hex: "#F59E0B", name: "عنبري" },
  { id: "orange", hex: "#F97316", name: "برتقالي" },
  
  // Others
  { id: "coral", hex: "#FF7F50", name: "مرجاني" },
  { id: "gold", hex: "#FFD700", name: "ذهبي" },
  { id: "slate", hex: "#64748B", name: "رمادي" },
  { id: "brown", hex: "#8B4513", name: "بني" },
];

const ICONS = [
  // Health & Fitness
  "🏃‍♂️", "💪", "🧘‍♂️", "🏊‍♂️", "🚴‍♂️", "🚶‍♂️", "🍎", "🥗", "💧", "💊",
  "🛌", "🥑", "🏋️‍♂️", "🚿", "⚖️", "🥩", "🥦", "🩺", "🦷", "🧗‍♂️",
  
  // Learning & Work
  "📚", "💻", "🧠", "📖", "🎓", "✍️", "💼", "📈", "🎯", "🔬",
  "📝", "🏫", "📊", "💡", "🛠️", "⏰", "📅", "📱", "🎧", "🎙️",
  
  // Hobbies & Lifestyle
  "🎨", "🎵", "📸", "🍳", "🪴", "⚽", "🎮", "🎸", "🚗", "✈️",
  "🌍", "🏕️", "🧹", "🛍️", "💸", "💰", "🎟️", "🎬", "🎤", "🧩",

  // Mind & Spirit
  "✨", "🙏", "☀️", "🌙", "🤝", "❤️", "🫂", "🕊️", "🧘‍♀️", "🔥",
  "🌟", "⚡", "🍀", "💎", "⚖️", "🔮", "🧿", "🕯️", "📿", "🌱",

  // Bad Habits to Quit
  "🚭", "📵", "🍔", "🍺", "🥱", "🤬", "🍬", "💳", "📺", "🕹️",
  "🚬", "🍕", "🍟", "🧁", "🍩", "🛋️", "📱", "🎰", "💸", "😡"
];

export function HabitModal({ isOpen, onClose, onSave, habit }: Props) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [icon, setIcon] = useState("✨");
  const [color, setColor] = useState<HabitColor>("blue");
  const [cadence, setCadence] = useState<HabitCadence>("daily");
  const [target, setTarget] = useState(1);
  const [habitType, setHabitType] = useState<'good' | 'quit'>('good');
  const [savedValuePerDay, setSavedValuePerDay] = useState("");
  const [savedUnit, setSavedUnit] = useState("ساعة");
  const [loading, setLoading] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);

  useEffect(() => {
    if (habit) {
      setTitle(habit.title);
      setDescription(habit.description || "");
      setIcon(habit.icon || "✨");
      setColor(habit.color);
      setCadence(habit.cadence);
      setTarget(habit.target_per_period);
      setHabitType(habit.habit_type || 'good');
      setSavedValuePerDay(String(habit.saved_value_per_day || ""));
      setSavedUnit(habit.saved_unit || "ساعة");
    } else {
      setTitle("");
      setDescription("");
      setIcon("✨");
      setColor("blue");
      setCadence("daily");
      setTarget(1);
      setHabitType('good');
      setSavedValuePerDay("");
      setSavedUnit("ساعة");
    }
  }, [habit, isOpen]);

  const selectedColorHex = useMemo(() => {
    return COLORS.find(c => c.id === color)?.hex || "#3B82F6";
  }, [color]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    setLoading(true);
    try {
      const habitData: Record<string, unknown> = {
        title: title.trim(),
        description: description.trim() || null,
        icon,
        color,
        cadence,
        target_per_period: target,
        habit_type: habitType,
      };

      // Add optional fields safely (only if they exist in DB schema)
      
      if (savedValuePerDay) {
        habitData['saved_value_per_day'] = Number(savedValuePerDay);
        habitData['saved_unit'] = savedUnit || undefined;
      }

      await onSave(habitData as any);
      onClose();
    } catch (err: any) {
      console.error("Save error:", err);
      const msg = err?.message || JSON.stringify(err);
      toast.error(`خطأ في الحفظ: ${msg}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10, filter: "blur(10px)" }}
          animate={{ opacity: 1, scale: 1, y: 0, filter: "blur(0px)" }}
          exit={{ opacity: 0, scale: 0.95, y: 10, filter: "blur(10px)" }}
          transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md"
          onClick={(e) => e.target === e.currentTarget && onClose()}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 10, filter: "blur(10px)" }}
            animate={{ opacity: 1, scale: 1, y: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, scale: 0.95, y: 10, filter: "blur(10px)" }}
            transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1], delay: 0.05 }}
            className="relative bg-[#09090B]/80 backdrop-blur-3xl rounded-[2.5rem] w-full max-w-md overflow-hidden border border-white/10 shadow-[0_0_80px_-20px_rgba(0,0,0,0.5)]"
          >
            {/* Subtle inner top highlight */}
            <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/20 to-transparent" />
            {/* Header with preview */}
            <div className="relative p-8 border-b border-white/5 overflow-hidden">
              <div
                className="absolute inset-0 opacity-20 pointer-events-none"
                style={{ background: `radial-gradient(circle at top right, ${selectedColorHex}40, transparent 70%)` }}
              />
              <div className="relative flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <div
                    className="w-16 h-16 rounded-2xl flex items-center justify-center text-3xl shadow-xl border border-white/10"
                    style={{ background: `linear-gradient(135deg, ${selectedColorHex}33, ${selectedColorHex}11)` }}
                  >
                    {icon}
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-white tracking-tight">
                      {habit ? "تعديل العادة" : "عادة جديدة"}
                    </h2>
                    <p className="text-sm text-white/40 mt-0.5">
                      {title || "اكتب اسم العادة..."}
                    </p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="w-10 h-10 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center transition-colors border border-white/5"
                >
                  <X size={18} className="text-white/60" />
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="p-8 space-y-6 max-h-[70vh] overflow-y-auto scrollbar-thin">
              {/* Title */}
              <div>
                <label className="block text-[11px] font-bold text-white/40 mb-2 uppercase tracking-widest">اسم العادة *</label>
                <input
                  required
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={habitType === 'good' ? "مثال: القراءة لمدة 20 دقيقة" : "مثال: تضييع الوقت على السوشيال ميديا"}
                  className="w-full bg-black/40 border border-white/5 rounded-2xl px-5 py-4 text-white placeholder:text-white/20 focus:outline-none focus:border-white/20 focus:bg-white/5 transition-all text-sm shadow-inner"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-[11px] font-bold text-white/40 mb-2 uppercase tracking-widest">الوصف (اختياري)</label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={habitType === 'good' ? "لماذا تريد بناء هذه العادة؟" : "لماذا تريد تجنب هذه العادة؟"}
                  className="w-full bg-black/40 border border-white/5 rounded-2xl px-5 py-4 text-white placeholder:text-white/20 focus:outline-none focus:border-white/20 focus:bg-white/5 transition-all text-sm shadow-inner"
                />
              </div>

              {/* Icon */}
              <div>
                <label className="block text-[11px] font-bold text-white/40 mb-2 uppercase tracking-widest flex items-center justify-between">
                  <span>الأيقونة</span>
                  <span className="text-[10px] text-white/20">{ICONS.length} أيقونة</span>
                </label>
                <div className="grid grid-cols-7 sm:grid-cols-10 gap-1.5 p-3 bg-black/40 rounded-2xl border border-white/5 max-h-48 overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                  {ICONS.map((i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setIcon(i)}
                      className={`aspect-square rounded-xl text-xl flex items-center justify-center transition-all ${
                        icon === i
                          ? "bg-white/20 scale-110 shadow-lg border border-white/20"
                          : "hover:bg-white/5 hover:scale-110 filter saturate-50 hover:saturate-100 opacity-70 hover:opacity-100"
                      }`}
                    >
                      {i}
                    </button>
                  ))}
                </div>
              </div>

              {/* Color */}
              <div>
                <label className="block text-[11px] font-bold text-white/40 mb-2 uppercase tracking-widest flex items-center justify-between">
                  <span>اللون</span>
                  <span className="text-[10px] text-white/20">{COLORS.length} لون</span>
                </label>
                <div className="grid grid-cols-7 sm:grid-cols-10 gap-2 p-4 bg-black/40 rounded-2xl border border-white/5 max-h-40 overflow-y-auto scrollbar-thin scrollbar-thumb-white/10 scrollbar-track-transparent">
                  {COLORS.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setColor(c.id)}
                      className={`aspect-square rounded-full transition-all relative group ${
                        color === c.id
                          ? "ring-2 ring-white ring-offset-4 ring-offset-[#09090B] scale-110 shadow-lg"
                          : "hover:scale-110 opacity-60 hover:opacity-100"
                      }`}
                      style={{ backgroundColor: c.hex }}
                      title={c.name}
                    >
                      {/* Tooltip */}
                      <span className="absolute -top-8 left-1/2 -translate-x-1/2 bg-black/90 text-white text-[10px] px-2 py-1 rounded-md opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity whitespace-nowrap z-10 border border-white/10">
                        {c.name}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Habit Type Toggle */}
              <div>
                <label className="block text-[11px] font-bold text-white/40 mb-2 uppercase tracking-widest">نوع العادة</label>
                <div className="flex bg-black/40 p-1.5 rounded-2xl border border-white/5">
                  <button
                    type="button"
                    onClick={() => setHabitType('good')}
                    className={`flex-1 py-3 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
                      habitType === 'good' 
                        ? 'bg-green-500/20 text-green-400 shadow-sm border border-green-500/20' 
                        : 'text-white/40 hover:text-white/70 border border-transparent'
                    }`}
                  >
                    <span className="text-lg">🌱</span>
                    عادة جيدة
                  </button>
                  <button
                    type="button"
                    onClick={() => setHabitType('quit')}
                    className={`flex-1 py-3 rounded-xl text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
                      habitType === 'quit' 
                        ? 'bg-red-500/20 text-red-400 shadow-sm border border-red-500/20' 
                        : 'text-white/40 hover:text-white/70 border border-transparent'
                    }`}
                  >
                    <span className="text-lg">🚫</span>
                    عادة سيئة أتركها
                  </button>
                </div>
              </div>

              {/* Advanced toggle */}
              <div className="pt-2">
                <button
                  type="button"
                  onClick={() => setShowAdvanced(!showAdvanced)}
                  className="flex items-center gap-2 text-xs font-semibold text-white/60 hover:text-white transition-colors tracking-wide"
                >
                  <span className={`transform transition-transform ${showAdvanced ? 'rotate-90' : ''}`}>▶</span>
                  {habitType === 'good' ? 'إضافة قيمة مكتسبة / وحدات (اختياري)' : 'إضافة قيمة موفرة / وحدات (اختياري)'}
                </button>
                
                <AnimatePresence>
                  {showAdvanced && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden mt-3"
                    >
                      <div className="flex gap-2">
                        <div className="flex-1">
                          <label className="block text-[11px] font-bold text-white/40 mb-2 uppercase tracking-widest">
                            {habitType === 'good' ? 'القيمة المكتسبة في كل مرة' : 'القيمة الموفرة في كل مرة'}
                          </label>
                          <input
                            type="number"
                            value={savedValuePerDay}
                            onChange={(e) => setSavedValuePerDay(e.target.value)}
                            placeholder="مثال: 2"
                            className="w-full bg-black/40 border border-white/5 rounded-2xl px-5 py-4 text-white placeholder:text-white/20 focus:outline-none focus:border-white/20 focus:bg-white/5 transition-all text-sm shadow-inner"
                          />
                        </div>
                        <div className="w-28">
                          <label className="block text-[11px] font-bold text-white/40 mb-2 uppercase tracking-widest">الوحدة</label>
                          <select
                            value={savedUnit}
                            onChange={(e) => setSavedUnit(e.target.value)}
                            className="w-full bg-black/40 border border-white/5 rounded-2xl px-4 py-4 text-white focus:outline-none focus:border-white/20 focus:bg-white/5 transition-all text-sm appearance-none"
                          >
                            <option value="ساعة">ساعة</option>
                            <option value="جنيه">جنيه</option>
                            <option value="سيجارة">سيجارة</option>
                            <option value="سعر حراري">سعرة</option>
                            <option value="دقيقة">دقيقة</option>
                          </select>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>


              {/* Buttons */}
              <div className="flex gap-4 pt-4 pb-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 bg-white/5 hover:bg-white/10 border border-white/5 text-white/70 px-4 py-4 rounded-2xl transition-all font-semibold text-sm"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={loading || !title.trim()}
                  className="flex-[2] text-white px-4 py-4 rounded-2xl transition-all font-bold text-sm disabled:opacity-40 flex items-center justify-center gap-2 shadow-lg hover:shadow-xl hover:scale-[1.02]"
                  style={{
                    background: `linear-gradient(135deg, ${selectedColorHex}, ${selectedColorHex}dd)`,
                    boxShadow: `0 8px 30px -10px ${selectedColorHex}80`,
                  }}
                >
                  {loading ? (
                    <>
                      <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                      جاري الحفظ...
                    </>
                  ) : (
                    <>
                      <Sparkles size={18} className="opacity-80" />
                      حفظ العادة
                    </>
                  )}
                </button>
              </div>
            </form>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

