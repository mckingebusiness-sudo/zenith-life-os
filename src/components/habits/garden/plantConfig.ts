import { HabitCadence } from "@/hooks/useHabits";

// Levels based on Habit Strength (0-100%):
// 1: 0-19% (Seed)
// 2: 20-39% (Sprout)
// 3: 40-59% (Plant)
// 4: 60-79% (Blooming)
// 5: 80-89% (Tree)
// 6: 90-100% (Fruit Tree)

export const PLANT_THRESHOLDS = [0, 20, 40, 60, 80, 90];

/**
 * Returns the visual level of the plant (1 to 6) based on habit strength and current streak.
 */
export function getPlantLevel(habitStrength: number, currentStreak: number = 0): number {
  if (habitStrength >= PLANT_THRESHOLDS[5] && currentStreak >= 90) return 6; // Royal Forest
  if (habitStrength >= PLANT_THRESHOLDS[4] && currentStreak >= 50) return 5; // Tree
  if (habitStrength >= PLANT_THRESHOLDS[3] && currentStreak >= 21) return 4; // Bush
  if (habitStrength >= PLANT_THRESHOLDS[2]) return 3;
  if (habitStrength >= PLANT_THRESHOLDS[1]) return 2;
  return 1;
}

/**
 * Calculates the full state of the plant given habit strength.
 */
export function getPlantState(
  habitStrength: number,
  currentStreak: number,
  totalCheckins: number
) {
  // A plant is dormant if it has history but currently the streak is 0.
  // With health view, the plant won't disappear immediately, it will just be dormant.
  const isDormant = currentStreak === 0 && totalCheckins > 0;
  
  const visualLevel = getPlantLevel(habitStrength, currentStreak);
  const currentLevel = visualLevel; // In health view, visual and current are the same
  
  // Calculate next stage requirement in terms of strength points
  let nextStageReqActual = 0;
  if (currentLevel < 6) {
    nextStageReqActual = PLANT_THRESHOLDS[currentLevel]; // e.g. level 1 (index 0) next is index 1 -> 20
  }

  return {
    isDormant,
    visualLevel,
    currentLevel,
    currentStrength: habitStrength,
    nextStageReqActual,
    pointsToNext: Math.max(0, nextStageReqActual - habitStrength)
  };
}
