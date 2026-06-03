import { HabitWithStreak } from "@/hooks/useHabits";
import { buildHabitReportSnapshot, getAiAnalysisDataset, getMonthStats } from "./habitAnalyticsEngine";
import { usePendingWrites } from "@/stores/usePendingWrites";
import { getLocalDateString } from "./habitCalculations";

/**
 * Generates stable snapshot data for PDF exporting and AI analysis.
 * Explicitly blocks generation if there are pending database writes,
 * ensuring the report or analysis is based on fully confirmed data.
 */
export function generateStableReportData(habits: HabitWithStreak[], targetDate: Date) {
  const status = usePendingWrites.getState().getDataStatus();
  
  if (status === "syncing") {
    throw new Error("PENDING_WRITES");
  }

  const dateStr = getLocalDateString(targetDate);
  const snapshot = buildHabitReportSnapshot(habits, dateStr);
  const aiDataset = getAiAnalysisDataset(habits, targetDate);
  const monthStats = getMonthStats(habits, targetDate);

  return {
    snapshot,
    aiDataset,
    monthStats
  };
}
