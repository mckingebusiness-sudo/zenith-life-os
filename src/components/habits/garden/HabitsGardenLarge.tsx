import { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { HabitWithStreak } from "@/hooks/useHabits";
import { getPlantState } from "./plantConfig";
import HabitPlant from "./HabitPlant";
import { Check, Sparkles, Moon, Sun, Info, ChevronDown, ChevronUp, Flame, Leaf, Trophy, BookOpen } from "lucide-react";
import { useTranslation } from "react-i18next";

interface HabitsGardenLargeProps {
  habits: HabitWithStreak[];
  onCheckIn: (id: string, dayLocal?: string, action?: "check" | "uncheck") => void;
}

const PLANT_STAGES = [
  { range: "0–2 يوم", name: "بذرة", emoji: "🌱", desc: "بداية الرحلة — البذرة تنتظر الاهتمام" },
  { range: "3–6 أيام", name: "شتلة", emoji: "🌿", desc: "الجذور تمتد — الالتزام يبدأ يتشكل" },
  { range: "7–20 يوم", name: "نبتة", emoji: "🌾", desc: "النمو الحقيقي — عادة راسخة تتشكل" },
  { range: "21–59 يوم", name: "شجيرة", emoji: "🌳", desc: "قوة وثبات — أنت تتغير فعلاً" },
  { range: "60–149 يوم", name: "شجرة", emoji: "🌲", desc: "الثمار تبدأ — عادة متأصلة عميقاً" },
  { range: "150+ يوم", name: "غابة ملكية", emoji: "🏕️", desc: "أسطورة! هذه العادة جزء من هويتك" },
];

export default function HabitsGardenLarge({ habits, onCheckIn }: HabitsGardenLargeProps) {
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

  const total = activeHabits.length;
  const doneCount = activeHabits.filter((h) => h.checkedToday).length;
  const pct = total > 0 ? (doneCount / total) * 100 : 0;
  const avgStreak = total > 0 ? Math.round(activeHabits.reduce((a, h) => a + (h.streak?.current_streak || 0), 0) / total) : 0;
  const bestStreak = Math.max(...activeHabits.map(h => h.streak?.current_streak || 0), 0);
  const totalCheckins = activeHabits.reduce((a, h) => a + (h.streak?.total_checkins || 0), 0);

  const handlePlantClick = (id: string, checkedToday: boolean) => {
    if (!checkedToday) {
      onCheckIn(id, undefined, "check");
      setBurst(id);
      setTimeout(() => setBurst(null), 700);
    }
    setSelectedHabit((prev) => (prev === id ? null : id));
  };

  const handleActionClick = (e: React.MouseEvent, id: string, checkedToday: boolean) => {
    e.stopPropagation();
    onCheckIn(id, undefined, checkedToday ? "uncheck" : "check");
    if (!checkedToday) {
      setBurst(id);
      setTimeout(() => setBurst(null), 700);
    }
  };

  const isSunny = pct >= 70;
  const bgClass = "bg-card";

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
      <div className="absolute inset-0 rounded-3xl overflow-hidden pointer-events-none z-0">

      {/* All-done celebration */}
      <AnimatePresence>
        {showCelebration && (
          <motion.div
            initial={{ opacity: 0, y: -20, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -20, scale: 0.9 }}
            className="absolute top-6 left-1/2 -translate-x-1/2 z-30 flex items-center gap-3 bg-gradient-to-r from-emerald-500 to-green-400 text-white px-5 py-2.5 rounded-full shadow-[0_4px_20px_rgba(52,211,153,0.4)] pointer-events-none"
          >
            <span className="text-xl">🎉</span>
            <div className="flex flex-col">
              <span className="text-sm font-bold leading-tight">{t('habits.allDone')}</span>
              <span className="text-[10px] text-white/90 leading-tight">{t('habits.allDoneSub')}</span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Ambient particles */}
      {Array.from({ length: 12 }).map((_, i) => (
        <motion.span
          key={i}
          aria-hidden
          className={`absolute w-1 h-1 rounded-full pointer-events-none ${isSunny ? "bg-yellow-300/30" : "bg-green-400/20"}`}
          style={{ left: `${(i * 8) % 100}%`, top: `${(i * 13) % 80}%`, boxShadow: isSunny ? "none" : "0 0 6px #4ADE80" }}
          animate={{ y: [0, -18, 0], opacity: [0.1, 0.7, 0.1] }}
          transition={{ duration: 4 + i * 0.6, repeat: Infinity, delay: i * 0.3, ease: "easeInOut" }}
        />
      ))}
      </div>

      {/* ─── Header ─── */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between p-6 sm:p-8 pb-4 relative z-10 gap-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-2xl bg-foreground/5 backdrop-blur-md border border-border">
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

      {/* ─── Plants Grid ─── */}
      {activeHabits.length === 0 ? (
        <div className="text-center py-16 relative z-10 text-muted-foreground flex flex-col items-center gap-3">
          <Leaf size={40} className="text-primary/30" />
          <p>{t('habits.emptyGarden')}</p>
        </div>
      ) : (
        <div className="flex overflow-x-auto overflow-y-hidden gap-5 sm:gap-7 relative z-10 px-6 sm:px-8 pb-6 mt-2 scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
          {activeHabits.map((habit, i) => {
            const state = getPlantState(
              habit.streak?.current_streak || 0,
              habit.streak?.longest_streak || 0,
              habit.streak?.total_checkins || 0,
              habit.cadence
            );
            const isSelected = selectedHabit === habit.id;

            return (
              <motion.div
                key={habit.id}
                initial={{ opacity: 0, y: 24 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.04 * i, type: "spring", stiffness: 160, damping: 20 }}
                className={`min-w-[100px] flex-shrink-0 relative flex flex-col items-center gap-2.5 p-3 rounded-2xl transition hover:bg-foreground/5 cursor-pointer group ${isSelected ? 'z-50' : 'z-10'}`}
              >
                {/* Tooltip (Elegant Cloud) */}
                <AnimatePresence>
                  {isSelected && (
                    <motion.div
                      initial={{ opacity: 0, y: -12, scale: 0.88 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -6, scale: 0.9 }}
                      className="absolute top-full mt-2 left-1/2 -translate-x-1/2 w-44 bg-card rounded-2xl p-3 shadow-xl z-50 pointer-events-none text-foreground border border-border"
                    >
                      {/* Tiny arrow pointing up */}
                      <div className="absolute bottom-[98%] left-1/2 -translate-x-1/2 w-3 h-3 bg-card border-t border-l border-border rotate-45 rounded-[2px]" />
                      
                      <div className="text-xs text-center font-black mb-2 border-b border-border pb-2 truncate">{habit.title}</div>
                      <div className="grid grid-cols-2 gap-x-1 gap-y-2 text-[10px] mb-2 border-b border-border pb-2">
                        <div className="text-muted-foreground">{t('habits.streak')} <span className="text-orange-500 font-bold">{habit.streak?.current_streak || 0}{t('habits.days')}</span></div>
                        <div className="text-muted-foreground">{t('habits.longest')} <span className="text-amber-500 font-bold">{habit.streak?.longest_streak || 0}{t('habits.days')}</span></div>
                        <div className="text-muted-foreground">{t('habits.total')} <span className="text-primary font-bold">{habit.streak?.total_checkins || 0}</span></div>
                        <div className="text-muted-foreground">{t('habits.level')} <span className="text-blue-500 font-bold">{state.currentLevel}/6</span></div>
                      </div>
                      {state.isDormant ? (
                        <div className="text-[10px] text-orange-500 font-bold text-center flex items-center justify-center gap-1">
                          <Moon size={10} className="fill-orange-500" /> {t('habits.dormantPlant')}
                        </div>
                      ) : state.currentLevel < 6 ? (
                        <div className="text-[10px] text-center text-primary font-bold">
                          ⏳ {t('habits.daysToGrow', { days: state.daysToNext })}
                        </div>
                      ) : (
                        <div className="text-[10px] text-center text-amber-500 font-bold flex justify-center items-center gap-1">
                          <Sparkles size={10} className="fill-amber-500" /> {t('habits.maxLevel')}
                        </div>
                      )}
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Plant — BIGGER */}
                <div
                  className="relative"
                  onClick={() => handlePlantClick(habit.id, !!habit.checkedToday)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") { e.preventDefault(); handlePlantClick(habit.id, !!habit.checkedToday); }
                  }}
                  tabIndex={0}
                  role="button"
                  aria-label={habit.title}
                  aria-expanded={isSelected}
                >
                  {/* Scale up plants by wrapping in a larger container */}
                  <div className="scale-[1.4] origin-bottom transform-gpu">
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
                            className="absolute left-1/2 top-8 w-2 h-2 rounded-full bg-[#4ADE80]"
                            initial={{ x: 0, y: 0, opacity: 1 }}
                            animate={{
                              x: Math.cos((p / 8) * Math.PI * 2) * 32,
                              y: Math.sin((p / 8) * Math.PI * 2) * 32 - 12,
                              opacity: 0,
                            }}
                            transition={{ duration: 0.7, ease: "easeOut" }}
                            style={{ boxShadow: "0 0 10px #4ADE80" }}
                          />
                        ))}
                      </>
                    )}
                  </AnimatePresence>
                </div>

                {/* Habit name */}
                <div className="text-[10px] text-muted-foreground text-center truncate w-full px-1 leading-snug" title={habit.title}>
                  {habit.icon} {habit.title}
                </div>

                {/* Streak badge */}
                {(habit.streak?.current_streak || 0) > 0 && (
                  <div className="text-[9px] px-1.5 py-0.5 rounded-full bg-orange-500/20 text-orange-400 flex items-center gap-0.5 border border-orange-500/20">
                    🔥 {habit.streak?.current_streak || 0}
                  </div>
                )}

                {/* Check button */}
                <motion.button
                  whileTap={{ scale: 0.82 }}
                  onClick={(e) => handleActionClick(e, habit.id, !!habit.checkedToday)}
                  aria-label={habit.checkedToday ? `إلغاء ${habit.title}` : `إنجاز ${habit.title}`}
                  className={`relative w-7 h-7 rounded-full flex items-center justify-center transition border shadow-lg ${
                    habit.checkedToday
                      ? "bg-primary border-primary shadow-[0_0_14px_rgba(34,197,94,0.5)] text-primary-foreground"
                      : "border-border hover:bg-foreground/10 hover:border-border text-muted-foreground"
                  }`}
                >
                  <AnimatePresence>
                    {habit.checkedToday && (
                      <motion.span
                        initial={{ scale: 0, rotate: -90 }}
                        animate={{ scale: 1, rotate: 0 }}
                        exit={{ scale: 0 }}
                      >
                        <Check size={13} strokeWidth={3} />
                      </motion.span>
                    )}
                  </AnimatePresence>
                </motion.button>
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
