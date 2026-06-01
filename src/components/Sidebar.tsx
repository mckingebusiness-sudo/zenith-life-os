import { Link, useRouterState } from "@tanstack/react-router";
import {
  Home, KanbanSquare, Flame, FileText, Calendar,
  Target, Lock, Wallet, BarChart3, Settings, Search,
  ChevronsLeft, ChevronsRight, GripVertical, LogOut,
  type LucideIcon,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useState } from "react";
import { useAuth } from "@/lib/useAuth";

const primary = [
  { to: "/dashboard", label: "الرئيسية", icon: Home },
  { to: "/kanban", label: "المشاريع", icon: KanbanSquare },
  { to: "/habits", label: "العادات", icon: Flame },
  { to: "/notes", label: "الملاحظات", icon: FileText },
  { to: "/calendar", label: "التقويم", icon: Calendar },
  { to: "/goals", label: "الأهداف", icon: Target },
] as const;

const secondary = [
  { to: "/vault", label: "الخزنة", icon: Lock },
  { to: "/expenses", label: "المصاريف", icon: Wallet },
  { to: "/analytics", label: "التحليلات", icon: BarChart3 },
  { to: "/settings", label: "الإعدادات", icon: Settings },
] as const;

export default function Sidebar({
  collapsed,
  onToggle,
  width = 256,
  onDragStart,
}: {
  collapsed: boolean;
  onToggle: () => void;
  width?: number;
  onDragStart?: () => void;
}) {
  const [dragging, setDragging] = useState(false);
  const { profile, signOut } = useAuth();
  return (
    <motion.aside
      animate={{ width: collapsed ? 72 : width }}
      transition={{ type: "spring", damping: 26, stiffness: 220 }}
      className="relative shrink-0 border-r border-white/[0.06] bg-black/30 backdrop-blur-xl flex flex-col gap-4 p-3 sticky top-0 h-screen overflow-hidden"
    >
      {/* Drag handle on the inner edge (visually right in RTL = DOM left) */}
      {!collapsed && (
        <div
          onMouseDown={(e) => {
            e.preventDefault();
            const startX = e.clientX;
            let moved = false;
            const mv = (ev: MouseEvent) => {
              if (Math.abs(ev.clientX - startX) > 3 && !moved) {
                moved = true;
                setDragging(true);
                onDragStart?.();
              }
            };
            const up = () => {
              if (!moved) onToggle();
              setDragging(false);
              window.removeEventListener("mousemove", mv);
              window.removeEventListener("mouseup", up);
            };
            window.addEventListener("mousemove", mv);
            window.addEventListener("mouseup", up);
          }}
          className="absolute top-0 right-0 h-full w-2 cursor-ew-resize z-30 group flex items-center justify-center"
        >
          <div className="absolute inset-y-0 left-1/2 -translate-x-1/2 w-px bg-green-500/15 group-hover:bg-green-400/70 transition-all" />
          <motion.div
            animate={{ opacity: dragging ? 1 : 0, scale: dragging ? 1 : 0.85 }}
            whileHover={{ opacity: 1, scale: 1 }}
            className="relative z-10 w-5 h-10 rounded-md flex items-center justify-center bg-[#0b1410] border border-green-400/40 shadow-[0_0_18px_rgba(74,222,128,0.5)]"
          >
            <GripVertical size={12} className="text-[#4ADE80]" />
          </motion.div>
          {/* Cursor-style hint tooltip */}
          <div className="absolute top-1/2 -translate-y-1/2 right-6 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
            <div className="px-2.5 py-1.5 rounded-md bg-[#1a1a1a]/95 border border-white/10 shadow-2xl text-[11px] text-white whitespace-nowrap leading-tight">
              <div><span className="font-semibold">Close</span> <span className="text-[#999]">Click</span></div>
              <div><span className="font-semibold">Resize</span> <span className="text-[#999]">Drag</span></div>
            </div>
          </div>
          <AnimatePresence>
            {dragging && (
              <motion.div
                initial={{ opacity: 0, x: -6 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0 }}
                className="absolute top-4 right-6 px-2 py-1 rounded-md bg-black/80 border border-green-400/40 text-[10px] text-[#4ADE80] tabular whitespace-nowrap"
              >
                {Math.round(width)}px
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
      {/* Brand + collapse toggle */}
      <div className="flex items-center gap-3 px-1 py-2">
        <div
          className="w-10 h-10 rounded-xl flex items-center justify-center text-lg font-bold shrink-0"
          style={{
            background: "linear-gradient(135deg, #15803D, #4ADE80)",
            boxShadow: "0 0 18px rgba(34,197,94,0.4)",
          }}
        >
          ∞
        </div>
        {!collapsed && (
          <div className="flex-1 min-w-0">
            <div className="text-sm font-bold">Zenith</div>
            <div className="text-[10px] text-[#647067]">زينيث لايف OS</div>
          </div>
        )}
        <button
          onClick={onToggle}
          title={collapsed ? "توسيع" : "تصغير"}
          className="w-8 h-8 rounded-lg hover:bg-white/[0.06] flex items-center justify-center text-[#A7B3AB] hover:text-white transition shrink-0"
        >
          {collapsed ? <ChevronsRight size={15} /> : <ChevronsLeft size={15} />}
        </button>
      </div>

      {!collapsed && (
        <button className="flex items-center gap-2 px-3 py-2 rounded-xl bg-white/[0.03] border border-white/[0.06] text-[12px] text-[#A7B3AB] hover:bg-white/[0.05] transition">
          <Search size={13} />
          <span className="flex-1 text-right">بحث...</span>
          <span className="text-[10px] text-[#647067]">⌘K</span>
        </button>
      )}

      <nav className="flex flex-col gap-1">
        {primary.map((item) => (
          <NavItem key={item.to} {...item} collapsed={collapsed} />
        ))}
      </nav>

      <div className="h-px bg-white/[0.06] my-2" />

      <nav className="flex flex-col gap-1">
        {secondary.map((item) => (
          <NavItem key={item.to} {...item} collapsed={collapsed} small />
        ))}
      </nav>

      <div className="mt-auto flex flex-col gap-3">
        {!collapsed ? (
          <div
            className="rounded-2xl p-3 flex items-center gap-3"
            style={{
              background: "linear-gradient(135deg, rgba(34,197,94,0.08), rgba(13,20,16,0.6))",
              border: "1px solid rgba(34,197,94,0.2)",
            }}
          >
            <MiniRing value={83} />
            <div>
              <div className="text-[10px] text-[#647067] uppercase tracking-wider">Life Score</div>
              <div className="text-lg font-bold tabular text-grad-green">83</div>
            </div>
          </div>
        ) : (
          <div className="flex justify-center"><MiniRing value={83} /></div>
        )}

        <div className="flex items-center gap-3 px-1 py-2 rounded-xl hover:bg-white/[0.03] transition cursor-pointer">
          <div className="relative w-9 h-9 rounded-full bg-gradient-to-br from-[#15803D] to-[#4ADE80] flex items-center justify-center text-sm font-bold shrink-0">
            {(profile?.full_name?.[0] || profile?.username?.[0] || "م").toUpperCase()}
            <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-green-400 border-2 border-black" />
          </div>
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <div className="text-[12px] font-semibold truncate">{profile?.full_name || profile?.username || "المستخدم"}</div>
              <div className="text-[10px] text-[#647067]">{profile?.subscription_plan || "free"}</div>
            </div>
          )}
          <button
            onClick={signOut}
            title="تسجيل الخروج"
            className="w-7 h-7 rounded-lg hover:bg-red-500/10 flex items-center justify-center text-[#647067] hover:text-red-400 transition shrink-0"
          >
            <LogOut size={13} />
          </button>
        </div>
      </div>
    </motion.aside>
  );
}

function NavItem({ to, label, icon: Icon, small, collapsed }: { to: string; label: string; icon: LucideIcon; small?: boolean; collapsed: boolean }) {
  const pathname = useRouterState({ select: (s) => s.location.pathname });
  const isActive = pathname === to;
  return (
    <Link
      to={to}
      title={collapsed ? label : undefined}
      className={`relative flex items-center gap-3 px-3 py-2 rounded-lg transition-all text-[13px] ${
        collapsed ? "justify-center" : ""
      } ${
        isActive
          ? "text-[#4ADE80] bg-white/[0.03]"
          : `${small ? "text-[#647067]" : "text-[#A7B3AB]"} hover:text-white hover:bg-white/[0.03]`
      }`}
    >
      {isActive && (
        <span
          className="absolute left-0 top-1/2 -translate-y-1/2 w-0.5 h-5 rounded-full bg-green-400"
          style={{ boxShadow: "0 0 8px rgba(74,222,128,0.8)" }}
        />
      )}
      <Icon size={16} className="shrink-0" />
      {!collapsed && <span>{label}</span>}
    </Link>
  );
}

function MiniRing({ value }: { value: number }) {
  const r = 18;
  const c = 2 * Math.PI * r;
  const offset = c - (value / 100) * c;
  return (
    <svg width="44" height="44" viewBox="0 0 44 44" className="-rotate-90 shrink-0">
      <defs>
        <linearGradient id="miniRing" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#15803D" />
          <stop offset="100%" stopColor="#4ADE80" />
        </linearGradient>
      </defs>
      <circle cx="22" cy="22" r={r} stroke="rgba(255,255,255,0.08)" strokeWidth="3" fill="none" />
      <circle
        cx="22" cy="22" r={r}
        stroke="url(#miniRing)" strokeWidth="3" fill="none" strokeLinecap="round"
        strokeDasharray={c} strokeDashoffset={offset}
      />
    </svg>
  );
}
