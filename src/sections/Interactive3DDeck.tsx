import { motion, useMotionValue, useTransform, useSpring } from "framer-motion";
import { useRef, useState } from "react";
import { Sparkles, Zap, Brain, Target, TrendingUp, Rocket } from "lucide-react";

const cards = [
  { icon: Brain,      title: "تركيز عميق",   value: "4س 32د", hint: "أعلى من الأمس بـ 18%", color: "#4ADE80" },
  { icon: Zap,        title: "طاقة الآن",    value: "82%",    hint: "ذروة الإنتاجية",        color: "#A7C957" },
  { icon: Target,     title: "هدف الأسبوع", value: "67%",    hint: "متبقي 3 مهام",          color: "#22C55E" },
  { icon: TrendingUp, title: "ميل الأداء",  value: "+12%",   hint: "آخر 7 أيام",            color: "#86EFAC" },
  { icon: Rocket,     title: "زخم اليوم",   value: "9 إنجاز", hint: "استمر!",                color: "#4ADE80" },
  { icon: Sparkles,   title: "إلهام AI",    value: "3 أفكار", hint: "اضغط لاكتشافها",       color: "#A7C957" },
];

function Tilt3DCard({ icon: Icon, title, value, hint, color, index }: typeof cards[number] & { index: number }) {
  const ref = useRef<HTMLDivElement>(null);
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const rx = useSpring(useTransform(my, [-0.5, 0.5], [12, -12]), { stiffness: 200, damping: 18 });
  const ry = useSpring(useTransform(mx, [-0.5, 0.5], [-14, 14]), { stiffness: 200, damping: 18 });
  const glowX = useTransform(mx, [-0.5, 0.5], ["20%", "80%"]);
  const glowY = useTransform(my, [-0.5, 0.5], ["20%", "80%"]);
  const [hover, setHover] = useState(false);

  function onMove(e: React.MouseEvent) {
    const r = ref.current!.getBoundingClientRect();
    mx.set((e.clientX - r.left) / r.width - 0.5);
    my.set((e.clientY - r.top) / r.height - 0.5);
  }
  function onLeave() { mx.set(0); my.set(0); setHover(false); }

  return (
    <motion.div
      ref={ref}
      onMouseMove={onMove}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={onLeave}
      initial={{ opacity: 0, y: 30, rotateX: -20 }}
      animate={{ opacity: 1, y: 0, rotateX: 0 }}
      transition={{ delay: index * 0.06, type: "spring", damping: 18 }}
      style={{ rotateX: rx, rotateY: ry, transformStyle: "preserve-3d", perspective: 1000 }}
      className="relative h-44 rounded-2xl p-5 cursor-pointer group overflow-hidden"
    >
      {/* Layered surfaces */}
      <div
        className="absolute inset-0 rounded-2xl"
        style={{
          background: "linear-gradient(140deg, rgba(13,20,16,0.95), rgba(6,10,8,0.95))",
          border: `1px solid ${color}33`,
          boxShadow: `0 20px 60px -20px ${color}55, inset 0 1px 0 rgba(255,255,255,0.04)`,
        }}
      />
      {/* Cursor-follow glow */}
      <motion.div
        className="absolute inset-0 rounded-2xl pointer-events-none"
        style={{
          background: `radial-gradient(circle at ${glowX} ${glowY}, ${color}33, transparent 60%)`,
          opacity: hover ? 1 : 0.4,
        }}
      />
      {/* Animated grid */}
      <svg className="absolute inset-0 w-full h-full opacity-[0.07] pointer-events-none">
        <defs>
          <pattern id={`grid-${index}`} width="22" height="22" patternUnits="userSpaceOnUse">
            <path d="M 22 0 L 0 0 0 22" fill="none" stroke={color} strokeWidth="0.4" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill={`url(#grid-${index})`} />
      </svg>

      {/* Floating icon (pops out in 3D) */}
      <motion.div
        style={{ transform: "translateZ(40px)" }}
        animate={{ y: hover ? -2 : 0 }}
        className="relative z-10 w-11 h-11 rounded-xl flex items-center justify-center mb-3"
      >
        <div
          className="absolute inset-0 rounded-xl"
          style={{
            background: `linear-gradient(135deg, ${color}, ${color}66)`,
            boxShadow: `0 10px 24px -8px ${color}aa`,
          }}
        />
        <Icon size={20} className="relative text-black/80" strokeWidth={2.4} />
      </motion.div>

      <div style={{ transform: "translateZ(25px)" }} className="relative z-10">
        <div className="text-[11px] text-[#647067] uppercase tracking-wider mb-1">{title}</div>
        <div className="text-2xl font-extrabold tabular" style={{ color }}>{value}</div>
        <div className="text-[10px] text-[#A7B3AB] mt-2">{hint}</div>
      </div>

      {/* Shine sweep on hover */}
      <motion.div
        className="absolute inset-0 rounded-2xl pointer-events-none"
        initial={{ x: "-120%" }}
        animate={{ x: hover ? "120%" : "-120%" }}
        transition={{ duration: 0.9, ease: "easeOut" }}
        style={{
          background: "linear-gradient(115deg, transparent 30%, rgba(255,255,255,0.08) 50%, transparent 70%)",
        }}
      />
    </motion.div>
  );
}

export default function Interactive3DDeck() {
  return (
    <section className="relative">
      {/* Ambient blobs */}
      <motion.div
        aria-hidden
        animate={{ x: [0, 30, 0], y: [0, -20, 0] }}
        transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
        className="absolute -top-10 right-10 w-72 h-72 rounded-full blur-3xl opacity-30 pointer-events-none"
        style={{ background: "radial-gradient(circle, #22C55E, transparent 70%)" }}
      />
      <motion.div
        aria-hidden
        animate={{ x: [0, -40, 0], y: [0, 30, 0] }}
        transition={{ duration: 18, repeat: Infinity, ease: "easeInOut" }}
        className="absolute -bottom-16 left-10 w-80 h-80 rounded-full blur-3xl opacity-20 pointer-events-none"
        style={{ background: "radial-gradient(circle, #4ADE80, transparent 70%)" }}
      />

      <div className="relative flex items-baseline justify-between mb-6">
        <div>
          <div className="text-[11px] uppercase tracking-[0.25em] text-[#647067]">لوحة تفاعلية</div>
          <h2 className="text-2xl font-extrabold text-grad-green mt-1">نبض اللحظة</h2>
        </div>
        <div className="text-[11px] text-[#647067]">حرّك الفأرة فوق البطاقات</div>
      </div>

      <div className="relative grid grid-cols-2 md:grid-cols-3 gap-5">
        {cards.map((c, i) => (
          <Tilt3DCard key={c.title} {...c} index={i} />
        ))}
      </div>
    </section>
  );
}
