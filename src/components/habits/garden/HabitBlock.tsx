import { ReactNode } from "react";

interface HabitBlockProps {
  isDormant?: boolean;
  isFrozen?: boolean;
  level: number;
  children: ReactNode;
}

export default function HabitBlock({ isDormant, isFrozen, level, children }: HabitBlockProps) {
  // We use a beautiful glassmorphic planter box look
  let borderColor = "border-white/10";
  let bgColor = "bg-white/5";
  let shadow = "shadow-[0_15px_30px_rgba(0,0,0,0.4)]";

  if (isDormant) {
    borderColor = "border-orange-500/20";
    bgColor = "bg-orange-500/5";
    shadow = "shadow-[0_15px_30px_rgba(249,115,22,0.1)]";
  } else if (isFrozen) {
    borderColor = "border-blue-400/30";
    bgColor = "bg-blue-400/10";
    shadow = "shadow-[0_15px_30px_rgba(56,189,248,0.2)]";
  } else if (level >= 5) {
    borderColor = "border-green-400/30";
    bgColor = "bg-green-400/10";
    shadow = "shadow-[0_15px_30px_rgba(34,197,94,0.2)]";
  }

  return (
    <div className={`relative flex flex-col items-center p-4 rounded-[2rem] border ${borderColor} ${bgColor} ${shadow} backdrop-blur-md transition-all duration-300 group-hover:-translate-y-2 group-hover:bg-white/10 w-full`}>
      {/* 3D Planter soil base */}
      <div className="absolute bottom-4 left-1/2 -translate-x-1/2 w-24 h-6 rounded-[100%] bg-black/40 blur-[2px] shadow-[inset_0_-2px_10px_rgba(0,0,0,0.8)] border border-white/5" />
      
      {/* The Plant */}
      <div className="relative w-28 h-32 flex items-end justify-center z-10 mb-8">
        {children}
      </div>
    </div>
  );
}
