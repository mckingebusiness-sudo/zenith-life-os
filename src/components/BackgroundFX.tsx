import { motion } from "framer-motion";
import type { CSSProperties } from "react";

const gradTopRight: CSSProperties = {
  background:
    "radial-gradient(ellipse 1200px 800px at 95% 0%, rgba(34,197,94,0.16) 0%, transparent 60%)",
};
const gradBottomLeft: CSSProperties = {
  background:
    "radial-gradient(ellipse 800px 600px at 5% 100%, rgba(167,201,87,0.08) 0%, transparent 50%)",
};
const noise: CSSProperties = {
  backgroundImage:
    "radial-gradient(rgba(255,255,255,0.025) 1px, transparent 1px)",
  backgroundSize: "3px 3px",
  opacity: 0.6,
};

export default function BackgroundFX() {
  return (
    <div className="fixed inset-0 z-0 pointer-events-none overflow-hidden">
      <div className="absolute inset-0" style={gradTopRight} />
      <div className="absolute inset-0" style={gradBottomLeft} />
      <div className="absolute inset-0" style={noise} />
      {[0, 1, 2, 3, 4].map((i) => {
        const dotStyle: CSSProperties = {
          left: `${15 + i * 18}%`,
          top: `${20 + (i % 3) * 25}%`,
          boxShadow: "0 0 12px rgba(74,222,128,0.8)",
        };
        return (
          <motion.span
            key={i}
            className="absolute w-1 h-1 rounded-full bg-green-400"
            style={dotStyle}
            animate={{ y: [0, -18, 0], opacity: [0.4, 1, 0.4] }}
            transition={{ duration: 4 + i, repeat: Infinity, delay: i * 0.6 }}
          />
        );
      })}
    </div>
  );
}