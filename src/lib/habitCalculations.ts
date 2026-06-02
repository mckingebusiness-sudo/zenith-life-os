/**
 * ─── Centralized Habit Calculation Logic ─────────────────────────────────────
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
 * ─── PRODUCT RULES ──────────────────────────────────────────────────────────
 * 
 * 1. "Good" habit is HANDLED for the day if:
 *    - checkedToday === true (user checked in), OR
 *    - frozenToday === true (user froze it — counts as handled, not failed)
 * 
 * 2. "Quit/Avoidance" habit is HANDLED for the day if:
 *    - relapsedToday === false (user did NOT relapse), OR
 *    - frozenToday === true (frozen — counts as handled)
 * 
 * 3. Daily progress = handledCount / totalHabits
 *    Where handledCount = good_handled + quit_handled
 * 
 * 4. A frozen habit is NOT a failure. It is "excused" for the day.
 */

import type { HabitWithStreak } from "@/hooks/useHabits";

// ─── Core: Is a habit "handled" (success OR frozen) for a given day? ─────────

/** Check if a GOOD habit is handled on a specific day */
export function isGoodHabitHandled(habit: HabitWithStreak, dateStr: string): boolean {
  if (habit.freezes?.has(dateStr)) return true;  // frozen = handled
  return !!habit.checkins?.has(dateStr);           // checked = handled
}

/** Check if a QUIT habit is handled on a specific day */
export function isQuitHabitHandled(habit: HabitWithStreak, dateStr: string): boolean {
  if (habit.freezes?.has(dateStr)) return true;  // frozen = handled
  if (habit.created_at) {
    const created = new Date(habit.created_at);
    const createdStr = `${created.getFullYear()}-${String(created.getMonth() + 1).padStart(2, '0')}-${String(created.getDate()).padStart(2, '0')}`;
    if (dateStr < createdStr) return false;      // Habit didn't exist yet
  }
  return !habit.relapses?.has(dateStr);           // no relapse = handled
}

/** Check if ANY habit is handled on a specific day */
export function isHabitHandledOnDay(habit: HabitWithStreak, dateStr: string): boolean {
  if (habit.habit_type === 'quit') return isQuitHabitHandled(habit, dateStr);
  return isGoodHabitHandled(habit, dateStr);
}

/** Check if a habit was a pure "success" (not frozen) on a specific day */
export function isHabitSuccessOnDay(habit: HabitWithStreak, dateStr: string): boolean {
  if (habit.freezes?.has(dateStr)) return false;  // frozen is not "success", it's excused
  if (habit.habit_type === 'quit') return !habit.relapses?.has(dateStr);
  return !!habit.checkins?.has(dateStr);
}

// ─── Today's Status ─────────────────────────────────────────────────────────

/** Is a habit handled TODAY? (success or frozen) */
export function isHabitHandledToday(habit: HabitWithStreak): boolean {
  if (habit.frozenToday) return true;
  if (habit.habit_type === 'quit') return !habit.relapsedToday;
  return !!habit.checkedToday;
}

// ─── Aggregate Calculations ─────────────────────────────────────────────────

export interface DailyProgress {
  /** Total habits */
  totalHabits: number;
  /** Habits that are handled (completed + frozen + avoided) */
  handledCount: number;
  /** Good habits that were checked in */
  completedGood: number;
  /** Total good habits */
  totalGood: number;
  /** Bad habits successfully avoided (not relapsed, not frozen) */
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
  const avoidedBad = badHabits.filter(h => !h.relapsedToday && !h.frozenToday).length;
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

  const goodHabits = habits.filter(h => h.habit_type !== 'quit');
  const badHabits = habits.filter(h => h.habit_type === 'quit');

  let completedGood = 0;
  goodHabits.forEach(h => {
    if (isGoodHabitHandled(h, dateStr)) completedGood++;
  });

  let avoidedBad = 0;
  badHabits.forEach(h => {
    if (isQuitHabitHandled(h, dateStr)) avoidedBad++;
  });

  const totalSuccess = completedGood + avoidedBad;
  const totalItems = habits.length;
  const percentage = totalItems > 0 ? Math.round((totalSuccess / totalItems) * 100) : 0;

  return { completedGood, avoidedBad, totalSuccess, totalItems, percentage };
}
