import { Sparkles, Check, X } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useEffect, useState } from "react";

const fullText =
  "لاحظت نمطاً واضحاً في بياناتك: أنت أكثر إنتاجية الثلاثاء والأربعاء بـ 34% من المتوسط. أقترح نقل المهام الثقيلة لهذين اليومين تلقائياً.";

export default function AIInsight() {
  const [typed, setTyped] = useState("");
  const [applied, setApplied] = useState(false);
  useEffect(() => {
    let i = 0;
    const id = setInterval(() => {
      i++;
      setTyped(fullText.slice(0, i));
      if (i >= fullText.length) clearInterval(id);
    }, 22);
    return () => clearInterval(id);
  }, []);
  return (
    <motion.section
      whileHover={{ y: -2 }}
      className="rounded-3xl p-7 h-full relative overflow-hidden"
      style={{
        background: "linear-gradient(135deg, rgba(34,197,94,0.06), rgba(13,20,16,0.85))",
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

      <div className="flex items-center gap-3 mb-4">
        <motion.div
          animate={{ rotate: [0, 8, -6, 0], scale: [1, 1.06, 1] }}
          transition={{ duration: 4, repeat: Infinity }}
          className="w-9 h-9 rounded-full flex items-center justify-center"
          style={{
            background: "linear-gradient(135deg, #15803D, #4ADE80)",
            boxShadow: "0 0 20px rgba(34,197,94,0.5)",
          }}
        >
          <Sparkles size={14} />
        </motion.div>
        <div>
          <div className="text-sm font-bold">رؤية زينيث</div>
          <div className="text-[10px] text-[#647067]">منذ 5 دقائق</div>
        </div>
      </div>

      <p className="text-[15px] leading-[1.8] text-[#F4F7F5] mb-5 max-w-[480px] min-h-[110px] relative">
        {typed}
        {typed.length < fullText.length && (
          <motion.span
            animate={{ opacity: [1, 0, 1] }}
            transition={{ duration: 0.8, repeat: Infinity }}
            className="inline-block w-1.5 h-4 bg-green-400 ml-0.5 align-middle"
          />
        )}
      </p>

      <div className="flex items-center gap-2">
        <motion.button
          whileHover={{ scale: 1.04 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setApplied(true)}
          className="px-4 py-2 rounded-xl text-[12px] font-semibold flex items-center gap-1.5 transition hover:scale-[1.02]"
          style={{
            background: applied
              ? "linear-gradient(135deg, #4ADE80, #22C55E)"
              : "linear-gradient(135deg, #15803D, #22C55E)",
            boxShadow: "0 0 20px rgba(34,197,94,0.3)",
          }}
        >
          <AnimatePresence mode="wait">
            {applied ? (
              <motion.span key="ok" initial={{ scale: 0 }} animate={{ scale: 1 }} className="flex items-center gap-1.5">
                <Check size={13} /> تم التطبيق
              </motion.span>
            ) : (
              <motion.span key="apply" initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-1.5">
                <Check size={13} /> طبّق الآن
              </motion.span>
            )}
          </AnimatePresence>
        </motion.button>
        <button className="px-4 py-2 rounded-xl text-[12px] text-[#A7B3AB] hover:text-white hover:bg-white/5 transition">
          اشرح أكثر
        </button>
        <button className="w-8 h-8 rounded-xl text-[#647067] hover:text-white hover:bg-white/5 transition flex items-center justify-center">
          <X size={14} />
        </button>
      </div>
    </motion.section>
  );
}