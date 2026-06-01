import { useEffect, useState } from "react";
import { Sparkles, Brain, Trophy } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export function AITicker({ habits }: { habits: any[] }) {
  const [insight, setInsight] = useState<string>("جاري تحليل بياناتك اليومية...");
  
  useEffect(() => {
    // Generate simple local insights based on habits data instead of calling API every time to save costs
    const generateLocalInsight = () => {
      const goodHabits = habits.filter(h => h.habit_type !== 'quit');
      const badHabits = habits.filter(h => h.habit_type === 'quit');
      
      const goodStreaks = goodHabits.filter(h => h.streak?.current_streak > 2);
      const badAvoided = badHabits.filter(h => h.streak?.current_streak >= 3);
      
      const messages = [];
      
      if (badAvoided.length > 0) {
        messages.push(`🔥 بطل! لقد تجنبت "${badAvoided[0].title}" لـ ${badAvoided[0].streak.current_streak} أيام متتالية!`);
      }
      
      if (goodStreaks.length > 0) {
        messages.push(`✨ استمر في "${goodStreaks[0].title}"، أنت في سلسلة نجاح رائعة!`);
      }
      
      if (messages.length === 0) {
        messages.push("🎯 ابدأ يومك بقوة، كل عادة صغيرة تبني مستقبلك!");
        messages.push("💡 الذكاء الاصطناعي يراقب تطورك... استمر في الالتزام!");
      }
      
      setInsight(messages[Math.floor(Math.random() * messages.length)]);
    };
    
    generateLocalInsight();
    const interval = setInterval(generateLocalInsight, 10000); // Rotate every 10s
    return () => clearInterval(interval);
  }, [habits]);

  return (
    <div className="relative overflow-hidden glass border-t border-border py-3 px-4 mt-8 flex items-center justify-center rounded-2xl mx-auto max-w-4xl shadow-[0_0_15px_rgba(59,130,246,0.1)]">
      <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 via-purple-500/5 to-blue-500/5 animate-pulse" />
      <div className="relative flex items-center gap-3 w-full overflow-hidden">
        <Sparkles size={16} className="text-blue-400 shrink-0" />
        <AnimatePresence mode="wait">
          <motion.div
            key={insight}
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: -20, opacity: 0 }}
            transition={{ duration: 0.5 }}
            className="text-sm font-medium text-foreground/90 truncate flex-1 text-center"
          >
            {insight}
          </motion.div>
        </AnimatePresence>
        <Brain size={16} className="text-purple-400 shrink-0" />
      </div>
    </div>
  );
}
