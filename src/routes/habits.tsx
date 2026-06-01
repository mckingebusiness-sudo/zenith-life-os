import { createFileRoute } from "@tanstack/react-router";
import { useHabits, HabitWithStreak, Habit } from "@/hooks/useHabits";
import { HabitMonthlyGrid } from "@/components/habits/HabitMonthlyGrid";
import { HabitModal } from "@/components/habits/HabitModal";
import { HabitsAnalytics } from "@/components/habits/HabitsAnalytics";
import HabitsGardenLarge from "@/components/habits/garden/HabitsGardenLarge";
import { HabitBlueprintsModal } from "@/components/habits/HabitBlueprintsModal";
import { AITicker } from "@/components/habits/AITicker";
import { ChevronRight, ChevronLeft, Plus, Calendar, Sparkles, Loader2, LayoutGrid, Download, Bookmark, RefreshCcw } from "lucide-react";
import { useState, useEffect, useRef, Component } from "react";
import { supabase } from "@/lib/supabase";
import { motion } from "framer-motion";
import { toast } from "sonner";
import { useQueryClient } from "@tanstack/react-query";
import confetti from "canvas-confetti";

export const Route = createFileRoute("/habits")({
  component: HabitsPage,
});

// ─── Phase 7.5: Error Boundary ───────────────────────────────────────────────
class HabitsErrorBoundary extends Component<
  { children: React.ReactNode },
  { hasError: boolean }
