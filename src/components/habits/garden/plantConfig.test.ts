import { describe, it, expect } from "vitest";
import { getEffectiveStreak, getPlantLevel, getPlantState } from "./plantConfig";

describe("plantConfig", () => {
  describe("getEffectiveStreak", () => {
    it("returns direct value for daily", () => {
      expect(getEffectiveStreak(5, "daily")).toBe(5);
    });
    it("multiplies by 7 for weekly", () => {
      expect(getEffectiveStreak(2, "weekly")).toBe(14);
      expect(getEffectiveStreak(4, "times_per_week")).toBe(28);
    });
    it("multiplies by 30 for monthly", () => {
      expect(getEffectiveStreak(1, "monthly")).toBe(30);
    });
  });

  describe("getPlantLevel", () => {
    it("handles exact threshold boundaries", () => {
      expect(getPlantLevel(0)).toBe(1);
      expect(getPlantLevel(2)).toBe(1);
      
      expect(getPlantLevel(3)).toBe(2);
      expect(getPlantLevel(6)).toBe(2);
      
      expect(getPlantLevel(7)).toBe(3);
      expect(getPlantLevel(20)).toBe(3);
      
      expect(getPlantLevel(21)).toBe(4);
      expect(getPlantLevel(59)).toBe(4);
      
      expect(getPlantLevel(60)).toBe(5);
      expect(getPlantLevel(149)).toBe(5);
      
      expect(getPlantLevel(150)).toBe(6);
      expect(getPlantLevel(999)).toBe(6);
    });
  });

  describe("getPlantState", () => {
    it("calculates state for active daily habit", () => {
      const state = getPlantState(4, 4, 4, "daily");
      expect(state.isDormant).toBe(false);
      expect(state.visualLevel).toBe(2); // 4 days -> level 2
      expect(state.currentLevel).toBe(2);
      expect(state.nextStageReqActual).toBe(7); // Next is level 3 (7 days)
      expect(state.daysToNext).toBe(3); // 7 - 4 = 3
    });

    it("calculates state for dormant habit (does not shrink)", () => {
      // Current streak is 0, but it previously reached level 4 (longest streak 25)
      const state = getPlantState(0, 25, 30, "daily");
      expect(state.isDormant).toBe(true);
      expect(state.visualLevel).toBe(4); // Based on longest streak 25
      expect(state.currentLevel).toBe(1); // Based on current streak 0
      expect(state.nextStageReqActual).toBe(3); // Next is level 2 (3 days)
      expect(state.daysToNext).toBe(3); // 3 - 0 = 3
    });

    it("handles weekly habit progression", () => {
      // 1 weekly streak = 7 effective days -> level 3
      const state1 = getPlantState(1, 1, 1, "weekly");
      expect(state1.visualLevel).toBe(3);
      expect(state1.nextStageReqActual).toBe(3); // 21 effective days / 7 = 3 actual weeks
      expect(state1.daysToNext).toBe(2); // 3 - 1 = 2 weeks to go

      // 3 weekly streak = 21 effective days -> level 4
      const state3 = getPlantState(3, 3, 3, "weekly");
      expect(state3.visualLevel).toBe(4);
      expect(state3.nextStageReqActual).toBe(9); // 60 effective days / 7 = 8.57 -> ceil = 9 weeks
      expect(state3.daysToNext).toBe(6); // 9 - 3 = 6 weeks
    });
  });
});
