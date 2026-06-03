import type { HabitWithStreak } from "@/hooks/useHabits";
import { calculateDayProgress, getLocalDateString, isHabitHandledOnDay, habitExistsOnDate, tz } from "./habitCalculations";

export interface HabitReportSnapshot {
  date: string;
  totalHabits: number;
  handledCount: number;
  percentage: number;
  completedGood: number;
  avoidedBad: number;
  monthStats: {
    totalDays: number;
    perfectDays: number;
    averagePercentage: number;
    dailyData: { date: string; percentage: number; isPerfect: boolean }[];
  };
  habitsDetails: {
    id: string;
    title: string;
    type: 'good' | 'quit';
    currentStreak: number;
    longestStreak: number;
    monthlyConsistency: number; // percentage
  }[];
}

/**
 * Builds a deterministic snapshot of all habit data for the current month and day.
 * This should be passed to the PrintableReport or used as the source of truth for Analytics.
 */
export function buildHabitReportSnapshot(habits: HabitWithStreak[], targetDateStr?: string): HabitReportSnapshot {
  const dateStr = targetDateStr || getLocalDateString();
  const dayProgress = calculateDayProgress(habits, dateStr, false);
  const monthStats = getMonthStats(habits, new Date(dateStr));

  const habitsDetails = habits.map(h => {
    return {
      id: h.id,
      title: h.title,
      type: h.habit_type || 'good',
      currentStreak: h.streak?.current_streak || 0,
      longestStreak: h.streak?.longest_streak || 0,
      monthlyConsistency: calculateHabitMonthlyConsistency(h, new Date(dateStr)),
    };
  });

  return {
    date: dateStr,
    totalHabits: dayProgress.totalItems,
    handledCount: dayProgress.totalSuccess,
    percentage: dayProgress.percentage,
    completedGood: dayProgress.completedGood,
    avoidedBad: dayProgress.avoidedBad,
    monthStats,
    habitsDetails,
  };
}

/**
 * Calculates aggregated statistics for a given month based on central rules.
 */
export function getMonthStats(habits: HabitWithStreak[], dateInMonth: Date = new Date()) {
  const year = dateInMonth.getFullYear();
  const month = dateInMonth.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const todayStr = getLocalDateString();

  let perfectDays = 0;
  let totalPercentage = 0;
  const dailyData: { date: string; percentage: number; isPerfect: boolean }[] = [];

  for (let i = 1; i <= daysInMonth; i++) {
    const dStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
    const isFuture = dStr > todayStr;
    
    if (isFuture) continue;

    const dp = calculateDayProgress(habits, dStr, isFuture);
    
    // perfect means 100% and there was at least 1 habit active that day
    const isPerfect = dp.percentage === 100 && dp.totalItems > 0;
    if (isPerfect) perfectDays++;
    
    totalPercentage += dp.percentage;
    
    dailyData.push({
      date: dStr,
      percentage: dp.percentage,
      isPerfect,
    });
  }

  const pastDaysCount = dailyData.length;
  const averagePercentage = pastDaysCount > 0 ? Math.round(totalPercentage / pastDaysCount) : 0;

  return {
    totalDays: pastDaysCount,
    perfectDays,
    averagePercentage,
    dailyData,
  };
}

/**
 * Calculates a single habit's consistency percentage for the current month.
 */
function calculateHabitMonthlyConsistency(habit: HabitWithStreak, dateInMonth: Date): number {
  const year = dateInMonth.getFullYear();
  const month = dateInMonth.getMonth();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const todayStr = getLocalDateString();
  
  const createdStr = habit.created_at 
    ? new Intl.DateTimeFormat("en-CA", { timeZone: tz() }).format(new Date(habit.created_at))
    : "1970-01-01";

  let handledDays = 0;
  let validDays = 0;

  for (let i = 1; i <= daysInMonth; i++) {
    const dStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
    if (dStr > todayStr) continue;
    if (dStr < createdStr) continue;

    validDays++;
    if (isHabitHandledOnDay(habit, dStr)) {
      handledDays++;
    }
  }

  return validDays > 0 ? Math.round((handledDays / validDays) * 100) : 0;
}

