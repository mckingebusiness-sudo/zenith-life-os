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
  { id: "red", hex: "#EF4444", name: "أحمر" },
  { id: "orange", hex: "#F97316", name: "برتقالي" },
  { id: "amber", hex: "#F59E0B", name: "عنبري" },
  { id: "yellow", hex: "#EAB308", name: "أصفر" },
  { id: "lime", hex: "#84CC16", name: "ليموني" },
  { id: "green", hex: "#22C55E", name: "أخضر" },
  { id: "emerald", hex: "#10B981", name: "زمردي" },
  { id: "teal", hex: "#14B8A6", name: "مخضر" },
  { id: "cyan", hex: "#06B6D4", name: "سماوي" },
  { id: "sky", hex: "#0EA5E9", name: "سماوي فاتح" },
  { id: "blue", hex: "#3B82F6", name: "أزرق" },
  { id: "indigo", hex: "#6366F1", name: "نيلي" },
  { id: "violet", hex: "#8B5CF6", name: "بنفسجي فاتح" },
  { id: "purple", hex: "#A855F7", name: "بنفسجي" },
  { id: "fuchsia", hex: "#D946EF", name: "فوشيا" },
  { id: "pink", hex: "#EC4899", name: "وردي" },
  { id: "rose", hex: "#F43F5E", name: "وردي فاتح" },
];

