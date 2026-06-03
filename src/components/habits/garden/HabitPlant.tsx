import { motion } from "framer-motion";
import { useMemo } from "react";

interface HabitPlantProps {
  level: number;
  isDormant?: boolean;
  sway?: boolean;
  habitName: string;
}

function seededRandom(seed: string, index: number): number {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (Math.imul(31, h) + seed.charCodeAt(i)) | 0;
  h = (h + index * 2654435761) | 0;
  return Math.abs((h ^ (h >>> 16)) / 2147483648);
}

export default function HabitPlant({ level, isDormant, sway, habitName }: HabitPlantProps) {
  const uid = useMemo(
    () => `p-${habitName.replace(/\W+/g, "").slice(0, 10)}-${level}-${isDormant ? "d" : "a"}`,
    [habitName, level, isDormant]
  );
  const r = (i: number) => seededRandom(habitName, i);

  /* ── heights per level (bigger values = taller plant) ── */
  const heights = [16, 24, 34, 44, 56, 68];
  const h = heights[Math.min(level - 1, 5)];

  /* ── colour palette ── */
  const C = isDormant
    ? {
        stemA: "#1f2937", stemB: "#374151", stemC: "#4b5563",
        leafA: "#374151", leafB: "#4b5563", leafC: "#6b7280",
        leafHL: "#9ca3af",
        fruitA: "#374151", fruitB: "#4b5563",
        vein: "#1f2937",
      }
    : {
        stemA: "#052e16", stemB: "#14532d", stemC: "#16a34a",
        leafA: "#14532d", leafB: "#166534", leafC: "#22c55e",
        leafHL: "#86efac",
        fruitA: "#b91c1c", fruitB: "#dc2626",
        vein: "#052e16",
      };

  /* ── gradient / filter IDs ── */
  const gStem   = `${uid}-gs`;
  const gLeafL  = `${uid}-gll`;   // light-facing leaf
  const gLeafD  = `${uid}-gld`;   // dark-facing leaf
  const gLeafSS = `${uid}-glss`;  // subsurface scatter (backlit)
  const gPot    = `${uid}-gp`;
  const gRim    = `${uid}-gr`;
  const gSoil   = `${uid}-gso`;
  const gGlow   = `${uid}-gg`;
  const fBloom  = `${uid}-fb`;    // soft bloom filter
  const fSpec   = `${uid}-fsp`;   // specular filter

  /* ── soil-surface baseline ── */
  const SB = 72;  // y of soil surface (pot bigger now)

  /* ── leaf helpers ── */
  const Leaf = ({
    cx, cy, rx, ry, rot = 0, grad = gLeafL, op = 1,
  }: { cx: number; cy: number; rx: number; ry: number; rot?: number; grad?: string; op?: number }) => (
    <ellipse
      cx={cx} cy={cy} rx={rx} ry={ry} fill={`url(#${grad})`} opacity={op}
      transform={rot !== 0 ? `rotate(${rot} ${cx} ${cy})` : undefined}
    />
  );

  const Vein = ({ x1, y1, x2, y2 }: { x1: number; y1: number; x2: number; y2: number }) => (
    <line x1={x1} y1={y1} x2={x2} y2={y2}
      stroke={C.vein} strokeWidth="0.55" strokeLinecap="round" opacity="0.55" />
  );

  const Branch = ({
    d, w = 1.6,
  }: { d: string; w?: number }) => (
    <path d={d} stroke={`url(#${gStem})`} strokeWidth={w} strokeLinecap="round" fill="none" />
  );

  return (
    <svg
      /* Bigger viewBox: was 60×88, now 80×110 */
      width="80" height="110" viewBox="0 0 80 110"
      aria-label={`نبتة ${habitName} مستوى ${level}`}
      role="img"
      style={{
        overflow: "visible",
        filter: isDormant
          ? "none"
          : `drop-shadow(0 6px 20px rgba(34,197,94,0.22)) drop-shadow(0 2px 6px rgba(0,0,0,0.5))`,
      }}
    >
      <defs>
        {/* ── Stem ── */}
        <linearGradient id={gStem} x1="0" y1="1" x2="1" y2="0">
          <stop offset="0%"   stopColor={C.stemA} />
          <stop offset="45%"  stopColor={C.stemB} />
          <stop offset="100%" stopColor={C.stemC} />
        </linearGradient>

        {/* ── Leaf – light side (top-left lit) ── */}
        <radialGradient id={gLeafL} cx="30%" cy="28%" r="68%">
          <stop offset="0%"   stopColor={C.leafHL} stopOpacity="0.95" />
          <stop offset="30%"  stopColor={C.leafC}  stopOpacity="1"    />
          <stop offset="70%"  stopColor={C.leafB}  stopOpacity="1"    />
          <stop offset="100%" stopColor={C.leafA}  stopOpacity="0.95" />
        </radialGradient>

        {/* ── Leaf – dark side ── */}
        <radialGradient id={gLeafD} cx="70%" cy="72%" r="65%">
          <stop offset="0%"   stopColor={C.leafA} stopOpacity="0.98" />
          <stop offset="60%"  stopColor={C.leafB} stopOpacity="0.9"  />
          <stop offset="100%" stopColor={C.leafC} stopOpacity="0.8"  />
        </radialGradient>

        {/* ── Leaf – subsurface scatter (translucent backlit) ── */}
        <radialGradient id={gLeafSS} cx="50%" cy="50%" r="50%">
          <stop offset="0%"   stopColor={isDormant ? "#6b7280" : "#4ade80"} stopOpacity="0.35" />
          <stop offset="100%" stopColor={isDormant ? "#374151" : "#166534"} stopOpacity="0"   />
        </radialGradient>

        {/* ── Pot body ── */}
        <linearGradient id={gPot} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0%"   stopColor="#080808" />
          <stop offset="18%"  stopColor="#1a1a1a" />
          <stop offset="50%"  stopColor="#262626" />
          <stop offset="82%"  stopColor="#1a1a1a" />
          <stop offset="100%" stopColor="#060606" />
        </linearGradient>

        {/* ── Rim ── */}
        <linearGradient id={gRim} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%"   stopColor="#3d3d3d" />
          <stop offset="40%"  stopColor="#1e1e1e" />
          <stop offset="100%" stopColor="#090909" />
        </linearGradient>

        {/* ── Soil ── */}
        <radialGradient id={gSoil} cx="48%" cy="25%" r="72%">
          <stop offset="0%"   stopColor="#3d1f08" />
          <stop offset="55%"  stopColor="#1e0d04" />
          <stop offset="100%" stopColor="#0d0602" />
        </radialGradient>

        {/* ── Under-glow ── */}
        {!isDormant && (
          <radialGradient id={gGlow} cx="50%" cy="100%" r="50%">
            <stop offset="0%"   stopColor="rgba(34,197,94,0.3)" />
            <stop offset="100%" stopColor="rgba(34,197,94,0)"   />
          </radialGradient>
        )}

        {/* ── Soft bloom filter ── */}
        <filter id={fBloom} x="-25%" y="-25%" width="150%" height="150%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="1.2" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>

        {/* ── Specular highlight filter ── */}
        <filter id={fSpec} x="-10%" y="-10%" width="120%" height="120%">
          <feGaussianBlur in="SourceGraphic" stdDeviation="0.6" />
        </filter>
      </defs>

      {/* ══════════════════════════════════════════════
          GLOW UNDER PLANT
      ══════════════════════════════════════════════ */}
      {!isDormant && (
        <ellipse cx="40" cy="105" rx="36" ry="10" fill={`url(#${gGlow})`} opacity="0.6" />
      )}

      {/* ══════════════════════════════════════════════
          POT  (bigger — was ~60px wide, now ~70px)
      ══════════════════════════════════════════════ */}

      {/* Ground shadow */}
      <ellipse cx="40" cy="107" rx="22" ry="4" fill="rgba(0,0,0,0.6)" />

      {/* Saucer dish */}
      <ellipse cx="40" cy="103" rx="21" ry="3.5" fill={`url(#${gPot})`} />
      <path d="M 18 101.5 Q 40 106 62 101.5 L 61 103.5 Q 40 107.5 19 103.5 Z" fill="#070707" />
      <ellipse cx="40" cy="101.5" rx="22.5" ry="3.8" fill="none" stroke="#2a2a2a" strokeWidth="0.5" />

      {/* Main pot body (slightly wider trapezoid) */}
      <path d="M 22 90 L 58 90 L 55 102.5 L 25 102.5 Z" fill={`url(#${gPot})`} />
      {/* Subtle left highlight / right shadow */}
      <path d="M 22 90 L 30 90 L 28 102.5 L 25 102.5 Z" fill="rgba(255,255,255,0.04)" />
      <path d="M 52 90 L 58 90 L 55 102.5 L 50.5 102.5 Z" fill="rgba(0,0,0,0.3)" />
      {/* Pot belly specular streak */}
      <path d="M 28 92 L 52 92 L 51 94 L 29 94 Z" fill="rgba(255,255,255,0.055)" />

      {/* Top rim – 3 layers */}
      <rect x="18"  y="87"   width="44" height="3.2" rx="1.2" fill={`url(#${gRim})`} />
      <rect x="19"  y="84.5" width="42" height="2.8" rx="1"   fill={`url(#${gRim})`} />
      <rect x="17"  y="81.5" width="46" height="3.2" rx="1.2" fill={`url(#${gRim})`} />
      {/* Rim top highlight */}
      <rect x="17.5" y="81.5" width="46" height="1" rx="0.8" fill="rgba(255,255,255,0.14)" />
      {/* Rim inner shadow */}
      <ellipse cx="40" cy="84.5" rx="20" ry="1.5" fill="rgba(0,0,0,0.35)" />

      {/* Soil surface */}
      <ellipse cx="40" cy="82" rx="22" ry="4.2" fill={`url(#${gSoil})`} />
      {/* Soil moisture sheen */}
      <ellipse cx="38" cy="81.2" rx="10" ry="1.8" fill="rgba(255,255,255,0.055)" />
      {/* Soil pebble texture */}
      {Array.from({ length: 10 }).map((_, i) => (
        <circle
          key={i}
          cx={28 + r(i + 5) * 22}
          cy={81 + r(i + 15) * 2.5}
          r={0.5 + r(i + 25) * 1.1}
          fill="rgba(0,0,0,0.45)"
        />
      ))}

      {/* ══════════════════════════════════════════════
          PLANT  (animated sway)
      ══════════════════════════════════════════════ */}
      <motion.g
        animate={sway ? { rotate: [-1.8, 1.8, -1.8] } : undefined}
        transition={{
          duration: 3.8 + r(0) * 2.4,
          repeat: Infinity,
          ease: "easeInOut",
          repeatType: "mirror",
        }}
        style={{ transformOrigin: `40px ${SB}px` }}
      >

        {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
            LEVEL 1 – Seedling
        ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        {level >= 1 && (() => {
          const tip = SB - h;
          return (
            <>
              {/* Stem with slight S-curve */}
              <path
                d={`M 40 ${SB} C 40 ${SB - h * 0.35} 39 ${SB - h * 0.7} 40 ${tip}`}
                stroke={`url(#${gStem})`} strokeWidth="3.2" strokeLinecap="round" fill="none"
              />
              {/* First leaf pair – tiny cotyledons */}
              <Leaf cx={34} cy={SB - h * 0.75} rx={5.5} ry={2.4} rot={-42} grad={gLeafL} />
              <Leaf cx={46} cy={SB - h * 0.75} rx={5.5} ry={2.4} rot={42}  grad={gLeafD} />
              {/* Subsurface glow on leaves */}
              <Leaf cx={34} cy={SB - h * 0.75} rx={5.5} ry={2.4} rot={-42} grad={gLeafSS} op={0.6} />
              <Leaf cx={46} cy={SB - h * 0.75} rx={5.5} ry={2.4} rot={42}  grad={gLeafSS} op={0.5} />
              {/* Vein */}
              <Vein x1={38} y1={SB - h * 0.74} x2={31} y2={SB - h * 0.77} />
              <Vein x1={42} y1={SB - h * 0.74} x2={49} y2={SB - h * 0.77} />
              {/* Apical bud */}
              <circle cx={40} cy={tip} r={2.5} fill={`url(#${gLeafL})`} />
            </>
          );
        })()}

        {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
            LEVEL 2 – Sprout
        ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        {level >= 2 && (() => {
          const tip = SB - h;
          const midL = SB - h * 0.5;
          return (
            <>
              {/* Side branches */}
              <Branch d={`M 40 ${SB - h * 0.52} C 32 ${SB - h * 0.62} 22 ${SB - h * 0.52} 19 ${SB - h * 0.42}`} w={2} />
              <Branch d={`M 40 ${SB - h * 0.52} C 48 ${SB - h * 0.62} 58 ${SB - h * 0.52} 61 ${SB - h * 0.42}`} w={2} />

              {/* Left compound leaf */}
              <Leaf cx={19} cy={SB - h * 0.42} rx={10} ry={4.8} rot={-22} grad={gLeafL} />
              <Leaf cx={17} cy={SB - h * 0.44} rx={6.5} ry={3}   rot={-32} grad={gLeafD} op={0.75} />
              <Leaf cx={19} cy={SB - h * 0.42} rx={10} ry={4.8}  rot={-22} grad={gLeafSS} op={0.4} />
              <Vein x1={28} y1={SB-h*0.42} x2={12} y2={SB-h*0.41} />
              <Vein x1={25} y1={SB-h*0.44} x2={15} y2={SB-h*0.48} />

              {/* Right compound leaf */}
              <Leaf cx={61} cy={SB - h * 0.42} rx={10} ry={4.8} rot={22} grad={gLeafD} />
              <Leaf cx={63} cy={SB - h * 0.44} rx={6.5} ry={3}  rot={32} grad={gLeafL} op={0.75} />
              <Leaf cx={61} cy={SB - h * 0.42} rx={10} ry={4.8} rot={22} grad={gLeafSS} op={0.4} />
              <Vein x1={52} y1={SB-h*0.42} x2={68} y2={SB-h*0.41} />
              <Vein x1={55} y1={SB-h*0.44} x2={65} y2={SB-h*0.48} />

              {/* Top rosette */}
              <Leaf cx={40} cy={tip + 2}   rx={8}   ry={6}   grad={gLeafL} />
              <Leaf cx={33} cy={tip + 4}   rx={6}   ry={4}   rot={-18} grad={gLeafL} />
              <Leaf cx={47} cy={tip + 4}   rx={6}   ry={4}   rot={18}  grad={gLeafD} />
              <Leaf cx={40} cy={tip - 1}   rx={5.5} ry={4}   grad={gLeafL} />
              {/* Specular highlight */}
              <ellipse cx={38} cy={tip} rx={3} ry={2} fill={C.leafHL} opacity={0.3} filter={`url(#${fSpec})`} />
            </>
          );
        })()}

        {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
            LEVEL 3 – Young Bush
        ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        {level >= 3 && (() => {
          const tip = SB - h;
          return (
            <>
              {/* Mid branches */}
              <Branch d={`M 40 ${SB-h*0.68} C 32 ${SB-h*0.76} 22 ${SB-h*0.68} 18 ${SB-h*0.58}`} w={1.6} />
              <Branch d={`M 40 ${SB-h*0.68} C 48 ${SB-h*0.76} 58 ${SB-h*0.68} 62 ${SB-h*0.58}`} w={1.6} />

              <Leaf cx={17} cy={SB-h*0.58} rx={9}  ry={4.5} rot={-28} grad={gLeafL} />
              <Leaf cx={15} cy={SB-h*0.60} rx={6}  ry={3}   rot={-38} grad={gLeafD} op={0.7} />
              <Leaf cx={17} cy={SB-h*0.58} rx={9}  ry={4.5} rot={-28} grad={gLeafSS} op={0.35} />
              <Vein x1={26} y1={SB-h*0.58} x2={11} y2={SB-h*0.57} />

              <Leaf cx={63} cy={SB-h*0.58} rx={9}  ry={4.5} rot={28} grad={gLeafD} />
              <Leaf cx={65} cy={SB-h*0.60} rx={6}  ry={3}   rot={38} grad={gLeafL} op={0.7} />
              <Leaf cx={63} cy={SB-h*0.58} rx={9}  ry={4.5} rot={28} grad={gLeafSS} op={0.35} />
              <Vein x1={54} y1={SB-h*0.58} x2={69} y2={SB-h*0.57} />

              {/* Crown blob cluster */}
              <Leaf cx={40} cy={tip+3}  rx={13} ry={9.5} grad={gLeafD} />
              <Leaf cx={28} cy={tip+5}  rx={9}  ry={6.5} rot={-8}  grad={gLeafL} />
              <Leaf cx={52} cy={tip+5}  rx={9}  ry={6.5} rot={8}   grad={gLeafD} />
              <Leaf cx={40} cy={tip-1}  rx={11} ry={8}   grad={gLeafL} />
              <Leaf cx={40} cy={tip-7}  rx={7.5} ry={5.5} grad={gLeafL} />
              {/* SS glow on crown */}
              <Leaf cx={40} cy={tip+3}  rx={13} ry={9.5} grad={gLeafSS} op={0.28} />
              {/* Specular */}
              <ellipse cx={37} cy={tip-4} rx={4.5} ry={2.8} fill={C.leafHL} opacity={0.25} filter={`url(#${fSpec})`} />
              {/* Rim lighting (back-edge) */}
              <ellipse cx={40} cy={tip+12} rx={14} ry={3} fill={C.leafC} opacity={0.12} />
            </>
          );
        })()}

        {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
            LEVEL 4 – Bushy Tree
        ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        {level >= 4 && (() => {
          const tip = SB - h;
          return (
            <>
              {/* Lower wide branches */}
              <Branch d={`M 40 ${SB-h*0.32} C 28 ${SB-h*0.40} 16 ${SB-h*0.28} 12 ${SB-h*0.18}`} w={2.2} />
              <Branch d={`M 40 ${SB-h*0.32} C 52 ${SB-h*0.40} 64 ${SB-h*0.28} 68 ${SB-h*0.18}`} w={2.2} />

              <Leaf cx={11} cy={SB-h*0.18} rx={12} ry={5.5} rot={-14} grad={gLeafD} />
              <Leaf cx={9}  cy={SB-h*0.20} rx={7.5} ry={3.5} rot={-24} grad={gLeafL} op={0.8} />
              <Leaf cx={11} cy={SB-h*0.18} rx={12} ry={5.5} rot={-14} grad={gLeafSS} op={0.3} />
              <Vein x1={22} y1={SB-h*0.18} x2={6}  y2={SB-h*0.17} />
              <Vein x1={20} y1={SB-h*0.21} x2={8}  y2={SB-h*0.25} />

              <Leaf cx={69} cy={SB-h*0.18} rx={12} ry={5.5} rot={14} grad={gLeafL} />
              <Leaf cx={71} cy={SB-h*0.20} rx={7.5} ry={3.5} rot={24} grad={gLeafD} op={0.8} />
              <Leaf cx={69} cy={SB-h*0.18} rx={12} ry={5.5} rot={14} grad={gLeafSS} op={0.3} />
              <Vein x1={58} y1={SB-h*0.18} x2={74} y2={SB-h*0.17} />

              {/* Multi-layer canopy */}
              <Leaf cx={40} cy={tip+6}  rx={19} ry={14}  grad={gLeafD} op={0.88} />
              <Leaf cx={25} cy={tip+7}  rx={13} ry={9.5} rot={-6}  grad={gLeafL} />
              <Leaf cx={55} cy={tip+7}  rx={13} ry={9.5} rot={6}   grad={gLeafD} />
              <Leaf cx={40} cy={tip}    rx={15} ry={11.5} grad={gLeafL} />
              <Leaf cx={40} cy={tip-7}  rx={11} ry={8}   grad={gLeafL} />
              <Leaf cx={40} cy={tip-13} rx={7}  ry={5.5} grad={gLeafL} />
              {/* SS scatter */}
              <Leaf cx={40} cy={tip+6}  rx={19} ry={14}  grad={gLeafSS} op={0.22} />
              {/* Specular hotspot */}
              <ellipse cx={37} cy={tip-6} rx={5.5} ry={3.5} fill={C.leafHL} opacity={0.28} filter={`url(#${fSpec})`} />
              {/* Rim fringe */}
              <ellipse cx={40} cy={tip+19} rx={20} ry={3.5} fill={C.leafC} opacity={0.10} />
            </>
          );
        })()}

        {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
            LEVEL 5 – Full Tree
        ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        {level >= 5 && (() => {
          const tip = SB - h;
          return (
            <>
              {/* Simpler, more compact side branches */}
              <Branch d={`M 40 ${SB-h*0.2} C 30 ${SB-h*0.3} 20 ${SB-h*0.2} 15 ${SB-h*0.1}`} w={2.2} />
              <Branch d={`M 40 ${SB-h*0.2} C 50 ${SB-h*0.3} 60 ${SB-h*0.2} 65 ${SB-h*0.1}`} w={2.2} />

              <Leaf cx={15} cy={SB-h*0.1} rx={10} ry={5} rot={-10} grad={gLeafD} />
              <Leaf cx={65} cy={SB-h*0.1} rx={10} ry={5} rot={10} grad={gLeafL} />

              {/* Layered canopy - simplified and smaller to prevent overlapping */}
              <Leaf cx={40} cy={tip+10} rx={22} ry={16} grad={gLeafD} op={0.9} />
              <Leaf cx={26} cy={tip+12} rx={14} ry={10} rot={-5} grad={gLeafL} />
              <Leaf cx={54} cy={tip+12} rx={14} ry={10} rot={5} grad={gLeafD} />
              <Leaf cx={40} cy={tip} rx={16} ry={12} grad={gLeafL} />
              <Leaf cx={40} cy={tip-10} rx={12} ry={9} grad={gLeafL} />
              
              {/* SS scatter */}
              <Leaf cx={40} cy={tip+10} rx={22} ry={16} grad={gLeafSS} op={0.15} />
              {/* Specular */}
              <ellipse cx={37} cy={tip-10} rx={6} ry={4} fill={C.leafHL} opacity={0.25} filter={`url(#${fSpec})`} />
            </>
          );
        })()}

        {/* ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
            LEVEL 6 – Royal Fruit Tree
        ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━ */}
        {level >= 6 && (() => {
          const tip = SB - h;
          const fruits = [
            { cx: 30, cy: tip + 2, r: 3.5 },
            { cx: 50, cy: tip + 2, r: 3.5 },
            { cx: 40, cy: tip + 8, r: 3.5 },
            { cx: 22, cy: tip + 12, r: 2.8 },
            { cx: 58, cy: tip + 12, r: 2.8 },
            { cx: 40, cy: tip - 5, r: 3.0 },
          ];
          return (
            <>
              {/* Compact base branches */}
              <Branch d={`M 40 ${SB-h*0.15} C 25 ${SB-h*0.25} 12 ${SB-h*0.15} 8 ${SB-h*0.05}`} w={2.8} />
              <Branch d={`M 40 ${SB-h*0.15} C 55 ${SB-h*0.25} 68 ${SB-h*0.15} 72 ${SB-h*0.05}`} w={2.8} />

              <Leaf cx={8} cy={SB-h*0.05} rx={12} ry={6} rot={-6} grad={gLeafD} />
              <Leaf cx={72} cy={SB-h*0.05} rx={12} ry={6} rot={6} grad={gLeafL} />

              {/* Neat, compact majestic canopy */}
              <Leaf cx={40} cy={tip+15} rx={26} ry={20} grad={gLeafD} op={0.85} />
              <Leaf cx={22} cy={tip+15} rx={16} ry={12} rot={-5} grad={gLeafL} />
              <Leaf cx={58} cy={tip+15} rx={16} ry={12} rot={5} grad={gLeafD} />
              <Leaf cx={40} cy={tip+5} rx={20} ry={15} grad={gLeafL} />
              <Leaf cx={40} cy={tip-8} rx={16} ry={12} grad={gLeafL} />
              <Leaf cx={40} cy={tip-20} rx={10} ry={8} grad={gLeafL} />
              
              {/* SS scatter */}
              <Leaf cx={40} cy={tip+15} rx={26} ry={20} grad={gLeafSS} op={0.15} />
              {/* Specular hotspot */}
              <ellipse cx={36} cy={tip-8} rx={7} ry={5} fill={C.leafHL} opacity={0.3} filter={`url(#${fSpec})`} />

              {/* ── Fruits ── */}
              {fruits.map((f, i) =>
                !isDormant ? (
                  <g key={i}>
                    {/* Fruit body with gradient */}
                    <circle cx={f.cx} cy={f.cy} r={f.r} fill={C.fruitB} />
                    {/* Dark shadow side */}
                    <ellipse cx={f.cx + f.r * 0.3} cy={f.cy + f.r * 0.35} rx={f.r * 0.6} ry={f.r * 0.55}
                      fill={C.fruitA} opacity={0.7} />
                    {/* Specular highlight */}
                    <circle cx={f.cx - f.r * 0.32} cy={f.cy - f.r * 0.35} r={f.r * 0.32}
                      fill="rgba(255,255,255,0.55)" />
                    {/* Tiny stem */}
                    <line x1={f.cx} y1={f.cy - f.r} x2={f.cx} y2={f.cy - f.r - 2.5}
                      stroke={C.stemB} strokeWidth="0.9" strokeLinecap="round" />
                  </g>
                ) : (
                  <circle key={i} cx={f.cx} cy={f.cy} r={f.r * 0.85} fill="#374151" opacity={0.8} />
                )
              )}
            </>
          );
        })()}
      </motion.g>
    </svg>
  );
}
