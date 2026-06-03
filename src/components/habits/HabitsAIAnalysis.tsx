import { useState, useEffect, useMemo } from "react";
import { motion } from "framer-motion";
import { Brain, AlertTriangle, Sparkles, Loader2, ArrowRight } from "lucide-react";
import { getLocalDateString } from "@/lib/habitCalculations";
import { generateMoodAnalysis } from "@/lib/gemini";
import { supabase } from "@/lib/supabase";
import { getAiAnalysisDataset } from "@/lib/habitAnalyticsEngine";

export function HabitsAIAnalysis({ habits, monthlyData }: { habits: any[], monthlyData: any[] }) {
  const [analysis, setAnalysis] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Derive a stable hash to prevent redundant AI calls on every React Query refetch
  const habitsHash = useMemo(() => {
    return habits.map(h => `${h.id}-${h.streak?.current_streak}-${!!h.checkedToday}-${!!h.frozenToday}`).join('|');
  }, [habits]);

  useEffect(() => {
    async function fetchAnalysis() {
      setIsLoading(true);
      
      let moodStr = "Not recorded today";
      const { data: authData } = await supabase.auth.getSession();
      
      if (authData.session) {
        const todayLocal = getLocalDateString();
        const { data: moodData } = await supabase
          .from('daily_moods')
          .select('mood')
          .eq('user_id', authData.session.user.id)
          .eq('day_local', todayLocal)
          .single();
          
        if (moodData) {
          moodStr = moodData.mood;
        }
      }

      const dataset = getAiAnalysisDataset(habits);
      const data = {
        ...dataset,
        moodStats: moodStr
      };
      
      try {
        const result = await generateMoodAnalysis(data);
        setAnalysis(result);
      } catch (error) {
        console.error("Failed to generate AI analysis:", error);
        setAnalysis(null);
      } finally {
        setIsLoading(false);
      }
    }

    fetchAnalysis();
  }, [habitsHash]);

  if (isLoading) {
    return (
      <div className="mb-6 relative overflow-hidden rounded-3xl border border-white/10 p-[1px] shadow-[0_0_30px_rgba(139,92,246,0.1)] min-h-[150px] flex items-center justify-center">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-500/20 via-blue-500/10 to-transparent" />
        <div className="flex flex-col items-center gap-3 text-purple-400 relative z-10">
          <Loader2 className="animate-spin" size={28} />
          <p className="text-sm font-medium animate-pulse">يقوم الذكاء الاصطناعي بتحليل بياناتك المعقدة...</p>
        </div>
      </div>
    );
  }

  if (!analysis) return null;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
      {/* Mood Analysis */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="glass rounded-3xl p-6 border border-white/[0.06] relative overflow-hidden shadow-[0_0_20px_rgba(139,92,246,0.05)]"
      >
        <div className="absolute top-0 right-0 p-4 opacity-10 pointer-events-none">
          <Brain size={100} />
        </div>
        <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2 relative z-10">
          <span className="text-pink-400 text-lg">😊</span> تحليل الذكاء الاصطناعي للمزاج
          <Sparkles size={14} className="text-blue-400" />
        </h3>
        <div className="flex flex-col gap-4 relative z-10">
          <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-green-500/20 text-green-400 rounded-xl flex items-center justify-center text-xl shrink-0">😄</div>
              <div>
                <div className="text-sm font-bold text-white">أيام السعادة والنشاط</div>
                <div className="text-xs text-white/70 mt-1">{analysis?.mood?.happy}</div>
              </div>
            </div>
          </div>
          <div className="flex items-center justify-between p-4 bg-white/5 rounded-2xl border border-white/5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-red-500/20 text-red-400 rounded-xl flex items-center justify-center text-xl shrink-0">😫</div>
              <div>
                <div className="text-sm font-bold text-white">أيام التعب والإرهاق</div>
                <div className="text-xs text-white/70 mt-1">{analysis?.mood?.tired}</div>
              </div>
            </div>
          </div>
          <p className="text-xs text-orange-400 mt-1">نصيحة AI: {analysis?.mood?.advice}</p>
        </div>
      </motion.div>

      {/* Best Time Analysis */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.35 }}
        className="glass rounded-3xl p-6 border border-white/[0.06] relative overflow-hidden shadow-[0_0_20px_rgba(139,92,246,0.05)]"
      >
        <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2 relative z-10">
          <span className="text-amber-400 text-lg">⏳</span> أفضل وقت لإنجاز العادات (AI)
          <Sparkles size={14} className="text-blue-400" />
        </h3>
        <div className="flex flex-col gap-4 relative z-10">
          <div className="relative pt-4">
            <div className="flex items-end justify-between mb-2">
              <div className="text-center" style={{ opacity: Math.max(0.3, analysis?.time?.morning / 100) }}>
                <div className="text-2xl mb-1">🌅</div>
                <div className="text-[10px] text-white/50">الصباح</div>
                <div className="text-sm font-bold text-green-400 mt-1">{analysis?.time?.morning}%</div>
              </div>
              <div className="text-center" style={{ opacity: Math.max(0.3, analysis?.time?.afternoon / 100) }}>
                <div className="text-2xl mb-1">☀️</div>
                <div className="text-[10px] text-white/50">الظهر</div>
                <div className="text-sm font-bold text-white mt-1">{analysis?.time?.afternoon}%</div>
              </div>
              <div className="text-center" style={{ opacity: Math.max(0.3, analysis?.time?.evening / 100) }}>
                <div className="text-2xl mb-1">🌙</div>
                <div className="text-[10px] text-white/50">المساء</div>
                <div className="text-sm font-bold text-white mt-1">{analysis?.time?.evening}%</div>
              </div>
            </div>
            <div className="h-2 w-full bg-white/5 rounded-full overflow-hidden flex">
              <div className="h-full bg-green-400 transition-all duration-1000" style={{ width: `${analysis?.time?.morning}%` }}></div>
              <div className="h-full bg-white/20 transition-all duration-1000" style={{ width: `${analysis?.time?.afternoon}%` }}></div>
              <div className="h-full bg-white/10 transition-all duration-1000" style={{ width: `${analysis?.time?.evening}%` }}></div>
            </div>
          </div>
          <p className="text-xs text-blue-400 mt-3 p-3 bg-blue-500/10 rounded-xl border border-blue-500/20 leading-relaxed">
            {analysis?.time?.advice}
          </p>
        </div>
      </motion.div>
    </div>
  );
}
