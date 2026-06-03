/**
 * ─── Centralized Habit Calculation Logic ────────────────────────────────────
 * 
 * ALL habit progress, completion, and counter logic MUST use these functions.
 * This ensures consistent numbers across:
 *   - HabitMonthlyGrid (stats bar)
 *   - HabitsAnalytics (charts)
 *   - AIFloatingButton (context + stats bar)
 *   - HabitsGardenLarge (progress)
 *   - habits.tsx (confetti trigger)
 *   - Dashboard (if applicable)
 * 
 * ─── PRODUCT RULES ───────────────────────────────────────────────────
 * 
 * 1. "Good" habit is HANDLED for the day if:
 *    - checkedToday === true (user checked in), OR
 *    - frozenToday === true (user froze it — counts as handled, not failed)
 * 
 * 2. "Quit/Avoidance" habit is HANDLED for the day if:
 *    - checkedToday === true (user explicitly confirmed avoidance), OR
 *    - frozenToday === true (frozen — counts as handled)
 *    NOTE: we never auto-succeed a quit habit for TODAY without an explicit check-in.
 * 
 * 3. Daily progress = handledCount / totalHabits
 *    Where handledCount = good_handled + quit_handled
 * 
 * 4. A frozen habit is NOT a failure. It is "excused" for the day.
 */

import type { HabitWithStreak } from "@/hooks/useHabits";

export const tz = () => Intl.DateTimeFormat().resolvedOptions().timeZone;

/** Standardized way to get YYYY-MM-DD in the user's local timezone */
export function getLocalDateString(date: Date = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: tz() }).format(date);
}

/** Check if a habit existed on a specific date (created_at exclusion rule) */
export function habitExistsOnDate(habit: HabitWithStreak, dateStr: string): boolean {
  if (!habit.created_at) return true; // assume always existed if missing
  const createdStr = new Intl.DateTimeFormat("en-CA", { timeZone: tz() }).format(new Date(habit.created_at));
  return dateStr >= createdStr;
}

// ─── Core: Is a habit "handled" (success OR frozen) for a given day? ─────────

/** Check if a GOOD habit is handled on a specific day */
export function isGoodHabitHandled(habit: HabitWithStreak, dateStr: string): boolean {
  if (habit.freezes?.has(dateStr)) return true;  // frozen = handled
  return !!habit.checkins?.has(dateStr);           // checked = handled
}

/** Check if a QUIT habit is handled on a specific day */
export function isQuitHabitHandled(habit: HabitWithStreak, dateStr: string): boolean {
  if (habit.freezes?.has(dateStr)) return true;  // frozen = handled
  if (habit.checkins?.has(dateStr)) return true; // explicit success

  const todayStr = new Intl.DateTimeFormat("en-CA", { timeZone: tz() }).format(new Date());
  
  if (dateStr === todayStr) {
    // For today, it is pending until explicit check-in (or freeze)
    return false;
  }

  // For past days, if there's a relapse, it failed.
  if (habit.relapses?.has(dateStr)) return false;
  
  // If no relapse on a past day, it auto-succeeds (avoided)
  // BUT only if the habit actually existed then.
  return habitExistsOnDate(habit, dateStr);
  
  return true;
}

/** Check if ANY habit is handled on a specific day */
export function isHabitHandledOnDay(habit: HabitWithStreak, dateStr: string): boolean {
  if (habit.habit_type === 'quit') return isQuitHabitHandled(habit, dateStr);
  return isGoodHabitHandled(habit, dateStr);
}

/** Check if a habit was a pure "success" (not frozen) on a specific day */
export function isHabitSuccessOnDay(habit: HabitWithStreak, dateStr: string): boolean {
  if (habit.freezes?.has(dateStr)) return false;  // frozen is not "success", it's excused
  
  if (habit.habit_type === 'quit') {
    if (habit.checkins?.has(dateStr)) return true;
    
    const todayStr = new Intl.DateTimeFormat("en-CA", { timeZone: tz() }).format(new Date());
    if (dateStr === todayStr) return false;
    
    if (habit.relapses?.has(dateStr)) return false;
    
    if (habit.relapses?.has(dateStr)) return false;
    
    return habitExistsOnDate(habit, dateStr);
  }
  
  return !!habit.checkins?.has(dateStr);
}