const ICONS = [
  "✨", "📚", "🏃‍♂️", "💧", "🧘‍♂️", "🍎", "💻", "💪", "🛌", "🎵",
  "🧠", "🥗", "🚴‍♂️", "🚶‍♂️", "✍️", "📖", "🎨", "🎯", "💰", "🌱",
  "💊", "🚿", "🧹", "☀️", "🌙", "🚭", "📵", "🤝", "🙏", "🎓",
  "🚗", "✈️", "🍳", "📸", "⚽", "🏀", "🏊‍♂️", "📈", "🌍", "💡"
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
        try { habitData['saved_value_per_day'] = Number(savedValuePerDay); } catch {}
        try { habitData['saved_unit'] = savedUnit || undefined; } catch {}
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
            transition={{ duration: 0.2, ease: "easeOut" }}
            className="glass rounded-3xl w-full max-w-md overflow-hidden border border-white/10"
          >
            {/* Header with preview */}
            <div className="relative p-6 border-b border-white/10 overflow-hidden">
              <div
                className="absolute inset-0 opacity-10"
                style={{ background: `linear-gradient(135deg, ${selectedColorHex}, transparent)` }}
              />
              <div className="relative flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className="w-16 h-16 rounded-3xl flex items-center justify-center text-4xl shadow-xl shadow-black/20"
                    style={{ background: `linear-gradient(135deg, ${selectedColorHex}44, ${selectedColorHex}88)` }}
                  >
                    {icon}
                  </div>
                  <div>
                    <h2 className="text-lg font-bold text-white">
                      {habit ? "تعديل العادة" : "عادة جديدة"}
                    </h2>
                    <p className="text-xs text-white/50">
                      {title || "اكتب اسم العادة..."}
                    </p>
                  </div>
                </div>
                <button
                  onClick={onClose}
                  className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 flex items-center justify-center transition"
                >
                  <X size={16} className="text-white/60" />
                </button>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="p-6 space-y-5">
              {/* Title */}
              <div>
                <label className="block text-xs font-semibold text-[#8B9A90] mb-2 tracking-wide">اسم العادة *</label>
                <input
                  required
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder={habitType === 'good' ? "مثال: القراءة لمدة 20 دقيقة" : "مثال: تضييع الوقت على السوشيال ميديا"}
                  className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/20 focus:outline-none focus:border-green-500/50 focus:ring-1 focus:ring-green-500/20 transition-all"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-semibold text-[#8B9A90] mb-2 tracking-wide">الوصف (اختياري)</label>
                <input
                  type="text"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder={habitType === 'good' ? "لماذا تريد بناء هذه العادة؟" : "لماذا تريد تجنب هذه العادة؟"}
                  className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/20 focus:outline-none focus:border-green-500/50 focus:ring-1 focus:ring-green-500/20 transition-all"
                />
              </div>

              {/* Icon */}
              <div>
                <label className="block text-xs font-semibold text-[#8B9A90] mb-2 tracking-wide">الأيقونة</label>
                <div className="grid grid-cols-10 gap-1.5 max-h-28 overflow-y-auto scrollbar-thin pr-1">
                  {ICONS.map((i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setIcon(i)}
                      className={`w-8 h-8 rounded-lg text-base flex items-center justify-center transition-all ${
                        icon === i
                          ? "bg-white/15 ring-2 ring-white/30 scale-110"
                          : "bg-black/20 hover:bg-white/10"
                      }`}
                    >
                      {i}
                    </button>
                  ))}
                </div>
              </div>

              {/* Color */}
              <div>
                <label className="block text-xs font-semibold text-[#8B9A90] mb-2 tracking-wide">اللون</label>
                <div className="flex flex-wrap gap-2">
                  {COLORS.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => setColor(c.id)}
                      className={`w-7 h-7 rounded-full transition-all ${
                        color === c.id
                          ? "ring-2 ring-white/80 ring-offset-2 ring-offset-black scale-110 shadow-lg"
                          : "hover:scale-110 opacity-60 hover:opacity-100"
                      }`}
                      style={{ backgroundColor: c.hex }}
                      title={c.name}
                    />
                  ))}
                </div>
              </div>

              {/* Habit Type Toggle */}
              <div>
                <label className="block text-xs font-semibold text-[#8B9A90] mb-2 tracking-wide">نوع العادة</label>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => setHabitType('good')}
                    className={`flex-1 py-2 rounded-xl text-xs font-bold transition border ${habitType === 'good' ? 'bg-green-500/20 border-green-500/40 text-green-400' : 'bg-white/5 border-white/10 text-white/50'}`}
                  >
                    ✅ عادة جيدة
                  </button>
                  <button
                    type="button"
                    onClick={() => setHabitType('quit')}
                    className={`flex-1 py-2 rounded-xl text-xs font-bold transition border ${habitType === 'quit' ? 'bg-red-500/20 border-red-500/40 text-red-400' : 'bg-white/5 border-white/10 text-white/50'}`}
                  >
                    🚫 عادة سيئة أتركها
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
                          <label className="block text-xs font-semibold text-[#8B9A90] mb-2 tracking-wide">
                            {habitType === 'good' ? 'القيمة المكتسبة في كل مرة' : 'القيمة الموفرة في كل مرة'}
                          </label>
                          <input
                            type="number"
                            value={savedValuePerDay}
                            onChange={(e) => setSavedValuePerDay(e.target.value)}
                            placeholder="مثال: 2"
                            className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-2.5 text-white placeholder:text-white/20 focus:outline-none focus:border-white/30 transition"
                          />
                        </div>
                        <div className="w-28">
                          <label className="block text-xs font-semibold text-[#8B9A90] mb-2 tracking-wide">الوحدة</label>
                          <select
                            value={savedUnit}
                            onChange={(e) => setSavedUnit(e.target.value)}
                            className="w-full bg-black/30 border border-white/10 rounded-xl px-3 py-2.5 text-white focus:outline-none focus:border-white/30 transition"
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
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 bg-white/5 hover:bg-white/10 border border-white/10 text-white/70 px-4 py-3 rounded-xl transition font-medium"
                >
                  إلغاء
                </button>
                <button
                  type="submit"
                  disabled={loading || !title.trim()}
                  className="flex-1 text-white px-4 py-3 rounded-xl transition font-medium disabled:opacity-40 flex items-center justify-center gap-2"
                  style={{
                    background: `linear-gradient(135deg, ${selectedColorHex}, ${selectedColorHex}cc)`,
                    boxShadow: `0 4px 20px ${selectedColorHex}30`,
                  }}
                >
                  {loading ? (
                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <Sparkles size={16} />
                      حفظ
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

