import { motion } from "framer-motion";
import { useState } from "react";

const events = [
  { time: "09:00", title: "مراجعة الخطة", dur: "30د", state: "done" },
  { time: "11:00", title: "تنفيذ عميق", dur: "2س", state: "active" },
  { time: "14:00", title: "ميتنج الفريق", dur: "45د", state: "upcoming" },
  { time: "17:00", title: "مراجعة مالية", dur: "30د", state: "upcoming" },
  { time: "21:00", title: "قراءة وهدوء", dur: "30د", state: "upcoming" },
];

export default function DayTimeline() {
  const [selected, setSelected] = useState<number | null>(null);
  return (
    <section className="glass rounded-3xl p-7 relative overflow-hidden">
      <motion.div
        aria-hidden
        className="absolute inset-x-0 top-0 h-px pointer-events-none"
        style={{ background: "linear-gradient(90deg, transparent, #4ADE80, transparent)" }}
        animate={{ x: ["-100%", "100%"] }}
        transition={{ duration: 6, repeat: Infinity, ease: "linear" }}
      />
      <div className="flex items-baseline justify-between mb-6">
        <h2 className="text-base font-bold text-foreground">إيقاع اليوم</h2>
        <div className="text-[11px] text-muted-foreground">5 جلسات</div>
      </div>

      <div className="relative">
        <div className="absolute right-0 left-0 top-3 h-px bg-border" />
        <motion.div
          className="absolute right-0 top-[10px] h-1 rounded-full"
          style={{ background: "linear-gradient(90deg, #4ADE80, #15803D)", boxShadow: "0 0 12px #4ADE80" }}
          initial={{ width: 0 }}
          animate={{ width: "30%" }}
          transition={{ duration: 1.6, ease: "easeOut" }}
        />
        <div className="flex justify-between relative">
          {events.map((e, i) => {
            const isActive = e.state === "active";
            const isDone = e.state === "done";
            const isSel = selected === i;
            return (
              <motion.div
                key={i}
                onClick={() => setSelected(isSel ? null : i)}
                whileHover={{ y: -3 }}
                className="flex flex-col items-center gap-3 flex-1 relative cursor-pointer"
              >
                <motion.div
                  whileHover={{ scale: 1.25 }}
                  animate={isSel ? { scale: 1.35 } : { scale: 1 }}
                  className="w-6 h-6 rounded-full flex items-center justify-center relative z-10"
                  style={{
                    background: isActive
                      ? "radial-gradient(circle, #4ADE80, #15803D)"
                      : isDone
                      ? "#3F6212"
                      : isSel
                      ? "radial-gradient(circle, #4ADE80, #15803D)"
                      : "var(--bg)",
                    border: isActive || isSel ? "none" : "1px solid var(--border)",
                    boxShadow: isActive || isSel ? "0 0 24px rgba(74,222,128,0.6)" : "none",
                  }}
                >
                  {isActive && <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />}
                  {isDone && <span className="text-[10px] text-white">✓</span>}
                </motion.div>
                <div className="text-center" style={{ opacity: isDone && !isSel ? 0.5 : 1 }}>
                  <div className="text-[11px] tabular text-muted-foreground">{e.time}</div>
                  <div className={`text-[12px] mt-1 ${isActive || isSel ? "font-bold text-[#4ADE80]" : "text-foreground"}`}>
                    {e.title}
                  </div>
                  <div className="text-[10px] text-muted-foreground mt-0.5">{e.dur}</div>
                </div>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}