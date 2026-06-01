import { motion } from "framer-motion";

const hours = Array.from({ length: 24 }, (_, i) => {
  const energy = Math.max(0.15, Math.sin(((i - 6) / 24) * Math.PI * 2) * 0.5 + 0.5);
  return { i, energy };
});

const events = [
  { time: "09:00", label: "مراجعة الخطة", state: "done" as const },
  { time: "11:00", label: "تنفيذ عميق", state: "active" as const },
  { time: "14:00", label: "ميتنج الفريق", state: "upcoming" as const },
  { time: "17:00", label: "مراجعة مالية", state: "upcoming" as const },
];

export default function FocusLane() {
  const currentHour = 14;
  return (
    <section className="glass rounded-3xl p-7 relative overflow-hidden">
      <div className="flex items-center justify-between mb-5">
        <div>
          <div className="text-[11px] uppercase tracking-[0.2em] text-[#647067]">إيقاع يومك</div>
          <div className="text-lg font-bold mt-1">ذروة طاقتك خلال 47 دقيقة</div>
        </div>
        <div className="text-[13px] tabular text-[#A7B3AB]">الآن · 2:34 م</div>
      </div>

      <div className="relative h-24 flex items-end gap-1">
        {hours.map((h) => {
          const isPast = h.i < currentHour;
          const isCurrent = h.i === currentHour;
          const color = isCurrent ? "#4ADE80" : isPast ? "#3F6212" : "#22C55E";
          const opacity = isPast ? 0.3 : isCurrent ? 1 : 0.6;
          return (
            <motion.div
              key={h.i}
              initial={{ scaleY: 0 }}
              animate={{ scaleY: 1 }}
              transition={{ delay: 0.05 * h.i, duration: 0.4 }}
              style={{
                height: `${h.energy * 100}%`,
                background: color,
                opacity,
                boxShadow: isCurrent ? "0 0 16px rgba(74,222,128,0.6)" : "none",
                transformOrigin: "bottom",
              }}
              className="flex-1 rounded-t-md relative"
            >
              {isCurrent && (
                <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-px h-3 bg-green-400" />
              )}
            </motion.div>
          );
        })}
      </div>

      <div className="flex justify-between mt-5">
        {events.map((e) => {
          const colors = {
            done: { bg: "rgba(63,98,18,0.2)", border: "rgba(167,201,87,0.3)", text: "#A7C957", icon: "✓" },
            active: { bg: "rgba(34,197,94,0.15)", border: "rgba(34,197,94,0.5)", text: "#4ADE80", icon: "●" },
            upcoming: { bg: "rgba(255,255,255,0.03)", border: "rgba(255,255,255,0.08)", text: "#647067", icon: "○" },
          }[e.state];
          return (
            <div key={e.time} className="flex items-center gap-2 px-3 py-1.5 rounded-full text-[11px]"
              style={{ background: colors.bg, border: `1px solid ${colors.border}`, color: colors.text }}>
              <span>{colors.icon}</span>
              <span className="tabular font-semibold">{e.time}</span>
              <span>{e.label}</span>
            </div>
          );
        })}
      </div>
    </section>
  );
}