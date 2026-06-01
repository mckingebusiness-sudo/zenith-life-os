import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { Check, Sparkles } from "lucide-react";
import { useHabits } from "@/hooks/useHabits";
import { getPlantState } from "@/components/habits/garden/plantConfig";
import HabitPlant from "@/components/habits/garden/HabitPlant";

export default function HabitsGarden() {
  const { habits, checkIn } = useHabits(new Date());
  const [burst, setBurst] = useState<string | null>(null);

  const activeHabits = habits.slice(0, 5); // Take top 5 for the small widget

  const toggle = (id: string, checkedToday: boolean) => {
    checkIn(id, undefined, checkedToday ? "uncheck" : "check");
    if (!checkedToday) {
      setBurst(id);
      setTimeout(() => setBurst(null), 700);
    }
  };

  const total = activeHabits.length;
  const doneCount = activeHabits.filter((h) => h.checkedToday).length;
  const pct = total > 0 ? (doneCount / total) * 100 : 0;

  return (
    <section className="glass rounded-3xl p-7 h-full relative overflow-hidden group">
      {/* Ambient garden glow */}
      <motion.div
        aria-hidden
        className="absolute -bottom-24 left-1/2 -translate-x-1/2 w-[120%] h-48 rounded-[50%] pointer-events-none"
        style={{ background: "radial-gradient(ellipse, rgba(34,197,94,0.18), transparent 70%)" }}
        animate={{ opacity: [0.5, 0.85, 0.5] }}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
      />
      {/* Floating fireflies */}
      {Array.from({ length: 6 }).map((_, i) => (
        <motion.span
          key={i}
          aria-hidden
          className="absolute w-1 h-1 rounded-full bg-[#4ADE80] pointer-events-none"
          style={{ left: `${10 + i * 14}%`, top: `${30 + (i % 3) * 18}%`, boxShadow: "0 0 8px #4ADE80" }}
          animate={{ y: [0, -14, 0], opacity: [0.2, 1, 0.2] }}
          transition={{ duration: 3 + i * 0.4, repeat: Infinity, delay: i * 0.3, ease: "easeInOut" }}
        />
      ))}

      <div className="flex items-baseline justify-between mb-5 relative z-10">
        <div className="flex items-center gap-2">
          <h2 className="text-base font-bold text-foreground">حديقة العادات</h2>
          <motion.span
            animate={{ rotate: [0, 12, -8, 0] }}
            transition={{ duration: 4, repeat: Infinity }}
            className="text-primary"
          >
            <Sparkles size={13} />
          </motion.span>
        </div>
        <div className="text-[11px] text-muted-foreground">
          <span className="text-primary tabular font-bold">{doneCount}</span>/{total} اليوم
        </div>
      </div>

      {/* Progress bar */}
      <div className="relative h-1 rounded-full bg-border mb-5 overflow-hidden">
        <motion.div
          className="absolute inset-y-0 right-0 rounded-full"
          style={{ background: "linear-gradient(90deg, #15803D, #4ADE80)", boxShadow: "0 0 12px rgba(74,222,128,0.6)" }}
          animate={{ width: `${pct}%` }}
          transition={{ type: "spring", damping: 18, stiffness: 160 }}
        />
      </div>

      {activeHabits.length === 0 ? (
        <div className="text-center py-6 relative z-10 text-muted-foreground text-sm">
          لا توجد عادات بعد
        </div>
      ) : (
        <div className="grid grid-cols-5 gap-3 relative z-10">
          {activeHabits.map((habit, i) => {
            const state = getPlantState(
              habit.streak?.current_streak || 0,
              habit.streak?.longest_streak || 0,
              habit.streak?.total_checkins || 0,
              habit.cadence
            );
            
            return (
              <motion.div
                key={habit.id}
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.08 * i, type: "spring", damping: 18 }}
                whileHover={{ y: -4 }}
                className="relative flex flex-col items-center gap-2 p-3 rounded-2xl hover:bg-muted transition cursor-pointer border border-transparent hover:border-green-500/20"
                onClick={() => toggle(habit.id, !!habit.checkedToday)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    toggle(habit.id, !!habit.checkedToday);
                  }
                }}
                tabIndex={0}
                role="button"
                aria-label={`تحديد ${habit.title}`}
              >
                <div className="relative">
                  <HabitPlant 
                    level={state.visualLevel} 
                    isDormant={state.isDormant} 
                    sway={!state.isDormant} 
                    habitName={habit.title}
                  />
                  {/* Soil pulse on done */}
                  <AnimatePresence>
                    {burst === habit.id && (
                      <>
                        {[0, 1, 2, 3, 4, 5].map((p) => (
                          <motion.span
                            key={p}
                            className="absolute left-1/2 top-5 w-1 h-1 rounded-full bg-[#4ADE80]"
                            initial={{ x: 0, y: 0, opacity: 1 }}
                            animate={{
                              x: Math.cos((p / 6) * Math.PI * 2) * 22,
                              y: Math.sin((p / 6) * Math.PI * 2) * 22 - 6,
                              opacity: 0,
                            }}
                            transition={{ duration: 0.7, ease: "easeOut" }}
                            style={{ boxShadow: "0 0 6px #4ADE80" }}
                          />
                        ))}
                      </>
                    )}
                  </AnimatePresence>
                </div>
                <div className="text-[10px] text-muted-foreground text-center truncate w-full" title={habit.title}>
                  {habit.title}
                </div>
                <motion.div
                  key={habit.streak?.current_streak || 0}
                  initial={{ scale: 1.4, color: "var(--primary)" }}
                  animate={{ scale: 1 }}
                  className="text-[11px] tabular font-bold text-primary"
                >
                  {habit.streak?.current_streak || 0}
                </motion.div>
                <motion.button
                  whileTap={{ scale: 0.85 }}
                  onClick={(e) => { e.stopPropagation(); toggle(habit.id, !!habit.checkedToday); }}
                  tabIndex={-1}
                  className={`relative w-6 h-6 rounded-full border flex items-center justify-center transition ${
                    habit.checkedToday
                      ? "bg-primary border-primary shadow-[0_0_14px_rgba(34,197,94,0.6)] text-primary-foreground"
                      : "border-primary/30 hover:bg-primary/10 hover:border-primary/60 text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <AnimatePresence>
                    {habit.checkedToday && (
                      <motion.span
                        initial={{ scale: 0, rotate: -90 }}
                        animate={{ scale: 1, rotate: 0 }}
                        exit={{ scale: 0 }}
                      >
                        <Check size={12} strokeWidth={3} />
                      </motion.span>
                    )}
                  </AnimatePresence>
                </motion.button>
              </motion.div>
            );
          })}
        </div>
      )}
    </section>
  );
}