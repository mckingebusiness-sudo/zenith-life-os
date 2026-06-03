import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState, useMemo } from "react";
import { Play, Sparkles, ChevronDown, Info } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useDirection } from "@/stores/useDirection";
import { useHabits } from "@/hooks/useHabits";
import { calculateLifeScore } from "@/lib/habitAnalyticsEngine";

export default function HeroStatement() {
  const [score, setScore] = useState(0);
  const [showMath, setShowMath] = useState(false);
  const { t } = useTranslation();
  const { dir } = useDirection();
  const { habits } = useHabits();

  const lifeMetrics = useMemo(() => calculateLifeScore(habits), [habits]);

  useEffect(() => {
    let raf = 0;
    const start = performance.now();
    const target = lifeMetrics.score || 0;
    const tick = (t: number) => {
      const p = Math.min((t - start) / 1200, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setScore(Math.round(target * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [lifeMetrics.score]);

  let headline = "مستواك مستقر، استمر";
  let subHeadline = "حافظ على أدائك وتقدم خطوة إضافية كل يوم.";
  if (lifeMetrics.score >= 80) {
    headline = "أنت في أفضل أيامك";
    subHeadline = "أداؤك استثنائي! استمر في دفع حدودك نحو القمة.";
  } else if (lifeMetrics.score < 40) {
    headline = "اليوم يحتاج إنقاذ";
    subHeadline = "بداية بطيئة لا تعني نهاية سيئة. قم بإنقاذ يومك الآن.";
  } else if (lifeMetrics.safetyScore < 50) {
    headline = "العادات السيئة في خطر";
    subHeadline = "احذر! أنت على وشك الانتكاس في عاداتك السلبية.";
  }

  return (
    <section className="relative grid grid-cols-1 md:grid-cols-[420px_1fr] gap-12 items-center min-h-[440px] py-8">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8, delay: 0.4 }}
        className={`relative flex flex-col items-center justify-center ${dir === 'rtl' ? 'md:order-last' : ''}`}
      >
        <div className="relative cursor-pointer" onClick={() => setShowMath(!showMath)}>
          <LifeScoreRings value={score} daily={lifeMetrics.dailyProgress} strength={lifeMetrics.strengthAverage} />
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className="text-[96px] font-extrabold leading-none tabular text-grad-green">
              {score}
            </div>
            <div className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground mt-1 flex items-center gap-1">
              {t('hero.lifeScore')} <ChevronDown size={12} className={`transition-transform ${showMath ? 'rotate-180' : ''}`} />
            </div>
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.6 }}
              className="mt-3 px-2.5 py-1 rounded-full text-[10px] font-semibold flex items-center gap-1"
              style={{
                background: "rgba(34,197,94,0.12)",
                border: "1px solid rgba(34,197,94,0.3)",
                color: "#4ADE80",
              }}
            >
              {t('hero.increase')}
            </motion.div>
          </div>
        </div>

        <AnimatePresence>
          {showMath && (
            <motion.div
              initial={{ opacity: 0, height: 0, y: -10 }}
              animate={{ opacity: 1, height: "auto", y: 0 }}
              exit={{ opacity: 0, height: 0, y: -10 }}
              className="mt-6 w-full max-w-sm overflow-hidden"
            >
              <div className="glass p-4 rounded-2xl border border-white/10 shadow-lg text-sm">
                <div className="flex items-center gap-2 mb-3 text-white/80 font-bold border-b border-white/10 pb-2">
                  <Info size={16} className="text-blue-400" />
                  كيف يتم حساب هذا الرقم؟
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">إنجاز اليوم (50%)</span>
                    <span className="text-green-400 font-bold">{lifeMetrics.dailyProgress}%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">متوسط القوة (25%)</span>
                    <span className="text-blue-400 font-bold">{lifeMetrics.strengthAverage}%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">أمان العادات السيئة (15%)</span>
                    <span className="text-orange-400 font-bold">{lifeMetrics.safetyScore}%</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">المسار الشهري (10%)</span>
                    <span className="text-purple-400 font-bold">{lifeMetrics.trendScore}%</span>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      <div className="space-y-6">
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.1 }}
          className="text-[11px] uppercase tracking-[0.2em] text-muted-foreground flex items-center gap-2"
        >
          <span className="w-1.5 h-1.5 rounded-full bg-green-400" />
          {t('hero.today')}
        </motion.div>

        <motion.h1
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
          className="text-[56px] font-extrabold leading-[1.05] tracking-tight text-foreground"
          style={{ letterSpacing: "-0.03em" }}
        >
          {headline.split(' ').map((word, i, arr) => (
            i === arr.length - 1 ? <span key={i} className="text-grad-green"> {word}</span> : <span key={i}> {word}</span>
          ))}
        </motion.h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="text-[17px] leading-[1.7] text-muted-foreground max-w-[540px]"
        >
          {subHeadline}
        </motion.p>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
          className="flex flex-wrap items-center gap-5 text-[12px] text-muted-foreground"
        >
          <Pill dot="#22C55E" label={`5/9 ${t('hero.tasks')}`} />
          <Pill dot="#F59E0B" label={`31 ${t('hero.days')}`} />
          <Pill dot="#A7C957" label={`64% ${t('hero.budget')}`} />
          <Pill dot="#4ADE80" label={`2 ${t('hero.aiMsgs')}`} />
        </motion.div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.8 }}
          className="flex flex-wrap items-center gap-3 pt-2"
        >
          <button
            className="px-7 py-3.5 rounded-2xl font-semibold text-[14px] flex items-center gap-2 transition hover:scale-[1.02] text-white"
            style={{
              background: "linear-gradient(135deg, #15803D 0%, #22C55E 100%)",
              boxShadow: "0 0 32px rgba(34,197,94,0.35), inset 0 1px 0 rgba(255,255,255,0.2)",
            }}
          >
            <Play size={14} fill="currentColor" />
            {t('hero.focusSession')}
          </button>
          <button
            className="px-5 py-3.5 rounded-2xl font-semibold text-[13px] flex items-center gap-2 transition"
            style={{
              border: "1px solid rgba(34,197,94,0.3)",
              color: "#4ADE80",
            }}
          >
            <Sparkles size={14} />
            {t('hero.aiSort')}
          </button>
        </motion.div>
      </div>
    </section>
  );
}

