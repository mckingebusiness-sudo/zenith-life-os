import { HabitCadence } from "@/hooks/useHabits";

// Levels:
// 1: 0-2 days (Seed)
// 2: 3-6 days (Sprout)
// 3: 7-20 days (Plant)
// 4: 21-59 days (Blooming)
// 5: 60-149 days (Tree)
// 6: 150+ days (Fruit Tree)

export const PLANT_THRESHOLDS = [0, 3, 7, 21, 60, 150];

/**
 * Returns the effective streak in "days equivalent" based on cadence.
 */
export function getEffectiveStreak(streak: number, cadence: HabitCadence): number {
  switch (cadence) {
    case "weekly":
    case "times_per_week":
      return streak * 7;
    case "monthly":
      return streak * 30;
    case "daily":
    default:
      return streak;
  }
}

/**
 * Returns the visual level of the plant (1 to 6) based on the effective streak.
 */
export function getPlantLevel(effectiveStreak: number): number {
  if (effectiveStreak >= PLANT_THRESHOLDS[5]) return 6;
  if (effectiveStreak >= PLANT_THRESHOLDS[4]) return 5;
  if (effectiveStreak >= PLANT_THRESHOLDS[3]) return 4;
  if (effectiveStreak >= PLANT_THRESHOLDS[2]) return 3;
  if (effectiveStreak >= PLANT_THRESHOLDS[1]) return 2;
  return 1;
}

/**
 * Calculates the full state of the plant given habit streak data.
 */
export function getPlantState(
  currentStreak: number,
  longestStreak: number,
  totalCheckins: number,
  cadence: HabitCadence
) {
  const isDormant = currentStreak === 0 && totalCheckins > 0;
  
  // The visual size never shrinks. If dormant, use the longest streak to determine its size.
  // We use max(longestStreak, 1) if it's dormant to ensure it doesn't just show a level 1 seed
  // if for some reason longestStreak wasn't recorded but totalCheckins exists.
  const visualBaseStreak = currentStreak > 0 ? currentStreak : Math.max(longestStreak, totalCheckins > 0 ? 1 : 0);
  
  const effectiveVisualStreak = getEffectiveStreak(visualBaseStreak, cadence);
  const visualLevel = getPlantLevel(effectiveVisualStreak);

  // For logic and tooltips, calculate current progress
  const currentEffective = getEffectiveStreak(currentStreak, cadence);
  const currentLevel = getPlantLevel(currentEffective);
  
  // Calculate next stage requirement in actual streak units (not effective days)
  let nextStageReqActual = 0;
  if (currentLevel < 6) {
    const nextEffectiveReq = PLANT_THRESHOLDS[currentLevel]; // e.g. level 1 (index 0) next is index 1 -> 3
    // We reverse getEffectiveStreak:
    // If weekly (eff = streak * 7), then reqStreak = ceil(nextEffectiveReq / 7)
    let divisor = 1;
    if (cadence === "weekly" || cadence === "times_per_week") divisor = 7;
    if (cadence === "monthly") divisor = 30;
    
    nextStageReqActual = Math.ceil(nextEffectiveReq / divisor);
  }

  return {
    isDormant,
    visualLevel,
    currentLevel,
    currentEffective,
    nextStageReqActual,
    daysToNext: Math.max(0, nextStageReqActual - currentStreak)
  };
}
