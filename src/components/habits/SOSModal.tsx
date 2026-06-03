import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Heart, Shield, Activity, Timer, Flame } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

interface SOSModalProps {
  isOpen: boolean;
  onClose: () => void;
  motivationalMessage?: string | null;
  habitId: string;
  habitTitle: string;
}

const DISTRACTIONS = [
  "قم بالمشي لمدة 10 دقائق",
  "اشرب كوباً كبيراً من الماء",
  "تحدث مع شخص مقرب",
  "العب لعبة على هاتفك",
  "مارس تمارين الضغط 10 مرات",
  "اكتب أفكارك في ورقة"
];

export function SOSModal({ isOpen, onClose, motivationalMessage, habitId, habitTitle }: SOSModalProps) {
  const [phase, setPhase] = useState<"inhale" | "hold" | "exhale">("inhale");
  const [timer, setTimer] = useState(5 * 60); // 5 minutes countdown
  
  const [urgeIntensity, setUrgeIntensity] = useState(5);
  const [urgeNote, setUrgeNote] = useState("");
  const [urgeLoading, setUrgeLoading] = useState(false);
  const [isLogged, setIsLogged] = useState(false);
  
  // Why Wall Items
  const [whyItems, setWhyItems] = useState<{ id: string; content: string }[]>([]);

  useEffect(() => {
    if (isOpen && habitId) {
      // Load Why Wall
      supabase.from("habit_why_wall").select("id, content").eq("habit_id", habitId).then(({ data }) => {
        if (data) setWhyItems(data);
      });
      // Reset state
      setIsLogged(false);
      setUrgeIntensity(5);
      setUrgeNote("");
      setTimer(5 * 60);
    }
  }, [isOpen, habitId]);
  
  useEffect(() => {
    if (!isOpen) return;
    
    // Breathing cycle: 4s inhale, 7s hold, 8s exhale
    let phaseTimer: NodeJS.Timeout;
    const runCycle = () => {
      setPhase("inhale");
      phaseTimer = setTimeout(() => {
        setPhase("hold");
        phaseTimer = setTimeout(() => {
          setPhase("exhale");
          phaseTimer = setTimeout(runCycle, 8000);
        }, 7000);
      }, 4000);
    };
    
    runCycle();
    
    // 5 min countdown timer
    const countdown = setInterval(() => {
      setTimer(t => (t > 0 ? t - 1 : 0));
    }, 1000);
    
    return () => {
      clearTimeout(phaseTimer);
      clearInterval(countdown);
    };
  }, [isOpen]);

  const logUrge = async () => {
    try {
      setUrgeLoading(true);
      const { data: auth } = await supabase.auth.getSession();
      if (!auth.session) throw new Error("No session");
      
      // Also log the SOS Session itself
      await supabase.from("habit_sos_sessions").insert({
        habit_id: habitId,
        user_id: auth.session.user.id,
        duration_seconds: (5 * 60) - timer,
        success: true
      });

      await supabase.from("habit_urge_logs").insert({
        habit_id: habitId,
        user_id: auth.session.user.id,
        intensity: urgeIntensity,
        note: urgeNote,
        trigger: "SOS Modal"
      });
      
      setIsLogged(true);
      toast.success("تم تسجيل مستوى الرغبة. تذكر أنك أقوى!");
    } catch (e) {
      console.error(e);
      toast.error("حدث خطأ أثناء التسجيل");
    } finally {
      setUrgeLoading(false);
    }
  };

  if (!isOpen) return null;

  const getBreathingText = () => {
    switch (phase) {
      case "inhale": return "شهيق... (4)";
      case "hold": return "احبس أنفاسك... (7)";
      case "exhale": return "زفير ببطء... (8)";
    }
  };

  const getCircleScale = () => {
    switch (phase) {
      case "inhale": return 1.5;
      case "hold": return 1.5;
      case "exhale": return 1;
    }
  };

  const getTransitionDuration = () => {
    switch (phase) {
      case "inhale": return 4;
      case "hold": return 0;
      case "exhale": return 8;
    }
  };

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-8">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/80 backdrop-blur-md"
            onClick={onClose}
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="relative w-full max-w-5xl bg-[#0a0a0a] border border-red-500/30 shadow-2xl shadow-red-900/20 rounded-3xl overflow-hidden flex flex-col md:flex-row max-h-[90vh] md:max-h-[800px]"
          >
            {/* Left Panel: Breathing & Timer */}
            <div className="flex-1 p-8 md:p-12 flex flex-col items-center justify-center relative overflow-hidden bg-gradient-to-br from-zinc-950 to-zinc-900 border-b md:border-b-0 md:border-l border-white/5 shrink-0">
              <button 
                onClick={onClose}
                className="absolute top-6 left-6 p-2 bg-white/5 hover:bg-white/10 rounded-full text-white/50 hover:text-white transition z-20"
              >
                <X size={24} />
              </button>
              
              <div className="absolute top-6 right-6 flex items-center gap-2 px-4 py-2 bg-red-500/10 text-red-400 rounded-full border border-red-500/20 font-mono text-xl z-20">
                <Timer size={20} />
                {Math.floor(timer / 60).toString().padStart(2, '0')}:{(timer % 60).toString().padStart(2, '0')}
              </div>
              
              <div className="relative w-64 h-64 flex items-center justify-center mt-12 md:mt-0">
                <motion.div
                  className="absolute inset-0 rounded-full border-2 border-red-500/20"
                  animate={{ scale: getCircleScale(), opacity: phase === 'hold' ? 0.8 : 0.3 }}
                  transition={{ duration: getTransitionDuration(), ease: "easeInOut" }}
                />
                <motion.div
                  className="absolute inset-4 rounded-full bg-gradient-to-tr from-red-600/20 to-orange-500/20 backdrop-blur-3xl"
                  animate={{ scale: getCircleScale() }}
                  transition={{ duration: getTransitionDuration(), ease: "easeInOut" }}
                />
                <div className="relative z-10 flex flex-col items-center pointer-events-none">
                  <Shield size={48} className="text-red-400 mb-4 opacity-50" />
                  <h3 className="text-2xl font-bold text-white mb-2">{getBreathingText()}</h3>
                  <p className="text-red-300/60 text-sm">تقنية 4-7-8 للاسترخاء</p>
                </div>
              </div>
            </div>

            {/* Right Panel: Motivation & Distractions & Logging */}
            <div className="flex-1 p-8 md:p-12 flex flex-col bg-zinc-900/50 overflow-y-auto custom-scrollbar">
              <div className="mb-8">
                <h2 className="text-3xl font-bold text-white mb-2">وضع الطوارئ (SOS)</h2>
                <p className="text-zinc-400 text-lg">أنت تحاول مقاومة: <span className="text-red-400">{habitTitle}</span></p>
              </div>

              {motivationalMessage && (
                <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-6 relative overflow-hidden shrink-0">
                  <div className="absolute top-0 right-0 p-4 opacity-10">
                    <Heart size={64} />
                  </div>
                  <h4 className="text-white/50 text-sm font-semibold mb-2 uppercase tracking-wider">رسالة لنفسك</h4>
                  <p className="text-xl text-white font-medium leading-relaxed">"{motivationalMessage}"</p>
                </div>
              )}

              {/* WHY WALL */}
              {whyItems.length > 0 && (
                <div className="mb-6 shrink-0">
                  <h4 className="text-white/50 text-sm font-semibold mb-3 uppercase tracking-wider">تذكر لماذا بدأت</h4>
                  <div className="flex flex-col gap-2">
                    {whyItems.map((item) => (
                      <div key={item.id} className="p-3 bg-red-500/5 border border-red-500/10 rounded-xl text-red-200 text-sm">
                        • {item.content}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* DISTRACTIONS */}
              <div className="mb-8 shrink-0">
                <h4 className="text-white/50 text-sm font-semibold mb-4 uppercase tracking-wider">افعل شيئاً من هذا الآن لتشتيت ذهنك</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {DISTRACTIONS.map((item, i) => (
                    <div key={i} className="flex items-center gap-3 p-4 bg-black/20 border border-white/5 rounded-xl text-zinc-300 hover:bg-white/5 transition cursor-default">
                      <Activity size={18} className="text-red-400/70" />
                      <span className="text-sm">{item}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* URGE LOGGER */}
              <div className="bg-white/5 rounded-2xl p-6 border border-white/10 mt-auto shrink-0">
                <h4 className="text-white font-bold mb-4 flex items-center gap-2">
                  <Flame size={18} className="text-orange-500" />
                  سجل شدة هذه الرغبة
                </h4>
                
                {!isLogged ? (
                  <>
                    <div className="flex items-center gap-4 mb-4">
                      <span className="text-xs text-white/40">خفيفة</span>
                      <input 
                        type="range" 
                        min="1" max="10" 
                        value={urgeIntensity}
                        onChange={(e) => setUrgeIntensity(Number(e.target.value))}
                        className="flex-1 accent-orange-500"
                      />
                      <span className="text-xs text-red-400/80">شديدة جداً ({urgeIntensity}/10)</span>
                    </div>
                    
                    <textarea 
                      placeholder="بم تشعر الآن؟ ما الذي حفز هذه الرغبة؟ (اختياري)"
                      value={urgeNote}
                      onChange={(e) => setUrgeNote(e.target.value)}
                      className="w-full bg-black/40 border border-white/10 rounded-xl p-3 text-sm text-white placeholder:text-white/20 mb-4 h-20 resize-none"
                    />
                    
                    <button 
                      onClick={logUrge}
                      disabled={urgeLoading}
                      className="w-full py-3 bg-white/10 hover:bg-white/20 text-white rounded-xl font-bold transition disabled:opacity-50"
                    >
                      {urgeLoading ? "جاري التسجيل..." : "تسجيل الموقف للتعلم منه"}
                    </button>
                  </>
                ) : (
                  <div className="text-center p-4 bg-green-500/10 text-green-400 rounded-xl border border-green-500/20">
                    تم التسجيل بنجاح. لقد انتصرت في هذه المعركة!
                  </div>
                )}
              </div>
              
              <button 
                onClick={onClose}
                className="mt-4 w-full py-4 bg-red-600 hover:bg-red-500 text-white rounded-xl font-bold text-lg shadow-lg shadow-red-900/50 transition active:scale-[0.98] shrink-0"
              >
                أنا بخير، يمكنني إغلاق هذه النافذة
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
