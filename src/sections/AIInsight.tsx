import { Sparkles, Check, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";
import { useHabits } from "@/hooks/useHabits";
import { getAiAnalysisDataset } from "@/lib/habitAnalyticsEngine";
import { generateDashboardInsight } from "@/lib/gemini";
import { getLocalDateString } from "@/lib/habitCalculations";

export default function AIInsight() {
  const { habits } = useHabits();
  const [insight, setInsight] = useState<string | null>(null);
  const [typed, setTyped] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const todayStr = getLocalDateString();
    const stored = localStorage.getItem("zenith_daily_insight");
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        if (parsed.date === todayStr && parsed.text) {
          setInsight(parsed.text);
          return;
        }
      } catch (e) {}
    }
  }, []);

  useEffect(() => {
    if (!insight) return;
    let i = 0;
    const id = setInterval(() => {
      i++;
      setTyped(insight.slice(0, i));
      if (i >= insight.length) clearInterval(id);
    }, 22);
    return () => clearInterval(id);
  }, [insight]);

  const generateInsight = async () => {
    setIsLoading(true);
    const dataset = getAiAnalysisDataset(habits);
    const res = await generateDashboardInsight(dataset);
    setIsLoading(false);
    if (res) {
      setInsight(res);
      localStorage.setItem("zenith_daily_insight", JSON.stringify({
        date: getLocalDateString(),
        text: res
      }));
    } else {
      // Fallback
      setInsight("البيانات الحالية لا تكفي لاستنتاج دقيق، استمر في تتبع عاداتك وسأراقب تقدمك.");
    }
  };

  return (
    <motion.section
      whileHover={{ y: -2 }}
      className="rounded-3xl p-7 h-full relative overflow-hidden bg-card"
      style={{
        border: "1px solid rgba(34,197,94,0.22)",
        boxShadow: "0 0 32px rgba(34,197,94,0.12)",
      }}
    >
      <motion.div
        aria-hidden
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "radial-gradient(600px circle at var(--mx,70%) var(--my,30%), rgba(74,222,128,0.10), transparent 50%)",
        }}
        animate={{ opacity: [0.6, 1, 0.6] }}
        transition={{ duration: 5, repeat: Infinity, ease: "easeInOut" }}
      />
      {[0, 1, 2, 3, 4].map((i) => (
        <motion.div
          key={i}
          className="absolute w-1 h-1 rounded-full bg-green-400"
          style={{ left: `${60 + i * 7}%`, top: `${15 + i * 12}%`, boxShadow: "0 0 8px #4ADE80" }}
          animate={{ y: [0, -14, 0], opacity: [0.2, 0.9, 0.2], x: [0, i % 2 ? 6 : -6, 0] }}
          transition={{ duration: 3 + i * 0.6, repeat: Infinity, ease: "easeInOut" }}
        />
      ))}

      <div className="flex items-center gap-3 mb-4 relative z-10">
        <motion.div
          animate={{ rotate: [0, 8, -6, 0], scale: [1, 1.06, 1] }}
          transition={{ duration: 4, repeat: Infinity }}
          className="w-9 h-9 rounded-full flex items-center justify-center text-white shrink-0"
          style={{
            background: "linear-gradient(135deg, #15803D, #4ADE80)",
            boxShadow: "0 0 20px rgba(34,197,94,0.5)",
          }}
        >
          <Sparkles size={14} />
        </motion.div>
        <div>
          <div className="text-sm font-bold text-foreground">رؤية زينيث AI</div>
          <div className="text-[10px] text-muted-foreground">{insight ? "تم التحليل بنجاح" : "جاهز للتحليل"}</div>
        </div>
      </div>

      <div className="min-h-[110px] relative z-10 flex flex-col justify-center">
        {!insight && !isLoading ? (
          <div className="text-center">
            <p className="text-sm text-muted-foreground mb-4">احصل على استنتاج يومي دقيق مبني على تقدمك في عاداتك الحالية.</p>
            <button
              onClick={generateInsight}
              className="px-5 py-2.5 rounded-xl text-[13px] font-semibold flex items-center gap-2 mx-auto transition hover:scale-[1.02] text-white"
              style={{
                background: "linear-gradient(135deg, #15803D, #22C55E)",
                boxShadow: "0 0 20px rgba(34,197,94,0.3)",
              }}
            >
              <Sparkles size={14} />
              تحليل يومي
            </button>
          </div>
        ) : isLoading ? (
          <div className="flex flex-col items-center justify-center gap-2 text-green-400 opacity-80">
            <Loader2 className="animate-spin" size={24} />
            <span className="text-xs font-medium">يتم استنتاج الأنماط...</span>
          </div>
        ) : (
          <p className="text-[15px] leading-[1.8] text-foreground max-w-[480px]">
            {typed}
            {(insight && typed.length < insight.length) && (
              <motion.span
                animate={{ opacity: [1, 0, 1] }}
                transition={{ duration: 0.8, repeat: Infinity }}
                className="inline-block w-1.5 h-4 bg-green-400 ml-0.5 align-middle"
              />
            )}
          </p>
        )}
      </div>
    </motion.section>
  );
}