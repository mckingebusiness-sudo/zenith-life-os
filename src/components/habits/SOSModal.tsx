import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Heart, Shield, Activity, Timer } from "lucide-react";

interface SOSModalProps {
  isOpen: boolean;
  onClose: () => void;
  motivationalMessage?: string | null;
  habitTitle: string;
}

const DISTRACTIONS = [
  "???? ????? ?? ????? ??????",
  "???? ??? ???? ????",
  "???? ???? 5 ?????",
  "???? ?????? ??????? ????",
  "????? ??? ???? ???? ????",
  "?? ??????? ??????? ???????"
];

export function SOSModal({ isOpen, onClose, motivationalMessage, habitTitle }: SOSModalProps) {
  const [phase, setPhase] = useState<"inhale" | "hold" | "exhale">("inhale");
  const [timer, setTimer] = useState(5 * 60); // 5 minutes countdown
  
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

  if (!isOpen) return null;

  const getBreathingText = () => {
    switch (phase) {
      case "inhale": return "????... (4)";
      case "hold": return "????? ???????... (7)";
      case "exhale": return "???? ????... (8)";
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-8">
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
            className="relative w-full max-w-4xl bg-zinc-950 border border-red-500/30 shadow-2xl shadow-red-900/20 rounded-3xl overflow-hidden flex flex-col md:flex-row h-full max-h-[800px]"
          >
            {/* Left Panel: Breathing & Timer */}
            <div className="flex-1 p-8 md:p-12 flex flex-col items-center justify-center relative overflow-hidden bg-gradient-to-br from-zinc-950 to-zinc-900 border-b md:border-b-0 md:border-l border-white/5">
              <button 
                onClick={onClose}
                className="absolute top-6 left-6 p-2 bg-white/5 hover:bg-white/10 rounded-full text-white/50 hover:text-white transition"
              >
                <X size={24} />
              </button>
              
              <div className="absolute top-6 right-6 flex items-center gap-2 px-4 py-2 bg-red-500/10 text-red-400 rounded-full border border-red-500/20 font-mono text-xl">
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
                <div className="relative z-10 flex flex-col items-center">
                  <Shield size={48} className="text-red-400 mb-4 opacity-50" />
                  <h3 className="text-2xl font-bold text-white mb-2">{getBreathingText()}</h3>
                  <p className="text-red-300/60 text-sm">????? 4-7-8 ?????????</p>
                </div>
              </div>
            </div>

            {/* Right Panel: Motivation & Distractions */}
            <div className="flex-1 p-8 md:p-12 flex flex-col bg-zinc-900/50">
              <div className="mb-10">
                <h2 className="text-3xl font-bold text-white mb-2">???? ??????? (SOS)</h2>
                <p className="text-zinc-400 text-lg">??? ????? ?????? ???: <span className="text-red-400">{habitTitle}</span></p>
              </div>

              {motivationalMessage && (
                <div className="bg-white/5 border border-white/10 rounded-2xl p-6 mb-8 relative overflow-hidden">
                  <div className="absolute top-0 right-0 p-4 opacity-10">
                    <Heart size={64} />
                  </div>
                  <h4 className="text-white/50 text-sm font-semibold mb-2 uppercase tracking-wider">?????? ?????</h4>
                  <p className="text-xl text-white font-medium leading-relaxed">"{motivationalMessage}"</p>
                </div>
              )}

              <div className="flex-1">
                <h4 className="text-white/50 text-sm font-semibold mb-4 uppercase tracking-wider">???? ??? ????? ?? ??? (????? ????????)</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {DISTRACTIONS.map((item, i) => (
                    <div key={i} className="flex items-center gap-3 p-4 bg-black/20 border border-white/5 rounded-xl text-zinc-300 hover:bg-white/5 transition cursor-default">
                      <Activity size={18} className="text-red-400/70" />
                      <span className="text-sm">{item}</span>
                    </div>
                  ))}
                </div>
              </div>
              
              <button 
                onClick={onClose}
                className="mt-8 w-full py-4 bg-red-600 hover:bg-red-500 text-white rounded-xl font-bold text-lg shadow-lg shadow-red-900/50 transition active:scale-[0.98]"
              >
                ??? ???? ????? ?? ??????
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
