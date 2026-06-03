import { createFileRoute } from "@tanstack/react-router";
import { useHabits, HabitWithStreak, Habit } from "@/hooks/useHabits";
import { calculateTodayProgress } from "@/lib/habitCalculations";
import { HabitMonthlyGrid } from "@/components/habits/HabitMonthlyGrid";
import { HabitModal } from "@/components/habits/HabitModal";
import { HabitsAnalytics } from "@/components/habits/HabitsAnalytics";
import HabitsGardenLarge from "@/components/habits/garden/HabitsGardenLarge";
import { BadHabitsTracker } from "@/components/habits/BadHabitsTracker";
import { HabitBlueprintsModal } from "@/components/habits/HabitBlueprintsModal";
import { AITicker } from "@/components/habits/AITicker";
import { DailyMoodCheckIn } from "@/components/habits/DailyMoodCheckIn";
import { ChevronRight, ChevronLeft, Plus, Calendar, Sparkles, Loader2, LayoutGrid, Download, Bookmark, RefreshCcw, HelpCircle, X, Shield, Flame, Snowflake, AlertTriangle } from "lucide-react";
import { useState, useEffect, useRef, Component } from "react";
import { supabase } from "@/lib/supabase";
import { motion, AnimatePresence } from "framer-motion";
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
  const { habits, isLoading, error, checkIn, addHabit, addHabitAsync, bulkAddHabits, updateHabit, updateHabitAsync, deleteHabit, undeleteHabit, freezeHabit, resetStreak, undoRelapse } = useHabits(currentDate);
  const [burst, setBurst] = useState<string | null>(null);
  const [isBlueprintsOpen, setIsBlueprintsOpen] = useState(false);
  const confettiFiredRef = useRef<string | null>(null);

  const [currentTime, setCurrentTime] = useState(new Date());
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);


  const [isModalOpen, setIsModalOpen] = useState(false);
  const [showGuideModal, setShowGuideModal] = useState(false);
  const [editingHabit, setEditingHabit] = useState<HabitWithStreak | null>(null);

  const isCurrentMonth = currentDate.getMonth() === new Date().getMonth() && currentDate.getFullYear() === new Date().getFullYear();

  // Phase 7.4 — Fire confetti on 100% daily completion (once per day)
  useEffect(() => {
    const isCurrentMonth = currentDate.getMonth() === new Date().getMonth() &&
      currentDate.getFullYear() === new Date().getFullYear();
    if (!isCurrentMonth || habits.length === 0) return;
    
    const progress = calculateTodayProgress(habits);
    const pct = progress.percentage;
    
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


  const handleToggleRelapse = async (id: string, currentlyRelapsed: boolean) => {
    if (currentlyRelapsed) {
      await undoRelapse(id);
    } else {
      await resetStreak(id, "من الحديقة");
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
      const monthStr = new Intl.DateTimeFormat("en-CA").format(currentDate).slice(0, 7);
      qc.invalidateQueries({ queryKey: ["habits", monthStr] });
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
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-6 bg-black/40 backdrop-blur-2xl p-6 rounded-3xl border border-white/10 shadow-[0_8px_30px_rgb(0,0,0,0.5)] relative overflow-hidden group"
          >
            {/* Subtle animated background glow */}
            <div className="absolute -inset-1 bg-gradient-to-r from-green-500/10 via-emerald-500/5 to-transparent blur-2xl opacity-50 group-hover:opacity-100 transition-opacity duration-700" />
            
            <div className="relative flex items-center gap-5">
              <div className="relative">
                <div className="absolute inset-0 bg-green-500/20 blur-xl rounded-full" />
                <div className="relative bg-gradient-to-br from-green-400/20 to-emerald-600/20 p-4 rounded-2xl border border-green-500/30 shadow-inner">
                  <Calendar className="text-green-400" size={28} />
                </div>
              </div>
              <div>
                <h1 className="text-2xl font-black text-white flex items-center gap-2 tracking-tight">
                  {t('habits.title')}
                  <button 
                    onClick={() => setShowGuideModal(true)}
                    className="mr-2 text-white/30 hover:text-white/80 transition-colors p-1 rounded-full hover:bg-white/10"
                    title="كيف تعمل الحديقة؟"
                  >
                    <HelpCircle size={18} />
                  </button>
                  <Sparkles size={18} className="text-green-400/80 animate-pulse mr-1" />
                </h1>
                <p className="text-sm font-medium text-[#A7B3AB] mt-1.5 flex items-center gap-2">
                  <span>{currentTime.toLocaleDateString('ar-EG', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
                  <span className="w-1 h-1 rounded-full bg-white/20" />
                  <span className="text-white/60">{currentTime.toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}</span>
                </p>
              </div>
            </div>

            <div className="relative flex items-center gap-4 w-full sm:w-auto">
              {/* Month Navigation */}
              <div className="flex items-center gap-1 bg-black/50 p-1.5 rounded-2xl border border-white/5 backdrop-blur-md shadow-inner flex-1 sm:flex-none justify-between sm:justify-start">
                <button
                  onClick={prevMonth}
                  className="w-10 h-10 flex items-center justify-center hover:bg-white/10 rounded-xl transition-all text-white/50 hover:text-white"
                >
                  <ChevronRight size={20} />
                </button>
                <div className="w-32 text-center font-bold text-white text-sm px-2 tracking-wide">
                  {currentDate.toLocaleDateString('ar-EG', { month: 'long', year: 'numeric' })}
                </div>
                <button
                  onClick={nextMonth}
                  disabled={isCurrentMonth}
                  className="w-10 h-10 flex items-center justify-center hover:bg-white/10 rounded-xl transition-all text-white/50 hover:text-white disabled:opacity-20 disabled:pointer-events-none"
                >
                  <ChevronLeft size={20} />
                </button>
              </div>

              <motion.button
                whileHover={{ scale: 1.02, y: -2 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => setIsBlueprintsOpen(true)}
                className="flex items-center justify-center gap-2 px-4 py-3.5 bg-white/5 hover:bg-white/10 text-white rounded-2xl border border-white/10 transition-all font-bold"
              >
                <Sparkles size={18} className="text-yellow-400" />
                <span className="hidden sm:inline">قوالب جاهزة</span>
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.02, y: -2 }}
                whileTap={{ scale: 0.98 }}
                onClick={openAddModal}
                className="flex items-center justify-center gap-2 px-5 py-3.5 bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-400 hover:to-emerald-500 text-white rounded-2xl shadow-[0_0_20px_rgba(34,197,94,0.3)] hover:shadow-[0_0_30px_rgba(34,197,94,0.5)] transition-all font-bold"
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
            <div className="print:hidden space-y-8">
              <DailyMoodCheckIn />
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
                onUndoRelapse={undoRelapse}
            />
            </div>
            <HabitsAnalytics habits={habits} currentDate={currentDate} />
            <div className="print:hidden space-y-8">
              <HabitsGardenLarge habits={habits} onCheckIn={handleCheckIn} onToggleRelapse={handleToggleRelapse} />
            </div>
            
            {/* Visual Separator as requested by user */}
            <div className="print:hidden w-full flex items-center justify-center py-8">
              <div className="w-1/3 h-px bg-gradient-to-r from-transparent via-white/10 to-transparent"></div>
            </div>

            <div className="print:hidden mt-8">
              <BadHabitsTracker
                habits={habits}
                onResetStreak={resetStreak}
                onUndoRelapse={undoRelapse}
              />
            </div>
            <div className="print:hidden">
              <AITicker habits={habits} />
            </div>
          </div>
        )}

      {/* ─── Guide Modal ─── */}
      <AnimatePresence>
        {showGuideModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4 overflow-y-auto">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 bg-black/60 backdrop-blur-sm"
              onClick={() => setShowGuideModal(false)}
            />
            <motion.div
              initial={{ scale: 0.95, opacity: 0, y: 10 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.95, opacity: 0, y: -10 }}
              className="relative w-full max-w-lg bg-[#0F1412] rounded-3xl border border-white/10 shadow-2xl overflow-hidden my-8 flex flex-col max-h-[90vh]"
            >
              <div className="p-6 border-b border-white/5 flex items-center justify-between sticky top-0 bg-[#0F1412]/80 backdrop-blur z-10 shrink-0">
                <div>
                  <h2 className="text-xl font-bold text-white mb-1">دليل الحديقة المبسط</h2>
                  <p className="text-sm text-white/50">كيفية استخدام نظام العادات والسلاسل</p>
                </div>
                <button
                  onClick={() => setShowGuideModal(false)}
                  className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 flex items-center justify-center text-white/70 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="p-6 overflow-y-auto space-y-4">
                <div className="flex gap-4 p-4 rounded-2xl bg-white/[0.02] border border-white/5">
                  <div className="w-10 h-10 rounded-xl bg-green-500/10 text-green-400 flex items-center justify-center shrink-0">
                    <Sparkles size={20} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white mb-1">العادة الجيدة</h3>
                    <p className="text-xs text-[#A7B3AB] leading-relaxed">
                      وهي العادة التي تتطلب منك فعلاً إيجابياً خلال اليوم. اضغط عليها لإنجازها وستظهر باللون الأخضر.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4 p-4 rounded-2xl bg-white/[0.02] border border-white/5">
                  <div className="w-10 h-10 rounded-xl bg-teal-500/10 text-teal-400 flex items-center justify-center shrink-0">
                    <Shield size={20} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white mb-1">العادة السيئة</h3>
                    <p className="text-xs text-[#A7B3AB] leading-relaxed">
                      تنجح تلقائياً بنهاية اليوم إن لم تنتكس (مجرد الامتناع يكفي)، وتأخذ مساراً تلقائياً إلا إذا قمت بكسرها.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4 p-4 rounded-2xl bg-white/[0.02] border border-white/5">
                  <div className="w-10 h-10 rounded-xl bg-red-500/10 text-red-400 flex items-center justify-center shrink-0">
                    <AlertTriangle size={20} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white mb-1">الانتكاسة (Relapse)</h3>
                    <p className="text-xs text-[#A7B3AB] leading-relaxed">
                      في حال فعلت العادة السيئة، اضغط زر ⚠️ لتسجيل الانتكاسة، وسيحمر المربع دلالة على الخطأ.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4 p-4 rounded-2xl bg-white/[0.02] border border-white/5">
                  <div className="w-10 h-10 rounded-xl bg-orange-500/10 text-orange-400 flex items-center justify-center shrink-0">
                    <Flame size={20} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white mb-1">السلسلة (الستريك)</h3>
                    <p className="text-xs text-[#A7B3AB] leading-relaxed">
                      عداد يحسب أيام التزامك المتتالية. الانقطاع لأي سبب يعيد هذا العداد للصفر لتبدأ من جديد.
                    </p>
                  </div>
                </div>

                <div className="flex gap-4 p-4 rounded-2xl bg-white/[0.02] border border-white/5">
                  <div className="w-10 h-10 rounded-xl bg-blue-500/10 text-blue-400 flex items-center justify-center shrink-0">
                    <Snowflake size={20} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white mb-1">التجميد (Freeze)</h3>
                    <p className="text-xs text-[#A7B3AB] leading-relaxed">
                      استخدم التجميد لحماية سلسلتك في الأيام التي تصاب فيها بمرض أو ظروف تمنعك من إنجاز عادتك، يحافظ على رقم الستريك بدون زيادته.
                    </p>
                  </div>
                </div>
              </div>

              <div className="p-4 border-t border-white/5 shrink-0 bg-[#0F1412]">
                <button
                  onClick={() => setShowGuideModal(false)}
                  className="w-full py-3 bg-white/10 hover:bg-white/15 text-white font-bold rounded-xl transition-colors"
                >
                  فهمت، شكراً
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

        <HabitModal
          isOpen={isModalOpen}
          onClose={() => setIsModalOpen(false)}
          onSave={handleSaveHabit}
          habit={editingHabit}
        />
        <HabitBlueprintsModal
          isOpen={isBlueprintsOpen}
          onClose={() => setIsBlueprintsOpen(false)}
          bulkAddHabits={bulkAddHabits}
        />
      </div>
    </HabitsErrorBoundary>
  );
}

