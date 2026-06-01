import { useMemo, useState, useEffect } from "react";
import { HabitWithStreak, HabitColor, getMonthlyFreezeCount } from "@/hooks/useHabits";
import { Edit2, Trash2, Check, Flame, Award, AlertTriangle, PauseCircle, ChevronRight, ChevronLeft, Info, Trophy, Sparkles, Shield, Snowflake, Clock, Star } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
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
};

const COLORS: Record<string, string> = {
  slate: "#64748B", gray: "#9CA3AF", zinc: "#A1A1AA", neutral: "#A3A3A3",
  stone: "#A8A29E", red: "#EF4444", orange: "#F97316", amber: "#F59E0B",
  yellow: "#EAB308", lime: "#84CC16", green: "#22C55E", emerald: "#10B981",
  teal: "#14B8A6", cyan: "#06B6D4", sky: "#0EA5E9", blue: "#3B82F6",
  indigo: "#6366F1", violet: "#8B5CF6", purple: "#A855F7", fuchsia: "#D946EF",
  pink: "#EC4899", rose: "#F43F5E", brown: "#A52A2A",
};

export function HabitMonthlyGrid({ habits, currentDate, onCheckIn, onEdit, onDelete, onUndelete, burstId, onResetStreak, onFreeze }: Props) {
  const today = new Date();
  const todayLocal = new Intl.DateTimeFormat("en-CA").format(today);
  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const isCurrentMonth = month === today.getMonth() && year === today.getFullYear();
  const currentMonthStr = todayLocal.slice(0, 7);
  const freezesUsed = getMonthlyFreezeCount(currentMonthStr);

  // Relapse popup state
  const [relapseHabitId, setRelapseHabitId] = useState<string | null>(null);
  const [relapseReason, setRelapseReason] = useState("");
  const [relapseLoading, setRelapseLoading] = useState(false);
  // Micro-journal toast
  const [journalHabitId, setJournalHabitId] = useState<string | null>(null);
  const [journalText, setJournalText] = useState("");

  const handleCheckInWithJournal = (habitId: string, dayLocal: string) => {
    onCheckIn(habitId, dayLocal, "check");
    setJournalHabitId(habitId);
    setJournalText("");
    setTimeout(() => setJournalHabitId(null), 5000);
  };

  const saveJournal = () => {
    if (journalText.trim()) {
      const key = `journal_${journalHabitId}_${todayLocal}`;
      localStorage.setItem(key, journalText.trim());
    }
    setJournalHabitId(null);
  };

  const submitRelapse = async () => {
    if (!relapseHabitId || !onResetStreak) return;
    setRelapseLoading(true);
    await onResetStreak(relapseHabitId, relapseReason);
    setRelapseLoading(false);
    setRelapseHabitId(null);
    setRelapseReason("");
  };

  // Pagination state (0 = most recent 14 days, 1 = previous 14 days, etc)
  const [pageOffset, setPageOffset] = useState(0);

  // Show 14 days chunk based on pageOffset
  const { days, maxPageOffset } = useMemo(() => {
    const allDays = Array.from({ length: daysInMonth }, (_, i) => {
      const d = new Date(year, month, i + 1);
      const dayName = d.toLocaleDateString("ar-EG", { weekday: "narrow" });
      const fullDate = new Intl.DateTimeFormat("en-CA").format(d);
      const isToday = fullDate === todayLocal;
      const isFuture = d > new Date(new Date().setHours(23, 59, 59, 999));
      return { num: i + 1, dayName, fullDate, isToday, isFuture };
    });
    
    // Valid days (up to today if current month, or all month if past)
    const validDays = isCurrentMonth ? allDays.filter(d => !d.isFuture) : allDays;
    
    const CHUNK = 10;
    const totalValid = validDays.length;
    const maxPage = Math.max(0, Math.ceil(totalValid / CHUNK) - 1);
    
    // Ensure pageOffset is valid
    const currentOffset = Math.min(pageOffset, maxPage);
    
    // We want page 0 to show the MOST RECENT days (e.g. days 21-30)
    // page 1 to show the NEXT most recent (e.g. days 11-20)
    // page 2 to show the oldest (e.g. days 1-10)
    const end = Math.max(0, totalValid - currentOffset * CHUNK);
    const start = Math.max(0, end - CHUNK);
    
    return { days: validDays.slice(start, end), maxPageOffset: maxPage };
  }, [daysInMonth, year, month, todayLocal, isCurrentMonth, pageOffset]);

  // Adjust pageOffset if month changes
  useEffect(() => {
    setPageOffset(0);
  }, [month, year]);

  // Stats
  const goodHabits = habits.filter(h => (h as any).habit_type !== 'quit');
  const badHabits = habits.filter(h => (h as any).habit_type === 'quit');

  const completedGood = goodHabits.filter(h => h.checkedToday).length;
  const totalGood = goodHabits.length;
  
  // For bad habits, checkedToday means they actively confirmed avoiding it
  const avoidedBad = badHabits.filter(h => h.checkedToday).length;
  const relapsedBad = badHabits.length - avoidedBad;
  const totalBad = badHabits.length;

  // Total overall score
  const totalItems = totalGood + totalBad;
  const totalSuccess = completedGood + avoidedBad;
  const pct = totalItems > 0 ? Math.round((totalSuccess / totalItems) * 100) : 0;

  const bestStreak = Math.max(...habits.map(h => h.streak?.current_streak || 0), 0);

  // Circular progress values
  const circumference = 2 * Math.PI * 40;
  const strokeDashoffset = circumference - (pct / 100) * circumference;

  return (
    <div className="w-full pb-6">
      {/* ─── Premium Stats Bar ─── */}
      {isCurrentMonth ? (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          {/* Circular Progress */}
          <div className="lg:col-span-1 glass rounded-2xl p-5 border border-white/5 flex items-center gap-5 group hover:border-green-500/20 transition-all duration-300">
            <div className="relative w-20 h-20 shrink-0">
              <svg className="w-20 h-20 -rotate-90" viewBox="0 0 100 100">
                <circle cx="50" cy="50" r="40" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="8" />
                <motion.circle
                  cx="50" cy="50" r="40" fill="none"
                  stroke="url(#progressGradient)" strokeWidth="8"
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  initial={{ strokeDashoffset: circumference }}
                  animate={{ strokeDashoffset }}
                  transition={{ duration: 1, ease: "easeOut" }}
                />
                <defs>
                  <linearGradient id="progressGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                    <stop offset="0%" stopColor="#4ADE80" />
                    <stop offset="100%" stopColor="#22D3EE" />
                  </linearGradient>
                </defs>
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-lg font-black text-white">{pct}%</span>
              </div>
            </div>
            <div>
              <div className="text-[#A7B3AB] text-xs mb-0.5">التقدم اليومي</div>
              <div className="text-white font-bold text-lg">{totalSuccess}/{totalItems}</div>
              <div className="text-[10px] text-green-400/60 mt-0.5">
                {pct === 100 ? "🎉 يوم مثالي!" : pct >= 50 ? "💪 استمر!" : "🚀 ابدأ الآن!"}
              </div>
              {/* Phase 7.2 – urgency text after 6PM when incomplete */}
              {pct < 100 && today.getHours() >= 18 && (
                <div className="flex items-center gap-1 mt-1.5 text-[10px] text-amber-400/80">
                  <Clock size={10} />
                  تبقى {23 - today.getHours()} ساعة لإكمال عادات اليوم
                </div>
              )}
            </div>
          </div>

          {/* Good Habits Completed */}
          <div className="glass rounded-2xl p-5 border border-white/5 group hover:border-green-500/20 transition-all duration-300">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-green-500/15 flex items-center justify-center">
                <Check className="text-green-400" size={20} />
              </div>
              <span className="text-xs text-[#A7B3AB]">عادات جيدة تمت</span>
            </div>
            <div className="flex items-end gap-1">
              <span className="text-3xl font-black text-green-400">{completedGood}</span>
              <span className="text-sm text-white/30 mb-1">من {totalGood}</span>
            </div>
            <div className="mt-3 h-1.5 bg-white/5 rounded-full overflow-hidden">
              <motion.div
                className="h-full rounded-full bg-gradient-to-r from-green-500 to-emerald-400"
                initial={{ width: 0 }}
                animate={{ width: `${totalGood > 0 ? Math.round((completedGood / totalGood) * 100) : 0}%` }}
                transition={{ duration: 0.8, ease: "easeOut" }}
              />
            </div>
          </div>

          {/* Bad Habits Avoided */}
          <div className="glass rounded-2xl p-5 border border-white/5 group hover:border-orange-500/20 transition-all duration-300">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-red-500/15 flex items-center justify-center">
                <AlertTriangle className="text-red-400" size={20} />
              </div>
              <span className="text-xs text-[#A7B3AB]">تم تجنبها (سيئة)</span>
            </div>
            {totalBad > 0 ? (
              <>
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-black text-red-400">{avoidedBad}</span>
                  <span className="text-sm text-white/30">من {totalBad}</span>
                </div>
                <div className="mt-3 h-1.5 bg-white/5 rounded-full overflow-hidden">
                  <motion.div
                    className="h-full rounded-full bg-gradient-to-r from-red-500 to-orange-400"
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.round((avoidedBad / totalBad) * 100)}%` }}
                    transition={{ duration: 0.8, ease: "easeOut" }}
                  />
                </div>
              </>
            ) : (
              <div className="flex items-baseline gap-1 mt-1">
                <span className="text-lg font-bold text-white/40">لا يوجد</span>
              </div>
            )}
          </div>

          {/* Best Streak */}
          <div className="glass rounded-2xl p-5 border border-white/5 group hover:border-amber-500/20 transition-all duration-300">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-xl bg-amber-500/15 flex items-center justify-center">
                <Award className="text-amber-400" size={20} />
              </div>
              <span className="text-xs text-[#A7B3AB]">أفضل سلسلة 🔥</span>
            </div>
            <div className="flex items-baseline gap-1">
              <span className="text-3xl font-black text-amber-400">{bestStreak}</span>
              <span className="text-sm text-white/30">يوم متتالي</span>
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

      {/* ─── Info Guide ─── */}
      <div className="mb-6 flex flex-wrap items-center gap-4 text-[11px] text-[#A7B3AB] bg-white/[0.02] p-4 rounded-2xl border border-white/[0.04]">
        <div className="flex items-center gap-1.5"><Info size={13} className="text-blue-400" /> <b>دليل مبسط:</b></div>
        <div className="flex items-center gap-1.5"><Sparkles size={13} className="text-green-400" /> <b className="text-white">العادة الجيدة:</b> قم بالضغط عليها يومياً لإنجازها.</div>
        <div className="flex items-center gap-1.5"><AlertTriangle size={13} className="text-red-400" /> <b className="text-white">العادة السيئة:</b> اضغط عليها (✓) لتأكيد أنك نجحت في تجنبها اليوم.</div>
        <div className="flex items-center gap-1.5"><Flame size={13} className="text-orange-400" /> <b className="text-white">السلسلة:</b> عدد الأيام المتتالية التي أتممت فيها العادة بدون كسرها.</div>
      </div>

      {/* ─── Grid Table ─── */}
      <div className="glass rounded-3xl border border-white/[0.06] overflow-hidden">
        <div className="overflow-hidden">
          <div className="min-w-0 w-full">
            {/* Header Row */}
            <div className="flex items-center px-5 py-4 border-b border-white/[0.06] bg-gradient-to-r from-black/30 to-transparent">
              <div className="w-36 shrink-0 flex items-center justify-between text-xs font-bold text-[#8B9A90] tracking-wider uppercase pl-3 border-l border-white/5">
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
              <div className="flex-1 flex justify-between px-2">
                {days.map((day) => (
                  <div
                    key={day.num}
                    className={`flex-1 flex flex-col items-center justify-end transition-all duration-200 ${
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
              <div className="w-20 shrink-0 text-center text-[10px] font-bold text-[#8B9A90] tracking-wider uppercase border-r border-white/5">
                إجراءات
              </div>
            </div>

            {/* Rows */}
            <div className="flex flex-col gap-3 mt-4">
              {habits.map((habit, idx) => (
                <div
                  key={habit.id}
                  className={`flex items-center px-5 py-5 border rounded-2xl transition-colors group shadow-sm ${
                    (habit as any).habit_type === 'quit'
                      ? 'bg-red-950/10 border-red-500/10 hover:bg-red-950/20'
                      : 'bg-white/[0.01] border-white/5 hover:bg-white/[0.03]'
                  }`}
                >
                  {/* Habit Info */}
                  <div className="w-36 shrink-0 flex items-center gap-2 pl-3 border-l border-white/5">
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
                      <span className="font-semibold text-xs text-white/90 truncate flex items-center gap-1" title={habit.title}>
                        {habit.title}
                        {(habit as any).habit_type === 'quit' && <span className="text-[9px] text-red-400 bg-red-500/10 px-1.5 py-0.5 rounded">🚫 سيئة</span>}
                      </span>
                      {habit.checkedToday && (
                        <span className="text-[9px] text-green-400/70">✓ تم</span>
                      )}
                    </div>
                  </div>

                  {/* Days Grid */}
                  <div className="flex-1 flex justify-between px-2 items-center">
                    {days.map((day) => {
                      const isChecked = habit.checkins?.has(day.fullDate) || false;
                      const isBad = (habit as any).habit_type === 'quit';
                      const isFrozen = habit.freezes?.has(day.fullDate);
                      let habitColor = isBad
                        ? (isChecked ? "#4ADE80" : "#EF4444")  // green=avoided, red=relapsed
                        : (COLORS[habit.color] || "#22C55E");
                      
                      if (isFrozen) habitColor = "#60A5FA"; // Blue for frozen


                      return (
                        <div key={day.num} className="flex items-center justify-center flex-1 h-8 relative">
                          {!day.isFuture ? (
                            <button
                              onClick={() => isCurrentMonth && onCheckIn(habit.id, day.fullDate, isChecked ? "uncheck" : "check")}
                              disabled={!isCurrentMonth}
                              className={`w-[26px] h-[26px] rounded-lg transition-all duration-300 flex items-center justify-center relative overflow-hidden ${
                                isChecked
                                  ? ''
                                  : day.isToday
                                    ? `bg-white/[0.08] ring-1 ${isBad ? 'ring-red-500/30' : 'ring-green-500/30'} hover:bg-white/[0.12]`
                                    : 'bg-white/[0.04] hover:bg-white/[0.08]'
                              } ${!isCurrentMonth && !isChecked ? 'opacity-30 cursor-default hover:bg-white/[0.04]' : ''} ${!isCurrentMonth && isChecked ? 'cursor-default' : ''}`}
                              style={isChecked ? {
                                background: `linear-gradient(135deg, ${habitColor}, ${habitColor}cc)`,
                                boxShadow: `0 2px 10px ${habitColor}40`,
                              } : undefined}
                            >
                              {isFrozen ? (
                                <Snowflake size={14} className="text-white drop-shadow-md relative z-10" />
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
                            <div className="w-[26px] h-[26px] rounded-lg border border-white/[0.02] bg-white/[0.01] opacity-20" />
                          )}
                        </div>
                      );
                    })}
                  </div>

                  {/* Streak + Saved Value for quit habits — Phase 7.3: best streak badge */}
                  <div className="w-24 shrink-0 flex flex-col items-center justify-center gap-0.5 border-r border-white/5">
                    {(habit as any).habit_type === 'quit' ? (
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
                        {(habit as any).saved_value_per_day ? (
                          <div className="text-[9px] text-green-400/70 text-center leading-tight">
                            وفّر {(habit.streak?.current_streak || 0) * ((habit as any).saved_value_per_day || 0)} {(habit as any).saved_unit || ''}
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
                        {(habit as any).saved_value_per_day ? (
                          <div className="text-[9px] text-green-400/70 text-center leading-tight">
                            حقق {(habit.streak?.current_streak || 0) * ((habit as any).saved_value_per_day || 0)} {(habit as any).saved_unit || ''}
                          </div>
                        ) : null}
                      </>
                    )}
                    {(habit as any).is_paused && (
                      <div className="flex items-center gap-0.5 text-[9px] text-blue-400">
                        <PauseCircle size={9} /> مجمّد
                      </div>
                    )}
                  </div>

                  {/* Actions — always visible (Phase 4) */}
                  <div className="w-[110px] shrink-0 flex items-center justify-center border-r border-white/5 gap-1">
                    {(habit as any).habit_type === 'quit' && isCurrentMonth && onResetStreak ? (
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

                    {(habit as any).habit_type !== 'quit' ? (
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
                          toast.custom((t) => (
                            <div className="bg-[#121413] border border-white/10 p-4 rounded-xl shadow-xl max-w-sm">
                              <h3 className="text-white font-bold mb-2">تجميد العادة؟</h3>
                              <p className="text-[#A7B3AB] text-sm mb-4">هل تريد تجميد هذه العادة لليوم؟ لن تؤثر على تقييمك.</p>
                              <div className="flex gap-2 justify-end">
                                <button onClick={() => toast.dismiss(t)} className="px-3 py-1.5 text-sm rounded-lg bg-white/5 hover:bg-white/10 text-white transition-colors">إلغاء</button>
                                <button onClick={() => { onFreeze(habit.id, todayLocal, currentMonthStr); toast.dismiss(t); }} className="px-3 py-1.5 text-sm rounded-lg bg-blue-500 hover:bg-blue-600 text-white transition-colors">تجميد</button>
                              </div>
                            </div>
                          ), { duration: Infinity });
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
          className="mt-6 grid grid-cols-2 lg:grid-cols-4 gap-4"
        >
          {/* Good habits done */}
          <div className="glass rounded-2xl p-5 border border-green-500/10">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-2 h-2 rounded-full bg-green-400" />
              <span className="text-sm font-medium text-green-400">عادات تمت اليوم</span>
            </div>
            <div className="space-y-2">
              {goodHabits.filter(h => h.checkedToday).map(h => (
                <div key={h.id} className="flex items-center gap-2 text-sm text-white/70">
                  <span>{h.icon}</span>
                  <span className="truncate">{h.title}</span>
                  <Check size={12} className="text-green-400 mr-auto shrink-0" />
                </div>
              ))}
              {goodHabits.filter(h => h.checkedToday).length === 0 && (
                <div className="text-sm text-white/30 text-center py-2">لم تكمل أي عادة بعد</div>
              )}
            </div>
          </div>

          {/* Good habits not done yet */}
          <div className="glass rounded-2xl p-5 border border-orange-500/10">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-2 h-2 rounded-full bg-orange-400" />
              <span className="text-sm font-medium text-orange-400">لم تتم بعد</span>
            </div>

            {/* Freeze tracker */}
            <div className="flex items-center gap-2 bg-blue-500/10 border border-blue-500/20 px-3 py-1.5 rounded-full mb-3">
              <Snowflake size={14} className="text-blue-400" />
              <span className="text-xs font-semibold text-blue-300">
                رصيد الإيقاف: {3 - freezesUsed} / 3
              </span>
            </div>

            <div className="space-y-2">
              {goodHabits.filter(h => !h.checkedToday).map(h => (
                <motion.div
                  key={h.id}
                  className="flex items-center gap-2 text-sm text-white/70 cursor-pointer hover:bg-white/5 rounded-lg p-1.5 -m-1.5 transition-colors"
                  onClick={() => handleCheckInWithJournal(h.id, todayLocal)}
                  whileTap={{ scale: 0.98 }}
                >
                  <span>{h.icon}</span>
                  <span className="truncate">{h.title}</span>
                  <span className="text-[10px] text-white/30 mr-auto shrink-0">اضغط لإتمامها</span>
                </motion.div>
              ))}
              {goodHabits.filter(h => !h.checkedToday).length === 0 && (
                <div className="text-sm text-green-400/60 text-center py-2">🎉 أكملت كل العادات الجيدة!</div>
              )}
            </div>
          </div>

          {/* Quit habits avoided today */}
          {badHabits.length > 0 && (
            <div className="glass rounded-2xl p-5 border border-teal-500/10">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-2 h-2 rounded-full bg-teal-400" />
                <span className="text-sm font-medium text-teal-400">تم تجنبها اليوم</span>
              </div>
              <div className="space-y-2">
                {badHabits.filter(h => h.checkedToday).map(h => (
                  <div key={h.id} className="flex items-center gap-2 text-sm text-white/70">
                    <span>{h.icon}</span>
                    <span className="truncate">{h.title}</span>
                    <Shield size={12} className="text-teal-400 mr-auto shrink-0" />
                  </div>
                ))}
                {badHabits.filter(h => h.checkedToday).length === 0 && (
                  <div className="text-sm text-white/30 text-center py-2">لم تؤكد التجنب بعد</div>
                )}
              </div>
            </div>
          )}

          {/* Quit habits not yet avoided */}
          {badHabits.length > 0 && (
            <div className="glass rounded-2xl p-5 border border-red-500/10">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-2 h-2 rounded-full bg-red-400" />
                <span className="text-sm font-medium text-red-400">لم يتم تجنبها</span>
              </div>
              <div className="space-y-2">
                {badHabits.filter(h => !h.checkedToday).map(h => (
                  <motion.div
                    key={h.id}
                    className="flex items-center gap-2 text-sm text-white/70 cursor-pointer hover:bg-white/5 rounded-lg p-1.5 -m-1.5 transition-colors"
                    onClick={() => handleCheckInWithJournal(h.id, todayLocal)}
                    whileTap={{ scale: 0.98 }}
                  >
                    <span>{h.icon}</span>
                    <span className="truncate">{h.title}</span>
                    <span className="text-[10px] text-white/30 mr-auto shrink-0">اضغط لتأكيد</span>
                  </motion.div>
                ))}
                {badHabits.filter(h => !h.checkedToday).length === 0 && (
                  <div className="text-sm text-teal-400/60 text-center py-2">✅ تجنبت كل العادات السيئة!</div>
                )}
              </div>
            </div>
          )}
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
              <button onClick={() => setJournalHabitId(null)} className="flex-1 py-1.5 rounded-lg bg-white/5 text-white/50 text-xs">تخطي</button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
