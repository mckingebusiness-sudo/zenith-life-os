import { useMemo } from "react";

type Cell = { day: string; count: number; isFreeze: boolean };
type Props = { days: Cell[]; target: number; color: string; year: number };

function levelOf(count: number, target: number): 0 | 1 | 2 | 3 | 4 {
  if (count <= 0) return 0;
  const r = count / Math.max(1, target);
  return r >= 1 ? 4 : r >= 0.66 ? 3 : r >= 0.33 ? 2 : 1;
}

function buildGrid(days: Cell[], year: number) {
  const map = new Map(days.map((d) => [d.day, d]));
  const start = new Date(Date.UTC(year, 0, 1));
  const weeks: Cell[][] = [];
  const cursor = new Date(start);
  
  // Go back to the nearest Sunday
  cursor.setUTCDate(cursor.getUTCDate() - cursor.getUTCDay());
  
  for (let w = 0; w < 53; w++) {
    const week: Cell[] = [];
    for (let d = 0; d < 7; d++) {
      const key = cursor.toISOString().slice(0, 10);
      week.push(map.get(key) ?? { day: key, count: 0, isFreeze: false });
      cursor.setUTCDate(cursor.getUTCDate() + 1);
    }
    weeks.push(week);
  }
  return weeks;
}

// Map color names to CSS variables or hex values
const colors: Record<string, string> = {
  gray: "#9CA3AF",
  brown: "#A52A2A",
  orange: "#F97316",
  yellow: "#EAB308",
  green: "#22C55E",
  blue: "#3B82F6",
  purple: "#A855F7",
  pink: "#EC4899",
  red: "#EF4444",
};

export function HabitHeatmap({ days, target, color, year }: Props) {
  const weeks = useMemo(() => buildGrid(days, year), [days, year]);
  const opacity = [0.08, 0.32, 0.55, 0.78, 1];
  const colorValue = colors[color] || colors.blue;

  return (
    <div className="flex gap-[3px] overflow-x-auto pb-2 scrollbar-thin" role="img" aria-label={`خريطة الالتزام لعام ${year}`}>
      {weeks.map((week, wi) => (
        <div key={wi} className="flex flex-col gap-[3px]">
          {week.map((cell) => {
            const lvl = levelOf(cell.count, target);
            return (
              <span
                key={cell.day}
                title={`${cell.day}: ${cell.count}`}
                className="h-[11px] w-[11px] rounded-[2px] shrink-0"
                style={{
                  backgroundColor: cell.isFreeze ? "transparent" : colorValue,
                  opacity: cell.isFreeze ? 1 : opacity[lvl],
                  boxShadow: cell.isFreeze ? "inset 0 0 0 1px rgba(255,255,255,0.1)" : undefined,
                  backgroundImage: cell.isFreeze
                    ? "repeating-linear-gradient(45deg, transparent, transparent 2px, rgba(255,255,255,0.1) 2px, rgba(255,255,255,0.1) 3px)"
                    : undefined,
                }}
              />
            );
          })}
        </div>
      ))}
    </div>
  );
}
