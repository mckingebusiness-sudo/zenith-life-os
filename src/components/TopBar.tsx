import { Bell, Plus, Languages } from "lucide-react";
import { useDirection } from "@/stores/useDirection";

export default function TopBar() {
  const { dir, toggleDir } = useDirection();

  return (
    <header className="flex items-center justify-between px-8 py-5 border-b border-white/[0.04]">
      <div className="flex items-center gap-2 text-[12px] text-[#647067]">
        <span>∞</span>
        <span className="tracking-[0.2em] uppercase">Mission Control</span>
      </div>
      <div className="flex items-center gap-3">
        {/* RTL/LTR Toggle */}
        <button
          onClick={toggleDir}
          className="h-9 px-3 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06] flex items-center gap-2 transition group"
          title={dir === "rtl" ? "تبديل إلى اليسار" : "Switch to RTL"}
        >
          <Languages size={15} className="text-[#A7B3AB] group-hover:text-white transition" />
          <span className="text-[10px] font-bold text-[#647067] group-hover:text-[#A7B3AB] transition tracking-wide">
            {dir === "rtl" ? "LTR" : "RTL"}
          </span>
        </button>

        <button className="w-9 h-9 rounded-xl bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06] flex items-center justify-center transition">
          <Bell size={15} />
        </button>
        <button
          className="w-9 h-9 rounded-xl flex items-center justify-center"
          style={{
            background: "linear-gradient(135deg, #15803D, #22C55E)",
            boxShadow: "0 0 16px rgba(34,197,94,0.35)",
          }}
        >
          <Plus size={15} />
        </button>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/[0.03] border border-white/[0.06] text-[11px]">
          <span className="text-[#4ADE80] font-bold">Lv 7</span>
          <span className="text-[#647067]">·</span>
          <span className="tabular text-[#A7B3AB]">6,500 XP</span>
        </div>
      </div>
    </header>
  );
}