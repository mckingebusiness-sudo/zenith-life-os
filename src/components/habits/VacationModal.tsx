import React, { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Plane, Calendar, X, Snowflake } from "lucide-react";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  habitTitle: string;
  onConfirm: (days: number) => void;
  maxDays: number;
}

export function VacationModal({ isOpen, onClose, habitTitle, onConfirm, maxDays }: Props) {
  const [days, setDays] = useState(1);

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={onClose}
          />
          <motion.div
            initial={{ scale: 0.9, opacity: 0, y: 20 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.9, opacity: 0, y: 20 }}
            className="relative w-full max-w-md bg-zinc-900 border border-blue-500/30 rounded-3xl p-6 shadow-2xl shadow-blue-900/20"
          >
            <button 
              onClick={onClose}
              className="absolute top-4 left-4 p-2 bg-white/5 hover:bg-white/10 rounded-full text-white/50 hover:text-white transition"
            >
              <X size={20} />
            </button>
            
            <div className="flex flex-col items-center mb-6 text-center mt-4">
              <div className="w-16 h-16 bg-blue-500/20 text-blue-400 rounded-full flex items-center justify-center mb-4">
                <Plane size={32} />
              </div>
              <h3 className="text-2xl font-bold text-white mb-1">??? ???????</h3>
              <p className="text-blue-200/60 text-sm px-4">????? ?????? ({habitTitle}) ????? ?????? ?????? ??? ????? ????? ????? ??????? ?? ??????.</p>
            </div>
            
            <div className="space-y-4 mb-8">
              <div className="flex items-center justify-between p-4 bg-black/30 rounded-xl border border-white/5">
                <span className="text-zinc-300">?????? ???????:</span>
                <span className="font-bold text-blue-400 flex items-center gap-1">{maxDays} ???? <Snowflake size={14}/></span>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-zinc-400 mb-2">?? ??? ???? ??????? ????? ?? ??????</label>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min="1"
                    max={maxDays}
                    value={days}
                    onChange={(e) => setDays(Number(e.target.value))}
                    className="flex-1 accent-blue-500"
                  />
                  <div className="w-16 py-2 bg-black/50 text-center rounded-lg font-mono text-xl text-white border border-white/10">
                    {days}
                  </div>
                </div>
              </div>
            </div>

            <button
              onClick={() => onConfirm(days)}
              disabled={maxDays <= 0}
              className="w-full py-4 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:bg-zinc-800 text-white rounded-xl font-bold transition shadow-lg shadow-blue-900/50 flex items-center justify-center gap-2"
            >
              <Snowflake size={20} />
              ????? ??? ??????? ({days} ????)
            </button>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
