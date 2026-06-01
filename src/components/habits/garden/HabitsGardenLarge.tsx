import { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { HabitWithStreak } from "@/hooks/useHabits";
import { getPlantState } from "./plantConfig";
import { calculateTodayProgress, isHabitHandledToday } from "@/lib/habitCalculations";
import HabitPlant from "./HabitPlant";
import { Check, Sparkles, Moon, Sun, Info, ChevronDown, ChevronUp, Flame, Leaf, Trophy, BookOpen, Snowflake, Shield } from "lucide-react";
import { useTranslation } from "react-i18next";

const COLORS: Record<string, string> = {
  red: "#EF4444",
  orange: "#F97316",
  amber: "#F59E0B",
  yellow: "#EAB308",
  lime: "#84CC16",
  green: "#22C55E",
  emerald: "#10B981",
  teal: "#14B8A6",
  cyan: "#06B6D4",
  sky: "#0EA5E9",
  blue: "#3B82F6",
  indigo: "#6366F1",
  violet: "#8B5CF6",
  purple: "#A855F7",
  fuchsia: "#D946EF",
  pink: "#EC4899",
  rose: "#F43F5E",
};

interface HabitsGardenLargeProps {
  habits: HabitWithStreak[];
  onCheckIn: (id: string, dayLocal?: string, action?: "check" | "uncheck") => void;
  onToggleRelapse?: (id: string, currentlyRelapsed: boolean) => void;
}

const PLANT_STAGES = [
  { range: "0–2 يوم", name: "بذرة", emoji: "🌱", desc: "بداية الرحلة — البذرة تنتظر الاهتمام" },
  { range: "3–6 أيام", name: "شتلة", emoji: "🌿", desc: "الجذور تمتد — الالتزام يبدأ يتشكل" },
  { range: "7–20 يوم", name: "نبتة", emoji: "🌾", desc: "النمو الحقيقي — عادة راسخة تتشكل" },
  { range: "21–59 يوم", name: "شجيرة", emoji: "🌳", desc: "قوة وثبات — أنت تتغير فعلاً" },
  { range: "60–149 يوم", name: "شجرة", emoji: "🌲", desc: "الثمار تبدأ — عادة متأصلة عميقاً" },
  { range: "150+ يوم", name: "غابة ملكية", emoji: "🏕️", desc: "أسطورة! هذه العادة جزء من هويتك" },
];

export default function HabitsGardenLarge({ habits, onCheckIn, onToggleRelapse }: HabitsGardenLargeProps) {
  const { t } = useTranslation();
  const [selectedHabit, setSelectedHabit] = useState<string | null>(null);
  const [burst, setBurst] = useState<string | null>(null);
  const [showInstructions, setShowInstructions] = useState(false);

  const activeHabits = habits;
  const today = new Date();
  const todayLocal = new Intl.DateTimeFormat("en-CA").format(today);

  const { isDay, timeIcon } = useMemo(() => {
    const hour = new Date().getHours();
    const isDay = hour >= 6 && hour < 18;
    return { isDay, timeIcon: isDay ? <Sun size={14} className="text-yellow-400" /> : <Moon size={14} className="text-blue-300" /> };
  }, []);

  const { totalHabits: total, handledCount: doneCount, percentage: pct } = useMemo(() => calculateTodayProgress(activeHabits), [activeHabits]);
  const avgStreak = total > 0 ? Math.round(activeHabits.reduce((a, h) => a + (h.streak?.current_streak || 0), 0) / total) : 0;
  const bestStreak = Math.max(...activeHabits.map(h => h.streak?.current_streak || 0), 0);
  const totalCheckins = activeHabits.reduce((a, h) => a + (h.streak?.total_checkins || 0), 0);

  const handlePlantClick = (id: string, isHandled: boolean, isQuit: boolean, currentlyRelapsed: boolean) => {
    if (!isHandled) {
      if (isQuit) {
        onToggleRelapse?.(id, currentlyRelapsed);
      } else {
        onCheckIn(id, undefined, "check");
      }
      setBurst(id);
      setTimeout(() => setBurst(null), 700);
    }
    setSelectedHabit((prev) => (prev === id ? null : id));
  };

  const handleActionClick = (e: React.MouseEvent, habit: HabitWithStreak, isHandled: boolean) => {
    e.stopPropagation();
    if (habit.frozenToday) return;
    
    if (habit.habit_type === 'quit') {
      onToggleRelapse?.(habit.id, habit.relapsedToday || false);
    } else {
      onCheckIn(habit.id, undefined, isHandled ? "uncheck" : "check");
    }

    if (!isHandled) {
      setBurst(habit.id);
      setTimeout(() => setBurst(null), 700);
    }
  };

  const bgClass = "bg-[#0a0a0a]";

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
    <section className={`rounded-3xl relative shadow-2xl flex flex-col transition-all duration-1000 ${bgClass} border border-border`}>
      {/* ─── Ambient Particles & 3D Farm Backdrop ─── */}
      <div className="absolute inset-0 rounded-3xl overflow-hidden pointer-events-none z-0" style={{ perspective: "1000px" }}>
        
        {/* Sky / Atmosphere */}
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-background/50" />

        {/* Ambient floating particles */}
        {Array.from({ length: 15 }).map((_, i) => (
          <motion.span
            key={i}
            className="absolute w-1 h-1 rounded-full bg-primary/40 blur-[1px]"
            style={{ left: `${Math.random() * 100}%`, top: `${Math.random() * 100}%` }}
            animate={{ y: [0, -40, 0], opacity: [0, 1, 0], scale: [0.5, 1.5, 0.5] }}
            transition={{ duration: 3 + Math.random() * 4, repeat: Infinity, delay: Math.random() * 3, ease: "easeInOut" }}
          />
        ))}

        {/* 3D Ground/Soil */}
        <div 
          className="absolute bottom-0 left-[-20%] right-[-20%] h-[120%] bg-gradient-to-t from-primary/5 via-primary/5 to-transparent origin-bottom"
          style={{ transform: "rotateX(75deg) translateY(20%) scale(1.2)" }}
        >
          {/* Isometric grid pattern */}
          <div className="w-full h-full opacity-10" style={{ backgroundImage: `linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px)`, backgroundSize: "40px 40px" }} />
        </div>
        
        {/* Soft ground/soil gradient at the bottom to blend UI elements */}
        <div className="absolute bottom-0 left-0 w-full h-1/2 bg-gradient-to-t from-card via-card/80 to-transparent pointer-events-none" />
      </div>

      {/* All-done celebration */}
      <AnimatePresence>
        {showCelebration && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.9 }}
            className="absolute top-6 left-1/2 -translate-x-1/2 z-30 flex items-center gap-3 bg-gradient-to-r from-emerald-500 to-green-400 text-foreground px-5 py-2.5 rounded-full shadow-[0_4px_20px_rgba(52,211,153,0.4)] pointer-events-none"
          >
            <span className="text-xl">🎉</span>
            <div className="flex flex-col">
              <span className="text-sm font-bold leading-tight">{t('habits.allDone')}</span>
              <span className="text-[10px] text-foreground/90 leading-tight">{t('habits.allDoneSub')}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Header ─── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-6 sm:p-8 pb-4 relative z-10 gap-4 border-b border-border/50">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-foreground/5 backdrop-blur-md border border-border shadow-inner">
            {timeIcon}
          </div>
          <div>
            <h2 className="text-2xl font-black text-foreground flex items-center gap-2">
              {t('habits.garden')}
              <Sparkles size={18} className="text-primary" />
            </h2>
            <p className="text-sm text-muted-foreground mt-0.5">{t('habits.gardenSubtitle')}</p>
          </div>
        </div>

        {/* Progress + Stats */}
        <div className="flex items-center gap-4">
          {/* Mini stats */}
          <div className="hidden sm:flex items-center gap-3">
            <div className="flex flex-col items-center p-2 rounded-xl bg-foreground/5 border border-border min-w-[52px]">
              <Flame size={12} className="text-orange-400 mb-0.5" />
              <span className="text-xs font-black text-orange-400">{bestStreak}</span>
              <span className="text-[9px] text-muted-foreground">{t('habits.best')}</span>
            </div>
            <div className="flex flex-col items-center p-2 rounded-xl bg-foreground/5 border border-border min-w-[52px]">
              <Trophy size={12} className="text-amber-400 mb-0.5" />
              <span className="text-xs font-black text-amber-400">{totalCheckins}</span>
              <span className="text-[9px] text-muted-foreground">{t('habits.total')}</span>
            </div>
            <div className="flex flex-col items-center p-2 rounded-xl bg-foreground/5 border border-border min-w-[52px]">
              <Leaf size={12} className="text-primary mb-0.5" />
              <span className="text-xs font-black text-primary">{avgStreak}</span>
              <span className="text-[9px] text-muted-foreground">{t('habits.avg')}</span>
            </div>
          </div>

          {/* Progress bar */}
          <div className="flex flex-col items-end gap-1.5">
            <div className="text-sm font-bold text-foreground">
              <span className="text-primary">{doneCount}</span>
              <span className="text-muted-foreground"> / {total} {t('habits.bloomedToday')}</span>
            </div>
            <div className="w-40 h-2 rounded-full bg-foreground/10 overflow-hidden">
              <motion.div
                className="h-full rounded-full bg-primary"
                style={{ boxShadow: "0 0 12px rgba(34,197,94,0.6)" }}
                initial={{ width: 0 }}
                animate={{ width: `${pct}%` }}
                transition={{ type: "spring", damping: 22 }}
              />
            </div>
            <span className="text-[10px] text-muted-foreground">{Math.round(pct)}{t('habits.progress')}</span>
          </div>
        </div>
      </div>

      {/* ─── Farm Plants Grid ─── */}
      {activeHabits.length === 0 ? (
        <div className="text-center py-20 relative z-10 text-muted-foreground flex flex-col items-center gap-3">
          <Leaf size={48} className="text-primary/20 mb-2" />
          <p className="text-lg font-medium">{t('habits.emptyGarden')}</p>
          <p className="text-sm opacity-60">ازرع بذور عاداتك الأولى لتبدأ رحلتك</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-y-12 gap-x-4 relative z-10 px-6 sm:px-8 pt-8 pb-14 mt-2">
          {activeHabits.map((habit, i) => {
            const state = getPlantState(
              habit.streak?.current_streak || 0,
              habit.streak?.longest_streak || 0,
              habit.streak?.total_checkins || 0,
              habit.cadence
            );
            const isHandled = isHabitHandledToday(habit);
            const isQuit = habit.habit_type === 'quit';
            const isSelected = selectedHabit === habit.id;

            return (
              <motion.div
                key={habit.id}
                initial={{ opacity: 0, scale: 0.8, y: 30 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ delay: 0.05 * i, type: "spring", stiffness: 140, damping: 18 }}
                className={`relative flex flex-col items-center gap-3 p-4 rounded-3xl transition-all duration-300 hover:bg-foreground/[0.03] cursor-pointer group ${isSelected ? 'z-50' : 'z-10'}`}
              >
                {/* Tooltip (Elegant Cloud) */}
                <AnimatePresence>
                  {isSelected && (
                    <motion.div
                      initial={{ opacity: 0, y: -12, scale: 0.88 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -6, scale: 0.9 }}
                      className="absolute bottom-[90%] left-1/2 -translate-x-1/2 w-48 bg-card rounded-2xl p-4 shadow-2xl z-50 pointer-events-none text-foreground border border-border"
                    >
                      <div className="absolute top-full left-1/2 -translate-x-1/2 w-4 h-4 bg-card border-b border-r border-border rotate-45 -mt-2 rounded-[2px]" />
                      
                      <div className="text-sm text-center font-black mb-3 border-b border-border pb-2 truncate">{habit.title}</div>
                      <div className="grid grid-cols-2 gap-x-2 gap-y-3 text-[11px] mb-3 border-b border-border pb-3">
                        <div className="text-muted-foreground">{t('habits.streak')} <span className="text-orange-500 font-bold">{habit.streak?.current_streak || 0}{t('habits.days')}</span></div>
                        <div className="text-muted-foreground">{t('habits.longest')} <span className="text-amber-500 font-bold">{habit.streak?.longest_streak || 0}{t('habits.days')}</span></div>
                        <div className="text-muted-foreground">{t('habits.total')} <span className="text-primary font-bold">{habit.streak?.total_checkins || 0}</span></div>
                        <div className="text-muted-foreground">{t('habits.level')} <span className="text-blue-500 font-bold">{state.currentLevel}/6</span></div>
                      </div>
                      {state.isDormant ? (
                        <div className="text-xs text-orange-500 font-bold text-center flex items-center justify-center gap-1.5">
                          <Moon size={12} className="fill-orange-500" /> {t('habits.dormantPlant')}
                        </div>
                      ) : state.currentLevel < 6 ? (
                        <div className="text-xs text-center text-primary font-bold">
                          ⏳ {t('habits.daysToGrow', { days: state.daysToNext })}
                        </div>
                      ) : (
                        <div className="text-xs text-center text-amber-500 font-bold flex justify-center items-center gap-1.5">
                          <Sparkles size={12} className="fill-amber-500" /> {t('habits.maxLevel')}
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Plant Container with Hover Effects */}
                <div
                  className="relative group-hover:-translate-y-2 transition-transform duration-300"
                  onClick={() => handlePlantClick(habit.id, isHandled, isQuit, habit.relapsedToday || false)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); handlePlantClick(habit.id, isHandled, isQuit, habit.relapsedToday || false); }
                  }}
                  tabIndex={0}
                  role="button"
                  aria-label={habit.title}
                  aria-expanded={isSelected}
                >
                  <div className="origin-bottom transform-gpu drop-shadow-2xl">
                    <HabitPlant
                      level={state.visualLevel}
                      isDormant={state.isDormant}
                      sway={!state.isDormant}
                      habitName={habit.title}
                    />
                  </div>

                  {/* Burst particles */}
                  <AnimatePresence>
                    {burst === habit.id && (
                      <>
                        {[0, 1, 2, 3, 4, 5, 6, 7].map((p) => (
                          <motion.span
                            key={p}
                            className="absolute left-1/2 top-10 w-2.5 h-2.5 rounded-full bg-[#4ADE80]"
                            initial={{ x: 0, y: 0, opacity: 1, scale: 1 }}
                            animate={{
                              x: Math.cos((p / 8) * Math.PI * 2) * 45,
                              y: Math.sin((p / 8) * Math.PI * 2) * 45 - 20,
                              opacity: 0,
                              scale: 0.5
                            }}
                            transition={{ duration: 0.8, ease: "easeOut" }}
                            style={{ boxShadow: "0 0 15px #4ADE80" }}
                          />
                        ))}
                      </>
                    )}
                  </AnimatePresence>
                </div>

                {/* Info Container */}
                <div className="flex flex-col items-center w-full mt-2 gap-2">
                  <div className="text-xs font-medium text-foreground text-center truncate w-full px-2" title={habit.title}>
                    {habit.icon} {habit.title}
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Streak badge */}
                    {(habit.streak?.current_streak || 0) > 0 && (
                      <div className="text-[10px] px-2 py-0.5 rounded-full bg-orange-500/10 text-orange-500 font-bold flex items-center gap-1 border border-orange-500/20 shadow-sm">
                        🔥 {habit.streak?.current_streak || 0}
                      </div>
                    )}

                    {/* Check button */}
                    <motion.button
                      whileTap={{ scale: 0.82 }}
                      onClick={(e) => handleActionClick(e, habit, isHandled)}
                      aria-label={isHandled ? `إلغاء ${habit.title}` : `إنجاز ${habit.title}`}
                      className={`relative w-8 h-8 rounded-full flex items-center justify-center transition-all duration-300 border shadow-md ${
                        habit.frozenToday
                            ? "bg-blue-500/20 border-blue-500/50 shadow-[0_0_15px_rgba(59,130,246,0.4)] text-blue-400"
                            : isHandled
                              ? `border-transparent text-foreground`
                              : "border-border hover:bg-foreground/10 hover:border-foreground/30 text-muted-foreground"
                        }`}
                      style={
                        !habit.frozenToday && isHandled
                          ? {
                              backgroundColor: COLORS[habit.color] || "#22C55E",
                              boxShadow: `0 0 15px ${COLORS[habit.color] || "#22C55E"}90`,
                            }
                          : {}
                      }
                    >
                      <AnimatePresence>
                        {habit.frozenToday ? (
                          <motion.span initial={{ scale: 0, rotate: -90 }} animate={{ scale: 1, rotate: 0 }} exit={{ scale: 0 }}>
                            <Snowflake size={14} strokeWidth={2.5} />
                          </motion.span>
                        ) : isHandled ? (
                          <motion.span initial={{ scale: 0, rotate: -90 }} animate={{ scale: 1, rotate: 0 }} exit={{ scale: 0 }}>
                            {isQuit ? <Shield size={14} strokeWidth={2.5} /> : <Check size={14} strokeWidth={3} />}
                          </motion.span>
                        ) : null}
                      </AnimatePresence>
                    </motion.button>
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* ─── Instructions Panel ─── */}
      <div className="relative z-10 border-t border-border mt-2">
        <button
          onClick={() => setShowInstructions(!showInstructions)}
          className="w-full flex items-center justify-between px-6 sm:px-8 py-4 hover:bg-foreground/5 transition group"
        >
          <div className="flex items-center gap-2 text-muted-foreground group-hover:text-foreground transition">
            <BookOpen size={14} />
            <span className="text-xs font-medium">{t('habits.guide')}</span>
          </div>
          <motion.div animate={{ rotate: showInstructions ? 180 : 0 }} transition={{ duration: 0.25 }}>
            <ChevronDown size={14} className="text-muted-foreground" />
          </motion.div>
        </button>

        <AnimatePresence>
          {showInstructions && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: "auto", opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="overflow-hidden"
            >
              <div className="px-6 sm:px-8 pb-7 pt-3">
                <p className="text-xs text-muted-foreground mb-5 leading-relaxed">
                  {t('habits.guideDesc')}
                </p>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
                  {PLANT_STAGES.map((stage, i) => (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.06 }}
                      className="flex flex-col items-center gap-2 p-3 rounded-2xl bg-foreground/5 border border-border text-center hover:bg-foreground/10 transition"
                    >
                      <span className="text-3xl">{stage.emoji}</span>
                      <div className="text-[10px] font-bold text-primary">{t(stage.name as any, stage.name)}</div>
                      <div className="text-[9px] text-orange-500 font-medium">{stage.range}</div>
                      <div className="text-[9px] text-muted-foreground leading-tight">{t(stage.desc as any, stage.desc)}</div>
                    </motion.div>
                  ))}
                </div>

                <div className="mt-4 grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="p-3 rounded-xl bg-foreground/5 border border-border">
                    <div className="text-[10px] font-bold text-yellow-500 mb-1">💡 {t('habits.tip')}</div>
                    <p className="text-[9px] text-muted-foreground leading-relaxed">{t('habits.tipDesc')}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-foreground/5 border border-border">
                    <div className="text-[10px] font-bold text-red-500 mb-1">🌧️ {t('habits.darkWeather')}</div>
                    <p className="text-[9px] text-muted-foreground leading-relaxed">{t('habits.darkWeatherDesc')}</p>
                  </div>
                  <div className="p-3 rounded-xl bg-foreground/5 border border-border">
                    <div className="text-[10px] font-bold text-blue-500 mb-1">💤 {t('habits.dormantPlant')}</div>
                    <p className="text-[9px] text-muted-foreground leading-relaxed">{t('habits.dormantPlantDesc')}</p>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </section>
  );
}