> {
  constructor(props: { children: React.ReactNode }) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
          <div className="text-4xl">⚠️</div>
          <h2 className="text-xl font-bold text-white">حدث خطأ غير متوقع</h2>
          <p className="text-[#A7B3AB] text-sm">لم يتم تحميل قسم العادات بشكل صحيح.</p>
          <button
            onClick={() => this.setState({ hasError: false })}
            className="flex items-center gap-2 px-6 py-2.5 bg-white/10 hover:bg-white/15 rounded-xl transition text-white/70 text-sm"
          >
            <RefreshCcw size={16} /> إعادة تحميل القسم
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

function HabitsPage() {
  const qc = useQueryClient();
  const [currentDate, setCurrentDate] = useState(new Date());
  const { habits, isLoading, error, checkIn, addHabit, addHabitAsync, updateHabit, updateHabitAsync, deleteHabit, freezeHabit, resetStreak } = useHabits(currentDate);
  const [burst, setBurst] = useState<string | null>(null);
  const [isBlueprintsOpen, setIsBlueprintsOpen] = useState(false);
  const confettiFiredRef = useRef<string | null>(null);

  const [currentTime, setCurrentTime] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);


  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingHabit, setEditingHabit] = useState<HabitWithStreak | null>(null);

  const isCurrentMonth = currentDate.getMonth() === new Date().getMonth() && currentDate.getFullYear() === new Date().getFullYear();

  // Phase 7.4 — Fire confetti on 100% daily completion (once per day)
  useEffect(() => {
    const isCurrentMonth = currentDate.getMonth() === new Date().getMonth() &&
      currentDate.getFullYear() === new Date().getFullYear();
    if (!isCurrentMonth || habits.length === 0) return;
    const totalItems = habits.length;
    const totalSuccess = habits.filter(h => h.checkedToday).length;
    const pct = totalItems > 0 ? Math.round((totalSuccess / totalItems) * 100) : 0;
    const todayStr = new Intl.DateTimeFormat("en-CA").format(new Date());
    const key = `confetti_fired_${todayStr}`;
    if (pct === 100 && confettiFiredRef.current !== todayStr && !localStorage.getItem(key)) {
      confettiFiredRef.current = todayStr;
      localStorage.setItem(key, "1");
      confetti({
        particleCount: 160,
        spread: 80,
        origin: { y: 0.6 },
        colors: ["#4ADE80", "#22D3EE", "#F59E0B", "#EC4899"],
      });
    }
  }, [habits, currentDate]);

  const handleCheckIn = (id: string, dayLocal?: string, action?: "check" | "uncheck") => {
    checkIn(id, dayLocal, action);
    if (action === "check" || !action) {
      setBurst(`${id}-${dayLocal || new Intl.DateTimeFormat("en-CA").format(new Date())}`);
      setTimeout(() => setBurst(null), 500);
    }
  };

  // Awaits the actual DB save so the modal loading state is accurate
  const handleSaveHabit = async (habitData: Partial<Habit>): Promise<void> => {
    if (editingHabit) {
      await updateHabitAsync(editingHabit.id, habitData);
    } else {
      await addHabitAsync(habitData);
    }
  };


  const openAddModal = () => {
    setEditingHabit(null);
    setIsModalOpen(true);
  };

  const openEditModal = (habit: HabitWithStreak) => {
    setEditingHabit(habit);
    setIsModalOpen(true);
  };

  const handleGenerateDummies = async () => {
    try {
      const dummyHabits = [
        { title: "القراءة لمدة 20 دقيقة", icon: "📚", color: "blue", cadence: "daily", target_per_period: 1, sort_order: 1 },
        { title: "شرب 3 لتر ماء", icon: "💧", color: "cyan", cadence: "daily", target_per_period: 1, sort_order: 2 },
        { title: "المشي 10 آلاف خطوة", icon: "🚶‍♂️", color: "green", cadence: "daily", target_per_period: 1, sort_order: 3 },
        { title: "التأمل", icon: "🧘‍♂️", color: "violet", cadence: "daily", target_per_period: 1, sort_order: 4 },
        { title: "أكل صحي", icon: "🥗", color: "emerald", cadence: "daily", target_per_period: 1, sort_order: 5 },
        { title: "النوم 8 ساعات", icon: "🛌", color: "indigo", cadence: "daily", target_per_period: 1, sort_order: 6 },
        { title: "تعلم مهارة جديدة", icon: "🧠", color: "orange", cadence: "daily", target_per_period: 1, sort_order: 7 },
        { title: "تمرين رياضي", icon: "💪", color: "red", cadence: "daily", target_per_period: 1, sort_order: 8 },
        { title: "الاستيقاظ مبكراً", icon: "☀️", color: "yellow", cadence: "daily", target_per_period: 1, sort_order: 9 },
        { title: "الامتنان", icon: "🙏", color: "rose", cadence: "daily", target_per_period: 1, sort_order: 10 },
      ];

      const { data: authData } = await supabase.auth.getSession();
      if (!authData.session) throw new Error("Not logged in");
      const userId = authData.session.user.id;

      const habitsToInsert = dummyHabits.map(h => ({
        ...h,
        user_id: userId,
        active_weekdays: [0, 1, 2, 3, 4, 5, 6],
        grace_days: 0,
        is_private: false
      }));

      await supabase.from("habits").insert(habitsToInsert);
      qc.invalidateQueries({ queryKey: ["habits"] });
    } catch (err) {
      console.error(err);
      toast.error("حدث خطأ في إضافة العادات");
    }
  };

  const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  const nextMonth = () => {
    if (!isCurrentMonth) {
      setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] gap-4">
        <motion.div
          animate={{ rotate: 360 }}
          transition={{ repeat: Infinity, duration: 1, ease: "linear" }}
        >
          <Loader2 size={36} className="text-green-400" />
        </motion.div>
        <p className="text-[#A7B3AB] text-sm">جاري تحميل العادات...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-red-500 gap-4">
        <div className="text-xl font-bold">⚠️ حدث خطأ أثناء تحميل العادات</div>
        <p className="text-sm text-white/50 max-w-md text-center">تأكد من اتصال الإنترنت وأعد المحاولة</p>
        <pre className="text-xs bg-black/40 p-4 rounded-xl text-left dir-ltr max-w-lg overflow-auto">
          {error.message}
        </pre>
        <button
          onClick={() => qc.invalidateQueries({ queryKey: ["habits"] })}
          className="px-6 py-2.5 bg-white/10 hover:bg-white/15 rounded-xl transition text-white/70 text-sm"
        >
          إعادة المحاولة
        </button>
      </div>
    );
  }

  return (
    <HabitsErrorBoundary>
      <div className="space-y-8 max-w-[1600px] mx-auto px-4 lg:px-8 pb-16">
        {/* ─── Top Header ─── */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 glass p-5 rounded-2xl border border-white/[0.06] relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-r from-green-500/5 via-transparent to-transparent" />
          <div className="relative flex items-center gap-4">
            <div className="bg-gradient-to-br from-green-500/20 to-emerald-500/10 p-3.5 rounded-2xl border border-green-500/10">
              <Calendar className="text-green-400" size={24} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-white flex items-center gap-2">
                سجل العادات
                <Sparkles size={16} className="text-green-400/60" />
              </h1>
              <p className="text-sm text-[#8B9A90] mt-0.5">
                {currentTime.toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                {" \u2022 "}
                {currentTime.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>

          <div className="relative flex items-center gap-3">
            {/* Month Navigation */}
            <div className="flex items-center gap-1 bg-black/30 p-1 rounded-xl border border-white/5">
              <button
                onClick={prevMonth}
                className="w-9 h-9 flex items-center justify-center hover:bg-white/10 rounded-lg transition text-[#8B9A90] hover:text-white"
              >
                <ChevronRight size={18} />
              </button>
              <div className="w-36 text-center font-bold text-white text-sm px-2">
                {currentDate.toLocaleDateString('ar-EG', { month: 'long', year: 'numeric' })}
              </div>
              <button
                onClick={nextMonth}
                disabled={isCurrentMonth}
                className="w-9 h-9 flex items-center justify-center hover:bg-white/10 rounded-lg transition text-[#8B9A90] hover:text-white disabled:opacity-20 disabled:pointer-events-none"
              >
                <ChevronLeft size={18} />
              </button>
            </div>

            {/* Blueprints Button */}
            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => setIsBlueprintsOpen(true)}
              className="flex items-center gap-2 bg-white/5 hover:bg-white/10 text-white/70 px-4 py-2.5 rounded-xl transition border border-white/10"
            >
              <LayoutGrid size={16} />
              <span className="hidden sm:inline">قوالب</span>
            </motion.button>

            {/* Save as Template Button */}
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                if (!habits.length) {
                  toast.error("لا يوجد عادات لحفظها!");
                  return;
                }
                // Use a mutable object so the onChange handler captures the latest value
                const nameRef = { current: 'قالب مخصص' };
                toast.custom((t) => (
                  <div className="bg-[#121413] border border-white/10 p-4 rounded-xl shadow-xl max-w-sm w-[300px]">
                    <h3 className="text-white font-bold mb-2">اسم القالب</h3>
                    <input
                      type="text"
                      defaultValue={nameRef.current}
                      onChange={(e) => { nameRef.current = e.target.value; }}
                      className="w-full bg-black/30 border border-white/10 rounded-lg p-2 text-white text-sm mb-4 outline-none focus:border-green-500/50 transition-colors"
                      autoFocus
                    />
                    <div className="flex gap-2 justify-end">
                      <button onClick={() => toast.dismiss(t)} className="px-3 py-1.5 text-sm rounded-lg bg-white/5 hover:bg-white/10 text-white transition-colors">إلغاء</button>
                      <button onClick={() => {
                        const name = nameRef.current.trim();
                        if (!name) return;
                        const templates = JSON.parse(localStorage.getItem('zenith_custom_templates') || '[]');
                        const newTemplate = {
                          id: Date.now().toString(),
                          name,
                          habits: habits.map(h => ({ title: h.title, icon: h.icon, color: h.color, type: (h as any).habit_type || 'good' }))
                        };
                        localStorage.setItem('zenith_custom_templates', JSON.stringify([...templates, newTemplate]));
                        toast.success(`تم حفظ «${name}» كقالب بنجاح!`);
                        toast.dismiss(t);
                      }} className="px-3 py-1.5 text-sm rounded-lg bg-green-500 hover:bg-green-600 text-white transition-colors">حفظ</button>
                    </div>
                  </div>
                ), { duration: Infinity });
              }}
              className="flex items-center gap-2 px-4 py-2 bg-[#2D332F]/50 hover:bg-[#2D332F] text-[#8B9A90] rounded-xl border border-white/5 transition-all"
            >
              <Bookmark size={18} />
              <span className="hidden sm:inline">حفظ كقالب</span>
            </motion.button>

            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={openAddModal}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-400 hover:to-emerald-400 text-white rounded-xl shadow-lg shadow-green-500/20 transition-all font-semibold"
            >
              <Plus size={20} />
              <span className="hidden sm:inline">عادة جديدة</span>
            </motion.button>
          </div>
        </motion.div>

        {habits.length === 0 ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass rounded-3xl p-16 text-center flex flex-col items-center border border-white/[0.06]"
          >
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-green-500/10 to-emerald-500/5 flex items-center justify-center mb-6 text-4xl">
              ✨
            </div>
            <h3 className="text-2xl font-bold mb-2">ابدأ رحلة التطوير</h3>
            <p className="text-[#8B9A90] mb-8 max-w-sm">أضف عاداتك اليومية وتابع تقدمك. كل عادة صغيرة تصنع فرقاً كبيراً!</p>
            <div className="flex gap-4">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={openAddModal}
                className="flex items-center gap-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white px-8 py-3 rounded-xl transition-all font-medium shadow-lg shadow-green-900/30"
              >
                <Plus size={18} />
                إضافة عادة
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleGenerateDummies}
                className="flex items-center gap-2 bg-white/5 hover:bg-white/10 text-white/70 px-8 py-3 rounded-xl transition font-medium border border-white/10"
              >
                <Sparkles size={16} />
                10 عادات تجريبية
              </motion.button>
            </div>
          </motion.div>
        ) : (
          <div className="space-y-8">
            <HabitMonthlyGrid
              habits={habits}
              currentDate={currentDate}
              onCheckIn={handleCheckIn}
              onEdit={openEditModal}
              onDelete={deleteHabit}
              onUndelete={async (id) => {
                await updateHabit(id, { is_deleted: false } as any);
              }}
              onFreeze={freezeHabit}
              burstId={burst}
              onResetStreak={resetStreak}
            />
            <HabitsAnalytics habits={habits} currentDate={currentDate} />
            <HabitsGardenLarge habits={habits} onCheckIn={handleCheckIn} />
            <AITicker habits={habits} />
          </div>
        )}

        <HabitModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSave={handleSaveHabit}
          habit={editingHabit}
        />
        <HabitBlueprintsModal
          isOpen={isBlueprintsOpen}
          onClose={() => setIsBlueprintsOpen(false)}
          addHabit={addHabitAsync}
        />
      </div>
    </HabitsErrorBoundary>
  );
}

