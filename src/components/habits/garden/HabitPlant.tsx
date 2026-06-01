import { motion } from "framer-motion";
import { useMemo } from "react";

interface HabitPlantProps {
  level: number;
  isDormant?: boolean;
  sway?: boolean;
  habitName: string;
}

export default function HabitPlant({ level, isDormant, sway, habitName }: HabitPlantProps) {
  const heights = [16, 22, 30, 38, 46, 52]; // 6 heights
  const h = heights[Math.min(level - 1, 5)];
  
  // A unique ID for the gradient based on level and dormancy
  const grad = useMemo(() => `p${level}-${isDormant ? "d" : "a"}-${Math.random().toString(36).slice(2, 7)}`, [level, isDormant]);
  
  // Dormant: gray/muted greens. Active: vibrant greens
  const colorDark = isDormant ? "#4b5563" : "#15803D"; // gray-600 vs green-700
  const colorLight = isDormant ? "#9ca3af" : "#4ADE80"; // gray-400 vs green-400

  return (
    <svg
      width="48" height="75" viewBox="0 0 40 70"
      aria-label={`نبتة عادة ${habitName}، المستوى ${level}${isDormant ? "، في وضع خمول" : ""}`}
      role="img"
      style={{ overflow: "visible" }}
    >
      <defs>
        <linearGradient id={grad} x1="0" y1="1" x2="0" y2="0">
          <stop offset="0%" stopColor={colorDark} />
          <stop offset="100%" stopColor={colorLight} />
        </linearGradient>
        <linearGradient id="potBody" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#1a1c1a" />
          <stop offset="100%" stopColor="#080908" />
        </linearGradient>
        <linearGradient id="potRim" x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%" stopColor="#4A554A" />
          <stop offset="50%" stopColor="#A7B3AB" />
          <stop offset="100%" stopColor="#2A332A" />
        </linearGradient>
      </defs>
      
      {/* Luxurious Pot */}
      {/* Shadow under the pot */}
      <ellipse cx="20" cy="65" rx="14" ry="3" fill="rgba(0,0,0,0.4)" filter="blur(2px)" />
      
      {/* Pot body */}
      <path d="M10 56 L30 56 L26 65 L14 65 Z" fill="url(#potBody)" stroke="#3f4a42" strokeWidth="0.75" />
      
      {/* Pot rim (الشفة) */}
      <rect x="7" y="53" width="26" height="3.5" rx="1.5" fill="url(#potRim)" filter="drop-shadow(0 2px 4px rgba(0,0,0,0.5))" />
      
      {/* Plant Container (Animated) */}
      <motion.g
        animate={sway ? { rotate: [-2, 2, -2] } : undefined}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        style={{ transformOrigin: "20px 53px" }}
      >

      {/* Stem */}
      <line x1="20" y1="53" x2="20" y2={53 - h} stroke={`url(#${grad})`} strokeWidth="2.5" strokeLinecap="round" />
      
      {/* Leaves & Branches */}
      {level >= 2 && <ellipse cx="15" cy={53 - h * 0.5} rx="6" ry="3.5" fill={`url(#${grad})`} transform={`rotate(-35 15 ${53 - h * 0.5})`} />}
      {level >= 2 && <ellipse cx="25" cy={53 - h * 0.5} rx="6" ry="3.5" fill={`url(#${grad})`} transform={`rotate(35 25 ${53 - h * 0.5})`} />}
      
      {level >= 3 && <circle cx="20" cy={53 - h} r="5.5" fill={`url(#${grad})`} />}
      {level >= 3 && <ellipse cx="16" cy={53 - h * 0.75} rx="4.5" ry="2.5" fill={`url(#${grad})`} transform={`rotate(-15 16 ${53 - h * 0.75})`} />}
      
      {level >= 4 && <circle cx="14" cy={53 - h + 3} r="4.5" fill={`url(#${grad})`} />}
      {level >= 4 && <circle cx="26" cy={53 - h + 3} r="4.5" fill={`url(#${grad})`} />}
      
      {level >= 5 && <circle cx="20" cy={53 - h - 4} r="7" fill={`url(#${grad})`} />}
      {level >= 5 && <circle cx="12" cy={53 - h - 1} r="5.5" fill={`url(#${grad})`} />}
      {level >= 5 && <circle cx="28" cy={53 - h - 1} r="5.5" fill={`url(#${grad})`} />}

      {/* Fruits for level 6 (Fruit Tree) */}
      {level >= 6 && !isDormant && (
        <>
          <circle cx="18" cy={53 - h - 6} r="2" fill="#FCD34D" filter="drop-shadow(0 0 2px rgba(252,211,77,0.8))" />
          <circle cx="24" cy={53 - h - 2} r="2" fill="#FCD34D" filter="drop-shadow(0 0 2px rgba(252,211,77,0.8))" />
          <circle cx="13" cy={53 - h + 2} r="2" fill="#FCD34D" filter="drop-shadow(0 0 2px rgba(252,211,77,0.8))" />
        </>
      )}
      {level >= 6 && isDormant && (
        <>
          <circle cx="18" cy={53 - h - 6} r="2" fill="#6B7280" />
          <circle cx="24" cy={53 - h - 2} r="2" fill="#6B7280" />
          <circle cx="13" cy={53 - h + 2} r="2" fill="#6B7280" />
        </>
      )}
      </motion.g>
    </svg>
  );
}
