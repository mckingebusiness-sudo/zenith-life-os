import { supabase, Habit, HabitCompletion } from "@/lib/supabase";

// =====================================================
// HABITS API
// =====================================================

export async function getHabits(userId: string): Promise<{ data: Habit[]; error: Error | null }> {
  const today = new Date().toISOString().split("T")[0];

  const { data, error } = await supabase
    .from("habits")
    .select(`
      *,
      habit_completions!left(completed_at)
    `)
    .eq("user_id", userId)
    .eq("is_active", true)
    .order("created_at", { ascending: true });

  if (error) return { data: [], error };

  const habitsWithDone = (data || []).map((h) => ({
    ...h,
    done_today: h.habit_completions?.some((c: { completed_at: string }) => c.completed_at === today) ?? false,
  }));

  return { data: habitsWithDone as Habit[], error: null };
}

export async function createHabit(
  userId: string,
  habit: Partial<Habit>
): Promise<{ data: Habit | null; error: Error | null }> {
  const { data, error } = await supabase
    .from("habits")
    .insert({ ...habit, user_id: userId })
    .select()
    .single();

  return { data: data as Habit | null, error };
}

export async function updateHabit(
  habitId: string,
  updates: Partial<Habit>
): Promise<{ error: Error | null }> {
  const { error } = await supabase
    .from("habits")
    .update(updates)
    .eq("id", habitId);

  return { error };
}

export async function deleteHabit(habitId: string): Promise<{ error: Error | null }> {
  const { error } = await supabase.from("habits").delete().eq("id", habitId);
  return { error };
}

export async function toggleHabitCompletion(
  habitId: string,
  userId: string,
  done: boolean
): Promise<{ error: Error | null }> {
  const today = new Date().toISOString().split("T")[0];

  if (done) {
    // Mark as complete
    const { error } = await supabase.from("habit_completions").upsert({
      habit_id: habitId,
      user_id: userId,
      completed_at: today,
    });

    if (!error) {
      // Update streak and total_completions
      const { data: habit } = await supabase
        .from("habits")
        .select("streak, longest_streak, total_completions")
        .eq("id", habitId)
        .single();

      if (habit) {
        const newStreak = habit.streak + 1;
        const newLevel = Math.min(4, Math.max(1, Math.floor(newStreak / 8) + 1));
        await supabase.from("habits").update({
          streak: newStreak,
          longest_streak: Math.max(habit.longest_streak, newStreak),
          total_completions: habit.total_completions + 1,
          level: newLevel,
        }).eq("id", habitId);
      }
    }

    return { error };
  } else {
    // Unmark completion
    const { error } = await supabase
      .from("habit_completions")
      .delete()
      .eq("habit_id", habitId)
      .eq("completed_at", today);

    if (!error) {
      const { data: habit } = await supabase
        .from("habits")
        .select("streak, total_completions")
        .eq("id", habitId)
        .single();

      if (habit) {
        const newStreak = Math.max(0, habit.streak - 1);
        await supabase.from("habits").update({
          streak: newStreak,
          total_completions: Math.max(0, habit.total_completions - 1),
        }).eq("id", habitId);
      }
    }

    return { error };
  }
}

export async function getHabitCompletions(
  habitId: string,
  days: number = 30
): Promise<{ data: HabitCompletion[]; error: Error | null }> {
  const from = new Date();
  from.setDate(from.getDate() - days);

  const { data, error } = await supabase
    .from("habit_completions")
    .select("*")
    .eq("habit_id", habitId)
    .gte("completed_at", from.toISOString().split("T")[0])
    .order("completed_at", { ascending: false });

  return { data: (data || []) as HabitCompletion[], error };
}