/**
 * Builds a dataset optimized for AI Analysis processing.
 * Extracts rich stats to prevent AI hallucination.
 */
export function getAiAnalysisDataset(habits: HabitWithStreak[], dateInMonth: Date = new Date()) {
  const snapshot = buildHabitReportSnapshot(habits, getLocalDateString(dateInMonth));
  
  const goodHabits = habits.filter(h => h.habit_type !== 'quit');
  const badHabits = habits.filter(h => h.habit_type === 'quit');

  return {
    summary: {
      averageCompletion: snapshot.monthStats.averagePercentage,
      perfectDays: snapshot.monthStats.perfectDays,
      totalDaysTracked: snapshot.monthStats.totalDays,
    },
    goodHabits: goodHabits.map(h => ({
      title: h.title,
      currentStreak: h.streak?.current_streak || 0,
      longestStreak: h.streak?.longest_streak || 0,
      consistency: snapshot.habitsDetails.find(d => d.id === h.id)?.monthlyConsistency || 0,
      checkedToday: h.checkedToday,
      frozenToday: h.frozenToday,
      strength: calculateHabitStrength(h),
    })),
    quitHabits: badHabits.map(h => ({
      title: h.title,
      currentStreak: h.streak?.current_streak || 0,
      longestStreak: h.streak?.longest_streak || 0,
      consistency: snapshot.habitsDetails.find(d => d.id === h.id)?.monthlyConsistency || 0,
      avoidedToday: h.checkedToday && !h.frozenToday, // explicitly checked
      relapsedToday: h.relapsedToday,
      risk: calculateBadHabitRisk(h),
    }))
  };
}

// ─── SPRINT 2 ENHANCEMENTS ──────────────────────────────────────────────

export type HabitDayStatus = 'not_created' | 'pending' | 'completed' | 'missed' | 'frozen' | 'relapsed' | 'open_today';

/**
 * Returns the exact state of a habit for a given day.
 * Used for rendering UI chips (Status Chips).
 */
export function buildHabitDayState(
  habit: HabitWithStreak,
  dateStr: string
): HabitDayStatus {
  const todayStr = getLocalDateString();
  const isToday = dateStr === todayStr;
  const isFuture = dateStr > todayStr;
  
  if (isFuture) return 'pending';
  
  if (!habitExistsOnDate(habit, dateStr)) return 'not_created';
  
  if (habit.freezes?.has(dateStr)) return 'frozen';
  if (habit.relapses?.has(dateStr)) return 'relapsed';
  
  const hasCheckin = !!habit.checkins?.has(dateStr);
  
  if (habit.habit_type === 'quit') {
    if (hasCheckin) return 'completed';
    if (isToday) return 'open_today';
    return 'completed'; // Past avoidances without relapse auto-succeed
  } else {
    if (hasCheckin) return 'completed';
    if (isToday) return 'open_today';
    return 'missed';
  }
}

/**
 * Calculates a Habit Strength Metric (0-100%).
 * A holistic score representing the "health" of a habit.
 */
export function calculateHabitStrength(habit: HabitWithStreak): number {
  const today = new Date();
  const todayStr = getLocalDateString(today);
  const createdStr = habit.created_at ? getLocalDateString(new Date(habit.created_at)) : '1970-01-01';
  
  let handled7 = 0;
  let valid7 = 0;
  let handled30 = 0;
  let valid30 = 0;
  
  // Last 30 days strictly
  for (let i = 1; i <= 30; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    const dStr = getLocalDateString(d);
    
    if (dStr < createdStr) continue;
    
    valid30++;
    if (isHabitHandledOnDay(habit, dStr)) handled30++;
    
    if (i <= 7) {
      valid7++;
      if (isHabitHandledOnDay(habit, dStr)) handled7++;
    }
  }
  
  // If the habit was created today, we can't calculate a meaningful historical consistency.
  // We start it at a baseline, e.g., 20%.
  if (valid30 === 0) {
    if (habit.checkedToday) return 30;
    return 20;
  }
  
  const consistency7 = valid7 > 0 ? (handled7 / valid7) : 0;
  const consistency30 = valid30 > 0 ? (handled30 / valid30) : 0;
  
  const currentStreak = habit.streak?.current_streak || 0;
  const longestStreak = habit.streak?.longest_streak || 1;
  const streakRatio = Math.min(1, currentStreak / longestStreak);
  
  // Base Score: 45% (7-day), 40% (30-day), 15% (streak ratio)
  let score = (consistency7 * 45) + (consistency30 * 40) + (streakRatio * 15);
  
  // Penalty: recent freezes or relapses
  let freezes30 = 0;
  if (habit.freezes) {
    const thresholdDate = new Date(today.getTime() - 30 * 86400000);
    const thresholdStr = getLocalDateString(thresholdDate);
    for (const f of habit.freezes) {
      if (f >= thresholdStr && f <= todayStr) freezes30++;
    }
  }
  
  const freezePenalty = Math.min(15, freezes30 * 3); // 3% penalty per freeze, max 15%
  score = Math.max(0, score - freezePenalty);
  
  return Math.round(score);
}

