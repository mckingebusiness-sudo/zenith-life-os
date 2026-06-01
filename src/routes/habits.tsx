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
import { useTranslation } from "react-i18next";

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
  const { t } = useTranslation();
  const qc = useQueryClient();
  const [currentDate, setCurrentDate] = useState(new Date());
  const { habits, isLoading, error, checkIn, addHabit, addHabitAsync, updateHabit, updateHabitAsync, deleteHabit, undeleteHabit, freezeHabit, resetStreak } = useHabits(currentDate);
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
        <div className="print:hidden">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 glass p-5 rounded-2xl border border-border relative overflow-hidden"
          >
          <div className="absolute inset-0 bg-primary/5 via-transparent to-transparent opacity-50" />
          <div className="relative flex items-center gap-4">
            <div className="bg-primary/10 p-3.5 rounded-2xl border border-primary/10">
              <Calendar className="text-primary" size={24} />
            </div>
            <div>
              <h1 className="text-xl font-bold text-foreground flex items-center gap-2">
                {t('habits.title')}
                <Sparkles size={16} className="text-primary/60" />
              </h1>
              <p className="text-sm text-muted-foreground mt-0.5">
                {currentTime.toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                {" \u2022 "}
                {currentTime.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}
              </p>
            </div>
          </div>

          <div className="relative flex items-center gap-3">
            {/* Month Navigation */}
            <div className="flex items-center gap-1 bg-foreground/5 p-1 rounded-xl border border-border">
              <button
                onClick={prevMonth}
                className="w-9 h-9 flex items-center justify-center hover:bg-foreground/10 rounded-lg transition text-muted-foreground hover:text-foreground"
              >
                <ChevronRight size={18} />
              </button>
              <div className="w-36 text-center font-bold text-foreground text-sm px-2">
                {currentDate.toLocaleDateString('ar-EG', { month: 'long', year: 'numeric' })}
              </div>
              <button
                onClick={nextMonth}
                disabled={isCurrentMonth}
                className="w-9 h-9 flex items-center justify-center hover:bg-foreground/10 rounded-lg transition text-muted-foreground hover:text-foreground disabled:opacity-20 disabled:pointer-events-none"
              >
                <ChevronLeft size={18} />
              </button>
            </div>



            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={openAddModal}
              className="flex items-center gap-2 px-4 py-2 bg-primary hover:bg-primary/90 text-primary-foreground rounded-xl shadow-lg transition-all font-semibold"
            >
              <Plus size={20} />
              <span className="hidden sm:inline">{t('habits.newHabit')}</span>
            </motion.button>
          </div>
        </motion.div>
        </div>

        {habits.length === 0 ? (
          <div className="print:hidden">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass rounded-3xl p-16 text-center flex flex-col items-center border border-border"
            >
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-green-500/10 to-emerald-500/5 flex items-center justify-center mb-6 text-4xl">
              ✨
            </div>
            <h3 className="text-2xl font-bold mb-2 text-foreground">{t('habits.startJourney')}</h3>
            <p className="text-muted-foreground mb-8 max-w-sm">{t('habits.startJourneyDesc')}</p>
            <div className="flex gap-4">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={openAddModal}
                className="flex items-center gap-2 bg-primary hover:bg-primary/90 text-primary-foreground px-8 py-3 rounded-xl transition-all font-medium shadow-lg"
              >
                <Plus size={18} />
                {t('habits.addHabit')}
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={handleGenerateDummies}
                className="flex items-center gap-2 bg-foreground/5 hover:bg-foreground/10 text-muted-foreground px-8 py-3 rounded-xl transition font-medium border border-border"
              >
                <Sparkles size={16} />
                {t('habits.dummyHabits')}
              </motion.button>
            </div>
          </motion.div>
          </div>
        ) : (
          <div className="space-y-8">
            <div className="print:hidden">
              <HabitMonthlyGrid
                habits={habits}
                currentDate={currentDate}
                onCheckIn={handleCheckIn}
                onEdit={openEditModal}
                onDelete={deleteHabit}
                onUndelete={undeleteHabit}
                onFreeze={freezeHabit}
                burstId={burst}
                onResetStreak={resetStreak}
            />
            </div>
            <HabitsAnalytics habits={habits} currentDate={currentDate} />
            <div className="print:hidden">
              <HabitsGardenLarge habits={habits} onCheckIn={handleCheckIn} />
            </div>
            <div className="print:hidden">
              <AITicker habits={habits} />
            </div>
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

