import { useState, useEffect, useRef, type ReactNode } from "react";
import Sidebar from "./Sidebar";
import TopBar from "./TopBar";
import BackgroundFX from "./BackgroundFX";
import AIPanel, { AITrigger } from "./AIFloatingButton";
import { useDirection } from "@/stores/useDirection";
import { useHabits } from "@/hooks/useHabits";

export default function AppShell({ children }: { children: ReactNode }) {
  const [collapsed, setCollapsed] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(256);
  const [aiOpen, setAiOpen] = useState(false);
  const draggingSidebar = useRef(false);
  const { dir } = useDirection();
  const { addHabitAsync, deleteHabit, habits } = useHabits();

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
      setSidebarWidth(Math.min(420, Math.max(72, e.clientX)));
    };
    const up = () => (draggingSidebar.current = false);
    window.addEventListener("mousemove", move);
    window.addEventListener("mouseup", up);
    return () => {
      window.removeEventListener("mousemove", move);
      window.removeEventListener("mouseup", up);
    };
  }, [dir]);

  return (
    <div className="relative min-h-screen text-foreground">
      <BackgroundFX />
      <div className={`relative z-10 flex min-h-screen ${dir === "rtl" ? "flex-row-reverse" : "flex-row"}`}>
        {/* Sidebar */}
        <div className="print:hidden">
          <Sidebar
            collapsed={collapsed}
            width={collapsed ? 72 : sidebarWidth}
            onToggle={() => setCollapsed((v) => !v)}
            onDragStart={() => (draggingSidebar.current = true)}
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
              await addHabitAsync({
                title: habit.title,
                icon: habit.icon,
                color: habit.color,
                cadence: "daily",
                target_per_period: 1,
                sort_order: 0,
                habit_type: (habit.habit_type === 'quit' ? 'quit' : 'good') as any,
              });
            }}
            onDeleteHabit={async (title) => {
              // Find by title (case-insensitive) from in-memory list
              const found = habits.find((h) =>
                h.title.toLowerCase().includes(title.toLowerCase())
              );
              if (found) {
                await deleteHabit(found.id);
              }
            }}
          />
        </div>
      </div>

      {/* Floating trigger */}
      {!aiOpen && <div className="print:hidden"><AITrigger onClick={() => setAiOpen(true)} /></div>}
    </div>
  );
}
