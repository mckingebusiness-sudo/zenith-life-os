import { motion } from "framer-motion";
import { useMemo } from "react";

interface HabitPlant3Props {
  level: number;
  isDormant?: boolean;
  isFrozen?: boolean;
  sway?: boolean;
}

export default function HabitPlant3D({ level, isDormant, isFrozen, sway }: HabitPlant3Props) {
  // Straight-on view, high quality volumetric SVG.
  const idBase = useMemo(() => Math.random().toString(36).slice(2, 7), []);
  
  const isDead = isDormant;
  const isIce = isFrozen;
  
  const stemDark = isDead ? "#4b5563" : isIce ? "#38bdf8" : "#14532d";
  const stemLight = isDead ? "#9ca3af" : isIce ? "#bae6fd" : "#4ade80";
  
  const leafDark = isDead ? "#78350f" : isIce ? "#0284c7" : "#166534";
  const leafLight = isDead ? "#d97706" : isIce ? "#7dd3fc" : "#22c55e";
  const leafHighlight = isDead ? "#fcd34d" : isIce ? "#ffffff" : "#86efac";

  const renderPlant = () => {
    switch (level) {
      case 1: // Seed
        return (
          <>
            <path d="M50 100 Q 55 90 45 80" fill="none" stroke={`url(#stemGrad-${idBase})`} strokeWidth="3" strokeLinecap="round" />
            <path d="M45 80 Q 40 75 35 80 Q 40 85 45 80" fill={`url(#leafGrad-${idBase})`} />
            <path d="M45 80 Q 50 75 55 80 Q 50 85 45 80" fill={`url(#leafGrad-${idBase})`} />
          </>
        );
      case 2: // Small Plant
        return (
          <>
            <path d="M50 100 Q 45 80 50 60" fill="none" stroke={`url(#stemGrad-${idBase})`} strokeWidth="4" strokeLinecap="round" />
            <g filter={`drop-shadow(0px 5px 3px rgba(0,0,0,0.3))`}>
              <path d="M50 90 Q 30 95 20 80 Q 35 70 50 90" fill={`url(#leafGrad-${idBase})`} />
              <path d="M48 80 Q 70 85 80 70 Q 65 60 48 80" fill={`url(#leafGrad-${idBase})`} />
              <path d="M50 70 Q 35 70 30 55 Q 45 50 50 70" fill={`url(#leafGrad-${idBase})`} />
              <path d="M50 60 Q 60 50 50 40 Q 40 50 50 60" fill={`url(#leafGrad-${idBase})`} />
            </g>
          </>
        );
      case 3: // Bushy
        return (
          <>
            <path d="M50 100 C 50 70, 35 60, 25 45" fill="none" stroke={`url(#stemGrad-${idBase})`} strokeWidth="4" strokeLinecap="round" />
            <path d="M50 100 C 50 60, 65 50, 75 40" fill="none" stroke={`url(#stemGrad-${idBase})`} strokeWidth="4" strokeLinecap="round" />
            <path d="M50 100 C 50 60, 45 35, 50 20" fill="none" stroke={`url(#stemGrad-${idBase})`} strokeWidth="5" strokeLinecap="round" />
            <g filter={`drop-shadow(0px 8px 4px rgba(0,0,0,0.4))`}>
              <circle cx="25" cy="45" r="15" fill={`url(#canopyGrad-${idBase})`} />
              <circle cx="75" cy="40" r="18" fill={`url(#canopyGrad-${idBase})`} />
              <circle cx="50" cy="35" r="22" fill={`url(#canopyGrad-${idBase})`} />
              <circle cx="35" cy="25" r="16" fill={`url(#canopyGrad-${idBase})`} />
              <circle cx="65" cy="22" r="16" fill={`url(#canopyGrad-${idBase})`} />
              <circle cx="50" cy="15" r="18" fill={`url(#canopyGrad-${idBase})`} />
            </g>
          </>
        );
      case 4: // Small Tree
        return (
          <>
            <path d="M55 100 L 45 100 L 48 40 L 52 40 Z" fill={`url(#trunkGrad-${idBase})`} />
            <path d="M50 60 Q 30 50 20 35" fill="none" stroke={`url(#trunkGrad-${idBase})`} strokeWidth="4" strokeLinecap="round" />
            <path d="M50 50 Q 70 40 80 25" fill="none" stroke={`url(#trunkGrad-${idBase})`} strokeWidth="4" strokeLinecap="round" />
            <g filter={`drop-shadow(0px 10px 5px rgba(0,0,0,0.5))`}>
              <circle cx="25" cy="35" r="20" fill={`url(#canopyGrad-${idBase})`} />
              <circle cx="75" cy="25" r="22" fill={`url(#canopyGrad-${idBase})`} />
              <circle cx="50" cy="25" r="30" fill={`url(#canopyGrad-${idBase})`} />
              <circle cx="35" cy="15" r="25" fill={`url(#canopyGrad-${idBase})`} />
              <circle cx="65" cy="10" r="25" fill={`url(#canopyGrad-${idBase})`} />
            </g>
          </>
        );
      case 5: 
      case 6: // Large Tree
        return (
          <>
            <path d="M65 100 Q 55 90 55 40 L 45 40 Q 45 90 35 100 Z" fill={`url(#trunkGrad-${idBase})`} />
            <path d="M55 60 Q 80 50 90 30" fill="none" stroke={`url(#trunkGrad-${idBase})`} strokeWidth="6" strokeLinecap="round" />
            <path d="M45 55 Q 20 45 10 25" fill="none" stroke={`url(#trunkGrad-${idBase})`} strokeWidth="6" strokeLinecap="round" />
            <path d="M50 45 Q 30 20 35 -5" fill="none" stroke={`url(#trunkGrad-${idBase})`} strokeWidth="6" strokeLinecap="round" />
            <path d="M50 45 Q 70 20 65 -5" fill="none" stroke={`url(#trunkGrad-${idBase})`} strokeWidth="6" strokeLinecap="round" />
            <g filter={`drop-shadow(0px 15px 10px rgba(0,0,0,0.6))`}>
              <circle cx="15" cy="25" r="25" fill={`url(#canopyGrad-${idBase})`} />
              <circle cx="85" cy="30" r="25" fill={`url(#canopyGrad-${idBase})`} />
              <circle cx="35" cy="5" r="30" fill={`url(#canopyGrad-${idBase})`} />
              <circle cx="65" cy="0" r="30" fill={`url(#canopyGrad-${idBase})`} />
              <circle cx="50" cy="-15" r="35" fill={`url(#canopyGrad-${idBase})`} />
              <circle cx="50" cy="15" r="35" fill={`url(#canopyGrad-${idBase})`} />
            </g>
            {level === 6 && !isDead && (
              <g filter="drop-shadow(0 0 4px rgba(250,204,21,0.8))">
                <circle cx="20" cy="15" r="4" fill="url(#fruitGrad)" />
                <circle cx="35" cy="30" r="4" fill="url(#fruitGrad)" />
                <circle cx="80" cy="20" r="4" fill="url(#fruitGrad)" />
                <circle cx="65" cy="-5" r="4" fill="url(#fruitGrad)" />
                <circle cx="45" cy="-10" r="4" fill="url(#fruitGrad)" />
                <circle cx="55" cy="20" r="4" fill="url(#fruitGrad)" />
              </g>
            )}
            {level === 6 && isDead && (
              <g>
                <circle cx="20" cy="15" r="3" fill="#6B7280" />
                <circle cx="35" cy="30" r="3" fill="#6B7280" />
                <circle cx="80" cy="20" r="3" fill="#6B7280" />
                <circle cx="65" cy="-5" r="3" fill="#6B7280" />
                <circle cx="45" cy="-10" r="3" fill="#6B7280" />
                <circle cx="55" cy="20" r="3" fill="#6B7280" />
              </g>
            )}
          </>
        );
      default:
        return null;
    }
  };

  return (
    <motion.div
      animate={sway ? { rotateZ: [-2, 2, -2] } : undefined}
      transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
      style={{ transformOrigin: "bottom center", width: "100%", height: "100%" }}
      className="pointer-events-none drop-shadow-2xl"
    >
      <svg
        width="100%" height="100%" viewBox="0 -20 100 120"
        style={{ overflow: "visible" }}
      >
        <defs>
          <linearGradient id={`stemGrad-${idBase}`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor={stemDark} />
            <stop offset="100%" stopColor={stemLight} />
          </linearGradient>
          <linearGradient id={`leafGrad-${idBase}`} x1="0" y1="0" x2="1" y2="1">
            <stop offset="0%" stopColor={leafLight} />
            <stop offset="50%" stopColor={leafDark} />
            <stop offset="100%" stopColor={stemDark} />
          </linearGradient>
          <radialGradient id={`canopyGrad-${idBase}`} cx="30%" cy="30%" r="70%">
            <stop offset="0%" stopColor={leafHighlight} />
            <stop offset="40%" stopColor={leafLight} />
            <stop offset="80%" stopColor={leafDark} />
            <stop offset="100%" stopColor={stemDark} />
          </radialGradient>
          <linearGradient id={`trunkGrad-${idBase}`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor={isDead ? "#3f3f46" : isIce ? "#1e3a8a" : "#451a03"} />
            <stop offset="50%" stopColor={isDead ? "#71717a" : isIce ? "#3b82f6" : "#78350f"} />
            <stop offset="100%" stopColor={isDead ? "#27272a" : isIce ? "#1e3a8a" : "#381402"} />
          </linearGradient>
          <radialGradient id="fruitGrad" cx="30%" cy="30%" r="70%">
            <stop offset="0%" stopColor="#fef08a" />
            <stop offset="50%" stopColor="#eab308" />
            <stop offset="100%" stopColor="#a16207" />
          </radialGradient>
        </defs>
        {renderPlant()}
      </svg>
    </motion.div>
  );
}
