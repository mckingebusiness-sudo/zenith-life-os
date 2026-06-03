import { useState, useEffect, useRef, type ReactNode } from "react";
import Sidebar from "./Sidebar";
import TopBar from "./TopBar";
import BackgroundFX from "./BackgroundFX";
import AIPanel, { AITrigger } from "./AIFloatingButton";
import { useDirection } from "@/stores/useDirection";
import { useHabits } from "@/hooks/useHabits";
import { toast } from "sonner";

// ─── AppShell ──────────────────────────────────────────────────────────────
export default function AppShell({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(256);
  const [aiOpen, setAiOpen] = useState(false);
  
  const [sidebarSide, setSidebarSide] = useState<"left" | "right">(() => {
    if (typeof window !== "undefined") {
      return (localStorage.getItem("zenith-sidebar-side") as "left" | "right") || "right";
    }
    return "right";
  });

  const draggingSidebar = useRef(false);
  const { dir } = useDirection();
  const { addHabitAsync, deleteHabit, updateHabitAsync, habits } = useHabits();

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "j") {
        e.preventDefault();
        setAiOpen((v) => !v);
      }
      if (e.key === "Escape") setAiOpen(false);
      if ((e.ctrlKey || e.metaKey) && e.key === "\\") {
        e.preventDefault();
        setAiOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  useEffect(() => {
    const move = (e: MouseEvent) => {
      if (!draggingSidebar.current) return;
      // If sidebar is on the right, dragging left means smaller X, so width = window.innerWidth - e.clientX
      // If sidebar is on the left, dragging right means bigger X, so width = e.clientX
      const newWidth = sidebarSide === "right" ? window.innerWidth - e.clientX : e.clientX;
      setSidebarWidth(Math.min(420, Math.max(72, newWidth)));
    };
    const up = () => (draggingSidebar.current = false);
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
    return () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
    };
  }, [sidebarSide]);

  const toggleSidebarSide = () => {
    setSidebarSide(s => {
      const n = s === "left" ? "right" : "left";
      localStorage.setItem("zenith-sidebar-side", n);
      return n;
    });
  };

  const isRowFlow = (sidebarSide === "right" && dir === "rtl") || (sidebarSide === "left" && dir === "ltr");

  return (
    <div className="relative min-h-screen text-foreground">
      <BackgroundFX />
      <div className={`relative z-10 flex min-h-screen ${isRowFlow ? "flex-row" : "flex-row-reverse"}`}>
        {/* Sidebar */}
        <div className="print:hidden">
          <Sidebar
            collapsed={collapsed}
            width={collapsed ? 72 : sidebarWidth}
            onToggle={() => setCollapsed((v) => !v)}
            onDragStart={() => (draggingSidebar.current = true)}
            side={sidebarSide}
            onToggleSide={toggleSidebarSide}
          />
        </div>

        {/* Main */}
        <div className="flex-1 flex flex-col min-w-0">
          <div className="print:hidden">
            <TopBar />
          </div>
          <main className="flex-1 px-8 pt-6 print:p-0 print:m-0">{children}</main>
        </div>

        {/* AI Panel */}
        <div className="print:hidden">
          <AIPanel
            open={aiOpen}
            onClose={() => setAiOpen(false)}
            onAddHabit={async (habit) => {
              try {
                const res = await addHabitAsync({
                  title: habit.title,
                  icon: habit.icon,
                  color: habit.color,
                  cadence: "daily",
                  target_per_period: 1,
                  sort_order: 0,
                  habit_type: (habit.habit_type === 'quit' ? 'quit' : 'good') as any,
                });
                alert("DEBUG SUCCESS: " + JSON.stringify(res));
              } catch (e: any) {
                alert("خطأ أثناء الحفظ في الداتا بيز: " + (e.message || JSON.stringify(e)));
                throw e;
              }
            }}
            onDeleteHabit={async (id) => {
              await deleteHabit(id);
            }}
            onUpdateHabit={async (id, updates) => {
              await updateHabitAsync(id, updates as any);
            }}
            side={sidebarSide}
          />
        </div>
      </div>

      {/* Floating trigger */}
      {!aiOpen && (
        <div className="print:hidden">
          <AITrigger onClick={() => setAiOpen(true)} side={sidebarSide} />
        </div>
      )}
    </div>
  );
}
