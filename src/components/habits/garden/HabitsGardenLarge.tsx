import { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { HabitWithStreak } from "@/hooks/useHabits";
import { getPlantState } from "./plantConfig";
import { calculateTodayProgress, isHabitHandledToday } from "@/lib/habitCalculations";
import { calculateHabitStrength } from "@/lib/habitAnalyticsEngine";
import HabitPlant from "./HabitPlant";
import { Check, Sparkles, Moon, Sun, ChevronDown, Flame, Leaf, Trophy, BookOpen, Snowflake } from "lucide-react";
import { useTranslation } from "react-i18next";

interface HabitsGardenLargeProps {
  habits: HabitWithStreak[];
  onCheckIn: (id: string, dayLocal?: string, action?: "check" | "uncheck") => void;
  onToggleRelapse?: (id: string, currentlyRelapsed: boolean) => void;
}

const PLANT_STAGES = [
  { range: "0-19%", name: "بذرة", emoji: "🌱", desc: "بداية الرحلة — تحتاج لالتزام مبدئي" },
  { range: "20-39%", name: "شتلة", emoji: "🌿", desc: "قوة مبدئية — الالتزام يبدأ يتشكل" },
  { range: "40-59%", name: "نبتة", emoji: "🌾", desc: "النمو الحقيقي — صحة العادة تتحسن" },
  { range: "60-79%", name: "شجيرة", emoji: "🌳", desc: "قوة وثبات — عادة صحية ومستقرة" },
  { range: "80-89%", name: "شجرة", emoji: "🌲", desc: "مناعة قوية — تعافت من الزلات السابقة" },
  { range: "90-100%", name: "غابة ملكية", emoji: "🏕️", desc: "أسطورة! صحة مثالية ومناعة كاملة ضد الانتكاس" },
];

export default function HabitsGardenLarge({ habits, onCheckIn, onToggleRelapse }: HabitsGardenLargeProps) {
  const { t } = useTranslation();
  const [burst, setBurst] = useState<string | null>(null);
  const [showInstructions, setShowInstructions] = useState(false);

  const activeHabits = habits;

  const { isDay, timeIcon } = useMemo(() => {
    const hour = new Date().getHours();
    const d = hour >= 6 && hour < 18;
    return {
      isDay: d,
      timeIcon: d
        ? <Sun size={14} className="text-yellow-400" />
        : <Moon size={14} className="text-blue-300" />,
    };
  }, []);

  const { totalHabits: total, handledCount: doneCount, percentage: pct } = useMemo(
    () => calculateTodayProgress(activeHabits),
    [activeHabits]
  );
  const bestStreak = Math.max(...activeHabits.map(h => h.streak?.longest_streak || 0), 0);
  const totalCheckins = activeHabits.reduce((a, h) => a + (h.streak?.total_checkins || 0), 0);

  const toggle = (habit: HabitWithStreak, isHandled: boolean, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    if (habit.frozenToday) return;
    if (habit.habit_type === "quit") {
      if (habit.relapsedToday) {
        onToggleRelapse?.(habit.id, true);
      } else {
        onCheckIn(habit.id, undefined, isHandled ? "uncheck" : "check");
      }
    } else {
      onCheckIn(habit.id, undefined, isHandled ? "uncheck" : "check");
    }
    if (!isHandled) {
      setBurst(habit.id);
      setTimeout(() => setBurst(null), 700);
    }
  };

  const isAllDone = total > 0 && doneCount === total;
  const [showCelebration, setShowCelebration] = useState(false);

  useEffect(() => {
    if (isAllDone) {
      setShowCelebration(true);
      const timer = setTimeout(() => setShowCelebration(false), 5000);
      return () => clearTimeout(timer);
    } else {
      setShowCelebration(false);
    }
  }, [isAllDone]);

  return (
    <section className="glass rounded-[2rem] relative shadow-2xl flex flex-col transition-all duration-1000 overflow-hidden group">
      {/* Ambient garden glow */}
      <motion.div
        aria-hidden
        className="absolute -bottom-48 left-1/2 -translate-x-1/2 w-[120%] h-96 rounded-[50%] pointer-events-none"
        style={{ background: "radial-gradient(ellipse, rgba(34,197,94,0.15), transparent 70%)" }}
        animate={{ opacity: [0.5, 0.8, 0.5] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
      />

      {/* Floating fireflies */}
      {Array.from({ length: 12 }).map((_, i) => (
        <motion.span
          key={i}
          aria-hidden
          className="absolute w-1.5 h-1.5 rounded-full bg-[#4ADE80] pointer-events-none"
          style={{ left: `${10 + i * 8}%`, top: `${20 + (i % 4) * 20}%`, boxShadow: "0 0 10px #4ADE80" }}
          animate={{ y: [0, -20, 0], opacity: [0.2, 1, 0.2] }}
          transition={{ duration: 3 + i * 0.4, repeat: Infinity, delay: i * 0.3, ease: "easeInOut" }}
        />
      ))}

      {/* All-done celebration */}
      <AnimatePresence>
        {showCelebration && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.9 }}
            className="absolute top-6 left-1/2 -translate-x-1/2 z-50 flex items-center gap-3 bg-gradient-to-r from-emerald-500 to-green-400 text-black px-6 py-3 rounded-full shadow-[0_10px_30px_rgba(52,211,153,0.4)] pointer-events-none"
          >
            <span className="text-2xl">🎉</span>
            <div className="flex flex-col">
              <span className="text-sm font-black leading-tight">حديقتك مكتملة!</span>
              <span className="text-xs text-black/80 font-bold leading-tight">لقد أزهرت جميع عاداتك اليوم</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between p-8 relative z-50 gap-6 backdrop-blur-sm border-b border-white/5">
        <div className="flex items-center gap-4">
          <div className="p-3.5 rounded-2xl bg-white/5 backdrop-blur-xl border border-white/10 shadow-[inset_0_0_20px_rgba(255,255,255,0.05)]">
            {timeIcon}
          </div>
          <div>
            <h2 className="text-3xl font-black text-foreground flex items-center gap-2 tracking-tight">
              {t('habits.garden')}
              <Sparkles size={22} className="text-primary drop-shadow-[0_0_10px_rgba(34,197,94,0.5)]" />
            </h2>
            <p className="text-sm text-muted-foreground mt-1 font-medium">كل نبتة تمثل التزامك اليومي</p>
          </div>
        </div>

        {/* Progress + Stats */}
        <div className="flex items-center gap-5">
          <div className="hidden sm:flex items-center gap-3">
            <div className="flex flex-col items-center p-2.5 rounded-2xl bg-white/5 border border-white/10 min-w-[60px] shadow-lg">
              <Flame size={14} className="text-orange-400 mb-1 drop-shadow-[0_0_8px_rgba(249,115,22,0.5)]" />
              <span className="text-sm font-black text-foreground">{bestStreak}</span>
            </div>
            <div className="flex flex-col items-center p-2.5 rounded-2xl bg-white/5 border border-white/10 min-w-[60px] shadow-lg">
              <Trophy size={14} className="text-amber-400 mb-1 drop-shadow-[0_0_8px_rgba(245,158,11,0.5)]" />
              <span className="text-sm font-black text-foreground">{totalCheckins}</span>
            </div>
          </div>

          <div className="flex flex-col items-end gap-2">
            <div className="text-sm font-black text-foreground tracking-wide">
              <span className="text-primary text-lg">{doneCount}</span>
              <span className="text-muted-foreground"> / {total} منجز</span>
            </div>
            <div className="w-48 h-2.5 rounded-full bg-border overflow-hidden shadow-inner">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-[#15803D] to-[#4ADE80]"
                style={{ boxShadow: "0 0 15px rgba(74,222,128,0.8)" }}
                initial={{ width: 0 }}
                animate={{ width: `${pct}%` }}
                transition={{ type: "spring", damping: 22 }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Grid Container */}
      <div className="relative w-full p-8 min-h-[400px]">
        {activeHabits.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 relative z-10 text-center">
            <div className="w-24 h-24 mb-6 relative">
              <div className="absolute inset-0 bg-green-500/10 rounded-full animate-pulse blur-xl" />
              <div className="absolute inset-0 bg-white/5 border border-white/10 rounded-3xl rotate-3 flex items-center justify-center shadow-2xl backdrop-blur-sm">
                <Leaf size={40} className="text-green-400/60 drop-shadow-lg -rotate-6" />
              </div>
            </div>
            <h3 className="text-2xl font-black text-white mb-3">حديقتك تنتظر البذور الأولى</h3>
            <p className="text-sm text-muted-foreground max-w-md mx-auto leading-relaxed">
              كل عادة عظيمة تبدأ بقرار صغير. أضف عادتك الأولى الآن لتبدأ في زراعة حديقة إنجازاتك اليومية، وراقب نموها مع كل يوم من الالتزام.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-6 max-w-7xl mx-auto relative z-10">
            {activeHabits.map((habit, i) => {
              const strength = calculateHabitStrength(habit);
              const state = getPlantState(
                strength,
                habit.streak?.current_streak || 0,
                habit.streak?.total_checkins || 0
              );
              const isHandled = isHabitHandledToday(habit);
              const isQuit = habit.habit_type === 'quit';

              return (
                <motion.div
                  key={habit.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.05 * i, type: "spring", damping: 18 }}
                  whileHover={{ y: -6 }}
                  className="relative flex flex-col items-center gap-2 p-2 transition cursor-pointer group"
                  onClick={() => toggle(habit, isHandled)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      toggle(habit, isHandled);
                    }
                  }}
                  tabIndex={0}
                  role="button"
                >
                  <div className="relative my-2 flex justify-center items-center">
                    <HabitPlant
                      level={state.visualLevel}
                      isDormant={state.isDormant}
                      sway={!state.isDormant && !habit.frozenToday}
                      habitName={habit.title}
                    />
                    {/* Particle Burst on completion */}
                    <AnimatePresence>
                      {burst === habit.id && (
                        <>
                          {[0, 1, 2, 3, 4, 5, 6].map((p) => (
                            <motion.span
                              key={p}
                              className="absolute left-1/2 top-10 w-2 h-2 rounded-full bg-[#4ADE80] z-50 pointer-events-none"
                              initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
                              animate={{
                                x: Math.cos((p / 7) * Math.PI * 2) * 35,
                                y: Math.sin((p / 7) * Math.PI * 2) * 35 - 15,
                                opacity: 0,
                                scale: 0.1
                              }}
                              transition={{ duration: 0.6, ease: "easeOut" }}
                              style={{ boxShadow: "0 0 10px #4ADE80" }}
                            />
                          ))}
                        </>
                      )}
                    </AnimatePresence>
                  </div>

                  <div className="text-sm font-semibold text-foreground text-center truncate w-full" title={habit.title}>
                    {habit.title}
                  </div>

                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs text-muted-foreground">السلسلة:</span>
                    <motion.div
                      key={habit.streak?.current_streak || 0}
                      initial={{ scale: 1.4, color: "var(--primary)" }}
                      animate={{ scale: 1 }}
                      className="text-sm tabular-nums font-black text-primary"
                    >
                      {habit.streak?.current_streak || 0}
                    </motion.div>
                  </div>

                  <motion.button
                    whileTap={{ scale: 0.85 }}
                    onClick={(e) => toggle(habit, isHandled, e)}
                    tabIndex={-1}
                    className={`relative mt-2 w-7 h-7 rounded-full border-2 flex items-center justify-center transition shadow-md ${
                      habit.frozenToday
                        ? "bg-blue-500 border-blue-400 text-white shadow-[0_0_15px_rgba(59,130,246,0.6)]"
                        : habit.relapsedToday
                        ? "bg-red-500 border-red-400 text-white shadow-[0_0_15px_rgba(239,68,68,0.6)]"
                        : isHandled
                        ? "bg-primary border-primary shadow-[0_0_15px_rgba(34,197,94,0.6)] text-primary-foreground"
                        : "border-primary/30 hover:bg-primary/10 hover:border-primary/60 text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <AnimatePresence>
                      {habit.frozenToday ? (
                        <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
                          <Snowflake size={13} strokeWidth={2.5} />
                        </motion.span>
                      ) : habit.relapsedToday ? (
                        <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
                          <Flame size={13} strokeWidth={2.5} />
                        </motion.span>
                      ) : isHandled ? (
                        <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} exit={{ scale: 0 }}>
                          <Check size={13} strokeWidth={3} />
                        </motion.span>
                      ) : null}
                    </AnimatePresence>
                  </motion.button>
                </motion.div>
              );
            })}
          </div>
        )}
      </div>

      {/* Instructions Panel */}
      <div className="relative z-30 border-t border-white/5 bg-black/20 backdrop-blur-md">
        <button
          onClick={() => setShowInstructions(!showInstructions)}
          className="w-full flex items-center justify-between px-8 py-5 hover:bg-white/5 transition group"
        >
          <div className="flex items-center gap-2 text-foreground/80 group-hover:text-foreground transition">
            <BookOpen size={16} />
            <span className="text-sm font-bold">دليل المزرعة</span>
          </div>
          <motion.div animate={{ rotate: showInstructions ? 180 : 0 }} transition={{ duration: 0.3 }}>
            <ChevronDown size={16} className="text-foreground/80" />
          </motion.div>
        </button>

        <AnimatePresence>
          {showInstructions && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.4, ease: "easeInOut" }}
              className="overflow-hidden"
            >
              <div className="px-8 pb-8 pt-2">
                <p className="text-sm text-muted-foreground mb-6 leading-relaxed">
                  هذه الحديقة تعكس التزامك. كلما حافظت على استمراريتك، زاد حجم النبتة وتطورت.
                </p>
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
                  {PLANT_STAGES.map((stage, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.05 }}
                      className="flex flex-col items-center gap-2 p-4 rounded-2xl bg-white/5 border border-white/5 text-center hover:bg-white/10 hover:border-white/20 transition-all cursor-default shadow-sm"
                    >
                      <span className="text-4xl drop-shadow-md">{stage.emoji}</span>
                      <div className="text-xs font-black text-primary">{stage.name}</div>
                      <div className="text-[10px] text-amber-500 font-bold">{stage.range}</div>
                      <div className="text-[10px] text-muted-foreground leading-tight mt-1">{stage.desc}</div>
                    </motion.div>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
}
