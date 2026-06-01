import { supabase, Goal } from "@/lib/supabase";

// =====================================================
// GOALS API
// =====================================================

export async function getGoals(
  userId: string,
  options?: {
    status?: string;
    category?: string;
    parentId?: string | null;
  }
): Promise<{ data: Goal[]; error: Error | null }> {
  let query = supabase.from("goals").select("*").eq("user_id", userId);

  if (options?.status) query = query.eq("status", options.status);
  if (options?.category) query = query.eq("category", options.category);
  if (options?.parentId !== undefined) {
    if (options.parentId === null) {
      query = query.is("parent_goal_id", null);
    } else {
      query = query.eq("parent_goal_id", options.parentId);
    }
  }

  const { data, error } = await query
    .order("priority", { ascending: false })
    .order("created_at", { ascending: false });

  return { data: (data || []) as Goal[], error };
}

export async function createGoal(
  userId: string,
  goal: Partial<Goal>
): Promise<{ data: Goal | null; error: Error | null }> {
  const { data, error } = await supabase
    .from("goals")
    .insert({ ...goal, user_id: userId })
    .select()
    .single();

  return { data: data as Goal | null, error };
}

export async function updateGoal(
  goalId: string,
  updates: Partial<Goal>
): Promise<{ error: Error | null }> {
  const payload = { ...updates };

  if (updates.status === "completed" && !updates.completed_at) {
    (payload as Partial<Goal> & { completed_at: string }).completed_at = new Date().toISOString();
    payload.progress = 100;
  }

  const { error } = await supabase.from("goals").update(payload).eq("id", goalId);
  return { error };
}

export async function deleteGoal(goalId: string): Promise<{ error: Error | null }> {
  const { error } = await supabase.from("goals").delete().eq("id", goalId);
  return { error };
}

export async function updateGoalProgress(
  goalId: string,
  progress: number
): Promise<{ error: Error | null }> {
  const updates: Partial<Goal> & { completed_at?: string } = { progress };

  if (progress >= 100) {
    updates.status = "completed";
    updates.completed_at = new Date().toISOString();
  }

  const { error } = await supabase.from("goals").update(updates).eq("id", goalId);
  return { error };
}

export async function getGoalStats(
  userId: string
): Promise<{
  data: { total: number; active: number; completed: number; avgProgress: number } | null;
  error: Error | null;
}> {
  const { data, error } = await supabase
    .from("goals")
    .select("status, progress")
    .eq("user_id", userId);

  if (error) return { data: null, error };

  const goals = data || [];
  return {
    data: {
      total: goals.length,
      active: goals.filter((g) => g.status === "active").length,
      completed: goals.filter((g) => g.status === "completed").length,
      avgProgress:
        goals.length > 0
          ? goals.reduce((sum, g) => sum + g.progress, 0) / goals.length
          : 0,
    },
    error: null,
  };
}
