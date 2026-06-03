import { useMemo, useState, useEffect } from "react";
import { HabitWithStreak, HabitColor } from "@/hooks/useHabits";
import { calculateTodayProgress, isHabitHandledToday, isHabitSuccessOnDay } from "@/lib/habitCalculations";
import { Edit2, Trash2, Check, Flame, Award, AlertTriangle, PauseCircle, ChevronRight, ChevronLeft, Info, Trophy, Sparkles, Shield, Snowflake, Clock, Star, ChevronDown, ChevronUp } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";

type Props = {
  habits: HabitWithStreak[];
  currentDate: Date;
  onCheckIn: (id: string, dayLocal?: string, action?: "check" | "uncheck") => void;
  onEdit: (habit: HabitWithStreak) => void;
  onDelete: (id: string) => void;
  onUndelete?: (id: string) => void;
  burstId: string | null;
  onResetStreak?: (id: string, reason: string) => Promise<void>;
  onFreeze?: (id: string, dateStr: string, monthStr: string) => void;
  onUndoRelapse?: (id: string) => Promise<void>;
};

const COLORS: Record<string, string> = {
  slate: "#64748B", gray: "#9CA3AF", zinc: "#A1A1AA", neutral: "#A3A3A3",
  stone: "#A8A29E", red: "#EF4444", orange: "#F97316", amber: "#F59E0B",
  yellow: "#EAB308", lime: "#84CC16", green: "#22C55E", emerald: "#10B981",
  teal: "#14B8A6", cyan: "#06B6D4", sky: "#0EA5E9", blue: "#3B82F6",
  indigo: "#6366F1", violet: "#8B5CF6", purple: "#A855F7", fuchsia: "#D946EF",
  pink: "#EC4899", rose: "#F43F5E", brown: "#A52A2A",
};