export function calculateBadHabitRisk(habit: HabitWithStreak): number {
  if (habit.habit_type !== 'quit') return 0;
  
  const today = new Date();
  const todayStr = getLocalDateString(today);
  
  // Base risk starts low, climbs drastically upon relapse
  let risk = 20; 
  
  // Relapse factor
  let relapses7 = 0;
  let relapses30 = 0;
  
  if (habit.relapses) {
    const d7 = new Date(today.getTime() - 7 * 86400000);
    const d7Str = getLocalDateString(d7);
    const d30 = new Date(today.getTime() - 30 * 86400000);
    const d30Str = getLocalDateString(d30);
    
    for (const r of habit.relapses) {
      if (r >= d7Str && r <= todayStr) relapses7++;
      if (r >= d30Str && r <= todayStr) relapses30++;
    }
  }
  
  // Heavy penalty for recent relapses
  risk += (relapses7 * 30);
  risk += ((relapses30 - relapses7) * 10); 
  
  // Streak factor - reward for maintaining distance
  const currentStreak = habit.streak?.current_streak || 0;
  if (currentStreak > 30) risk -= 30;
  else if (currentStreak > 14) risk -= 20;
  else if (currentStreak > 7) risk -= 10;
  
  return Math.min(100, Math.max(0, Math.round(risk)));
}

/**
 * Calculates the Habit-Driven Life Score (Sprint 4)
 * Formula: Daily Progress (50%) + Habit Strength Avg (25%) + Bad Habit Safety (15%) + Trend (10%)
 */
export function calculateLifeScore(habits: HabitWithStreak[]): {
  score: number;
  dailyProgress: number;
  strengthAverage: number;
  safetyScore: number;
  trendScore: number;
} {
  if (!habits || habits.length === 0) {
    return { score: 0, dailyProgress: 0, strengthAverage: 0, safetyScore: 0, trendScore: 0 };
  }

  const todayStr = getLocalDateString();
  const dayProgress = calculateDayProgress(habits, todayStr, false);
  const dailyProgress = dayProgress.percentage; // 50%

  const goodHabits = habits.filter(h => h.habit_type !== 'quit');
  let strengthAverage = 0;
  if (goodHabits.length > 0) {
    strengthAverage = goodHabits.reduce((acc, h) => acc + calculateHabitStrength(h), 0) / goodHabits.length;
  }

  const badHabits = habits.filter(h => h.habit_type === 'quit');
  let safetyScore = 100;
  if (badHabits.length > 0) {
    const avgRisk = badHabits.reduce((acc, h) => acc + calculateBadHabitRisk(h), 0) / badHabits.length;
    safetyScore = Math.max(0, 100 - avgRisk); // Higher risk = lower safety
  }

  // Trend Score (10%): We'll use the month's average completion rate as the trend
  const monthStats = getMonthStats(habits);
  const trendScore = monthStats.averagePercentage;

  const score = Math.round(
    (dailyProgress * 0.50) +
    (strengthAverage * 0.25) +
    (safetyScore * 0.15) +
    (trendScore * 0.10)
  );

  return {
    score: Math.min(100, Math.max(0, score)),
    dailyProgress: Math.round(dailyProgress),
    strengthAverage: Math.round(strengthAverage),
    safetyScore: Math.round(safetyScore),
    trendScore: Math.round(trendScore)
  };
}