// ─── Today's Status ────────────────────────────────────────────────

/** Is a habit handled TODAY? (success or frozen) */
export function isHabitHandledToday(habit: HabitWithStreak): boolean {
  if (habit.frozenToday) return true;
  // Quit habits must be explicitly checked today to be considered "handled" today
  if (habit.habit_type === 'quit') return !!habit.checkedToday;
  return !!habit.checkedToday;
}

// ─── Aggregate Calculations ──────────────────────────────────────────

export interface DailyProgress {
  /** Total habits */
  totalHabits: number;
  /** Habits that are handled (completed + frozen + avoided) */
  handledCount: number;
  /** Good habits that were checked in */
  completedGood: number;
  /** Total good habits */
  totalGood: number;
  /** Bad habits successfully avoided (explicitly checked in today, not frozen) */
  avoidedBad: number;
  /** Total bad/quit habits */
  totalBad: number;
  /** Habits that are frozen today */
  frozenCount: number;
  /** Overall percentage (handled / total * 100) */
  percentage: number;
}

/** Calculate today's progress across all habits */
export function calculateTodayProgress(habits: HabitWithStreak[]): DailyProgress {
  const goodHabits = habits.filter(h => h.habit_type !== 'quit');
  const badHabits = habits.filter(h => h.habit_type === 'quit');

  const completedGood = goodHabits.filter(h => h.checkedToday && !h.frozenToday).length;
  const frozenGood = goodHabits.filter(h => h.frozenToday).length;
  // ✅ FIX (Midnight effect): a quit habit only counts as "avoided" today when the user
  // explicitly checked in. Previously `!h.relapsedToday` auto-succeeded every quit habit
  // at midnight without any user input.
  const avoidedBad = badHabits.filter(h => h.checkedToday && !h.frozenToday).length;
  const frozenBad = badHabits.filter(h => h.frozenToday).length;

  const totalGood = goodHabits.length;
  const totalBad = badHabits.length;
  const totalHabits = habits.length;
  const frozenCount = frozenGood + frozenBad;

  // handled = completed good + frozen good + avoided bad + frozen bad
  const handledCount = completedGood + frozenGood + avoidedBad + frozenBad;

  const percentage = totalHabits > 0 ? Math.round((handledCount / totalHabits) * 100) : 0;

  return {
    totalHabits,
    handledCount,
    completedGood,
    totalGood,
    avoidedBad,
    totalBad,
    frozenCount,
    percentage,
  };
}

/** Calculate progress for a specific day (used in charts) */
export function calculateDayProgress(
  habits: HabitWithStreak[],
  dateStr: string,
  isFuture: boolean
): { completedGood: number; avoidedBad: number; totalSuccess: number; totalItems: number; percentage: number } {
  if (isFuture) {
    return { completedGood: 0, avoidedBad: 0, totalSuccess: 0, totalItems: habits.length, percentage: 0 };
  }

  // Filter habits to only those that existed on the given date
  const habitsOnDate = habits.filter(h => habitExistsOnDate(h, dateStr));

  const goodHabits = habitsOnDate.filter(h => h.habit_type !== 'quit');
  const badHabits = habitsOnDate.filter(h => h.habit_type === 'quit');

  let completedGood = 0;
  goodHabits.forEach(h => {
    if (isGoodHabitHandled(h, dateStr)) completedGood++;
  });

  let avoidedBad = 0;
  badHabits.forEach(h => {
    if (isQuitHabitHandled(h, dateStr)) avoidedBad++;
  });

  const totalSuccess = completedGood + avoidedBad;
  const totalItems = habitsOnDate.length;
  const percentage = totalItems > 0 ? Math.round((totalSuccess / totalItems) * 100) : 0;

  return { completedGood, avoidedBad, totalSuccess, totalItems, percentage };
}