export function HabitMonthlyGrid({ habits, currentDate, onCheckIn, onEdit, onDelete, onUndelete, burstId, onResetStreak, onFreeze, onUndoRelapse }: Props) {
  const today = new Date();
  const todayLocal = new Intl.DateTimeFormat("en-CA").format(today);
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const isCurrentMonth = month === today.getMonth() && year === today.getFullYear();
  const currentMonthStr = todayLocal.slice(0, 7);
  
  const freezesUsed = useMemo(() => {
    let count = 0;
    habits.forEach(h => {
      if (h.freezes) {
        h.freezes.forEach(d => {
          if (d.startsWith(currentMonthStr)) count++;
        });
      }
    });
    return count;
  }, [habits, currentMonthStr]);

  // Relapse popup state
  const [relapseHabitId, setRelapseHabitId] = useState<string | null>(null);
  const [relapseReason, setRelapseReason] = useState("");
  const [relapseLoading, setRelapseLoading] = useState(false);
  // Micro-journal toast
  const [journalHabitId, setJournalHabitId] = useState<string | null>(null);
  const [journalDayLocal, setJournalDayLocal] = useState<string | null>(null);
  const [journalText, setJournalText] = useState("");
  const [showGuide, setShowGuide] = useState(false);

  const handleCheckInWithJournal = async (habitId: string, dayLocal: string) => {
    onCheckIn(habitId, dayLocal, "check");
    setJournalHabitId(habitId);
    setJournalDayLocal(dayLocal);
    setJournalText("");
    
    try {
      const { data: authData } = await supabase.auth.getSession();
      if (authData.session) {
        const { data } = await supabase
          .from("habit_journals")
          .select("journal_text")
          .eq("habit_id", habitId)
          .eq("day_local", dayLocal)
          .single();
          
        if (data) {
          setJournalText(data.journal_text);
        }
      }
    } catch (e) {
      console.error("Failed to fetch existing journal", e);
    }
  };

  const saveJournal = async () => {
    if (journalText.trim() && journalHabitId && journalDayLocal) {
      try {
        const { data: authData } = await supabase.auth.getSession();
        if (authData.session) {
          await supabase.from("habit_journals").upsert({
            habit_id: journalHabitId,
            user_id: authData.session.user.id,
            day_local: journalDayLocal,
            journal_text: journalText.trim()
          }, { onConflict: 'habit_id,day_local' });
        }
      } catch (e) {
        console.error("Failed to save journal", e);
      }
    }
    setJournalHabitId(null);
    setJournalDayLocal(null);
  };

  const submitRelapse = async () => {
    if (!relapseHabitId || !onResetStreak) return;
    setRelapseLoading(true);
    await onResetStreak(relapseHabitId, relapseReason);
    setRelapseLoading(false);
    setRelapseHabitId(null);
    setRelapseReason("");
  };

  // Pagination state (0 = days 1-10, 1 = days 11-20, etc)
  const [pageOffset, setPageOffset] = useState(() => {
    if (isCurrentMonth) {
      return Math.floor((today.getDate() - 1) / 10);
    }
    return 0;
  });

  // Show 10 days chunk based on pageOffset
  const { days, maxPageOffset } = useMemo(() => {
    const allDays = Array.from({ length: daysInMonth }, (_, i) => {
      const d = new Date(year, month, i + 1);
      const dayName = d.toLocaleDateString("ar-EG", { weekday: "narrow" });
      const fullDate = new Intl.DateTimeFormat("en-CA").format(d);
      const isToday = fullDate === todayLocal;
      const isFuture = d > new Date(new Date().setHours(23, 59, 59, 999));
      return { num: i + 1, dayName, fullDate, isToday, isFuture };
    });
    
    const CHUNK = 10;
    const maxPage = Math.max(0, Math.ceil(daysInMonth / CHUNK) - 1);
    const currentOffset = Math.min(pageOffset, maxPage);
    
    const start = currentOffset * CHUNK;
    const end = Math.min(start + CHUNK, daysInMonth);
    
    return { days: allDays.slice(start, end), maxPageOffset: maxPage };
  }, [daysInMonth, year, month, todayLocal, pageOffset]);

  // Adjust pageOffset if month changes
  useEffect(() => {
    if (isCurrentMonth) {
      setPageOffset(Math.floor((today.getDate() - 1) / 10));
    } else {
      setPageOffset(0);
    }
  }, [month, year, isCurrentMonth]);

  // Stats
  const goodHabits = habits.filter(h => h.habit_type !== 'quit');
  const badHabits = habits.filter(h => h.habit_type === 'quit');

  const {
    completedGood, totalGood, avoidedBad, totalBad, totalHabits: totalItems, handledCount: totalSuccess, percentage: pct
  } = useMemo(() => calculateTodayProgress(habits), [habits]);

  const bestStreak = Math.max(...habits.map(h => h.streak?.longest_streak || 0), 0);

  // Circular progress values
  const circumference = 2 * Math.PI * 40;
  const strokeDashoffset = circumference - (pct / 100) * circumference;

  return (
    <div className="w-full pb-6">
      {/* ─── Premium Stats Bar ─── */}
      {isCurrentMonth ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-10">
          {/* Circular Progress */}
          <div className="glass rounded-3xl p-6 border border-white/5 flex items-center gap-5 group hover:border-green-500/40 hover:-translate-y-1.5 hover:shadow-[0_10px_40px_rgba(74,222,128,0.15)] transition-all duration-500 relative overflow-hidden backdrop-blur-2xl bg-black/40">
            <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div className="relative w-24 h-24 shrink-0">
              <svg className="w-24 h-24 -rotate-90 drop-shadow-[0_0_10px_rgba(74,222,128,0.3)]" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="42" fill="none" stroke="rgba(255,255,255,0.03)" strokeWidth="8" />
                <motion.circle
                  cx="50" cy="50" r="42" fill="none"
                  stroke="url(#progressGradient)" strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  initial={{ strokeDashoffset: circumference }}
                  animate={{ strokeDashoffset }}
                  transition={{ duration: 1.5, ease: "easeOut" }}
                />
                <defs>
                  <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#4ADE80" />
                    <stop offset="100%" stopColor="#059669" />
                  </linearGradient>
                </defs>
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-xl font-black text-white tracking-tighter">{pct}%</span>
              </div>
            </div>
            <div className="flex-1">
              <div className="text-[#A7B3AB] text-xs font-bold uppercase tracking-widest mb-1">التقدم اليومي</div>
              <div className="flex items-baseline gap-1.5">
                <span className="text-white font-black text-3xl">{totalSuccess}</span>
                <span className="text-white/30 text-sm font-bold">/ {totalItems}</span>
              </div>
              <div className="text-[10px] text-white/40 font-medium mt-0.5">
                ( {completedGood} إنجاز إيجابي + {avoidedBad} تجنب سلبي )
              </div>
              <div className="text-xs font-medium mt-1">
                {pct === 100 ? (
                  <span className="text-green-400 drop-shadow-[0_0_5px_rgba(74,222,128,0.5)]">🎉 يوم مثالي!</span>
                ) : pct >= 50 ? (
                  <span className="text-emerald-400">💪 استمر!</span>
                ) : (
                  <span className="text-white/50">🚀 ابدأ الآن!</span>
                )}
              </div>
              {/* Phase 7.2 – urgency text after 6PM when incomplete */}
              {pct < 100 && today.getHours() >= 18 && (
                <div className="flex items-center gap-1.5 mt-2 text-[11px] font-bold text-amber-400/90 bg-amber-500/10 px-2 py-1 rounded-lg w-fit whitespace-nowrap">
                  <Clock size={12} className="shrink-0" />
                  تبقى {
                    23 - today.getHours() > 0 
                      ? `${23 - today.getHours()} ساعة و ${59 - today.getMinutes()} دقيقة`
                      : `${59 - today.getMinutes()} دقيقة`
                  }
                </div>
              )}
            </div>
          </div>

          {/* Good Habits Completed */}
          <div className="glass rounded-3xl p-6 border border-white/5 group hover:border-green-500/40 hover:-translate-y-1.5 hover:shadow-[0_10px_40px_rgba(34,197,94,0.15)] transition-all duration-500 relative overflow-hidden backdrop-blur-2xl bg-black/40 flex flex-col justify-between">
            <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div>
              <div className="relative flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-green-400/20 to-emerald-600/20 flex items-center justify-center border border-green-500/20 shadow-inner group-hover:scale-110 transition-transform duration-500">
                  <Check className="text-green-400 drop-shadow-[0_0_8px_rgba(74,222,128,0.5)]" size={24} />
                </div>
              </div>
              <div className="text-[#A7B3AB] text-xs font-bold uppercase tracking-widest mb-1">عادات جيدة تمت</div>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-black text-white drop-shadow-md">{completedGood}</span>
                <span className="text-base text-white/30 font-bold">/ {totalGood}</span>
              </div>
            </div>
            <div className="mt-5 h-2 bg-white/5 rounded-full overflow-hidden relative">
              <motion.div
                className="absolute inset-y-0 right-0 rounded-full bg-gradient-to-l from-green-400 to-emerald-600 shadow-[0_0_10px_rgba(74,222,128,0.5)]"
                initial={{ width: 0 }}
                animate={{ width: `${totalGood > 0 ? Math.round((completedGood / totalGood) * 100) : 0}%` }}
                transition={{ duration: 1, ease: "easeOut" }}
              />
            </div>
          </div>

          {/* Bad Habits Avoided */}
          <div className="glass rounded-3xl p-6 border border-white/5 group hover:border-teal-500/40 hover:-translate-y-1.5 hover:shadow-[0_10px_40px_rgba(45,212,191,0.15)] transition-all duration-500 relative overflow-hidden backdrop-blur-2xl bg-black/40 flex flex-col justify-between">
            <div className="absolute inset-0 bg-gradient-to-br from-teal-500/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div>
              <div className="relative flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-teal-400/20 to-cyan-600/20 flex items-center justify-center border border-teal-500/20 shadow-inner group-hover:scale-110 transition-transform duration-500">
                  <Shield className="text-teal-400 drop-shadow-[0_0_8px_rgba(45,212,191,0.5)]" size={24} />
                </div>
              </div>
              <div className="text-[#A7B3AB] text-xs font-bold uppercase tracking-widest mb-1">تجنب العادات السيئة</div>
              {totalBad > 0 ? (
                <div className="flex items-baseline gap-2">
                  <span className="text-4xl font-black text-white drop-shadow-md">{avoidedBad}</span>
                  <span className="text-base text-white/30 font-bold">/ {totalBad}</span>
                </div>
              ) : (
                <div className="flex items-baseline gap-1 mt-2">
                  <span className="text-xl font-bold text-white/40">لا يوجد</span>
                </div>
              )}
            </div>
            {totalBad > 0 && (
              <div className="mt-5 h-2 bg-white/5 rounded-full overflow-hidden relative">
                <motion.div
                  className="absolute inset-y-0 right-0 rounded-full bg-gradient-to-l from-teal-400 to-cyan-600 shadow-[0_0_10px_rgba(45,212,191,0.5)]"
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.round((avoidedBad / totalBad) * 100)}%` }}
                  transition={{ duration: 1, ease: "easeOut" }}
                />
              </div>
            )}
          </div>

          {/* Best Streak */}
          <div className="glass rounded-3xl p-6 border border-white/5 group hover:border-amber-500/40 hover:-translate-y-1.5 hover:shadow-[0_10px_40px_rgba(245,158,11,0.15)] transition-all duration-500 relative overflow-hidden backdrop-blur-2xl bg-black/40 flex flex-col justify-between">
            <div className="absolute inset-0 bg-gradient-to-br from-amber-500/10 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
            <div>
              <div className="relative flex items-center justify-between mb-4">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-400/20 to-orange-600/20 flex items-center justify-center border border-amber-500/20 shadow-inner group-hover:scale-110 transition-transform duration-500">
                  <Award className="text-amber-400 drop-shadow-[0_0_8px_rgba(251,191,36,0.5)]" size={24} />
                </div>
                <div className="px-3 py-1 bg-amber-500/10 rounded-lg border border-amber-500/20">
                  <span className="text-xs font-bold text-amber-400">🔥 أسطوري</span>
                </div>
              </div>
              <div className="text-[#A7B3AB] text-xs font-bold uppercase tracking-widest mb-1">أفضل سلسلة مستمرة</div>
              <div className="flex items-baseline gap-2">
                <span className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-br from-amber-300 to-orange-500 drop-shadow-sm">{bestStreak}</span>
                <span className="text-sm text-amber-400/50 font-bold">يوم</span>
              </div>
            </div>
            
            <div className="mt-5 flex gap-1 h-2">
              {[...Array(5)].map((_, i) => (
                <div key={i} className={`flex-1 rounded-full ${i < Math.min(5, Math.ceil(bestStreak / 5)) ? 'bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.5)]' : 'bg-white/5'}`} />
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="mb-8 p-6 glass rounded-2xl border border-white/5 flex items-center gap-4">
          <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center">
            <span className="text-2xl">📅</span>
          </div>
          <div>
            <h2 className="text-xl font-bold text-white mb-1">أخبارك الشهر اللي فات إيه؟</h2>
            <p className="text-[#A7B3AB] text-sm">هذا الشهر انتهى ومغلق للتعديل. تفقد تقدمك وإنجازاتك في هذا الشهر.</p>
          </div>
        </div>
      )}

      {/* ─── Grid Table ─── */}
      <div className="glass rounded-3xl border border-white/[0.06] overflow-hidden">
        <div className="overflow-x-auto relative">
          <div className="min-w-[650px] w-full pb-4">
            {/* Header Row */}
            <div className="flex items-center px-5 py-4 border-x border-transparent border-b border-b-white/[0.06] bg-gradient-to-r from-black/30 to-transparent">
              <div className="w-48 shrink-0 flex items-center justify-between text-xs font-bold text-[#8B9A90] tracking-wider uppercase pl-3 border-l border-white/5">
                <span>العادة</span>
                
                {/* Pagination Controls */}
                <div className="flex items-center gap-1 ml-2 rtl:mr-2 rtl:ml-0" dir="ltr">
                  <button 
                    onClick={() => setPageOffset(p => Math.min(maxPageOffset, p + 1))}
                    disabled={pageOffset >= maxPageOffset}
                    className="w-6 h-6 flex items-center justify-center rounded hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    title="أيام أقدم"
                  >
                    <ChevronLeft size={14} />
                  </button>
                  <button 
                    onClick={() => setPageOffset(p => Math.max(0, p - 1))}
                    disabled={pageOffset === 0}
                    className="w-6 h-6 flex items-center justify-center rounded hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
                    title="أيام أحدث"
                  >
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>

              {/* Days */}
              <div className="flex-1 grid grid-cols-10 px-2">
                {days.map((day) => (
                  <div
                    key={day.num}
                    className={`flex flex-col items-center justify-end transition-all duration-200 ${
                      day.isToday
                        ? 'text-green-400 font-bold'
                        : 'text-[#5E6A63]'
                    }`}
                  >
                    <span className="text-[8px] leading-none mb-0.5 opacity-50">{day.dayName}</span>
                    <span className="text-[10px] leading-none">{day.num}</span>
                    {day.isToday && (
                      <motion.div
                        className="w-1 h-1 rounded-full bg-green-400 mt-0.5"
                        animate={{ scale: [1, 1.5, 1] }}
                        transition={{ repeat: Infinity, duration: 2 }}
                      />
                    )}
                  </div>
                ))}
              </div>

              <div className="w-24 shrink-0 text-center text-[10px] font-bold text-[#8B9A90] tracking-wider uppercase border-r border-white/5">
                🔥 السلسلة
              </div>
              <div className="w-[110px] shrink-0 text-center text-[10px] font-bold text-[#8B9A90] tracking-wider uppercase border-r border-white/5 sticky left-0 right-0 z-10 bg-black/40 backdrop-blur-xl md:static md:bg-transparent">
                إجراءات
              </div>
            </div>

            {/* Rows */}
            <div className="flex flex-col gap-3 mt-4">
              {habits.map((habit, idx) => (
                <div
                  key={habit.id}
                  className={`flex items-center px-5 py-5 border rounded-2xl transition-colors group shadow-sm ${
                    habit.habit_type === 'quit'
                      ? 'bg-red-950/10 border-red-500/10 hover:bg-red-950/20'
                      : 'bg-white/[0.01] border-white/5 hover:bg-white/[0.03]'
                  }`}
                >
                  {/* Habit Info */}
                  <div className="w-48 shrink-0 flex items-center gap-2 pl-3 border-l border-white/5">
                    <div
                      className="w-8 h-8 rounded-xl flex items-center justify-center text-sm shrink-0 shadow-lg transition-transform group-hover:scale-110"
                      style={{
                        background: `linear-gradient(135deg, ${COLORS[habit.color] || '#22C55E'}22, ${COLORS[habit.color] || '#22C55E'}44)`,
                        boxShadow: `0 4px 15px ${COLORS[habit.color] || '#22C55E'}15`
                      }}
                    >
                      {habit.icon || "✨"}
                    </div>
                    <div className="flex flex-col min-w-0">
                      <span className="font-semibold text-sm text-white/95 whitespace-normal break-words flex items-center gap-1" title={habit.title}>
                        {habit.title}
                        {habit.habit_type === 'quit' && <span className="text-[10px] text-red-400 bg-red-500/10 px-1.5 py-0.5 rounded">🚫 سيئة</span>}
                      </span>
                      {habit.habit_type === 'quit' ? (
                        habit.relapsedToday
                          ? <span className="text-[10px] text-red-400/70 mt-0.5">⚠️ انتكاس</span>
                          : isHabitHandledToday(habit)
                            ? <span className="text-[10px] text-teal-400/70 mt-0.5">🛡️ تم التجنب</span>
                            : <span className="text-[10px] text-orange-400/70 mt-0.5">⏳ بانتظار التأكيد</span>
                      ) : isHabitHandledToday(habit) ? (
                        <span className="text-[10px] text-green-400/70 mt-0.5">✓ {habit.frozenToday ? 'مجمّد' : 'تم'}</span>
                      ) : null}
                    </div>
                  </div>

                  {/* Days Grid */}
                  <div className="flex-1 grid grid-cols-10 px-2 items-center">
                    {days.map((day) => {
                      const isBad = habit.habit_type === 'quit';
                      const isRelapsed = habit.relapses?.has(day.fullDate) || false;
                      const isChecked = isHabitSuccessOnDay(habit, day.fullDate);
                      const isFrozen = habit.freezes?.has(day.fullDate);
                      let habitColor = isBad
                        ? (isRelapsed ? "#EF4444" : "#14B8A6")
                        : (COLORS[habit.color] || "#22C55E");
                      
                      if (isFrozen) habitColor = "#60A5FA"; // Blue for frozen


                      return (
                        <div key={day.num} className="flex items-center justify-center h-8 relative">
                          {!day.isFuture ? (
                            <button
                              onClick={() => {
                                if (!isCurrentMonth) return;
                                if (isRelapsed && day.isToday) {
                                  onUndoRelapse?.(habit.id);
                                  return;
                                }
                                onCheckIn(habit.id, day.fullDate, isChecked ? "uncheck" : "check");
                              }}
                              disabled={!isCurrentMonth || day.isFuture}
                              className={`w-[26px] h-[26px] rounded-lg transition-all duration-300 flex items-center justify-center relative overflow-hidden ${
                                isChecked || isRelapsed
                                  ? ''
                                  : day.isToday
                                    ? `bg-white/[0.08] ring-1 ${isBad ? 'ring-red-500/30' : 'ring-green-500/30'} hover:bg-white/[0.12]`
                                    : 'bg-white/[0.08] hover:bg-white/[0.12]'
                              } ${!isCurrentMonth && !isChecked ? 'opacity-30 cursor-default hover:bg-white/[0.04]' : ''} ${!isCurrentMonth && isChecked ? 'cursor-default' : ''}`}
                              style={(isChecked || isRelapsed) ? {
                                background: `linear-gradient(135deg, ${habitColor}, ${habitColor}cc)`,
                                boxShadow: `0 2px 10px ${habitColor}40`,
                              } : undefined}
                            >
                              {isFrozen ? (
                                <Snowflake size={14} className="text-white drop-shadow-md relative z-10" />
                              ) : isRelapsed ? (
                                <AlertTriangle size={13} className="text-white drop-shadow-md relative z-10" />
                              ) : isChecked ? (
                                <div className="text-white">
                                  {isBad
                                    ? <Shield size={12} strokeWidth={2.5} />
                                    : <Check size={14} strokeWidth={3} />
                                  }
                                </div>
                              ) : null}
                              
                              <AnimatePresence>
                                {isCurrentMonth && burstId === `${habit.id}-${day.fullDate}` && (
                                  <motion.div
                                    className="absolute inset-0 bg-white"
                                    initial={{ opacity: 0.8, scale: 0.5 }}
                                    animate={{ opacity: 0, scale: 2 }}
                                    exit={{ opacity: 0 }}
                                    transition={{ duration: 0.4 }}
                                  />
                                )}
                              </AnimatePresence>
                            </button>
                          ) : (
                            <div className="w-[26px] h-[26px] rounded-lg border border-white/[0.05] bg-white/[0.03] opacity-40" />
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Streak + Saved Value for quit habits — Phase 7.3: best streak badge */}
                  <div className="w-24 shrink-0 flex flex-col items-center justify-center gap-0.5 border-r border-white/5">
                    {habit.habit_type === 'quit' ? (
                      <>
                        <div className="flex items-center gap-1 px-2 py-1 rounded-lg text-xs font-bold bg-gradient-to-r from-red-500/15 to-orange-500/10 text-red-400">
                          <AlertTriangle size={11} />
                          {habit.streak?.current_streak || 0}د
                        </div>
                        {/* Best streak badge */}
                        {(habit.streak?.longest_streak || 0) > 0 && (
                          <div className="flex items-center gap-0.5 text-[9px] text-amber-400/70 mt-0.5">
                            <Star size={8} className="fill-amber-400/50" />
                            {habit.streak?.longest_streak}
                          </div>
                        )}
                        {habit.saved_value_per_day ? (
                          <div className="text-[9px] text-green-400/70 text-center leading-tight">
                            وفّر {Number(((habit.streak?.current_streak || 0) * (habit.saved_value_per_day || 0)).toFixed(2))} {habit.saved_unit || ''}
                          </div>
                        ) : null}
                      </>
                    ) : (
                      <>
                        <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-sm font-bold ${
                          (habit.streak?.current_streak || 0) > 0
                            ? 'bg-gradient-to-r from-orange-500/15 to-amber-500/10 text-orange-400'
                            : 'bg-white/5 text-white/30'
                        }`}>
                          <Flame size={14} className={(habit.streak?.current_streak || 0) > 0 ? 'text-orange-400' : 'text-white/20'} />
                          {habit.streak?.current_streak || 0}
                        </div>
                        {/* Best streak badge */}
                        {(habit.streak?.longest_streak || 0) > 0 && (
                          <div className="flex items-center gap-0.5 text-[9px] text-amber-400/70 mt-0.5">
                            <Star size={8} className="fill-amber-400/50" />
                            أفضل: {habit.streak?.longest_streak}
                          </div>
                        )}
                        {habit.saved_value_per_day ? (
                          <div className="text-[9px] text-green-400/70 text-center leading-tight">
                            حقق {Number(((habit.streak?.current_streak || 0) * (habit.saved_value_per_day || 0)).toFixed(2))} {habit.saved_unit || ''}
                          </div>
                        ) : null}
                      </>
                    )}
                    {habit.is_paused && (
                      <div className="flex items-center gap-0.5 text-[9px] text-blue-400">
                        <PauseCircle size={9} /> مجمّد
                      </div>
                    )}
                  </div>

                  {/* Actions — always visible (Phase 4) */}
                  <div className="w-[110px] shrink-0 flex items-center justify-center border-r border-white/5 gap-1 sticky left-0 right-0 z-10 bg-[#0F1110]/95 backdrop-blur-xl md:static md:bg-transparent">
                    {habit.habit_type === 'quit' && isCurrentMonth && onResetStreak ? (
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => { setRelapseHabitId(habit.id); setRelapseReason(""); }}
                        className="w-8 h-8 rounded-lg flex items-center justify-center bg-red-500/20 hover:bg-red-500/30 text-red-400 border border-red-500/20 transition-all"
                        title="انتكاس"
                      >
                        <AlertTriangle size={14} />
                      </motion.button>
                    ) : null}

                    {habit.habit_type !== 'quit' ? (
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => {
                          if (!onFreeze) return;
                          if (freezesUsed >= 3 && !habit.frozenToday) {
                            toast.error("لقد استنفدت رصيد الإيقاف (3 مرات) لهذا الشهر!");
                            return;
                          }
                          if (habit.frozenToday) return;
                          onFreeze(habit.id, todayLocal, currentMonthStr);
                          toast.success("تم تجميد العادة لليوم بنجاح ❄️");
                        }}
                        className={`w-8 h-8 rounded-lg flex items-center justify-center transition-all ${
                          habit.frozenToday
                            ? 'bg-blue-500/30 text-blue-300'
                            : 'bg-white/5 hover:bg-blue-500/20 text-[#8B9A90] hover:text-blue-400'
                        }`}
                        title="تجميد لليوم (عدم الحساب)"
                      >
                        <Snowflake size={14} />
                      </motion.button>
                    ) : null}

                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => onEdit(habit)}
                      className="w-8 h-8 rounded-lg flex items-center justify-center bg-white/5 hover:bg-blue-500/20 text-[#8B9A90] hover:text-blue-400 transition-all"
                      title="تعديل"
                    >
                      <Edit2 size={14} />
                    </motion.button>

                    {/* Phase 7.1 — Undo toast after delete */}
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => {
                        const deletedHabit = habit;
                        onDelete(habit.id);
                        toast(
                          <div className="flex items-center gap-3">
                            <Trash2 size={15} className="text-red-400 shrink-0" />
                            <span className="text-sm text-white/90">تم حذف «{deletedHabit.title}»</span>
                          </div>,
                          {
                            duration: 5000,
                            action: onUndelete
                              ? {
                                  label: "تراجع",
                                  onClick: () => onUndelete(deletedHabit.id),
                                }
                              : undefined,
                          }
                        );
                      }}
                      className="w-8 h-8 rounded-lg flex items-center justify-center bg-white/5 hover:bg-red-500/20 text-[#8B9A90] hover:text-red-400 transition-all"
                      title="حذف"
                    >
                      <Trash2 size={14} />
                    </motion.button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ─── Bottom Summary — Phase 5: split good/quit correctly ─── */}
      {isCurrentMonth && habits.length > 0 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="mt-16 mb-8"
        >
          <div className="flex flex-col lg:flex-row gap-8 relative">
            {/* --- Positive Habits Section --- */}
            <div className="flex-1 flex flex-col">
              <div className="flex items-center justify-between mb-5">
                <h3 className="text-base font-black text-white flex items-center gap-2">
                  <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-green-500/20 to-emerald-500/5 flex items-center justify-center border border-green-500/20 shadow-[0_0_15px_rgba(34,197,94,0.1)]">
                    <Check size={16} className="text-green-400" />
                  </div>
                  العادات الإيجابية
                </h3>
                <div className="flex items-center gap-1.5 bg-gradient-to-r from-blue-500/10 to-cyan-500/5 border border-blue-500/20 px-3 py-1.5 rounded-xl shadow-sm">
                  <Snowflake size={14} className="text-blue-400" />
                  <span className="text-xs font-bold text-blue-300">
                    رصيد الإيقاف: {Math.max(0, 3 - freezesUsed)} / 3
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 flex-1">
                {/* Good habits done */}
                <div className="glass rounded-2xl p-5 border border-green-500/10 hover:border-green-500/20 transition-colors relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-green-500/5 rounded-full blur-3xl -mr-16 -mt-16 transition-all group-hover:bg-green-500/10" />
                  <div className="flex items-center justify-between mb-4 relative">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-green-400 shadow-[0_0_8px_rgba(74,222,128,0.8)]" />
                      <span className="text-sm font-bold text-green-400">تمت اليوم</span>
                    </div>
                    <span className="text-xs font-bold bg-green-500/10 text-green-400 px-2 py-1 rounded-lg">
                      {goodHabits.filter(h => isHabitHandledToday(h)).length}
                    </span>
                  </div>
                  <div className="space-y-2.5 relative">
                    {goodHabits.filter(h => isHabitHandledToday(h)).map(h => (
                      <motion.div
                        key={h.id}
                        className="flex items-center gap-2.5 text-sm text-white/80 cursor-pointer bg-white/[0.02] hover:bg-red-500/10 p-2 rounded-xl border border-white/5 hover:border-red-500/20 transition-colors group/item"
                        onClick={() => onCheckIn(h.id, todayLocal, "uncheck")}
                        whileTap={{ scale: 0.98 }}
                      >
                        <span className="drop-shadow-md">{h.icon}</span>
                        <span className="truncate font-medium">{h.title}</span>
                        <span className="text-[10px] font-bold text-red-400/50 group-hover/item:text-red-400 mr-auto shrink-0 bg-red-500/10 px-2 py-1 rounded-md transition-colors opacity-0 group-hover/item:opacity-100">تراجع</span>
                        {h.frozenToday ? (
                          <Snowflake size={14} className="text-blue-400 shrink-0 group-hover/item:hidden" />
                        ) : (
                          <Check size={14} className="text-green-400 shrink-0 group-hover/item:hidden" />
                        )}
                      </motion.div>
                    ))}
                    {goodHabits.filter(h => isHabitHandledToday(h)).length === 0 && (
                      <div className="text-sm text-white/30 text-center py-4 bg-white/[0.01] rounded-xl border border-white/5 border-dashed">لم تكمل أي عادة بعد</div>
                    )}
                  </div>
                </div>

                {/* Good habits not done yet */}
                <div className="glass rounded-2xl p-5 border border-orange-500/10 hover:border-orange-500/20 transition-colors relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-orange-500/5 rounded-full blur-3xl -mr-16 -mt-16 transition-all group-hover:bg-orange-500/10" />
                  <div className="flex items-center justify-between mb-4 relative">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 rounded-full bg-orange-400 shadow-[0_0_8px_rgba(251,146,60,0.8)]" />
                      <span className="text-sm font-bold text-orange-400">لم تتم بعد</span>
                    </div>
                    <span className="text-xs font-bold bg-orange-500/10 text-orange-400 px-2 py-1 rounded-lg">
                      {goodHabits.filter(h => !isHabitHandledToday(h)).length}
                    </span>
                  </div>

                  <div className="space-y-2.5 relative">
                    {goodHabits.filter(h => !isHabitHandledToday(h)).map(h => (
                      <motion.div
                        key={h.id}
                        className="flex items-center gap-2.5 text-sm text-white/80 cursor-pointer bg-white/[0.02] hover:bg-orange-500/10 p-2 rounded-xl border border-white/5 hover:border-orange-500/20 transition-colors group/item"
                        onClick={() => handleCheckInWithJournal(h.id, todayLocal)}
                        whileTap={{ scale: 0.98 }}
                      >
                        <span className="drop-shadow-md">{h.icon}</span>
                        <span className="truncate font-medium">{h.title}</span>
                        <span className="text-[10px] font-bold text-orange-400/50 group-hover/item:text-orange-400 mr-auto shrink-0 bg-orange-500/10 px-2 py-1 rounded-md transition-colors">اضغط للإتمام</span>
                      </motion.div>
                    ))}
                    {goodHabits.filter(h => !isHabitHandledToday(h)).length === 0 && (
                      <div className="text-sm font-bold text-green-400/80 text-center py-4 bg-green-500/5 rounded-xl border border-green-500/10">🎉 أكملت كل العادات الجيدة!</div>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* --- Visual Divider --- */}
            {badHabits.length > 0 && (
              <>
                {/* Desktop Divider */}
                <div className="hidden lg:flex flex-col items-center justify-center shrink-0 w-8">
                  <div className="w-px h-full bg-gradient-to-b from-transparent via-green-500/40 to-transparent shadow-[0_0_12px_rgba(34,197,94,0.4)]"></div>
                </div>
                {/* Mobile Divider */}
                <div className="flex lg:hidden items-center justify-center w-full py-6">
                  <div className="h-px w-full bg-gradient-to-r from-transparent via-green-500/40 to-transparent shadow-[0_0_12px_rgba(34,197,94,0.4)]"></div>
                </div>
              </>
            )}

            {/* --- Negative Habits Section --- */}
            {badHabits.length > 0 && (
              <div className="flex-1 flex flex-col">
                <div className="flex items-center justify-between mb-5">
                  <h3 className="text-base font-black text-white flex items-center gap-2">
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-red-500/20 to-orange-500/5 flex items-center justify-center border border-red-500/20 shadow-[0_0_15px_rgba(239,68,68,0.1)]">
                      <AlertTriangle size={16} className="text-red-400" />
                    </div>
                    العادات السلبية
                  </h3>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 flex-1">
                  {/* Quit habits avoided today */}
                  <div className="glass rounded-2xl p-5 border border-teal-500/10 hover:border-teal-500/20 transition-colors relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-teal-500/5 rounded-full blur-3xl -mr-16 -mt-16 transition-all group-hover:bg-teal-500/10" />
                    <div className="flex items-center justify-between mb-4 relative">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-teal-400 shadow-[0_0_8px_rgba(45,212,191,0.8)]" />
                        <span className="text-sm font-bold text-teal-400">تم تجنبها اليوم</span>
                      </div>
                      <span className="text-xs font-bold bg-teal-500/10 text-teal-400 px-2 py-1 rounded-lg">
                        {badHabits.filter(h => isHabitHandledToday(h)).length}
                      </span>
                    </div>
                    <div className="space-y-2.5 relative">
                      {badHabits.filter(h => isHabitHandledToday(h)).map(h => (
                        <motion.div
                          key={h.id}
                          className="flex items-center gap-2.5 text-sm text-white/80 cursor-pointer bg-white/[0.02] hover:bg-red-500/10 p-2 rounded-xl border border-white/5 hover:border-red-500/20 transition-colors group/item"
                          onClick={() => { setRelapseHabitId(h.id); setRelapseReason(""); }}
                          whileTap={{ scale: 0.98 }}
                        >
                          <span className="drop-shadow-md">{h.icon}</span>
                          <span className="truncate font-medium">{h.title}</span>
                          <span className="text-[10px] font-bold text-red-400/50 group-hover/item:text-red-400 mr-auto shrink-0 bg-red-500/10 px-2 py-1 rounded-md transition-colors opacity-0 group-hover/item:opacity-100">سجل انتكاسة</span>
                          {h.frozenToday ? (
                            <Snowflake size={14} className="text-blue-400 shrink-0 group-hover/item:hidden" />
                          ) : (
                            <Shield size={14} className="text-teal-400 shrink-0 group-hover/item:hidden" />
                          )}
                        </motion.div>
                      ))}
                      {badHabits.filter(h => isHabitHandledToday(h)).length === 0 && (
                        <div className="text-sm text-white/30 text-center py-4 bg-white/[0.01] rounded-xl border border-white/5 border-dashed">لم تؤكد التجنب بعد</div>
                      )}
                    </div>
                  </div>

                  {/* Quit habits not yet avoided */}
                  <div className="glass rounded-2xl p-5 border border-red-500/10 hover:border-red-500/20 transition-colors relative overflow-hidden group">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-red-500/5 rounded-full blur-3xl -mr-16 -mt-16 transition-all group-hover:bg-red-500/10" />
                    <div className="flex items-center justify-between mb-4 relative">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-red-400 shadow-[0_0_8px_rgba(248,113,113,0.8)]" />
                        <span className="text-sm font-bold text-red-400">لم يتم تجنبها</span>
                      </div>
                      <span className="text-xs font-bold bg-red-500/10 text-red-400 px-2 py-1 rounded-lg">
                        {badHabits.filter(h => !isHabitHandledToday(h)).length}
                      </span>
                    </div>
                    <div className="space-y-2.5 relative">
                      {badHabits.filter(h => !isHabitHandledToday(h)).map(h => (
                        <motion.div
                          key={h.id}
                          className="flex items-center gap-2.5 text-sm text-white/80 cursor-pointer bg-white/[0.02] hover:bg-teal-500/10 p-2 rounded-xl border border-white/5 hover:border-teal-500/20 transition-colors group/item"
                          onClick={() => h.relapsedToday ? onUndoRelapse?.(h.id) : onCheckIn(h.id, todayLocal, "check")}
                          whileTap={{ scale: 0.98 }}
                        >
                          <span className="drop-shadow-md">{h.icon}</span>
                          <span className="truncate font-medium">{h.title}</span>
                          {h.relapsedToday ? (
                            <span className="text-[10px] font-bold text-red-400 mr-auto shrink-0 bg-red-500/10 px-2 py-1 rounded-md">انتكست اليوم</span>
                          ) : (
                            <span className="text-[10px] font-bold text-teal-400/50 group-hover/item:text-teal-400 mr-auto shrink-0 bg-teal-500/10 px-2 py-1 rounded-md transition-colors">تأكيد التجنب</span>
                          )}
                        </motion.div>
                      ))}
                      {badHabits.filter(h => !isHabitHandledToday(h)).length === 0 && (
                        <div className="text-sm font-bold text-teal-400/80 text-center py-4 bg-teal-500/5 rounded-xl border border-teal-500/10">🎉 أكدت تجنب جميع العادات السيئة!</div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        </motion.div>
      )}

      {/* ─── Relapse Popup ─── */}
      <AnimatePresence>
        {relapseHabitId && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
            onClick={(e) => e.target === e.currentTarget && setRelapseHabitId(null)}
          >
            <motion.div
              initial={{ scale: 0.9, y: 10 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="glass rounded-2xl p-6 w-full max-w-sm border border-red-500/20"
            >
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-red-500/20 flex items-center justify-center">
                  <AlertTriangle size={18} className="text-red-400" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-sm">تسجيل انتكاس</h3>
                  <p className="text-xs text-white/50">سيُصفَّر عداد السلسلة</p>
                </div>
              </div>
              <textarea
                value={relapseReason}
                onChange={(e) => setRelapseReason(e.target.value)}
                placeholder="ما هو سبب الانتكاس؟"
                className="w-full bg-black/30 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/30 text-sm focus:outline-none focus:border-red-500/40 resize-none mb-4"
                rows={3}
                autoFocus
              />
              <div className="flex gap-2">
                <button
                  onClick={() => setRelapseHabitId(null)}
                  className="flex-1 py-2.5 rounded-xl bg-white/5 border border-white/10 text-white/70 text-sm font-medium transition hover:bg-white/10"
                >
                  إلغاء
                </button>
                <button
                  onClick={submitRelapse}
                  disabled={relapseLoading}
                  className="flex-1 py-2.5 rounded-xl bg-red-500/20 border border-red-500/30 text-red-400 text-sm font-bold transition hover:bg-red-500/30 disabled:opacity-50"
                >
                  {relapseLoading ? (
                    <div className="w-4 h-4 border-2 border-red-400/30 border-t-red-400 rounded-full animate-spin mx-auto" />
                  ) : "تأكيد"}
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Micro-Journal Toast ─── */}
      <AnimatePresence>
        {journalHabitId && (
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 40 }}
            className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 w-80 glass rounded-2xl p-4 border border-green-500/20 shadow-2xl"
          >
            <p className="text-xs text-green-400 mb-2">💭 كيف كان شعورك؟ (اختياري)</p>
            <input
              type="text"
              value={journalText}
              onChange={(e) => setJournalText(e.target.value)}
              placeholder="اكتب ملاحظة سريعة..."
              className="w-full bg-black/30 border border-white/10 rounded-xl px-3 py-2 text-white text-xs placeholder:text-white/30 focus:outline-none mb-2"
              autoFocus
              onKeyDown={(e) => e.key === 'Enter' && saveJournal()}
            />
            <div className="flex gap-2">
              <button onClick={saveJournal} className="flex-1 py-1.5 rounded-lg bg-green-500/20 text-green-400 text-xs font-bold">حفظ</button>
              <button onClick={() => { setJournalHabitId(null); setJournalDayLocal(null); }} className="flex-1 py-1.5 rounded-lg bg-white/5 text-white/50 text-xs">تخطي</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
