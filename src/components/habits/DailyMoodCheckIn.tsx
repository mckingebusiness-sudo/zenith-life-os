import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { toast } from "sonner";
import { Sparkles, Loader2 } from "lucide-react";
import { supabase } from "@/lib/supabase";

const MOODS = [
  { score: 1, emoji: "😫", label: "مُرهق", color: "bg-red-500/20 text-red-400 border-red-500/30", glow: "shadow-[0_0_15px_rgba(239,68,68,0.4)]" },
  { score: 2, emoji: "😕", label: "مُحبط", color: "bg-orange-500/20 text-orange-400 border-orange-500/30", glow: "shadow-[0_0_15px_rgba(249,115,22,0.4)]" },
  { score: 3, emoji: "😐", label: "عادي", color: "bg-yellow-500/20 text-yellow-400 border-yellow-500/30", glow: "shadow-[0_0_15px_rgba(234,179,8,0.4)]" },
  { score: 4, emoji: "🙂", label: "جيد", color: "bg-lime-500/20 text-lime-400 border-lime-500/30", glow: "shadow-[0_0_15px_rgba(132,204,22,0.4)]" },
  { score: 5, emoji: "🤩", label: "ممتاز", color: "bg-green-500/20 text-green-400 border-green-500/30", glow: "shadow-[0_0_15px_rgba(34,197,94,0.4)]" },
];

export function DailyMoodCheckIn() {
  const [selectedMood, setSelectedMood] = useState<number | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [isVisible, setIsVisible] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    let isMounted = true;
    
    const checkVisibility = async () => {
      const now = new Date();
      if (now.getHours() < 18) {
        if (isMounted) setIsVisible(false);
        return;
      }
      
      const todayStr = now.toISOString().split("T")[0];
      
      const { data: authData } = await supabase.auth.getSession();
      if (!authData.session) return;
      const userId = authData.session.user.id;
      
      const { data, error } = await supabase
        .from('daily_moods')
        .select('id')
        .eq('user_id', userId)
        .eq('day_local', todayStr)
        .single();
        
      if (!data && isMounted) {
        setIsVisible(true);
      } else if (isMounted) {
        setIsVisible(false);
      }
    };

    checkVisibility();
    const interval = setInterval(checkVisibility, 60000); // Check every minute
    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  const handleSelect = async (score: number) => {
    setSelectedMood(score);
    setIsProcessing(true);
    
    const moodMap: Record<number, string> = {
      1: 'tired',
      2: 'sad',
      3: 'neutral',
      4: 'happy',
      5: 'energetic'
    };
    
    const todayStr = new Date().toISOString().split("T")[0];
    const { data: authData } = await supabase.auth.getSession();
    if (authData.session) {
      await supabase.from('daily_moods').upsert({
        user_id: authData.session.user.id,
        day_local: todayStr,
        mood: moodMap[score] || 'neutral'
      }, { onConflict: 'user_id, day_local' });
    }
    
    // Simulate AI processing
    setTimeout(() => {
      setIsProcessing(false);
      setIsSubmitted(true);
      setIsVisible(false);
      
      toast.success("تم تسجيل حالتك المزاجية! سيقوم الذكاء الاصطناعي بتحليلها مع عاداتك.", {
        icon: <Sparkles className="text-blue-400" />
      });
    }, 1500);
  };

  if (!isVisible && !isSubmitted) return null;
  if (isSubmitted) return null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      className="relative overflow-hidden rounded-3xl border border-white/10 p-1 print:hidden shadow-[0_0_40px_rgba(59,130,246,0.15)] mb-8"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-indigo-500/10 via-purple-500/5 to-blue-500/10" />
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/stardust.png')] opacity-20 mix-blend-overlay" />
      
      <div className="relative glass bg-black/40 backdrop-blur-2xl rounded-[22px] p-6 sm:p-8 flex flex-col items-center border border-white/5">
        <div className="absolute top-0 inset-x-0 h-px bg-gradient-to-r from-transparent via-blue-400/50 to-transparent" />
        
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="flex flex-col items-center text-center mb-8"
        >
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-300 text-xs font-bold mb-4">
            <Sparkles size={14} />
            تحليل زينيث الذكي
          </div>
          <h2 className="text-2xl sm:text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-white/60 mb-2">
            كيف تقيم يومك حتى الآن؟
          </h2>
          <p className="text-sm text-zinc-400 max-w-md">
            شاركنا حالتك المزاجية ليقوم الذكاء الاصطناعي بربطها مع أدائك لتقديم نصائح مخصصة تزيد من إنتاجيتك.
          </p>
        </motion.div>

        <div className="flex items-center justify-center gap-3 sm:gap-6 flex-wrap w-full max-w-2xl">
          {MOODS.map((mood, i) => (
            <motion.button
              key={mood.score}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 + i * 0.1 }}
              whileHover={{ scale: 1.05, y: -5 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => handleSelect(mood.score)}
              disabled={isProcessing}
              className={`relative flex flex-col items-center p-4 sm:p-5 rounded-2xl border transition-all duration-500 w-[72px] sm:w-[90px] group overflow-hidden ${
                selectedMood === mood.score 
                  ? `${mood.color} ${mood.glow} scale-110 z-10 border-opacity-100` 
                  : selectedMood !== null
                    ? "bg-white/5 border-white/5 opacity-50 grayscale"
                    : "bg-white/5 border-white/10 hover:bg-white/15"
              }`}
            >
              {selectedMood === mood.score && (
                <motion.div 
                  layoutId="activeGlow"
                  className="absolute inset-0 bg-current opacity-10"
                />
              )}
              
              <span className={`text-3xl sm:text-4xl mb-3 transition-transform duration-500 ${selectedMood === mood.score ? 'scale-110' : 'group-hover:scale-110'}`}>
                {mood.emoji}
              </span>
              <span className={`text-[11px] sm:text-xs font-bold tracking-wide ${selectedMood === mood.score ? 'opacity-100' : 'opacity-70 group-hover:opacity-100'}`}>
                {mood.label}
              </span>
            </motion.button>
          ))}
        </div>

        <AnimatePresence>
          {isProcessing && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="flex flex-col items-center justify-center text-blue-400 gap-3 mt-6"
            >
              <Loader2 className="animate-spin" size={24} />
              <p className="text-sm font-medium animate-pulse">يتم تحليل أنماطك اليومية...</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}
