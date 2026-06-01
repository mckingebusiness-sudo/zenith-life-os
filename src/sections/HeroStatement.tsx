import { motion } from "framer-motion";
import { useEffect, useState } from "react";
import { Play, Sparkles } from "lucide-react";
import { useTranslation } from "react-i18next";
import { useDirection } from "@/stores/useDirection";

export default function HeroStatement() {
  const [score, setScore] = useState(0);
  const { t } = useTranslation();
  const { dir } = useDirection();

  useEffect(() => {
    let raf = 0;
    const start = performance.now();
    const tick = (t: number) => {
      const p = Math.min((t - start) / 1200, 1);
      const eased = 1 - Math.pow(1 - p, 3);
      setScore(Math.round(83 * eased));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, []);

  return (
    <section className="relative grid grid-cols-1 md:grid-cols-[420px_1fr] gap-12 items-center min-h-[440px] py-8">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.8, delay: 0.4 }}
        className={`relative flex items-center justify-center ${dir === 'rtl' ? 'md:order-last' : ''}`}
      >
        <LifeScoreRings value={83} />
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className="text-[96px] font-extrabold leading-none tabular text-grad-green">
            {score}
          </div>
          <div className="text-[10px] uppercase tracking-[0.25em] text-muted-foreground mt-1">
            {t('hero.lifeScore')}
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
          {t('hero.bestDays').replace(t('hero.bestDaysHighlight'), '')}
          <span className="text-grad-green">{t('hero.bestDaysHighlight')}</span>
          {t('hero.bestDays').endsWith('.') ? '.' : ''}
        </motion.h1>

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
          className="text-[17px] leading-[1.7] text-muted-foreground max-w-[540px]"
        >
          {t('hero.productivity')}
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
            className="px-7 py-3.5 rounded-2xl font-semibold text-[14px] flex items-center gap-2 transition hover:scale-[1.02] text-foreground"
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

function LifeScoreRings({ value }: { value: number }) {
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
      {arc(125, 72, "#22C55E", 4)}
      <circle cx="180" cy="180" r="105" stroke="var(--border)" strokeWidth="3" fill="none" />
      {arc(105, 60, "#A7C957", 3)}
    </svg>
  );
}