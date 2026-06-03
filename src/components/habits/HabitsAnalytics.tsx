import { useMemo, useState, useEffect } from "react";
import { HabitWithStreak } from "@/hooks/useHabits";
import { AreaChart, Area, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, BarChart, Bar, Cell, Legend } from "recharts";
import { Flame, Target, Trophy, TrendingUp, Calendar, Sparkles, BarChart3, Brain, Shield, Printer, X } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/lib/supabase";
import { PrintableReport } from "./PrintableReport";
import { calculateDayProgress } from "@/lib/habitCalculations";
import { HabitsAIAnalysis } from "./HabitsAIAnalysis";
import { generateComplexAnalyticsReport } from "@/lib/gemini";

type Props = {
  habits: HabitWithStreak[];
  currentDate: Date;
  onRecoverStreak?: (habitId: string) => Promise<void>;
};

export function HabitsAnalytics({ habits, currentDate, onRecoverStreak }: Props) {
  const [aiInsight, setAiInsight] = useState<string | null>(null);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiError, setAiError] = useState(false);
  const [recoveryUsed, setRecoveryUsed] = useState(() => {
    const key = `recovery_${new Date().getFullYear()}_${new Date().getMonth()}`;
    return !!localStorage.getItem(key);
  });
  const [recoveryLoading, setRecoveryLoading] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [showMoreMonths, setShowMoreMonths] = useState(false);
  const [showFullMonth, setShowFullMonth] = useState(false);

  useEffect(() => {
    const loadCachedReport = async () => {
      const { data: authData } = await supabase.auth.getSession();
      if (!authData.session) return;
      const today = new Intl.DateTimeFormat("en-CA").format(new Date());
      const cached = localStorage.getItem(`zenith_ai_report_${authData.session.user.id}_${today}`);
      if (cached) {
        setAiInsight(cached);
      }
    };
    loadCachedReport();
  }, []);

  const daysInMonth = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    return new Date(year, month + 1, 0).getDate();
  }, [currentDate]);

  const { ticks: lineChartTicks, maxY: lineChartMaxY } = useMemo(() => {
    const goodHabitsCount = habits.filter(h => h.habit_type !== 'quit').length;
    const badHabitsCount = habits.filter(h => h.habit_type === 'quit').length;
    const rawMax = Math.max(goodHabitsCount, badHabitsCount, 5);
    
    let ticksArr: number[] = [];
    let maxYVal = rawMax;
    
    if (rawMax <= 5) {
      ticksArr = [0, 1, 2, 3, 4, 5];
      maxYVal = 5;
    } else if (rawMax <= 11) {
      ticksArr = [0, 2, 5, 8, 11];
      maxYVal = 11;
    } else if (rawMax <= 15) {
      ticksArr = [0, 3, 6, 9, 12, 15];
      maxYVal = 15;
    } else if (rawMax <= 20) {
      ticksArr = [0, 5, 10, 15, 20];
      maxYVal = 20;
    } else if (rawMax <= 25) {
      ticksArr = [0, 5, 10, 15, 20, 25];
      maxYVal = 25;
    } else {
      const step = Math.ceil(rawMax / 5);
      ticksArr = [0, step, step * 2, step * 3, step * 4, step * 5];
      maxYVal = step * 5;
    }
    
    return { ticks: ticksArr, maxY: maxYVal };
  }, [habits]);

  const barChartTicks = useMemo(() => {
    if (daysInMonth === 31) return [0, 10, 20, 31];
    if (daysInMonth === 30) return [0, 10, 20, 30];
    if (daysInMonth === 29) return [0, 10, 20, 29];
    return [0, 10, 20, 28];
  }, [daysInMonth]);

  const monthlyData = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const result = [];
    for (let i = 1; i <= daysInMonth; i++) {
      const d = new Date(year, month, i);
      const mm = String(month + 1).padStart(2, "0");
      const dd = String(i).padStart(2, "0");
      const dateStr = `${year}-${mm}-${dd}`;

      const isFuture = d > new Date(new Date().setHours(23,59,59,999));
      
      const { completedGood, avoidedBad, totalSuccess, percentage } = calculateDayProgress(habits, dateStr, isFuture);

      result.push({
        name: `${i}`,
        dateStr,
        الإنجاز: isFuture ? (showFullMonth ? 0 : null) : totalSuccess,
        "عادات جيدة": isFuture ? (showFullMonth ? 0 : null) : completedGood,
        "تجنب سيئة": isFuture ? (showFullMonth ? 0 : null) : avoidedBad,
        percentage: isFuture ? (showFullMonth ? 0 : null) : percentage
      });
    }
    return result;
  }, [habits, currentDate, daysInMonth, showFullMonth]);

  // Per-habit stats for bar chart
  const habitStats = useMemo(() => {
    const prefix = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, "0")}`;
    const realNow = new Date();
    const isCurrentMonth = currentDate.getFullYear() === realNow.getFullYear() && currentDate.getMonth() === realNow.getMonth();
    const daysToConsider = isCurrentMonth ? realNow.getDate() : daysInMonth;

    return habits.map(h => {
      let monthCheckins = 0;
      if (h.habit_type === 'quit') {
        const createdAt = h.created_at ? new Date(h.created_at) : new Date(0);
        for (let i = 1; i <= daysToConsider; i++) {
          const dateStr = `${prefix}-${String(i).padStart(2, "0")}`;
          const dateObj = new Date(currentDate.getFullYear(), currentDate.getMonth(), i);
          if (dateObj >= new Date(createdAt.getFullYear(), createdAt.getMonth(), createdAt.getDate())) {
            if (!h.relapses?.has(dateStr)) {
              monthCheckins++;
            }
          }
        }
      } else {
        h.checkins?.forEach(dateStr => {
          if (dateStr.startsWith(prefix)) monthCheckins++;
        });
      }
      return {
        name: h.title.length > 12 ? h.title.slice(0, 12) + "…" : h.title,
        icon: h.icon || "✨",
        checkins: monthCheckins,
        streak: h.streak?.current_streak || 0,
        color: h.color,
      };
    });
  }, [habits, currentDate, daysInMonth]);

  const bestStreak = useMemo(() => {
    return Math.max(...habits.map(h => h.streak?.longest_streak || 0), 0);
  }, [habits]);

  const perfectDays = useMemo(() => {
    return monthlyData.filter((d: any) => d.percentage === 100 && d.الإنجاز > 0).length;
  }, [monthlyData]);

  const totalCheckinsThisMonth = useMemo(() => {
    return monthlyData.reduce((sum: number, d: any) => sum + (d.الإنجاز || 0), 0);
  }, [monthlyData]);

  const averageCompletion = useMemo(() => {
    const validDays = monthlyData.filter((d: any) => (d.الإنجاز || 0) > 0 || new Date(d.dateStr) <= new Date());
    if (validDays.length === 0) return 0;
    return Math.round(validDays.reduce((s: number, d: any) => s + (d.percentage || 0), 0) / validDays.length);
  }, [monthlyData]);

  const stats = useMemo(() => [
    {
      icon: <Flame size={22} />,
      iconBg: "from-orange-500/20 to-amber-500/10",
      iconColor: "text-orange-400",
      label: "أفضل سلسلة إنجاز",
      value: bestStreak,
      unit: "يوم",
      extra: !recoveryUsed && bestStreak > 0 ? (
        <motion.button
          whileTap={{ scale: 0.95 }}
          disabled={recoveryLoading}
          onClick={() => {
            toast("تأكيد استخدام بطاقة الإنقاذ لاسترداد السلسلة بالأمس؟", {
              action: {
                label: "تأكيد واسترداد",
                onClick: async () => {
                  setRecoveryLoading(true);
                  try {
                    const { data: authData } = await supabase.auth.getSession();
                    if (!authData.session) return;
                    const yesterday = new Date();
                    yesterday.setDate(yesterday.getDate() - 1);
                    const yStr = new Intl.DateTimeFormat("en-CA").format(yesterday);
                    const bestHabit = habits.find((h: any) => h.streak?.current_streak === 0 && h.streak?.longest_streak > 5);
                    if (bestHabit) {
                      await supabase.from("habit_checkins").insert({ habit_id: bestHabit.id, user_id: authData.session.user.id, day_local: yStr });
                      const monthStr = `${new Date().getFullYear()}-${String(new Date().getMonth() + 1).padStart(2, '0')}`;
                      await supabase.from("monthly_recoveries").insert({ user_id: authData.session.user.id, month_local: monthStr, recovered_habit_id: bestHabit.id });
                    }
                    setRecoveryUsed(true);
                    toast.success("تم استرداد السلسلة بنجاح!");
                  } finally {
                    setRecoveryLoading(false);
                  }
                }
              }
            });
          }}
          className="mt-2 w-full flex items-center gap-1.5 justify-center py-1.5 rounded-lg bg-gradient-to-r from-amber-500/20 to-orange-500/10 border border-amber-500/20 text-amber-400 text-[10px] font-bold hover:from-amber-500/30 transition"
        >
          {recoveryLoading ? <div className="w-3 h-3 border border-amber-400/30 border-t-amber-400 rounded-full animate-spin" /> : <Shield size={11} />}
          🛡️ بطاقة إنقاذ
        </motion.button>
      ) : recoveryUsed ? (
        <div className="mt-1 text-[10px] text-white/30 text-center">✓ استُخدمت هذا الشهر</div>
      ) : null,
    },
    {
      icon: <Trophy size={22} />,
      iconBg: "from-green-500/20 to-emerald-500/10",
      iconColor: "text-green-400",
      label: "أيام مثالية (100%)",
      value: perfectDays,
      unit: "أيام",
    },
    {
      icon: <Target size={22} />,
      iconBg: "from-blue-500/20 to-cyan-500/10",
      iconColor: "text-blue-400",
      label: "إنجازات الشهر",
      value: totalCheckinsThisMonth,
      unit: "مرة",
    },
    {
      icon: <Sparkles size={22} />,
      iconBg: "from-purple-500/20 to-pink-500/10",
      iconColor: "text-purple-400",
      label: "متوسط الإنجاز",
      value: averageCompletion,
      unit: "%",
    },
  ], [bestStreak, perfectDays, totalCheckinsThisMonth, averageCompletion, recoveryUsed, recoveryLoading, habits]);

  const monthsStats = useMemo(() => {
    const realNow = new Date();
    const isOngoing = currentDate.getFullYear() === realNow.getFullYear() && currentDate.getMonth() === realNow.getMonth();
    
    const calculateMonth = (targetDate: Date, limitToRealCurrentDay: boolean) => {
        const y = targetDate.getFullYear();
        const m = targetDate.getMonth();
        const maxDays = new Date(y, m + 1, 0).getDate();
        const limit = limitToRealCurrentDay ? Math.min(realNow.getDate(), maxDays) : maxDays;
        
        let limitedScore = 0;
        let totalScore = 0;

        for (let i = 1; i <= maxDays; i++) {
            const mm = String(m + 1).padStart(2, "0");
            const dd = String(i).padStart(2, "0");
            const str = `${y}-${mm}-${dd}`;
            
            const isFuture = new Date(y, m, i) > new Date(new Date().setHours(23,59,59,999));
            const { totalSuccess: dayScore } = calculateDayProgress(habits, str, isFuture);
            
            totalScore += dayScore;
            if (i <= limit) {
                limitedScore += dayScore;
            }
        }
        return { 
           limitedScore, 
           totalScore,
           name: targetDate.toLocaleDateString('ar-EG', { month: 'long', year: targetDate.getFullYear() !== realNow.getFullYear() ? 'numeric' : undefined }),
           limited: limitToRealCurrentDay,
           limitDay: limit,
           isRealCurrent: y === realNow.getFullYear() && m === realNow.getMonth(),
           limitedPossible: habits.length * limit
        };
    };

    const list = [];
    if (isOngoing) {
        list.push(calculateMonth(realNow, true));
        for(let i=1; i<=5; i++) {
            const d = new Date(realNow.getFullYear(), realNow.getMonth() - i, 1);
            list.push(calculateMonth(d, true));
        }
    } else {
        list.push(calculateMonth(currentDate, true));
        list.push(calculateMonth(realNow, true));
        for(let i=1; i<=4; i++) {
            const d = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
            list.push(calculateMonth(d, true));
        }
    }
    
    return list;
  }, [habits, currentDate]);

  const maxScore = useMemo(() => Math.max(...monthsStats.map(m => m.limitedScore), 1), [monthsStats]);

  const generateAIReport = async () => {
    if (aiLoading) return;
    setAiLoading(true);
    setAiError(false);

    try {
      // Force loading state off after 70 seconds no matter what
      setTimeout(() => {
        setAiLoading(false);
      }, 70000);

      const today = new Intl.DateTimeFormat("en-CA").format(new Date());
      const { data: authData } = await supabase.auth.getSession();
      if (!authData.session) {
        toast.error("يرجى تسجيل الدخول أولاً لاستخدام الذكاء الاصطناعي");
        setAiLoading(false);
        return;
      }
      
      // Check usage
      const { data: usageData, error: usageError } = await supabase
        .from('daily_ai_usage')
        .select('usage_count')
        .eq('user_id', authData.session.user.id)
        .eq('day_local', today)
        .single();
        
      // PGRST116 means 0 rows, which is fine (first time today)
      if (usageError && usageError.code !== 'PGRST116') {
        console.error("Error checking usage:", usageError);
      }
        
      const count = usageData?.usage_count || 0;
      if (count >= 5) {
        toast.error("لقد أتممت الحد المسموح للتحليل اليوم (5 مرات). نلتقي غداً!", { style: { background: '#333', color: '#fff' } });
        setAiLoading(false);
        return;
      }

      const selectedMonthName = currentDate.toLocaleDateString('ar-EG', { month: 'long', year: 'numeric' });
      const isCurrentMonth = currentDate.getMonth() === new Date().getMonth() &&
        currentDate.getFullYear() === new Date().getFullYear();

      const ctx = JSON.stringify(monthsStats.slice(0, 6).map(m => ({
        name: m.name,
        limitedScore: m.limitedScore,
        totalScore: m.totalScore,
        limitDay: m.limitDay,
        isRealCurrent: m.isRealCurrent
      })));

      const habitDetailsStr = habits.map(h => {
        const isQuit = h.habit_type === 'quit';
        const typeStr = isQuit ? "تجنب عادة سيئة" : "بناء عادة إيجابية";
        const prefix = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, "0")}`;
        let monthCheckins = 0;
        if (isQuit) {
          const createdAt = h.created_at ? new Date(h.created_at) : new Date(0);
          const daysToConsider = isCurrentMonth ? new Date().getDate() : new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();
          for (let i = 1; i <= daysToConsider; i++) {
            const dateStr = `${prefix}-${String(i).padStart(2, "0")}`;
            const dateObj = new Date(currentDate.getFullYear(), currentDate.getMonth(), i);
            if (dateObj >= new Date(createdAt.getFullYear(), createdAt.getMonth(), createdAt.getDate())) {
              if (!h.relapses?.has(dateStr)) monthCheckins++;
            }
          }
        } else {
          h.checkins?.forEach(dateStr => {
            if (dateStr.startsWith(prefix)) monthCheckins++;
          });
        }
        return `- العادة: "${h.title}" | النوع: ${typeStr} | الإنجاز هذا الشهر: ${monthCheckins} | السلسلة: ${h.streak?.current_streak || 0} يوم`;
      }).join('\\n');

      const prompt = `أنت "زينيث"، خبير عالمي متمرس في تحليل البيانات السلوكية، وتطوير الأداء الشخصي، وعلم النفس المعرفي. مهمتك الآن تقديم تحليل شامل، عميق، وقاسٍ أحياناً لبيانات المستخدم لشهر ${selectedMonthName}. المستخدم يكره السطحية ويريد تحليل خبير غائص في التفاصيل.

البيانات التاريخية للأشهر (لمعرفة التقدم العام):
${ctx}

بيانات كل عادة بالتفصيل (هذا الشهر):
${habitDetailsStr}

المطلوب استخراج تقرير تحليلي طويل، مفصل، واحترافي جداً (بدون استخدام علامات النجمة * أبداً، استخدم الأرقام والشرطات والمسافات للتنسيق):

1. تقييم الأداء العام: تحليل لمدى استقرار أو تذبذب أداء المستخدم مقارنة بالأشهر السابقة بناءً على لغة الأرقام.
2. تشريح العادات الجيدة: حدد العادات الإيجابية التي أبلى فيها حسناً بالاسم. حلل هذا النجاح بناءً على قوة السلسلة والإنجاز.
3. تفكيك العادات المهملة والسيئة: حدد العادات التي تعاني من قصور شديد، سواء إيجابية مهملة أو سيئة عاد إليها. واجه المستخدم بالحقيقة بأسلوب حازم.
4. الخطة التكتيكية: قدم 3 خطوات عملية استراتيجية مصممة خصيصاً لهذه العادات الضعيفة (مثل تقنية 2-Minute Rule، أو Habit Stacking).
5. الخلاصة: رسالة ختامية تزرع الانضباط وتطالبه بنتائج أفضل.

تحدث كخبير حقيقي يقرأ بين السطور. يجب أن يكون التقرير دسماً، طويلاً، ويذكر أسماء العادات الخاصة به بالتفصيل.`;

      toast.info("جاري إرسال البيانات للذكاء الاصطناعي (قد يستغرق 30-60 ثانية)...", { id: "ai-loading" });
      const aiText = await generateComplexAnalyticsReport(prompt);
      toast.dismiss("ai-loading");
      
      let finalAiText = aiText;
      if (typeof finalAiText === "string") {
        finalAiText = finalAiText.replace(/\*/g, ""); // إزالة جميع النجوم
      }
      
      setAiInsight(finalAiText);
      localStorage.setItem(`zenith_ai_report_${authData.session.user.id}_${today}`, finalAiText);
      
      // Update DB
      await supabase.from('daily_ai_usage').upsert({
        user_id: authData.session.user.id,
        day_local: today,
        usage_count: count + 1
      }, { onConflict: 'user_id,day_local' });

      toast.success("تم الانتهاء من التحليل!", { style: { background: '#333', color: '#fff' } });
    } catch (err: any) {
      setAiError(true);
      console.error("AI report error:", err);
      toast.error("فشل الاتصال بالذكاء الاصطناعي. يرجى المحاولة لاحقاً.", { style: { background: '#333', color: '#fff' } });
    } finally {
      setAiLoading(false);
    }
  };
  
  const handleExportPDF = async () => {
    if (isExporting) return;
    setIsExporting(true);

    try {
      window.print();
    } catch (err) {
      console.error('PDF error:', err);
      toast.error('حدث خطأ في الطباعة');
    } finally {
      setIsExporting(false);
    }
  };

  if (habits.length === 0) return null;

  const HABIT_COLORS: Record<string, string> = {
    slate: "#64748B", gray: "#9CA3AF", red: "#EF4444", orange: "#F97316",
    amber: "#F59E0B", yellow: "#EAB308", lime: "#84CC16", green: "#22C55E",
    emerald: "#10B981", teal: "#14B8A6", cyan: "#06B6D4", sky: "#0EA5E9",
    blue: "#3B82F6", indigo: "#6366F1", violet: "#8B5CF6", purple: "#A855F7",
    fuchsia: "#D946EF", pink: "#EC4899", rose: "#F43F5E", brown: "#8B4513",
    coral: "#FF7F50", gold: "#FFD700", crimson: "#DC143C",
  };

  const isPositive = monthsStats.length >= 2 ? monthsStats[0].limitedScore >= monthsStats[1].limitedScore : true;
  const comparisonStr = monthsStats.length >= 2 
    ? monthsStats[0].limitedScore > monthsStats[1].limitedScore
      ? `أداؤك تحسّن بـ ${monthsStats[0].limitedScore - monthsStats[1].limitedScore} إنجاز! استمر 💪`
      : monthsStats[0].limitedScore < monthsStats[1].limitedScore
        ? `أداؤك أقل بـ ${monthsStats[1].limitedScore - monthsStats[0].limitedScore} إنجاز — حاول تعوّض!`
        : `أداؤك متطابق — حاول تتقدم!`
    : 'أنت في البداية! استمر بقوة 🚀';

  return (
    <>
      <PrintableReport habits={habits} currentDate={currentDate} monthsStats={monthsStats} />
      <motion.div
        initial={{ opacity: 0, y: 30 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.1 }}
        className="space-y-6 print:hidden"
        id="analytics-report"
      >
      <div className="glass rounded-3xl p-6 border border-white/[0.08] relative overflow-hidden shadow-[0_8px_32px_rgba(0,0,0,0.2)] backdrop-blur-xl">
        <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 via-transparent to-emerald-500/5 pointer-events-none" />
        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-green-500/20 to-emerald-500/20 flex items-center justify-center border border-white/10 shadow-inner">
              <BarChart3 className="text-green-400" size={26} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                تقرير شهر {currentDate.toLocaleDateString('ar-EG', { month: 'long', year: 'numeric' })}
              </h2>
              <p className={`text-sm mt-0.5 ${isPositive ? 'text-green-400' : 'text-orange-400'}`}>
                {comparisonStr}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-3 mt-4 md:mt-0" data-html2canvas-ignore>
            <button
              onClick={handleExportPDF}
              disabled={isExporting}
              className="flex items-center gap-2 px-5 py-2.5 bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 text-white font-bold text-sm transition"
            >
              {isExporting ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Printer size={18} />}
              تصدير PDF
            </button>
            <button
              onClick={generateAIReport}
              disabled={aiLoading}
              className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-green-500/20 to-emerald-500/20 hover:from-green-500/30 hover:to-emerald-500/30 rounded-xl border border-green-500/30 text-green-300 font-bold text-sm transition group relative shadow-[0_0_15px_rgba(34,197,94,0.1)] hover:shadow-[0_0_20px_rgba(34,197,94,0.2)]"
            >
              {aiLoading ? <div className="w-4 h-4 border-2 border-green-400/30 border-t-green-400 rounded-full animate-spin" /> : <Brain size={18} />}
              تحليل بالذكاء الاصطناعي
              
              <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-48 p-2 bg-black/90 border border-white/10 rounded-lg text-xs text-white text-center opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50">
                يقوم الذكاء الاصطناعي بتحليل أدائك وتقديم نصائح لتحسين التزامك.
              </div>
            </button>
            <div className="flex items-center gap-2 px-4 py-2 bg-white/5 rounded-xl border border-white/10">
              <Calendar size={16} className="text-[#A7B3AB]" />
              <span className="text-sm text-white/70">
                متوسط الإنجاز: <span className="font-bold text-white">{averageCompletion}%</span>
              </span>
            </div>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {(aiInsight || aiError) && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="overflow-hidden"
          >
            <div className="glass p-5 rounded-2xl border border-green-500/20 relative shadow-[0_8px_32px_rgba(34,197,94,0.05)]">
              <div className="absolute inset-0 bg-green-500/5" />
              <div className="relative">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2 text-green-400 font-bold">
                    <Brain size={18} />
                    تحليل زينيث AI
                  </div>
                  <button onClick={() => { setAiInsight(null); setAiError(false); }} className="text-white/40 hover:text-white transition" data-html2canvas-ignore>
                    <X size={16} />
                  </button>
                </div>
                {aiError ? (
                  <p className="text-red-400 text-sm">حدث خطأ أثناء الاتصال. يرجى المحاولة لاحقاً.</p>
                ) : (
                  <div className="text-sm text-[#A7B3AB] leading-relaxed whitespace-pre-wrap">
                    {aiInsight}
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat: any, i: number) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 + i * 0.05 }}
            whileHover={{ y: -4, scale: 1.01 }}
            className="glass rounded-3xl p-6 border border-white/[0.06] flex flex-col justify-between min-h-[148px] group hover:bg-white/[0.02] transition-all duration-300 relative overflow-hidden"
          >
            {/* Glowing background hint */}
            <div className={`absolute -right-6 -bottom-6 w-20 h-20 rounded-full blur-2xl opacity-10 bg-gradient-to-br ${stat.iconBg} pointer-events-none`} />

            {/* Top row: Icon */}
            <div className="flex items-center justify-between relative z-10">
              <div className={`w-11 h-11 rounded-xl bg-gradient-to-br ${stat.iconBg} flex items-center justify-center ${stat.iconColor} border border-white/5 shrink-0 group-hover:scale-105 transition-transform`}>
                {stat.icon}
              </div>
            </div>

            {/* Bottom info */}
            <div className="relative z-10 mt-auto text-right" dir="rtl">
              <div className="text-[#A7B3AB] text-xs font-bold opacity-60 mb-2">{stat.label}</div>
              <div className="text-3xl sm:text-4xl font-black text-white tracking-tight leading-none">
                {stat.value} <span className="text-sm font-bold text-[#A7B3AB] mr-1">{stat.unit}</span>
              </div>
            </div>

            {stat.extra && (
              <div className="relative z-10 mt-3" data-html2canvas-ignore>
                {stat.extra}
              </div>
            )}
          </motion.div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass rounded-3xl p-6 border border-white/[0.06]">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <TrendingUp size={16} className="text-green-400" />
              مخطط الإنجاز اليومي
            </h3>
            <button
              onClick={() => setShowFullMonth(!showFullMonth)}
              className="text-xs px-3 py-1.5 bg-white/5 hover:bg-white/10 text-white/80 hover:text-white rounded-xl border border-white/10 transition font-bold"
              data-html2canvas-ignore
            >
              {showFullMonth ? "عرض حتى اليوم" : "عرض الشهر كاملاً"}
            </button>
          </div>
          <div className="h-[250px] w-full" dir="ltr">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthlyData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                <XAxis dataKey="name" stroke="rgba(255,255,255,0.25)" fontSize={10} tickMargin={8} axisLine={false} tickLine={false} />
                <YAxis
                  domain={[0, lineChartMaxY]}
                  ticks={lineChartTicks}
                  stroke="rgba(255,255,255,0.25)"
                  fontSize={10}
                  axisLine={false}
                  tickLine={false}
                  allowDecimals={false}
                />
                <Tooltip
                  contentStyle={{ backgroundColor: 'rgba(0,0,0,0.85)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '12px', fontSize: '12px' }}
                  itemStyle={{ color: '#ffffff' }}
                  labelStyle={{ color: '#A7B3AB', marginBottom: '6px' }}
                />
                <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ fontSize: '12px', color: '#fff' }} />
                <Line type="monotone" name="عادات جيدة" dataKey="عادات جيدة" stroke="#4ADE80" strokeWidth={3} dot={false} activeDot={{ r: 5, fill: '#4ADE80', stroke: '#000', strokeWidth: 2 }} />
                <Line type="monotone" name="تجنب سيئة" dataKey="تجنب سيئة" stroke="#EF4444" strokeWidth={4} dot={false} activeDot={{ r: 6, fill: '#EF4444', stroke: '#000', strokeWidth: 2 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass rounded-3xl p-6 border border-white/[0.06]">
          <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
            <BarChart3 size={16} className="text-blue-400" />
            أداء كل عادة هذا الشهر
          </h3>
          <div className="h-[250px] w-full" dir="ltr">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={habitStats} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                <XAxis
                  dataKey="icon"
                  stroke="rgba(255,255,255,0.25)"
                  fontSize={14}
                  tickMargin={8}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis
                  domain={[0, daysInMonth]}
                  ticks={barChartTicks}
                  stroke="rgba(255,255,255,0.25)"
                  fontSize={10}
                  axisLine={false}
                  tickLine={false}
                  allowDecimals={false}
                />
                <Tooltip
                  cursor={{ fill: 'rgba(255, 255, 255, 0.05)' }}
                  contentStyle={{ backgroundColor: '#131815', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '16px', fontSize: '13px', boxShadow: '0 8px 32px rgba(0,0,0,0.4)' }}
                  labelStyle={{ color: '#8B9A90', marginBottom: '4px' }}
                  itemStyle={{ color: '#fff', fontWeight: 'bold' }}
                  formatter={(value: number) => [`${value} مرة`, "الإنجاز"]}
                />
                <Bar dataKey="checkins" radius={[6, 6, 0, 0]} maxBarSize={35}>
                  {habitStats.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={HABIT_COLORS[entry.color] || '#4ADE80'} fillOpacity={0.7} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Mood & Best Time Analysis */}
      <HabitsAIAnalysis habits={habits} monthlyData={monthlyData} />

      <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="glass rounded-3xl p-6 border border-white/[0.06]"
        >
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              📊 مقارنة الأداء بالشهور
            </h3>
            <div className="flex items-center gap-2" data-html2canvas-ignore>
              {monthsStats.length > 2 && (
                <button 
                  onClick={() => setShowMoreMonths(!showMoreMonths)}
                  className="text-xs text-blue-400 hover:text-blue-300 font-bold bg-blue-400/10 px-3 py-1 rounded-full transition-colors"
                >
                  {showMoreMonths ? "عرض أقل" : "عرض المزيد"}
                </button>
              )}
            </div>
          </div>

          <div className="space-y-5">
            {monthsStats.slice(0, showMoreMonths ? monthsStats.length : 2).map((mStat, idx) => (
              <div key={idx}>
                <div className="flex items-center justify-between mb-2">
                  <span className="text-sm text-white/80">
                    {mStat.name} {mStat.isRealCurrent ? "(الحالي)" : ""} 
                    {mStat.limited && !mStat.isRealCurrent ? <span className="text-xs text-white/40 mr-1">(حتى اليوم {mStat.limitDay})</span> : ""}
                  </span>
                  <div className="flex items-center gap-2">
                    <span className={`text-sm font-bold ${idx === 0 ? 'text-green-400' : 'text-blue-400'}`}>{mStat.limitedScore} / {mStat.limitedPossible} إنجاز</span>
                    {mStat.totalScore > mStat.limitedScore && (
                      <span className="text-[10px] text-white/30 hidden sm:inline-block">إجمالي الشهر: {mStat.totalScore}</span>
                    )}
                  </div>
                </div>
                <div className="h-4 bg-white/5 rounded-full overflow-hidden">
                  <motion.div
                    className={`h-full rounded-full bg-gradient-to-r ${idx === 0 ? 'from-green-500 to-emerald-400' : 'from-blue-500 to-cyan-400'}`}
                    initial={{ width: 0 }}
                    animate={{ width: `${mStat.limitedPossible > 0 ? Number(Math.min((mStat.limitedScore / mStat.limitedPossible) * 100, 100).toFixed(2)) : 0}%` }}
                    transition={{ duration: 1, ease: "easeOut", delay: 0.5 + (idx * 0.1) }}
                  />
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </motion.div>
    </>
  );
}

