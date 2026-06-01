import { motion } from "framer-motion";
import { useMemo } from "react";

interface HabitPlantProps {
  level: number;
  isDormant?: boolean;
  sway?: boolean;
  habitName: string;
}

export default function HabitPlant({ level, isDormant, sway, habitName }: HabitPlantProps) {
  // Safe level between 1 and 6
  const l = Math.max(1, Math.min(level, 6));
  
  // A unique ID for gradients
  const gradId = useMemo(() => `hp-${l}-${isDormant ? "d" : "a"}-${Math.random().toString(36).slice(2, 7)}`, [l, isDormant]);
  
  // Colors
  const leafBase = isDormant ? "#4b5563" : "#16a34a"; // gray vs vibrant green
  const leafHighlight = isDormant ? "#9ca3af" : "#4ade80";
  const leafDark = isDormant ? "#374151" : "#14532d";
  const trunkBase = isDormant ? "#4b5563" : "#78350f";
  const trunkHighlight = isDormant ? "#6b7280" : "#b45309";
  const trunkDark = isDormant ? "#374151" : "#451a03";

  return (
    <svg
      width="100" height="130" viewBox="0 -20 100 150"
      aria-label={`نبتة ${habitName}، المستوى ${l}${isDormant ? "، في وضع خمول" : ""}`}
      role="img"
      style={{ overflow: "visible" }}
    >
      <defs>
        {/* Pot Gradients - 3D Realistic */}
        <linearGradient id={`${gradId}-potBody`} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#1e1e1e" />
          <stop offset="15%" stopColor="#3d3d3d" />
          <stop offset="35%" stopColor="#2c2c2c" />
          <stop offset="85%" stopColor="#1a1a1a" />
          <stop offset="100%" stopColor="#0a0a0a" />
        </linearGradient>
        
        <linearGradient id={`${gradId}-potRim`} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#2a2a2a" />
          <stop offset="20%" stopColor="#4a4a4a" />
          <stop offset="80%" stopColor="#333" />
          <stop offset="100%" stopColor="#111" />
        </linearGradient>

        <linearGradient id={`${gradId}-potInner`} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#0a0a0a" />
          <stop offset="100%" stopColor="#1e1e1e" />
        </linearGradient>

        <radialGradient id={`${gradId}-soil`} cx="50%" cy="50%" r="50%">
          <stop offset="0%" stopColor="#291e14" />
          <stop offset="70%" stopColor="#1a120c" />
          <stop offset="100%" stopColor="#0a0604" />
        </radialGradient>

        {/* Plant Gradients - Volumetric 3D */}
        <radialGradient id={`${gradId}-leafSphere`} cx="40%" cy="30%" r="60%">
          <stop offset="0%" stopColor={leafHighlight} />
          <stop offset="60%" stopColor={leafBase} />
          <stop offset="100%" stopColor={leafDark} />
        </radialGradient>

        <linearGradient id={`${gradId}-trunk`} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor={trunkDark} />
          <stop offset="40%" stopColor={trunkHighlight} />
          <stop offset="80%" stopColor={trunkBase} />
          <stop offset="100%" stopColor={trunkDark} />
        </linearGradient>

        <radialGradient id={`${gradId}-fruit`} cx="35%" cy="35%" r="65%">
          <stop offset="0%" stopColor="#fef08a" />
          <stop offset="40%" stopColor="#f59e0b" />
          <stop offset="100%" stopColor="#b45309" />
        </radialGradient>

        <filter id={`${gradId}-dropShadow`} x="-20%" y="-20%" width="140%" height="140%">
          <feDropShadow dx="0" dy="6" stdDeviation="4" floodColor="#000" floodOpacity="0.4" />
        </filter>

        <filter id={`${gradId}-glow`} x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3" result="blur" />
          <feComposite in="SourceGraphic" in2="blur" operator="over" />
        </filter>
      </defs>

      {/* ─── 3D Realistic Pot ─── */}
      <g transform="translate(0, 10)">
        {/* Ground Drop Shadow */}
        <ellipse cx="50" cy="112" rx="34" ry="8" fill="rgba(0,0,0,0.5)" filter="blur(4px)" />
        <ellipse cx="50" cy="112" rx="22" ry="4" fill="rgba(0,0,0,0.7)" filter="blur(2px)" />
        
        {/* Pot Main Body (Cylinder with curve) */}
        <path d="M 26 106 C 26 114, 74 114, 74 106 L 82 76 C 82 70, 18 70, 18 76 Z" fill={`url(#${gradId}-potBody)`} />
        
        {/* Pot Base Curve Bottom (to complete 3D effect) */}
        <ellipse cx="50" cy="106" rx="24" ry="4.5" fill="#050505" opacity="0.6" />

        {/* Pot Rim */}
        <path d="M 16 76 C 16 83, 84 83, 84 76 L 82 71 C 82 64, 18 64, 18 71 Z" fill={`url(#${gradId}-potRim)`} />
        
        {/* Pot Inner Depth */}
        <ellipse cx="50" cy="71" rx="32" ry="6.5" fill={`url(#${gradId}-potInner)`} />
        
        {/* Soil */}
        <ellipse cx="50" cy="72" rx="28" ry="5" fill={`url(#${gradId}-soil)`} />
        
        {/* Soil Texture Details */}
        <circle cx="40" cy="70" r="1" fill="#4a3b2c" opacity="0.5" />
        <circle cx="55" cy="73" r="1.5" fill="#36291d" opacity="0.6" />
        <circle cx="48" cy="69" r="0.8" fill="#5e4c3a" opacity="0.4" />
        <circle cx="62" cy="71" r="1" fill="#2b1e13" opacity="0.7" />
      </g>

      {/* ─── Plant Container (Animated) ─── */}
      <motion.g
        animate={sway ? { rotate: [-1, 2, -1], skewX: [-0.5, 0.5, -0.5] } : undefined}
        transition={{ duration: 6, repeat: Infinity, ease: "easeInOut" }}
        style={{ transformOrigin: "50px 84px" }}
      >
        {/* LEVEL 1: Tiny Sprout */}
        {l === 1 && (
          <g filter={`url(#${gradId}-dropShadow)`}>
            <path d="M 50 82 Q 48 70 51 64" fill="none" stroke={`url(#${gradId}-trunk)`} strokeWidth="3" strokeLinecap="round" />
            <path d="M 51 66 C 40 66, 42 56, 51 64" fill={`url(#${gradId}-leafSphere)`} />
            <path d="M 51 65 C 60 62, 56 52, 51 64" fill={`url(#${gradId}-leafSphere)`} />
          </g>
        )}

        {/* LEVEL 2: Small Plant */}
        {l === 2 && (
          <g filter={`url(#${gradId}-dropShadow)`}>
            <path d="M 50 82 Q 48 60 50 50" fill="none" stroke={`url(#${gradId}-trunk)`} strokeWidth="4" strokeLinecap="round" />
            {/* Back leaf */}
            <path d="M 49 55 C 32 50, 36 38, 49 55" fill={`url(#${gradId}-leafSphere)`} />
            <path d="M 51 60 C 68 55, 64 43, 51 60" fill={`url(#${gradId}-leafSphere)`} />
            {/* Top leaf */}
            <path d="M 50 52 C 40 40, 48 32, 50 52" fill={`url(#${gradId}-leafSphere)`} />
            <path d="M 50 52 C 60 40, 52 32, 50 52" fill={`url(#${gradId}-leafSphere)`} />
          </g>
        )}

        {/* LEVEL 3: Volumetric Bush */}
        {l === 3 && (
          <g filter={`url(#${gradId}-dropShadow)`}>
            <path d="M 50 82 Q 52 50 50 35" fill="none" stroke={`url(#${gradId}-trunk)`} strokeWidth="5" strokeLinecap="round" />
            <path d="M 50 70 Q 40 60 38 55" fill="none" stroke={`url(#${gradId}-trunk)`} strokeWidth="3" strokeLinecap="round" />
            <path d="M 50 65 Q 60 55 62 50" fill="none" stroke={`url(#${gradId}-trunk)`} strokeWidth="3" strokeLinecap="round" />
            
            {/* 3D spheres overlapping for foliage */}
            <circle cx="38" cy="48" r="14" fill={`url(#${gradId}-leafSphere)`} />
            <circle cx="62" cy="45" r="14" fill={`url(#${gradId}-leafSphere)`} />
            <circle cx="50" cy="35" r="18" fill={`url(#${gradId}-leafSphere)`} />
            <circle cx="43" cy="28" r="12" fill={`url(#${gradId}-leafSphere)`} opacity="0.9" />
            <circle cx="57" cy="26" r="12" fill={`url(#${gradId}-leafSphere)`} opacity="0.9" />
          </g>
        )}

        {/* LEVEL 4: Large Bush / Small Tree */}
        {l === 4 && (
          <g filter={`url(#${gradId}-dropShadow)`}>
            <path d="M 50 82 Q 48 50 50 30" fill="none" stroke={`url(#${gradId}-trunk)`} strokeWidth="7" strokeLinecap="round" />
            <path d="M 50 60 Q 30 50 28 40" fill="none" stroke={`url(#${gradId}-trunk)`} strokeWidth="4" strokeLinecap="round" />
            <path d="M 50 55 Q 70 45 72 35" fill="none" stroke={`url(#${gradId}-trunk)`} strokeWidth="4" strokeLinecap="round" />
            
            <circle cx="28" cy="38" r="16" fill={`url(#${gradId}-leafSphere)`} />
            <circle cx="72" cy="32" r="16" fill={`url(#${gradId}-leafSphere)`} />
            <circle cx="50" cy="25" r="22" fill={`url(#${gradId}-leafSphere)`} />
            <circle cx="35" cy="18" r="15" fill={`url(#${gradId}-leafSphere)`} />
            <circle cx="65" cy="15" r="15" fill={`url(#${gradId}-leafSphere)`} />
            <circle cx="50" cy="8" r="16" fill={`url(#${gradId}-leafSphere)`} />
          </g>
        )}

        {/* LEVEL 5 & 6: Majestic Tree Base */}
        {(l === 5 || l === 6) && (
          <g filter={`url(#${gradId}-dropShadow)`}>
            {/* Trunk */}
            <path d="M 46 82 C 46 50, 48 40, 42 25 L 58 25 C 52 40, 54 50, 54 82 Z" fill={`url(#${gradId}-trunk)`} />
            <path d="M 48 60 Q 30 50 25 35" fill="none" stroke={`url(#${gradId}-trunk)`} strokeWidth="5" strokeLinecap="round" />
            <path d="M 52 55 Q 70 45 75 30" fill="none" stroke={`url(#${gradId}-trunk)`} strokeWidth="5" strokeLinecap="round" />
            <path d="M 50 45 Q 60 25 62 10" fill="none" stroke={`url(#${gradId}-trunk)`} strokeWidth="4" strokeLinecap="round" />
            
            {/* Roots */}
            <path d="M 46 80 Q 40 83 38 82" fill="none" stroke={`url(#${gradId}-trunk)`} strokeWidth="3" strokeLinecap="round" />
            <path d="M 54 80 Q 60 83 62 82" fill="none" stroke={`url(#${gradId}-trunk)`} strokeWidth="3" strokeLinecap="round" />

            {/* Back Canopy */}
            <circle cx="35" cy="15" r="16" fill={`url(#${gradId}-leafSphere)`} />
            <circle cx="65" cy="10" r="16" fill={`url(#${gradId}-leafSphere)`} />
            
            {/* Mid Canopy */}
            <circle cx="22" cy="28" r="18" fill={`url(#${gradId}-leafSphere)`} />
            <circle cx="78" cy="22" r="18" fill={`url(#${gradId}-leafSphere)`} />
            <circle cx="50" cy="5" r="24" fill={`url(#${gradId}-leafSphere)`} />
            
            {/* Front Canopy Details */}
            <circle cx="35" cy="30" r="14" fill={`url(#${gradId}-leafSphere)`} opacity="0.95" />
            <circle cx="65" cy="26" r="14" fill={`url(#${gradId}-leafSphere)`} opacity="0.95" />
            <circle cx="50" cy="20" r="18" fill={`url(#${gradId}-leafSphere)`} opacity="0.95" />
            <circle cx="40" cy="-2" r="16" fill={`url(#${gradId}-leafSphere)`} opacity="0.95" />
            <circle cx="60" cy="-6" r="16" fill={`url(#${gradId}-leafSphere)`} opacity="0.95" />
          </g>
        )}

        {/* LEVEL 6: Royal Fruits / Magical Elements */}
        {l === 6 && !isDormant && (
          <g filter={`url(#${gradId}-glow)`}>
            <circle cx="28" cy="35" r="4.5" fill={`url(#${gradId}-fruit)`} />
            <circle cx="20" cy="22" r="4" fill={`url(#${gradId}-fruit)`} />
            <circle cx="42" cy="15" r="5" fill={`url(#${gradId}-fruit)`} />
            <circle cx="58" cy="8" r="4.5" fill={`url(#${gradId}-fruit)`} />
            <circle cx="72" cy="28" r="5" fill={`url(#${gradId}-fruit)`} />
            <circle cx="82" cy="18" r="3.5" fill={`url(#${gradId}-fruit)`} />
            <circle cx="48" cy="-5" r="4" fill={`url(#${gradId}-fruit)`} />
            <circle cx="35" cy="4" r="3.5" fill={`url(#${gradId}-fruit)`} />
            <circle cx="65" cy="-2" r="4" fill={`url(#${gradId}-fruit)`} />
          </g>
        )}
        
        {/* Dormant fruits */}
        {l === 6 && isDormant && (
          <g>
            <circle cx="28" cy="35" r="4.5" fill="#6B7280" opacity="0.7" />
            <circle cx="42" cy="15" r="5" fill="#6B7280" opacity="0.7" />
            <circle cx="58" cy="8" r="4.5" fill="#6B7280" opacity="0.7" />
            <circle cx="72" cy="28" r="5" fill="#6B7280" opacity="0.7" />
            <circle cx="48" cy="-5" r="4" fill="#6B7280" opacity="0.7" />
          </g>
        )}
      </motion.g>
    </svg>
  );
}
