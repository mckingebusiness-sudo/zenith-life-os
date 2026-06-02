import { useState, useEffect } from "react";
import { HabitWithStreak } from "@/hooks/useHabits";
import {
  History, Medal, Trophy, Star, Target, Sparkles,
  RotateCcw, ShieldAlert, HeartPulse, Lock, PenTool,
  Eye, EyeOff, Crosshair, Zap, ShieldCheck, Flame,
  Crown, Gem, Award, Swords, Shield, AlertTriangle, Check
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { supabase } from "@/lib/supabase";

interface Props {
  habits: HabitWithStreak[];
  onResetStreak: (habitId: string, reason: string) => Promise<void>;
  onUndoRelapse?: (habitId: string) => Promise<void>;
}

/* ────────────────────── Milestone Definitions ────────────────────── */
const MILESTONES = [
  { days: 1,   label: "أول يوم",   subtitle: "بداية التغيير",   icon: Star },
  { days: 3,   label: "3 أيام",    subtitle: "الثبات الأول",     icon: Flame },
  { days: 7,   label: "أسبوع",     subtitle: "إرادة صلبة",      icon: Medal },
  { days: 10,  label: "10 أيام",   subtitle: "عزيمة لا تُكسر",  icon: Shield },
  { days: 14,  label: "أسبوعين",   subtitle: "درع الحماية",     icon: ShieldCheck },
  { days: 21,  label: "21 يوم",    subtitle: "عادة جديدة",      icon: Target },
  { days: 30,  label: "شهر",       subtitle: "محارب حقيقي",     icon: Trophy },
  { days: 40,  label: "40 يوم",    subtitle: "مقاتل شرس",      icon: Swords },
  { days: 45,  label: "45 يوم",    subtitle: "طاقة متفجرة",     icon: Zap },
  { days: 60,  label: "شهرين",     subtitle: "تألق مستمر",      icon: Sparkles },
  { days: 75,  label: "75 يوم",    subtitle: "جوهرة نادرة",     icon: Gem },
  { days: 90,  label: "90 يوم",    subtitle: "ملك الإرادة",     icon: Crown },
];

/* ─────────────────── Interactive Stat Card Component ─────────────────── */
interface StatCardProps {
  label: string;
  value: number | string;
  icon: React.FC<{ size?: number; className?: string }>;
  colorClass: string;
  glowBg: string;
  glowBgHover: string;
  dotColor: string;
}

function StatCard({ label, value, icon: Icon, colorClass, glowBg, glowBgHover, dotColor }: StatCardProps) {
  return (
    <motion.div
      whileHover={{ y: -6, scale: 1.02 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      className="relative overflow-hidden p-6 rounded-3xl border border-white/[0.06] bg-white/[0.01] backdrop-blur-xl shadow-2xl flex flex-col justify-between min-h-[144px] gap-4 group cursor-default"
    >
      {/* Glowing Background Orb */}
      <div className={`absolute -right-6 -bottom-6 w-20 h-20 rounded-full blur-2xl transition-all duration-500 pointer-events-none ${glowBg} ${glowBgHover}`} />
      
      {/* Top Row: Icon and Status Dot */}
      <div className="flex items-center justify-between relative z-10">
        <div className={`w-10 h-10 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center ${colorClass} shadow-inner`}>
          <Icon size={18} />
        </div>
        <span className={`w-1.5 h-1.5 rounded-full animate-pulse ${dotColor}`} />
      </div>

      {/* Bottom Row: Info */}
      <div className="relative z-10 mt-auto text-right">
        <div className="text-3xl font-black text-white tracking-tight leading-none tabular-nums">
          {value}
        </div>
        <div className="text-[11px] font-black text-white/35 mt-1.5 tracking-wide uppercase">
          {label}
        </div>
      </div>
    </motion.div>
  );
}

/* ─────────────────────── Main Component ─────────────────────────── */
export function BadHabitsTracker({ habits, onResetStreak, onUndoRelapse }: Props) {
  const badHabits = habits.filter((h) => h.habit_type === "quit");

  const [activeHabitId, setActiveHabitId] = useState<string | null>(null);
  const [selectedHabit, setSelectedHabit] = useState<HabitWithStreak | null>(null);
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [undoingId, setUndoingId] = useState<string | null>(null);
  
  // Emergency variables
  const [emergencyHabit, setEmergencyHabit] = useState<HabitWithStreak | null>(null);
  const [emergencyTimer, setEmergencyTimer] = useState(60);
  const [breathState, setBreathState] = useState<'شهيق' | 'كتم' | 'زفير' | 'راحة'>('شهيق');
  const [breathCountdown, setBreathCountdown] = useState(4);

  // Pledge variables
  const [pledgeChecked, setPledgeChecked] = useState(false);
  const [pledgeTimer, setPledgeTimer] = useState(10);

  // Urge variables
  const [urgeLevels, setUrgeLevels] = useState<Record<string, number>>(() => {
    try { return JSON.parse(localStorage.getItem("urge_levels") || "{}"); } catch { return {}; }
  });

  const [lockdownMode, setLockdownMode] = useState<Record<string, boolean>>({});
  const [futureMessages, setFutureMessages] = useState<Record<string, string>>({});
  const [editingMsg, setEditingMsg] = useState<string | null>(null);
  const [tempMsg, setTempMsg] = useState("");
  const [showSecretMsg, setShowSecretMsg] = useState<Record<string, boolean>>({});

  useEffect(() => { localStorage.setItem("urge_levels", JSON.stringify(urgeLevels)); }, [urgeLevels]);

  // Fetch from Supabase
  useEffect(() => {
    const fetchStates = async () => {
      const { data: authData } = await supabase.auth.getSession();
      if (!authData.session) return;
      const userId = authData.session.user.id;
      
      const { data: lockdowns } = await supabase
        .from('habit_lockdowns')
        .select('habit_id, locked_until')
        .eq('user_id', userId)
        .gt('locked_until', new Date().toISOString());
        
      if (lockdowns) {
        const lModes: Record<string, boolean> = {};
        lockdowns.forEach(l => lModes[l.habit_id] = true);
        setLockdownMode(lModes);
      }
      
      const { data: msgs } = await supabase
        .from('habit_vault_messages')
        .select('habit_id, encrypted_message')
        .eq('user_id', userId);
        
      if (msgs) {
        const mData: Record<string, string> = {};
        msgs.forEach(m => mData[m.habit_id] = m.encrypted_message);
        setFutureMessages(mData);
      }
    };
    fetchStates();
  }, []);

  // Set default active habit
  useEffect(() => {
    if (badHabits.length > 0 && !activeHabitId) {
      setActiveHabitId(badHabits[0].id);
    }
  }, [badHabits, activeHabitId]);

  // Emergency countdown
  useEffect(() => {
    if (!emergencyHabit || emergencyTimer <= 0) return;
    const t = setTimeout(() => setEmergencyTimer(p => p - 1), 1000);
    return () => clearTimeout(t);
  }, [emergencyHabit, emergencyTimer]);

  // Emergency Breathing helper
  useEffect(() => {
    if (!emergencyHabit) return;
    const interval = setInterval(() => {
      setBreathCountdown(prev => {
        if (prev <= 1) {
          setBreathState(state => {
            if (state === 'شهيق') return 'كتم';
            if (state === 'كتم') return 'زفير';
            if (state === 'زفير') return 'راحة';
            return 'شهيق';
          });
          return 4;
        }
        return prev - 1;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [emergencyHabit]);

  // Pledge read timer
  useEffect(() => {
    if (!selectedHabit || pledgeTimer <= 0 || pledgeChecked) return;
    const t = setTimeout(() => setPledgeTimer(p => p - 1), 1000);
    return () => clearTimeout(t);
  }, [selectedHabit, pledgeTimer, pledgeChecked]);

  if (badHabits.length === 0) return null;

  /* ── Handlers ── */
  const handleRelapse = async () => {
    if (!selectedHabit || !reason.trim() || !pledgeChecked) return;
    setIsSubmitting(true);
    try {
      await onResetStreak(selectedHabit.id, reason);
      toast.success("تم تسجيل السقوط. لا تيأس، المحارب الحقيقي هو من ينهض دائماً! 💪");
      setSelectedHabit(null); setReason(""); setPledgeChecked(false); setPledgeTimer(10);
    } catch { toast.error("حدث خطأ أثناء حفظ البيانات"); }
    finally { setIsSubmitting(false); }
  };

  const handleUndo = async (habit: HabitWithStreak) => {
    if (!onUndoRelapse) return;
    setUndoingId(habit.id);
    try { await onUndoRelapse(habit.id); toast.success("رائع! تراجعت عن السقوط، واصل صمودك المذهل! 🛡️"); }
    catch { toast.error("حدث خطأ أثناء التراجع"); }
    finally { setUndoingId(null); }
  };

  const toggleLockdown = async (id: string) => {
    const next = !lockdownMode[id];
    setLockdownMode(p => ({ ...p, [id]: next }));
    
    toast[next ? "success" : "info"](
      next ? "تم تفعيل درع الحصار 24 ساعة! حماية نشطة 🛡️" : "تم إلغاء قفل الدرع"
    );

    const { data: authData } = await supabase.auth.getSession();
    if (!authData.session) return;
    const userId = authData.session.user.id;
    
    if (next) {
      const lockedUntil = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();
      await supabase.from('habit_lockdowns').insert({
        user_id: userId,
        habit_id: id,
        locked_until: lockedUntil
      });
    } else {
      await supabase.from('habit_lockdowns')
        .delete()
        .eq('user_id', userId)
        .eq('habit_id', id);
    }
  };

  const handleSaveMessage = async () => {
    if (!activeHabitId) return;
    const habitId = activeHabitId;
    const msg = tempMsg;

    setFutureMessages(p => {
      const updated = { ...p };
      if (!msg.trim()) {
        delete updated[habitId];
      } else {
        updated[habitId] = msg;
      }
      return updated;
    });
    setEditingMsg(null);
    toast.success(msg.trim() ? "تم تشفير وحفظ الرسالة السرية 🔐" : "تم حذف الرسالة");

    const { data: authData } = await supabase.auth.getSession();
    if (!authData.session) return;
    const userId = authData.session.user.id;
    
    if (msg.trim()) {
      await supabase.from('habit_vault_messages').upsert({
        user_id: userId,
        habit_id: habitId,
        encrypted_message: msg
      }, { onConflict: 'habit_id' });
    } else {
      await supabase.from('habit_vault_messages')
        .delete()
        .eq('user_id', userId)
        .eq('habit_id', habitId);
    }
  };

  const handleUrgeChange = (habitId: string, val: number) => {
    setUrgeLevels(p => ({ ...p, [habitId]: val }));
  };

  /* ── Global Stats ── */
  const totalDays   = badHabits.reduce((a, h) => a + (h.streak?.current_streak || 0), 0);
  const bestStreak  = Math.max(0, ...badHabits.map(h => h.streak?.longest_streak || 0));
  const totalLapse  = badHabits.reduce((a, h) => a + ((h as any).relapseLogs?.length || 0), 0);

  const activeHabit = badHabits.find(h => h.id === activeHabitId) || badHabits[0];
  if (!activeHabit) return null;

  const streak    = activeHabit.streak?.current_streak  || 0;
  const longest   = activeHabit.streak?.longest_streak  || 0;
  const isToday   = !!activeHabit.relapsedToday;
  const isLock    = !!lockdownMode[activeHabit.id];
  const isUndo    = undoingId === activeHabit.id;
  const urgeVal   = urgeLevels[activeHabit.id] || 1;
  const logs      = ((activeHabit as any).relapseLogs || []).slice().reverse() as { date: string; reason: string }[];

  const pastMs    = MILESTONES.filter(m => m.days <= streak).reverse();

  // Progress Calculations for active habit streak ring
  const getStreakProgress = (currentStreak: number) => {
    const past = MILESTONES.filter(m => m.days <= currentStreak);
    const next = MILESTONES.filter(m => m.days > currentStreak);
    const prevDays = past.length > 0 ? past[past.length - 1].days : 0;
    const nextDays = next.length > 0 ? next[0].days : 1;
    const range = nextDays - prevDays;
    const percentage = Math.min(100, Math.max(0, ((currentStreak - prevDays) / range) * 100));
    return {
      percentage,
      nextMilestone: next[0] || null,
      remaining: next[0] ? next[0].days - currentStreak : 0
    };
  };

  const streakInfo = getStreakProgress(streak);
  const strokeRadius = 42;
  const strokeDasharray = 2 * Math.PI * strokeRadius;
  const strokeDashoffset = strokeDasharray - (strokeDasharray * streakInfo.percentage) / 100;

  // Level tips in Arabic
  const urgeTips = [
    { text: "منخفض - ممتاز! ذهنك صافٍ ومستقر. استثمر هذا الوقت في القراءة أو التعلم.", color: "text-emerald-400" },
    { text: "خفيف - رغبة عابرة. قم بشرب كوب ماء بارد أو غيّر مكان جلوسك فوراً للتشتيت.", color: "text-cyan-400" },
    { text: "متوسط - انتبه! عقلك يحاول خداعك. مارس تمرين التنفس (بزر الطوارئ) لمدة دقيقة لتتجاوزها.", color: "text-amber-400" },
    { text: "مرتفع - رغبة شديدة! غادر الغرفة فوراً، تحرك جسدياً أو تواصل مع شخص تثق به لكسر التفكير.", color: "text-orange-500" },
    { text: "حرج - خطر شديد! اضغط على زر الطوارئ (SOS) الآن، خذ أنفاساً عميقة ولا تستسلم أبداً!", color: "text-red-500 font-bold" }
  ];

  return (
    <div className="relative mt-12 mb-20 space-y-8" dir="rtl">

      {/* ── Title Header Ribbon ── */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="relative overflow-hidden p-6 rounded-3xl border border-white/10 bg-gradient-to-r from-red-950/20 via-black/40 to-orange-950/10 backdrop-blur-2xl shadow-3xl group"
      >
        {/* Neon Ambient glows */}
        <div className="absolute -right-24 -top-24 w-60 h-60 rounded-full bg-red-500/10 blur-3xl opacity-60 pointer-events-none group-hover:opacity-100 transition-opacity duration-1000" />
        <div className="absolute -left-24 -bottom-24 w-60 h-60 rounded-full bg-orange-500/10 blur-3xl opacity-40 pointer-events-none group-hover:opacity-100 transition-opacity duration-1000" />

        <div className="relative flex flex-col md:flex-row items-center justify-between gap-6 z-10">
          <div className="flex items-center gap-5 text-right">
            <div className="relative">
              <div className="absolute inset-0 bg-red-500/30 blur-xl rounded-2xl" />
              <div className="relative bg-gradient-to-br from-red-500/20 to-orange-600/30 p-4 rounded-2xl border border-red-500/40 shadow-inner">
                <ShieldAlert className="text-red-500 animate-pulse" size={26} />
              </div>
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-black text-white flex items-center gap-2 tracking-tight">
                التخلص من العادات السيئة
                <Sparkles size={16} className="text-red-500/80 animate-pulse" />
              </h2>
              <p className="text-xs sm:text-sm font-bold text-white/40 mt-1">
                راقب تعافيك، حصّن حصونك، واصنع نسخة أقوى من ذاتك كل يوم.
              </p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* ── Stats Grid ── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 w-full">
        <StatCard
          label="أيام صمود"
          value={totalDays}
          icon={ShieldCheck}
          colorClass="text-emerald-400"
          glowBg="bg-emerald-500/10"
          glowBgHover="group-hover:bg-emerald-500/20"
          dotColor="bg-emerald-400 shadow-[0_0_8px_rgba(52,211,153,0.6)]"
        />
        <StatCard
          label="أطول سلسلة"
          value={bestStreak}
          icon={Trophy}
          colorClass="text-amber-400"
          glowBg="bg-amber-500/10"
          glowBgHover="group-hover:bg-amber-500/20"
          dotColor="bg-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.6)]"
        />
        <StatCard
          label="عادات للترك"
          value={badHabits.length}
          icon={Target}
          colorClass="text-[#38BDF8]"
          glowBg="bg-sky-500/10"
          glowBgHover="group-hover:bg-sky-500/20"
          dotColor="bg-sky-400 shadow-[0_0_8px_rgba(56,189,248,0.6)]"
        />
        <StatCard
          label="إجمالي الانتكاسات"
          value={totalLapse}
          icon={History}
          colorClass="text-red-400"
          glowBg="bg-red-500/10"
          glowBgHover="group-hover:bg-red-500/20"
          dotColor="bg-red-400 shadow-[0_0_8px_rgba(239,68,68,0.6)]"
        />
      </div>

      {/* ═══ Main Split Dashboard Layout ═══ */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8 items-start mt-12">
        
        {/* ── LEFT SIDEBAR: Active Habit Showcase (5 Cols) ── */}
        <div className="xl:col-span-5 space-y-6">
          
          {/* Switcher Capsules */}
          <div className="w-full flex flex-col gap-2">
            <span className="text-[10px] font-black text-white/30 uppercase tracking-wider px-1">عاداتك النشطة</span>
            <div className="flex flex-wrap gap-2.5">
              {badHabits.map((habit) => {
                const isActive = habit.id === activeHabitId;
                const hStreak = habit.streak?.current_streak || 0;
                const hToday = !!habit.relapsedToday;
                return (
                  <button
                    key={habit.id}
                    onClick={() => {
                      setActiveHabitId(habit.id);
                      setEditingMsg(null);
                    }}
                    className={`flex items-center gap-3 px-4 py-2.5 rounded-2xl border transition-all duration-300 relative group overflow-hidden ${
                      isActive
                        ? "bg-white/[0.08] border-white/20 text-white shadow-lg"
                        : "bg-white/[0.01] border-white/[0.06] text-white/40 hover:bg-white/[0.03] hover:border-white/10 hover:text-white/80"
                    }`}
                  >
                    <span className="text-xl">{habit.icon}</span>
                    <div className="text-right">
                      <p className="font-bold text-xs leading-none text-white">{habit.title}</p>
                      <p className="text-[9px] font-bold text-white/30 mt-1">{hStreak} يوم</p>
                    </div>
                    <span className={`w-2 h-2 rounded-full shrink-0 ${
                      hToday ? 'bg-red-500 shadow-[0_0_6px_rgba(239,68,68,0.8)]' : 'bg-emerald-500 shadow-[0_0_6px_rgba(16,185,129,0.8)]'
                    }`} />
                  </button>
                );
              })}
            </div>
          </div>

          {/* Active Control Hub Card */}
          <div
            className={`relative rounded-[32px] p-6 sm:p-8 bg-gradient-to-br from-white/[0.02] to-white/[0.002] border backdrop-blur-3xl transition-all duration-500 overflow-hidden ${
              isLock ? "border-orange-500/30 shadow-[0_0_30px_rgba(249,115,22,0.06)]" : isToday ? "border-red-500/30 shadow-[0_0_30px_rgba(239,68,68,0.08)]" : "border-white/[0.08]"
            }`}
          >
            {/* Pulsing Lockdown Overlay */}
            {isLock && (
              <div className="absolute inset-0 bg-gradient-to-b from-orange-500/[0.03] to-transparent pointer-events-none animate-pulse" />
            )}

            {/* Glowing orbs */}
            <div className={`absolute -right-20 -bottom-20 w-60 h-60 rounded-full blur-3xl opacity-15 pointer-events-none transition-all duration-700 ${
              isToday ? 'bg-red-500' : isLock ? 'bg-orange-500' : 'bg-emerald-500'
            }`} />

            <div className="relative z-10 space-y-6">
              
              {/* Header Info */}
              <div className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-xl bg-white/5 border border-white/10 flex items-center justify-center text-2xl shadow-inner">
                    {activeHabit.icon}
                  </div>
                  <div>
                    <h3 className="text-lg font-black text-white">{activeHabit.title}</h3>
                    <p className="text-[10px] font-bold text-white/30 mt-0.5">الرقم القياسي: {longest} يوم</p>
                  </div>
                </div>

                {isLock && (
                  <span className="px-2 py-0.5 rounded-lg bg-orange-500/10 border border-orange-500/30 text-orange-400 text-[9px] font-black flex items-center gap-1.5 animate-pulse shadow-sm">
                    <Lock size={10} /> الدرع نشط
                  </span>
                )}
              </div>

              <div className="h-px bg-white/[0.06]" />

              {/* Circular Gauge and Streak View */}
              <div className="flex flex-col sm:flex-row items-center justify-around gap-6">
                
                {/* SVG circular progress */}
                <div className="relative w-32 h-32 flex items-center justify-center rounded-full bg-white/[0.01] border border-white/[0.05] shadow-inner transition-transform hover:scale-105 duration-300">
                  <div className={`absolute inset-0 rounded-full blur-lg opacity-10 ${
                    isToday ? 'bg-red-500' : isLock ? 'bg-orange-500' : 'bg-emerald-500'
                  }`} />
                  
                  <svg className="w-32 h-32 transform -rotate-90">
                    <circle
                      cx="64"
                      cy="64"
                      r={strokeRadius}
                      className="stroke-white/[0.03] fill-none"
                      strokeWidth="5"
                    />
                    <circle
                      cx="64"
                      cy="64"
                      r={strokeRadius}
                      className="fill-none transition-all duration-700 ease-out"
                      stroke={isToday ? "#ef4444" : isLock ? "#f97316" : "url(#activeStreakGradient)"}
                      strokeWidth="5"
                      strokeDasharray={strokeDasharray}
                      strokeDashoffset={isToday ? 0 : strokeDashoffset}
                      strokeLinecap="round"
                    />
                    <defs>
                      <linearGradient id="activeStreakGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#10B981" />
                        <stop offset="100%" stopColor="#06B6D4" />
                      </linearGradient>
                    </defs>
                  </svg>

                  <div className="absolute flex flex-col items-center justify-center">
                    <span className="text-3xl font-black text-white leading-none tracking-tight">{streak}</span>
                    <span className="text-[9px] font-black text-white/35 mt-1 uppercase tracking-widest">يوم صمود</span>
                  </div>
                </div>

                {/* Milestone info */}
                <div className="text-center sm:text-right space-y-2 flex-1">
                  <div className="flex items-center gap-1.5 justify-center sm:justify-start">
                    <Zap size={14} className="text-amber-400" />
                    <span className="text-xs font-black text-white/80">المرحلة القادمة</span>
                  </div>
                  {streakInfo.nextMilestone ? (
                    <div>
                      <p className="text-sm font-black text-white">{streakInfo.nextMilestone.label}</p>
                      <p className="text-[10px] text-white/40 mt-1">
                        متبقي <strong className="text-emerald-400 font-black">{streakInfo.remaining}</strong> يوم لفتح الشارة
                      </p>
                    </div>
                  ) : (
                    <p className="text-xs text-emerald-400 font-bold">لقد حققت أقصى شارة صمود! 👑</p>
                  )}
                  {/* Progress bar */}
                  <div className="w-full bg-white/5 h-1.5 rounded-full overflow-hidden mt-2 border border-white/[0.04]">
                    <div 
                      className={`h-full rounded-full bg-gradient-to-r from-emerald-500 to-cyan-500`}
                      style={{ width: `${streakInfo.percentage}%` }}
                    />
                  </div>
                </div>

              </div>

              <div className="h-px bg-white/[0.06]" />

              {/* Urge Level Tracker */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black text-white/70 flex items-center gap-1.5">
                    <Flame size={14} className="text-red-400 animate-pulse" />
                    مستوى الرغبة الملحة الآن
                  </span>
                  <span className="text-xs font-black px-2 py-0.5 rounded bg-white/5 border border-white/10 text-white/85">
                    {urgeVal} / 5
                  </span>
                </div>
                
                {/* Visual level capsules */}
                <div className="grid grid-cols-5 gap-2">
                  {[1, 2, 3, 4, 5].map((lvl) => {
                    const activeColor = 
                      lvl <= 2 ? "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" : 
                      lvl <= 4 ? "bg-orange-500 shadow-[0_0_8px_rgba(249,115,22,0.5)]" : 
                      "bg-red-600 shadow-[0_0_10px_rgba(220,38,38,0.75)] animate-pulse";
                    
                    const isSelected = lvl === urgeVal;
                    return (
                      <button
                        key={lvl}
                        onClick={() => handleUrgeChange(activeHabit.id, lvl)}
                        className={`h-2.5 rounded-lg border transition-all duration-300 ${
                          lvl <= urgeVal 
                            ? `${activeColor} border-transparent` 
                            : 'bg-white/5 border-white/10 hover:bg-white/10'
                        } ${isSelected ? 'scale-y-125' : ''}`}
                        title={`مستوى ${lvl}`}
                      />
                    );
                  })}
                </div>

                <p className={`text-[10px] leading-relaxed transition-all duration-300 p-2.5 rounded-xl bg-white/[0.02] border border-white/5 ${urgeTips[urgeVal - 1].color}`}>
                  {urgeTips[urgeVal - 1].text}
                </p>
              </div>

              <div className="h-px bg-white/[0.06]" />

              {/* Secret Message Vault */}
              <div className="space-y-2">
                {editingMsg === activeHabit.id ? (
                  <div className="rounded-2xl p-3 bg-white/[0.02] border border-white/10 shadow-inner">
                    <textarea
                      value={tempMsg}
                      onChange={e => setTempMsg(e.target.value)}
                      placeholder="اكتب رسالة تذكير قوية لنفسك لتقرأها في وضع الطوارئ..."
                      className="w-full bg-transparent text-white text-xs outline-none resize-none h-16 placeholder-white/20 font-medium"
                    />
                    <div className="flex justify-end gap-2 mt-1.5">
                      <button onClick={() => setEditingMsg(null)} className="px-2.5 py-1 text-[10px] font-bold text-white/40 hover:text-white transition">إلغاء</button>
                      <button
                        onClick={handleSaveMessage}
                        className="px-3.5 py-1 rounded-lg text-[10px] font-black bg-blue-500 hover:bg-blue-600 text-white transition shadow-md"
                      >تشفير وحفظ</button>
                    </div>
                  </div>
                ) : futureMessages[activeHabit.id] ? (
                  <div className="flex flex-col">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-[10px] font-bold text-white/30 flex items-center gap-1">
                        <Lock size={10} className="text-blue-400" />
                        الرسالة السرية مشفرة
                      </span>
                      <button
                        onClick={() => {
                          setShowSecretMsg(p => ({ ...p, [activeHabit.id]: !p[activeHabit.id] }));
                        }}
                        className="flex items-center gap-1 text-[10px] font-bold text-blue-400 hover:text-blue-300 transition"
                      >
                        {showSecretMsg[activeHabit.id] ? <EyeOff size={10}/> : <Eye size={10}/>}
                        {showSecretMsg[activeHabit.id] ? "إخفاء" : "فك التشفير"}
                      </button>
                    </div>
                    {showSecretMsg[activeHabit.id] ? (
                      <div className="relative group p-3 rounded-xl bg-blue-950/20 border border-blue-500/20 shadow-inner">
                        <p className="text-xs italic text-blue-300 leading-relaxed">"{futureMessages[activeHabit.id]}"</p>
                        <button
                          onClick={() => { setTempMsg(futureMessages[activeHabit.id]); setEditingMsg(activeHabit.id); }}
                          className="absolute top-2 left-2 text-blue-400/50 hover:text-blue-300 opacity-0 group-hover:opacity-100 transition p-1 bg-white/5 rounded"
                        ><PenTool size={10}/></button>
                      </div>
                    ) : (
                      <p className="text-[10px] text-white/20 italic">انقر على فك التشفير لقراءة رسالة ذاتك السابقة.</p>
                    )}
                  </div>
                ) : (
                  <div 
                    onClick={() => { setTempMsg(""); setEditingMsg(activeHabit.id); }}
                    className="flex items-center gap-3 p-3 rounded-xl border border-dashed border-white/10 hover:bg-white/[0.02] transition cursor-pointer group"
                  >
                    <PenTool size={12} className="text-white/20 group-hover:text-white/40 transition shrink-0" />
                    <span className="text-[10px] font-bold text-white/30 group-hover:text-white/50 transition">اكتب رسالة سرية لنفسك لتقرأها وقت الأزمات</span>
                  </div>
                )}
              </div>

              <div className="h-px bg-white/[0.06]" />

              {/* Action Buttons */}
              <div className="flex flex-col gap-3">
                <button
                  onClick={() => { setEmergencyHabit(activeHabit); setEmergencyTimer(60); setBreathState('شهيق'); setBreathCountdown(4); }}
                  className="py-3 px-4 rounded-2xl bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-500 hover:to-rose-500 text-white font-black text-xs flex items-center justify-center gap-2 transition-all duration-300 shadow-[0_0_20px_rgba(239,68,68,0.25)] border border-red-500/30"
                >
                  <HeartPulse size={16} className="animate-pulse"/> 
                  <span>حالة طوارئ (SOS) - كسر الرغبة</span>
                </button>
                
                <div className="flex gap-2">
                  <button
                    onClick={() => toggleLockdown(activeHabit.id)}
                    className={`flex-1 py-2.5 px-3 rounded-xl font-bold text-[10px] flex items-center justify-center gap-1.5 transition-all border ${
                      isLock 
                        ? 'bg-orange-500 border-orange-400 text-white shadow-[0_0_15px_rgba(249,115,22,0.3)]' 
                        : 'bg-white/5 hover:bg-white/10 border-white/10 text-white/80'
                    }`}
                  >
                    <Lock size={12} /> 
                    <span>وضع الدرع 24h</span>
                  </button>
                  
                  <AnimatePresence mode="wait">
                    {isToday ? (
                      <motion.button
                        key="undo"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        onClick={() => handleUndo(activeHabit)}
                        disabled={isUndo}
                        className="flex-1 py-2.5 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 border border-emerald-500/30 text-white font-bold text-[10px] flex items-center justify-center gap-1.5 transition"
                      >
                        {isUndo ? <Spinner/> : <><RotateCcw size={12}/> تراجع عن السقوط</>}
                      </motion.button>
                    ) : (
                      <motion.button
                        key="relapse"
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        onClick={() => { setSelectedHabit(activeHabit); setPledgeChecked(false); setPledgeTimer(10); setReason(""); }}
                        className="flex-1 py-2.5 px-3 rounded-xl bg-red-950/20 hover:bg-red-600/30 text-red-400 border border-red-500/20 font-bold text-[10px] flex items-center justify-center gap-1.5 transition-all duration-300"
                      >
                        <AlertTriangle size={12} />
                        <span>سجل انتكاسة</span>
                      </motion.button>
                    )}
                  </AnimatePresence>
                </div>
              </div>

            </div>
          </div>

        </div>

        {/* ── RIGHT COLUMN: Connected Alternating Winding Timeline Path ── */}
        <div className="xl:col-span-7 space-y-6">
          
          {/* Header */}
          <div className="flex items-center justify-between px-1">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="absolute inset-0 bg-emerald-500/20 blur-xl rounded-full" />
                <div className="relative w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500/10 to-teal-600/5 border border-emerald-500/20 flex items-center justify-center">
                  <Trophy size={16} className="text-emerald-400" />
                </div>
              </div>
              <div>
                <h4 className="text-sm font-black text-white">خريطة طريق الصمود</h4>
                <p className="text-white/40 text-[10px] mt-0.5 font-bold">
                  خط زمني يتتبع مسار نموك وإنجازاتك
                </p>
              </div>
            </div>
            <div className="text-xs font-black text-white/50 bg-white/5 px-2.5 py-1 rounded-lg border border-white/5">
              {pastMs.length} / {MILESTONES.length} شارة محققة
            </div>
          </div>

          {/* Timeline Wrapper */}
          <div className="relative rounded-[32px] pt-10 pb-10 px-2 sm:px-8 bg-white/[0.01] border border-white/[0.05] backdrop-blur-2xl shadow-xl overflow-visible">
            
            <div className="relative flex flex-col items-center w-full">
              {MILESTONES.map((ms, idx) => {
                const isUnlocked = streak >= ms.days;
                const isCurrentNext = !isUnlocked && (MILESTONES.filter(x => x.days > streak)[0]?.days === ms.days);
                const isEven = idx % 2 === 0;

                return (
                  <div key={ms.days} className="relative w-full pb-14 last:pb-0 z-10">
                    
                    {/* Vertical Line Segment to Next Node */}
                    {idx < MILESTONES.length - 1 && (
                      <>
                        {/* Desktop Line (Centered) */}
                        <div className={`absolute left-1/2 -translate-x-1/2 top-8 w-1 h-full z-0 hidden sm:block ${
                          streak >= MILESTONES[idx + 1].days 
                            ? 'bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.8)]' 
                            : streak >= ms.days 
                            ? 'bg-gradient-to-b from-emerald-500 via-emerald-500/50 to-white/5' 
                            : 'bg-white/5'
                        }`} />
                        {/* Mobile Line (Right Aligned) */}
                        <div className={`absolute right-10 translate-x-1/2 top-8 w-1 h-full z-0 block sm:hidden ${
                          streak >= MILESTONES[idx + 1].days 
                            ? 'bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.8)]' 
                            : streak >= ms.days 
                            ? 'bg-gradient-to-b from-emerald-500 via-emerald-500/50 to-white/5' 
                            : 'bg-white/5'
                        }`} />
                      </>
                    )}

                    {/* The Node Dot / Badge */}
                    {/* Desktop Node */}
                    <div className={`absolute left-1/2 -translate-x-1/2 top-8 -translate-y-1/2 z-20 hidden sm:flex items-center justify-center rounded-full transition-all duration-500 ${
                      isUnlocked 
                        ? 'w-10 h-10 bg-[#090b0a] border-2 border-emerald-500 text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.5)]' 
                        : isCurrentNext 
                        ? 'w-10 h-10 bg-[#090b0a] border-2 border-emerald-500/50 text-emerald-400/80 animate-pulse shadow-[0_0_15px_rgba(16,185,129,0.3)]' 
                        : 'w-8 h-8 bg-[#090b0a] border-2 border-white/10 text-white/20'
                    }`}>
                      <ms.icon size={isUnlocked || isCurrentNext ? 18 : 14} />
                    </div>
                    {/* Mobile Node */}
                    <div className={`absolute right-10 translate-x-1/2 top-8 -translate-y-1/2 z-20 flex sm:hidden items-center justify-center rounded-full transition-all duration-500 ${
                      isUnlocked 
                        ? 'w-10 h-10 bg-[#090b0a] border-2 border-emerald-500 text-emerald-400 shadow-[0_0_20px_rgba(16,185,129,0.5)]' 
                        : isCurrentNext 
                        ? 'w-10 h-10 bg-[#090b0a] border-2 border-emerald-500/50 text-emerald-400/80 animate-pulse shadow-[0_0_15px_rgba(16,185,129,0.3)]' 
                        : 'w-8 h-8 bg-[#090b0a] border-2 border-white/10 text-white/20'
                    }`}>
                      <ms.icon size={isUnlocked || isCurrentNext ? 18 : 14} />
                    </div>

                    {/* The Card Layout */}
                    <div className="relative z-10 w-full flex items-start">
                      {/* Mobile Layout */}
                      <div className="w-full sm:hidden pr-20 pl-2">
                        <MilestoneCard ms={ms} isUnlocked={isUnlocked} isCurrentNext={isCurrentNext} />
                      </div>

                      {/* Desktop Layout (Alternating correctly in RTL) */}
                      <div className="hidden sm:flex w-full justify-between items-center">
                        {/* Physical Right Column (Even index) */}
                        <div className="w-1/2 flex justify-end pl-10 pr-2">
                          {isEven && <MilestoneCard ms={ms} isUnlocked={isUnlocked} isCurrentNext={isCurrentNext} />}
                        </div>
                        {/* Physical Left Column (Odd index) */}
                        <div className="w-1/2 flex justify-start pr-10 pl-2">
                          {!isEven && <MilestoneCard ms={ms} isUnlocked={isUnlocked} isCurrentNext={isCurrentNext} />}
                        </div>
                      </div>
                    </div>

                  </div>
                );
              })}
            </div>

          </div>

          {/* Recent Events */}
          {logs.length > 0 && (
            <div className="p-5 rounded-3xl bg-white/[0.01] border border-white/[0.05] space-y-3">
              <span className="text-[10px] font-black text-white/30 uppercase tracking-widest block">سجل الأحداث الأخيرة</span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {logs.slice(0, 4).map((log, li) => (
                  <div key={li} className="flex items-center gap-3 p-3 rounded-xl bg-red-500/[0.01] border border-red-500/[0.04]">
                    <div className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                    <div>
                      <p className="text-[10px] font-black text-red-400/90">تسجيل انتكاسة</p>
                      <p className="text-[8px] text-white/30 mt-0.5">
                        {new Date(log.date).toLocaleDateString("ar-EG", { month: "long", day: "numeric" })}
                      </p>
                    </div>
                    {log.reason && (
                      <div className="mr-auto max-w-[120px] truncate text-[9px] text-white/40 italic" title={log.reason}>
                        "{log.reason}"
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

        </div>

      </div>

      {/* ═══ Emergency Modal ═══ */}
      <AnimatePresence>
        {emergencyHabit && (
          <Modal onClose={() => setEmergencyHabit(null)}>
            <div className="flex flex-col items-center text-center space-y-6">
              
              {/* Title Section */}
              <div className="flex flex-col items-center">
                <div className="w-16 h-16 rounded-[22px] bg-red-500/10 border border-red-500/20 flex items-center justify-center mb-4 shadow-inner">
                  <HeartPulse size={34} className="text-red-500 animate-pulse" />
                </div>
                <h3 className="text-xl font-black text-white">توقف تماماً! تنفس بوعي</h3>
                <p className="text-white/40 text-xs mt-1.5 max-w-xs font-bold">
                  تذكر أن ذروة الرغبة الملحة تستمر 60 ثانية فقط ثم تنكسر. ابقَ معي هنا.
                </p>
              </div>

              {/* Layout for Countdown and Breath helper */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full items-center py-4">
                
                {/* 60s Countdown */}
                <div className="flex flex-col items-center justify-center p-5 rounded-2xl bg-white/[0.01] border border-white/[0.04] h-44">
                  <span className="text-[10px] font-black text-white/30 uppercase tracking-wide">العد التنازلي للإنقاذ</span>
                  <div className="text-7xl font-black text-white mt-3 tabular-nums drop-shadow-md">
                    {emergencyTimer}
                  </div>
                  <span className="text-[10px] text-red-400 font-bold mt-2 animate-pulse">جاري سحب التفكير السلبي...</span>
                </div>

                {/* Breathing helper */}
                <div className="flex flex-col items-center justify-center p-5 rounded-2xl bg-white/[0.01] border border-white/[0.04] h-44">
                  <span className="text-[10px] font-black text-white/30 uppercase tracking-wide">مساعد التنفس المهدئ</span>
                  
                  {/* Breath Pulsing circle */}
                  <div className="relative w-16 h-16 flex items-center justify-center mt-3">
                    <motion.div
                      animate={{
                        scale: breathState === 'شهيق' ? 1.4 : breathState === 'زفير' ? 0.9 : 1.15,
                        opacity: breathState === 'شهيق' ? 0.9 : breathState === 'زفير' ? 0.4 : 0.7
                      }}
                      transition={{ duration: 4, ease: "easeInOut" }}
                      className="absolute inset-0 rounded-full bg-blue-500/20 border border-blue-400/40"
                    />
                    <span className="text-xs font-black text-blue-300 relative z-10">{breathState}</span>
                  </div>

                  <span className="text-[10px] text-white/40 font-bold mt-4">
                    انتبه للنبض ({breathCountdown} ثوانٍ)
                  </span>
                </div>

              </div>

              {/* Secret Message block */}
              {futureMessages[emergencyHabit.id] && (
                <div className="w-full p-4 rounded-2xl bg-blue-950/20 border border-blue-500/20 text-right">
                  <span className="text-[9px] font-black text-blue-400 block mb-1">رسالة صمود من ذاتك السابقة:</span>
                  <p className="text-blue-200/90 text-xs italic leading-relaxed">
                    "{futureMessages[emergencyHabit.id]}"
                  </p>
                </div>
              )}

              {/* Quit action */}
              <button
                onClick={() => setEmergencyHabit(null)}
                className="w-full py-3.5 rounded-xl bg-white hover:bg-gray-200 text-black font-black text-xs transition shadow-md"
              >
                أنا أقوى بكثير — لقد تجاوزت الرغبة! 💪
              </button>

            </div>
          </Modal>
        )}
      </AnimatePresence>

      {/* ═══ Iron Pledge Modal ═══ */}
      <AnimatePresence>
        {selectedHabit && (
          <Modal onClose={() => { setSelectedHabit(null); setPledgeChecked(false); setPledgeTimer(10); setReason(""); }}>
            <div className="flex flex-col items-center text-center space-y-6">
              
              <div className="flex flex-col items-center">
                <div className="w-14 h-14 rounded-2xl bg-red-500/10 text-red-500 border border-red-500/20 flex items-center justify-center mb-4">
                  <Crosshair size={28} className="animate-spin" style={{ animationDuration: '4s' }} />
                </div>
                <h3 className="text-xl font-black text-white">العهد الصارم لقطع الصمود</h3>
                <p className="text-xs text-white/40 mt-1 max-w-xs font-bold">
                  تأكيد سقوطك سيهدم الستريك الخاص بك ويعيدك للمربع الأول.
                </p>
              </div>

              <div className="w-full p-2 py-1.5 rounded-lg bg-red-500/10 border border-red-500/20 text-red-400 text-[10px] font-black">
                سلسلة صمود {selectedHabit.streak?.current_streak || 0} يوم ستُدمر وتلغى الآن!
              </div>

              <div className="w-full bg-white/[0.02] border border-white/10 rounded-xl p-4 text-xs text-white/60 leading-relaxed font-bold">
                "أنا أدرك تماماً أن الاستسلام لهذه الرغبة العابرة لن يمنحني سوى الندم والحسرة، وأقر بتحمل المسؤولية الكاملة لبدء رحلتي من الصفر."
              </div>

              {/* Checkbox confirmation */}
              <label className={`w-full flex items-center gap-3 p-3.5 rounded-xl border cursor-pointer transition-all ${
                pledgeTimer > 0 
                  ? 'opacity-40 pointer-events-none border-white/5 bg-transparent' 
                  : pledgeChecked 
                  ? 'bg-red-500/10 border-red-500/20' 
                  : 'bg-white/5 border-white/10 hover:bg-white/[0.08]'
              }`}>
                <input
                  type="checkbox"
                  checked={pledgeChecked}
                  onChange={e => setPledgeChecked(e.target.checked)}
                  className="w-4 h-4 accent-red-500 rounded border-white/10 cursor-pointer"
                />
                <span className={`text-xs font-bold ${pledgeChecked ? 'text-red-400' : 'text-white/80'}`}>
                  أقر ببنود العهد الصارم وأتحمل المسؤولية {pledgeTimer > 0 && `(${pledgeTimer} ثوانٍ للتحقق)`}
                </span>
              </label>

              {/* Relapse Form */}
              <div className={`w-full transition-all duration-500 space-y-4 ${
                pledgeChecked ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3 pointer-events-none h-0 overflow-hidden'
              }`}>
                <textarea
                  value={reason}
                  onChange={e => setReason(e.target.value)}
                  placeholder="ما السبب الحقيقي والمحفز الأساسي لهذا السقوط؟ اكتب لتتعلم وتتحصن المرة القادمة..."
                  className="w-full h-20 bg-white/5 border border-white/10 rounded-xl p-3 text-white text-xs outline-none resize-none placeholder-white/20 font-medium"
                />
                
                <button
                  onClick={handleRelapse}
                  disabled={isSubmitting || !reason.trim() || !pledgeChecked}
                  className="w-full py-3.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-black text-xs transition disabled:opacity-40 disabled:cursor-not-allowed shadow-[0_0_20px_rgba(239,68,68,0.3)] flex items-center justify-center gap-2 border border-red-500/30"
                >
                  {isSubmitting ? <Spinner /> : <><ShieldAlert size={14} /> تأكيد كسر الصمود وبدء التعافي</>}
                </button>
              </div>

            </div>
          </Modal>
        )}
      </AnimatePresence>

    </div>
  );
}

/* ─────────────────────── Milestone Card ─────────────────────────── */
interface MilestoneCardProps {
  ms: typeof MILESTONES[number];
  isUnlocked: boolean;
  isCurrentNext: boolean;
}

function MilestoneCard({ ms, isUnlocked, isCurrentNext }: MilestoneCardProps) {
  return (
    <div
      className={`w-full max-w-[260px] flex items-center justify-center p-3 rounded-2xl border transition-all duration-300 ${
        isUnlocked
          ? 'bg-emerald-500/[0.04] border-emerald-500/30 shadow-[0_4px_20px_rgba(16,185,129,0.05)]'
          : isCurrentNext
          ? 'bg-emerald-500/[0.06] border-emerald-500/40 shadow-[0_0_20px_rgba(16,185,129,0.1)]'
          : 'bg-white/[0.02] border-white/10 opacity-60'
      }`}
    >
      <div className="text-center">
        <h5 className={`text-sm font-black ${isUnlocked ? 'text-emerald-400' : isCurrentNext ? 'text-emerald-400' : 'text-white/40'}`}>{ms.label}</h5>
        <p className="text-[10px] font-bold text-white/50 mt-1">{ms.subtitle}</p>
      </div>
    </div>
  );
}

/* ─────────────────────── Modal Wrapper ──────────────────────── */
function Modal({ children, onClose }: { children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="absolute inset-0 bg-black/90 backdrop-blur-sm"
        onClick={onClose}
      />
      <motion.div
        initial={{ scale: 0.95, opacity: 0, y: 15 }}
        animate={{ scale: 1, opacity: 1, y: 0 }}
        exit={{ scale: 0.95, opacity: 0, y: 15 }}
        className="relative w-full max-w-md bg-[#090b0a] border border-white/10 rounded-3xl p-6 shadow-2xl overflow-hidden"
      >
        <div className="absolute inset-0 bg-white/[0.01] rounded-3xl pointer-events-none" />
        <div className="relative z-10">{children}</div>
      </motion.div>
    </div>
  );
}

/* ───────────────────── Spinner Helper ─────────────────────────── */
function Spinner() {
  return (
    <div className="w-4 h-4 rounded-full border-2 border-white/20 border-t-white animate-spin" />
  );
}
