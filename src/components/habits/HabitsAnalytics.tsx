import { useMemo, useState } from "react";
import { HabitWithStreak } from "@/hooks/useHabits";
import { AreaChart, Area, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, BarChart, Bar, Cell, Legend } from "recharts";
import { Flame, Target, Trophy, TrendingUp, Calendar, Sparkles, BarChart3, Brain, Shield, Printer, X } from "lucide-react";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import { supabase } from "@/lib/supabase";
import { PrintableReport } from "./PrintableReport";
import { calculateDayProgress } from "@/lib/habitCalculations";

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

  const monthlyData = useMemo(() => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const goodHabits = habits.filter(h => h.habit_type !== 'quit');
    const badHabits = habits.filter(h => h.habit_type === 'quit');

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
        الإنجاز: totalSuccess,
        "عادات جيدة": completedGood,
        "تجنب سيئة": avoidedBad,
        percentage
      });
    }
    return result;
  }, [habits, currentDate]);

  // Per-habit stats for bar chart
  const habitStats = useMemo(() => {
    const prefix = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, "0")}`;
    return habits.map(h => {
      let monthCheckins = 0;
      h.checkins?.forEach(dateStr => {
        if (dateStr.startsWith(prefix)) monthCheckins++;
      });
      return {
        name: h.title.length > 12 ? h.title.slice(0, 12) + "…" : h.title,
        icon: h.icon || "✨",
        checkins: monthCheckins,
        streak: h.streak?.current_streak || 0,
        color: h.color,
      };
    });
  }, [habits, currentDate]);

  const bestStreak = useMemo(() => {
    return Math.max(...habits.map(h => h.streak?.longest_streak || 0), 0);
  }, [habits]);

  const perfectDays = useMemo(() => {
    return monthlyData.filter((d: any) => d.percentage === 100 && d.الإنجاز > 0).length;
  }, [monthlyData]);

  const totalCheckinsThisMonth = useMemo(() => {
    return monthlyData.reduce((sum: number, d: any) => sum + d.الإنجاز, 0);
  }, [monthlyData]);

  const averageCompletion = useMemo(() => {
    const validDays = monthlyData.filter((d: any) => d.الإنجاز > 0 || new Date(d.dateStr) <= new Date());
    if (validDays.length === 0) return 0;
    return Math.round(validDays.reduce((s: number, d: any) => s + d.percentage, 0) / validDays.length);
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
                    }
                    const key = `recovery_${new Date().getFullYear()}_${new Date().getMonth()}`;
                    localStorage.setItem(key, "1");
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
        <div className="mt-1 text-[10px] text-foreground/30 text-center">✓ استُخدمت هذا الشهر</div>
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
    // Compare based on the selected month 'currentDate'
    const isOngoing = currentDate.getFullYear() === realNow.getFullYear() && currentDate.getMonth() === realNow.getMonth();
    const limitDayNum = isOngoing ? realNow.getDate() : new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 0).getDate();

        const list = [];
    
    const calculateMonth = (targetDate: Date, limitToRealCurrentDay: boolean) => {
        const y = targetDate.getFullYear();
        const m = targetDate.getMonth();
        const maxDays = new Date(y, m + 1, 0).getDate();
        // If we are looking at past months, we still compare them up to the current day in the current month to make a fair comparison
        const limit = limitToRealCurrentDay ? Math.min(realNow.getDate(), maxDays) : maxDays;
        
        let limitedScore = 0;
        let totalScore = 0;
        const goodHabits = habits.filter(h => h.habit_type !== 'quit');
        const badHabits = habits.filter(h => h.habit_type === 'quit');

        for (let i = 1; i <= maxDays; i++) {
            const mm = String(m + 1).padStart(2, "0");
            const dd = String(i).padStart(2, "0");
            const str = `${y}-${mm}-${dd}`;
            
            const isFuture = new Date(y, m, i) > new Date(new Date().setHours(23,59,59,999));
            const { totalSuccess: dayScore } = calculateDayProgress(habits, str, isFuture);
            
            totalScore += dayScore;
            // When calculating limited score for fair comparison, we use the realNow.getDate() as limit
            if (i <= limit) {
                limitedScore += dayScore;
            }
        }
        return { 
           limitedScore, 
           totalScore,
           maxPossible: Math.max(habits.length * maxDays, 1),
           name: targetDate.toLocaleDateString('ar-EG', { month: 'long', year: targetDate.getFullYear() !== realNow.getFullYear() ? 'numeric' : undefined }),
           limited: limitToRealCurrentDay,
           limitDay: limit,
           isRealCurrent: y === realNow.getFullYear() && m === realNow.getMonth()
        };
    };

    if (isOngoing) {
        list.push(calculateMonth(realNow, true));
        for(let i=1; i<=11; i++) {
            const d = new Date(realNow.getFullYear(), realNow.getMonth() - i, 1);
            list.push(calculateMonth(d, true));
        }
    } else {
        list.push(calculateMonth(currentDate, true));
        list.push(calculateMonth(realNow, true));
        for(let i=1; i<=10; i++) {
            const d = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
            list.push(calculateMonth(d, true));
        }
    }
    
    return list;
  }, [habits, currentDate]);

  const generateAIReport = async () => {
    if (aiLoading) return;
    setAiLoading(true);
    setAiError(false);

    try {
      // محاكاة معالجة بيانات عميقة
      await new Promise(resolve => setTimeout(resolve, 2000));

      const goodHabits = habits.filter(h => h.habit_type !== 'quit');
      const quitHabits = habits.filter(h => h.habit_type === 'quit');
      
      const scoreTrend = (monthsStats.length >= 2 && monthsStats[1].limitedScore > 0)
         ? ((monthsStats[0].limitedScore - monthsStats[1].limitedScore) / monthsStats[1].limitedScore) * 100
         : 100;
         
      const isUp = scoreTrend > 0;
      const isDown = scoreTrend < 0;
      
      // Momentum calculation (Algorithm)
      const momentumScore = Math.min(100, Math.round((averageCompletion + (perfectDays * 5))));
      let momentumText = "";
      if (momentumScore >= 80) momentumText = "🔥 زخم ناري (تدفق عالٍ)";
      else if (momentumScore >= 50) momentumText = "⚡ زخم متصاعد (إيجابي)";
      else if (momentumScore >= 30) momentumText = "🌱 زخم في طور البناء";
      else momentumText = "⚠️ انخفاض في الزخم";

      let insight = `[ تقرير زينيث التحليلي المتقدم ]\n`;
      insight += `الزمن: ${new Date().toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}\n\n`;

      // 1. Executive Summary
      insight += `📊 1. مؤشرات الأداء العام:\n`;
      insight += `• مؤشر الزخم الحالي: ${momentumScore}/100 [ ${momentumText} ]\n`;
      if (isUp) {
        insight += `• المسار: نمو حقيقي بنسبة +${Math.round(scoreTrend)}% في وتيرة الإنجاز مقارنة بنفس الفترة من الشهر الماضي.\n`;
      } else if (isDown) {
        insight += `• المسار: انحراف سلبي بنسبة ${Math.round(Math.abs(scoreTrend))}% مقارنة بالشهر الماضي. (فرصة لتصحيح المسار فوراً)\n`;
      } else {
        insight += `• المسار: استقرار تام (0% تغيير). الثبات هو أساس الانضباط.\n`;
      }
      insight += `• معدل الجودة: ${perfectDays} أيام مثالية (نسبة نجاح 100%).\n\n`;

      // 2. Deep Dive: Streaks & Winners
      insight += `🏆 2. تحليل نقاط القوة (القمة):\n`;
      const activeGood = [...goodHabits].filter(h => (h.streak?.current_streak || 0) > 0).sort((a,b) => (b.streak?.current_streak||0) - (a.streak?.current_streak||0));
      if (activeGood.length > 0) {
        insight += `• الالتزام الحديدي: "${activeGood[0].title}" تتصدر بسلسلة ${activeGood[0].streak?.current_streak} أيام متتالية. المسارات العصبية لهذه العادة أصبحت شبه تلقائية الآن.\n`;
      }
      const perfectQuit = [...quitHabits].filter(h => (h.streak?.current_streak || 0) >= 3).sort((a,b) => (b.streak?.current_streak||0) - (a.streak?.current_streak||0));
      if (perfectQuit.length > 0) {
        insight += `• السيطرة الذاتية: قدرتك على كبح "${perfectQuit[0].title}" لمدة ${perfectQuit[0].streak?.current_streak} أيام تثبت أنك تتحكم برغباتك بشكل ممتاز.\n`;
      }
      if (activeGood.length === 0 && perfectQuit.length === 0) {
        insight += `• قيد المعايرة: جميع سلاسلك في المرحلة التأسيسية. كل يوم جديد هو فرصة لصنع زخم.\n`;
      }
      insight += `\n`;

      // 3. Deep Dive: Weak Points & Relapses
      insight += `🔍 3. تحليل الفجوات والانكسارات:\n`;
      const brokenGood = [...goodHabits].filter(h => (h.streak?.current_streak || 0) === 0 && (h.streak?.longest_streak || 0) > 0);
      const brokenQuit = [...quitHabits].filter(h => (h.streak?.current_streak || 0) === 0);
      
      let hasGaps = false;
      if (brokenGood.length > 0) {
         hasGaps = true;
         insight += `• تسرب الطاقة: عادة "${brokenGood[0].title}" متوقفة حالياً. ترك عاداتك الإيجابية يرسل إشارة للعقل الباطن بقبول التنازلات.\n`;
      }
      if (brokenQuit.length > 0) {
         hasGaps = true;
         const relapsedHabit = brokenQuit[0];
         // Search for the last logged reason for this specific quit habit
         const lastLog = relapsedHabit.relapseLogs && relapsedHabit.relapseLogs.length > 0 
              ? relapsedHabit.relapseLogs[relapsedHabit.relapseLogs.length - 1].reason 
              : null;
         
         if (lastLog) {
            insight += `• تحليل الانتكاسة ("${relapsedHabit.title}"): تم رصد سبب الانتكاسة وهو: "${lastLog}". هذا النمط يحتاج إلى استراتيجية وقائية لكسر المحفز.\n`;
         } else {
            insight += `• تحليل الانتكاسة: رصد تعثر في "${relapsedHabit.title}". الانتكاس هو مجرد "بيانات" لتعديل استراتيجيتك، وليس حكماً بالفشل.\n`;
         }
      }
      if (!hasGaps) {
         insight += `• النقاء: نظامك خالٍ من الفجوات النشطة حالياً. أنت تعيش حالة (Flow State) مستقرة.\n`;
      }
      insight += `\n`;

      // 4. Algorithm Recommendation
      insight += `🎯 4. التوجيه الاستراتيجي:\n`;
      if (hasGaps) {
         const target = brokenGood.length > 0 ? brokenGood[0].title : (brokenQuit[0]?.title || 'العودة للمسار');
         insight += `القرار: تطبيق قاعدة "الدقيقتين" فوراً على [ ${target} ].\nلا تفكر في الإنجاز الكامل اليوم، بل التزم فقط بالاحتكاك بها لمدة دقيقتين لكسر المقاومة النفسية، وإعادة بناء الهوية.\n`;
      } else {
         insight += `القرار: تصعيد المعايير.\nبما أنك تتقن قائمة عاداتك الحالية، النظام يوصي بتحسين "جودة" التطبيق غداً بدلاً من زيادة الكمية. أنت في مرحلة التطوير العميق.\n`;
      }

      setAiInsight(insight);
      toast.success("تم توليد التقرير المتقدم!", { style: { background: '#333', color: '#fff' } });
    } catch (err: any) {
      setAiError(true);
      console.error("AI report error:", err);
      toast.error("فشل التحليل. يرجى المحاولة لاحقاً.", { style: { background: '#333', color: '#fff' } });
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
    fuchsia: "#D946EF", pink: "#EC4899", rose: "#F43F5E", brown: "#A52A2A",
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
      <div className="glass rounded-3xl p-6 border border-border relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-transparent to-purple-500/5" />
        <div className="relative flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-blue-500/20 to-purple-500/20 flex items-center justify-center border border-border">
              <BarChart3 className="text-blue-400" size={26} />
            </div>
            <div>
              <h2 className="text-xl font-bold text-foreground flex items-center gap-2">
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
              className="flex items-center gap-2 px-5 py-2.5 bg-foreground/5 hover:bg-foreground/10 rounded-xl border border-border text-foreground font-bold text-sm transition"
            >
              {isExporting ? <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <Printer size={18} />}
              تصدير PDF
            </button>
            <button
              onClick={generateAIReport}
              disabled={aiLoading}
              className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-blue-500/20 to-purple-500/20 hover:from-blue-500/30 hover:to-purple-500/30 rounded-xl border border-blue-500/30 text-blue-300 font-bold text-sm transition group relative"
            >
              {aiLoading ? <div className="w-4 h-4 border-2 border-blue-400/30 border-t-blue-400 rounded-full animate-spin" /> : <Brain size={18} />}
              تحليل بالذكاء الاصطناعي
              
              <div className="absolute top-full left-1/2 -translate-x-1/2 mt-2 w-48 p-2 bg-black/90 border border-border rounded-lg text-xs text-foreground text-center opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity z-50">
                يقوم الذكاء الاصطناعي بتحليل أدائك وتقديم نصائح لتحسين التزامك.
              </div>
            </button>
            <div className="flex items-center gap-2 px-4 py-2 bg-foreground/5 rounded-xl border border-border">
              <Calendar size={16} className="text-muted-foreground" />
              <span className="text-sm text-foreground/70">
                متوسط الإنجاز: <span className="font-bold text-foreground">{averageCompletion}%</span>
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
            <div className="glass p-5 rounded-2xl border border-blue-500/20 relative">
              <div className="absolute inset-0 bg-blue-500/5" />
              <div className="relative">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2 text-blue-400 font-bold">
                    <Brain size={18} />
                    تحليل زينيث AI
                  </div>
                  <button onClick={() => { setAiInsight(null); setAiError(false); }} className="text-foreground/40 hover:text-foreground transition" data-html2canvas-ignore>
                    <X size={16} />
                  </button>
                </div>
                {aiError ? (
                  <p className="text-red-400 text-sm">حدث خطأ أثناء الاتصال. يرجى المحاولة لاحقاً.</p>
                ) : (
                  <div className="text-sm text-muted-foreground leading-relaxed whitespace-pre-wrap">
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
            className="glass rounded-2xl p-5 border border-border flex flex-col gap-2 group hover:bg-foreground/[0.04] transition-all duration-300"
          >
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${stat.iconBg} flex items-center justify-center ${stat.iconColor} shrink-0 group-hover:scale-110 transition-transform`}>
                {stat.icon}
              </div>
              <div>
                <div className="text-muted-foreground text-xs mb-0.5">{stat.label}</div>
                <div className="text-2xl font-black text-foreground flex items-baseline gap-1">
                  {stat.value} <span className="text-sm font-normal text-muted-foreground">{stat.unit}</span>
                </div>
              </div>
            </div>
            <div data-html2canvas-ignore>
                {(stat as any).extra && (stat as any).extra}
            </div>
          </motion.div>
        ))}
      </div>


      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="glass rounded-3xl p-6 border border-border relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
          <h3 className="text-sm font-bold text-foreground mb-6 flex items-center gap-2">
            <div className="p-1.5 bg-green-500/10 rounded-lg">
              <TrendingUp size={16} className="text-green-400" />
            </div>
            مخطط الإنجاز اليومي
          </h3>
          <div className="h-[260px] w-full relative z-10" dir="ltr">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={monthlyData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorGood" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#4ADE80" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#4ADE80" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorBad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#EF4444" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="#EF4444" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
                <XAxis dataKey="name" stroke="rgba(255,255,255,0.4)" fontSize={11} tickMargin={10} axisLine={false} tickLine={false} />
                <YAxis stroke="rgba(255,255,255,0.4)" fontSize={11} axisLine={false} tickLine={false} allowDecimals={false} domain={[0, Math.max(habits.length, 4)]} />
                <Tooltip
                  contentStyle={{ backgroundColor: 'rgba(19, 24, 21, 0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', fontSize: '13px', boxShadow: '0 8px 32px rgba(0,0,0,0.5)', backdropFilter: 'blur(12px)' }}
                  itemStyle={{ color: '#ffffff', fontWeight: 'bold' }}
                  labelStyle={{ color: '#A7B3AB', marginBottom: '8px' }}
                />
                <Legend verticalAlign="top" height={40} iconType="circle" wrapperStyle={{ fontSize: '13px', color: '#fff', opacity: 0.8 }} />
                <Area type="monotone" name="عادات جيدة" dataKey="عادات جيدة" stroke="#4ADE80" strokeWidth={3} fillOpacity={1} fill="url(#colorGood)" activeDot={{ r: 6, fill: '#4ADE80', stroke: '#131815', strokeWidth: 3 }} />
                <Area type="monotone" name="تجنب سيئة" dataKey="تجنب سيئة" stroke="#EF4444" strokeWidth={3} fillOpacity={1} fill="url(#colorBad)" activeDot={{ r: 6, fill: '#EF4444', stroke: '#131815', strokeWidth: 3 }} />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="glass rounded-3xl p-6 border border-border relative overflow-hidden group">
          <div className="absolute inset-0 bg-gradient-to-bl from-blue-500/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none" />
          <h3 className="text-sm font-bold text-foreground mb-6 flex items-center gap-2">
            <div className="p-1.5 bg-blue-500/10 rounded-lg">
              <BarChart3 size={16} className="text-blue-400" />
            </div>
            أداء كل عادة هذا الشهر
          </h3>
          <div className="h-[260px] w-full relative z-10" dir="ltr">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={habitStats} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.06)" vertical={false} />
                <XAxis
                  dataKey="icon"
                  stroke="rgba(255,255,255,0.4)"
                  fontSize={16}
                  tickMargin={12}
                  axisLine={false}
                  tickLine={false}
                />
                <YAxis stroke="rgba(255,255,255,0.4)" fontSize={11} axisLine={false} tickLine={false} allowDecimals={false} />
                <Tooltip
                  cursor={{ fill: 'rgba(255, 255, 255, 0.03)' }}
                  contentStyle={{ backgroundColor: 'rgba(19, 24, 21, 0.95)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', fontSize: '13px', boxShadow: '0 8px 32px rgba(0,0,0,0.5)', backdropFilter: 'blur(12px)' }}
                  labelStyle={{ color: '#8B9A90', marginBottom: '6px' }}
                  itemStyle={{ color: '#fff', fontWeight: 'bold' }}
                  formatter={(value: number) => [`${value} مرة`, "الإنجاز"]}
                />
                <Bar dataKey="checkins" radius={[8, 8, 0, 0]} maxBarSize={45}>
                  {habitStats.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={HABIT_COLORS[entry.color] || '#4ADE80'} fillOpacity={0.9} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="glass rounded-3xl p-6 md:p-8 border border-border relative overflow-hidden"
        >
          <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-500/10 blur-[100px] rounded-full pointer-events-none" />
          
          <div className="flex items-center justify-between mb-8 relative z-10">
            <h3 className="text-base font-bold text-foreground flex items-center gap-3">
              <div className="p-2 bg-foreground/5 rounded-xl border border-border">
                <Calendar size={18} className="text-foreground/80" />
              </div>
              مقارنة الأداء بالشهور
            </h3>
            <div className="flex items-center gap-2" data-html2canvas-ignore>
              {monthsStats.length > 2 && (
                <button 
                  onClick={() => setShowMoreMonths(!showMoreMonths)}
                  className="text-xs text-blue-300 hover:text-foreground font-bold bg-blue-500/10 hover:bg-blue-500/20 px-4 py-2 rounded-full border border-blue-500/20 transition-all duration-300 shadow-[0_0_15px_rgba(59,130,246,0.15)]"
                >
                  {showMoreMonths ? "عرض أقل" : "عرض المزيد"}
                </button>
              )}
            </div>
          </div>

          <div className="space-y-6 relative z-10">
            {monthsStats.slice(0, showMoreMonths ? monthsStats.length : 2).map((mStat, idx) => (
              <div key={idx} className="group">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-sm font-medium text-foreground/90 flex items-center gap-2">
                    {mStat.name} 
                    {mStat.isRealCurrent && <span className="text-[10px] bg-green-500/20 text-green-400 px-2 py-0.5 rounded-full font-bold">الحالي</span>}
                    {mStat.limited && !mStat.isRealCurrent && <span className="text-xs text-foreground/40">(حتى اليوم {mStat.limitDay})</span>}
                  </span>
                  <div className="flex items-center gap-3">
                    <span className={`text-base font-black ${idx === 0 ? 'text-green-400' : 'text-blue-400'} drop-shadow-md flex items-baseline gap-1`}>
                      {mStat.limitedScore} 
                      <span className="text-[11px] text-foreground/40 font-normal">/ {mStat.maxPossible} إنجاز</span>
                    </span>
                    {mStat.totalScore > mStat.limitedScore && (
                      <span className="text-xs text-foreground/30 hidden sm:inline-block bg-foreground/5 px-2 py-1 rounded-md">إجمالي الشهر: {mStat.totalScore}</span>
                    )}
                  </div>
                </div>
                <div className="h-5 bg-background rounded-full overflow-hidden p-1 shadow-inner border border-border">
                  <motion.div
                    className={`h-full rounded-full relative overflow-hidden ${idx === 0 ? 'bg-gradient-to-r from-green-500 to-emerald-400' : 'bg-gradient-to-r from-blue-500 to-cyan-400'}`}
                    style={{
                      boxShadow: idx === 0 ? '0 0 15px rgba(74,222,128,0.4)' : '0 0 15px rgba(59,130,246,0.4)'
                    }}
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min((mStat.limitedScore / mStat.maxPossible) * 100, 100)}%` }}
                    transition={{ duration: 1, ease: "easeOut", delay: 0.5 + (idx * 0.1) }}
                  >
                    <div className="absolute inset-0 bg-[linear-gradient(45deg,rgba(255,255,255,0.15)_25%,transparent_25%,transparent_50%,rgba(255,255,255,0.15)_50%,rgba(255,255,255,0.15)_75%,transparent_75%,transparent_100%)] bg-[length:16px_16px] opacity-50" />
                  </motion.div>
                </div>
              </div>
            ))}
          </div>
        </motion.div>
      </motion.div>
    </>
  );
}