function Pill({ dot, label }: { dot: string; label: string }) {
  return (
    <div className="flex items-center gap-2">
      <span className="w-1.5 h-1.5 rounded-full" style={{ background: dot, boxShadow: `0 0 8px ${dot}` }} />
      <span className="font-medium tabular">{label}</span>
    </div>
  );
}

function LifeScoreRings({ value, daily = 72, strength = 60 }: { value: number; daily?: number; strength?: number }) {
  const arc = (r: number, pct: number, color: string, width = 6) => {
    const c = 2 * Math.PI * r;
    return (
      <motion.circle
        cx="180" cy="180" r={r}
        stroke={color} strokeWidth={width} fill="none" strokeLinecap="round"
        strokeDasharray={c}
        initial={{ strokeDashoffset: c }}
        animate={{ strokeDashoffset: c - (pct / 100) * c }}
        transition={{ duration: 1.4, delay: 0.4, ease: [0.65, 0, 0.35, 1] }}
      />
    );
  };
  return (
    <svg width="360" height="360" viewBox="0 0 360 360" className="-rotate-90">
      <defs>
        <linearGradient id="outerGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#15803D" />
          <stop offset="100%" stopColor="#4ADE80" />
        </linearGradient>
        <filter id="glow">
          <feGaussianBlur stdDeviation="4" result="b" />
          <feMerge><feMergeNode in="b" /><feMergeNode in="SourceGraphic" /></feMerge>
        </filter>
      </defs>
      <circle cx="180" cy="180" r="160" stroke="var(--border)" strokeWidth="1" fill="none" />
      <circle cx="180" cy="180" r="150" stroke="var(--border)" strokeWidth="6" fill="none" />
      <g filter="url(#glow)">
        {arc(150, value, "url(#outerGrad)", 6)}
      </g>
      <circle cx="180" cy="180" r="125" stroke="var(--border)" strokeWidth="4" fill="none" />
      {arc(125, daily, "#22C55E", 4)}
      <circle cx="180" cy="180" r="105" stroke="var(--border)" strokeWidth="3" fill="none" />
      {arc(105, strength, "#A7C957", 3)}
    </svg>
  );
}