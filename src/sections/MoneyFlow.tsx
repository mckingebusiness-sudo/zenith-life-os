import { motion } from "framer-motion";
import { useState } from "react";

const days = [
  { v: 40, label: "السبت", amount: 280 },
  { v: 65, label: "الأحد", amount: 455 },
  { v: 30, label: "الإثنين", amount: 210 },
  { v: 80, label: "الثلاثاء", amount: 560 },
  { v: 55, label: "الأربعاء", amount: 385 },
  { v: 90, label: "الخميس", amount: 630 },
  { v: 45, label: "الجمعة", amount: 315 },
];

export default function MoneyFlow() {
  const [hover, setHover] = useState<number | null>(null);
  return (
    <section className="glass rounded-3xl p-7 h-full relative overflow-hidden group">
      <motion.div
        aria-hidden
        className="absolute -top-16 -left-16 w-56 h-56 rounded-full blur-3xl pointer-events-none"
        style={{ background: "radial-gradient(circle, rgba(74,222,128,0.18), transparent 70%)" }}
        animate={{ scale: [1, 1.15, 1], opacity: [0.4, 0.7, 0.4] }}
        transition={{ duration: 7, repeat: Infinity, ease: "easeInOut" }}
      />
      <div className="flex items-baseline justify-between mb-4">
        <h2 className="text-base font-bold">تدفق المال</h2>
        <div className="text-[10px] text-[#647067]">مايو 2026</div>
      </div>
      <div className="flex items-baseline gap-2 mb-1">
        <motion.span
          key={hover ?? "total"}
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-[36px] font-extrabold tabular text-grad-green leading-none"
        >
          {hover !== null ? days[hover].amount.toLocaleString() : "3,200"}
        </motion.span>
        <span className="text-sm text-[#A7B3AB]">ج</span>
      </div>
      <div className="text-[11px] text-[#647067] mb-4 h-4">
        {hover !== null ? days[hover].label : "من 5,000 ج · 64% مستهلك"}
      </div>

      <div className="flex items-end gap-1.5 h-16 mb-4">
        {days.map((d, i) => (
          <motion.div
            key={i}
            initial={{ scaleY: 0 }}
            animate={{ scaleY: 1 }}
            transition={{ delay: 0.06 * i, type: "spring", damping: 14 }}
            whileHover={{ scaleY: 1.08, y: -2 }}
            onMouseEnter={() => setHover(i)}
            onMouseLeave={() => setHover(null)}
            className="flex-1 rounded-md cursor-pointer origin-bottom"
            style={{
              height: `${d.v}%`,
              background:
                hover === i || (hover === null && i === 5)
                  ? "linear-gradient(180deg, #4ADE80, #22C55E)"
                  : "linear-gradient(180deg, rgba(34,197,94,0.5), rgba(34,197,94,0.2))",
              boxShadow: hover === i || (hover === null && i === 5) ? "0 0 16px rgba(74,222,128,0.6)" : "none",
              opacity: hover === null ? (i === 5 ? 1 : 0.7) : hover === i ? 1 : 0.4,
            }}
          />
        ))}
      </div>

      <div
        className="flex items-center gap-2 text-[11px] px-3 py-2 rounded-xl"
        style={{ background: "rgba(34,197,94,0.08)", border: "1px solid rgba(34,197,94,0.2)" }}
      >
        <span className="text-[#4ADE80]">✨</span>
        <span className="text-[#A7B3AB]">معدل صرفك أقل بـ 15% من الشهر الماضي</span>
      </div>
    </section>
  );
}