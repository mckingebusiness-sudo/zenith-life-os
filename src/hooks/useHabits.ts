import { useMutation, useQuery, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

const KEY = ["habits"];

// Freezes are now tracked via 'habit_freezes' table in Supabase.
// Relapse logs are now tracked via 'habit_relapses' table in Supabase.


export type HabitCadence = "daily" | "weekly" | "monthly" | "times_per_week";
export type HabitColor = string;

export interface HabitStreak {
  habit_id: string;
  user_id: string;
  current_streak: number;
  longest_streak: number;
  last_checkin_day: string | null;
  total_checkins: number;
  computed_at: string;
}

export interface Habit {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  icon: string | null;
  color: HabitColor;
  cadence: HabitCadence;
  target_per_period: number;
  active_weekdays: number[];
  grace_days: number;
  is_private: boolean;
  sort_order: number;
  // Quit Habits
  habit_type?: 'good' | 'quit';
  saved_value_per_day?: number;
  saved_unit?: string;
  // Pause
  is_paused?: boolean;
  pause_until?: string | null;
  // Quantitative
  tracking_type?: 'checkbox' | 'quantitative';
  target_value?: number | null;
  target_unit?: string | null;
}

export interface HabitWithStreak extends Habit {
  streak: HabitStreak | null;
  checkins?: Set<string>;
  freezes?: Set<string>;
  checkedToday?: boolean;
  frozenToday?: boolean;
}

const tz = () => Intl.DateTimeFormat().resolvedOptions().timeZone;

async function fetchHabits(year: number, month: number): Promise<HabitWithStreak[]> {
  const { data: authData } = await supabase.auth.getSession();
  if (!authData.session) throw new Error("Not logged in");

  const today = new Intl.DateTimeFormat("en-CA", { timeZone: tz() }).format(new Date());

  // Build query – DB has all columns now
  const { data: habits, error: habitsError } = await supabase
    .from("habits")
    .select("*, streak:habit_streaks(*)")
    .or("is_deleted.eq.false,is_deleted.is.null")
    .order("sort_order");

  if (habitsError) throw habitsError;

  // Fetch check-ins for the selected month + previous 6 months for deep AI analytics
  const startDate = new Date(year, month - 6, 1);
  const endDate = new Date(year, month + 1, 0);

  const startStr = new Intl.DateTimeFormat("en-CA", { timeZone: tz() }).format(startDate);
  const endStr = new Intl.DateTimeFormat("en-CA", { timeZone: tz() }).format(endDate);

  const { data: recentCheckins } = await supabase
    .from("habit_checkins")
    .select("habit_id, day_local")
    .gte("day_local", startStr)
    .lte("day_local", endStr);

  const checkinsByHabit = new Map<string, Set<string>>();
  recentCheckins?.forEach((c) => {
    if (!checkinsByHabit.has(c.habit_id)) checkinsByHabit.set(c.habit_id, new Set());
    checkinsByHabit.get(c.habit_id)!.add(c.day_local);
  });

  // Fetch freezes — column is 'freeze_day' in DB (not 'day_local')
  const { data: recentFreezes } = await supabase
    .from("habit_freezes")
    .select("habit_id, freeze_day")
    .gte("freeze_day", startStr)
    .lte("freeze_day", endStr);

  const freezesByHabit = new Map<string, Set<string>>();
  recentFreezes?.forEach((f) => {
    if (!freezesByHabit.has(f.habit_id)) freezesByHabit.set(f.habit_id, new Set());
    // freeze_day comes as a date string like '2026-06-01'
    const dayStr = typeof f.freeze_day === 'string' ? f.freeze_day : String(f.freeze_day);
    freezesByHabit.get(f.habit_id)!.add(dayStr);
  });

  return (habits || []).map((h: any) => {
    const habitCheckins = checkinsByHabit.get(h.id) || new Set<string>();
    const habitFreezes = freezesByHabit.get(h.id) || new Set<string>();
    return {
      ...h,
      habit_type: h.habit_type || 'good',
      streak: h.streak?.[0] || { current_streak: 0, longest_streak: 0, total_checkins: 0 },
      checkins: habitCheckins,
      freezes: habitFreezes,
      checkedToday: habitCheckins.has(today),
      frozenToday: habitFreezes.has(today),
    };
  });
}



// ─── Streak recalculation in DB ───────────────────────────────────────────────
// Streaks are now automatically updated via PostgreSQL triggers in Supabase
// (See streak_trigger.sql artifact)

export function useHabits(currentDate: Date = new Date()) {
  const qc = useQueryClient();
  const year = currentDate.getFullYear();
  // Use 1-indexed month to avoid year/month confusion in cache keys
  const month = currentDate.getMonth() + 1;

  const queryKey = [...KEY, year, month];

  const query = useQuery({
    queryKey,
    queryFn: () => fetchHabits(year, month - 1), // fetchHabits still expects 0-indexed
    staleTime: 60000,   // 60s — reduces unnecessary refetches/flashes
    gcTime: 300000,     // 5 min — keep cached data longer
    retry: 0,           // ← NO retry on error – prevents infinite reload
    networkMode: 'always',
    placeholderData: keepPreviousData,
  });


  const checkIn = useMutation({
    mutationFn: async ({ id, dayLocal, action = "check" }: { id: string; dayLocal?: string; action?: "check" | "uncheck" }) => {
      const today = new Intl.DateTimeFormat("en-CA", { timeZone: tz() }).format(new Date());
      const targetDay = dayLocal || today;
      const { data: authData } = await supabase.auth.getSession();
      if (!authData.session) throw new Error("Not logged in");
      const userId = authData.session.user.id;

      if (action === "check") {
        const { error } = await supabase.from("habit_checkins").insert({
          habit_id: id,
          user_id: userId,
          day_local: targetDay,
        });
        if (error && error.code !== "23505") throw error;
      } else {
        const { error } = await supabase.from("habit_checkins").delete().match({
          habit_id: id,
          day_local: targetDay,
        });
        if (error) throw error;
      }

      // ✅ Fetch streak recalculated by Supabase Trigger
      const { data: streakData } = await supabase
        .from("habit_streaks")
        .select("*")
        .eq("habit_id", id)
        .single();
        
      return { id, streakData: streakData || { current_streak: 0, longest_streak: 0, total_checkins: 0 } };
    },
    onMutate: async ({ id, dayLocal, action = "check" }) => {
      const today = new Intl.DateTimeFormat("en-CA", { timeZone: tz() }).format(new Date());
      const targetDay = dayLocal || today;
      await qc.cancelQueries({ queryKey });
      const prev = qc.getQueryData<HabitWithStreak[]>(queryKey);

      qc.setQueryData<HabitWithStreak[]>(queryKey, (old) => {
        if (!old) return old;
        return old.map((h) => {
          if (h.id === id) {
            const newCheckins = new Set(h.checkins);
            if (action === "check") newCheckins.add(targetDay);
            else newCheckins.delete(targetDay);

            // Optimistic streak update (will be corrected by onSuccess)
            let newStreakCount = h.streak?.current_streak || 0;
            let newTotal = h.streak?.total_checkins || 0;
            if (targetDay === today) {
              if (action === "check" && !h.checkedToday) {
                newStreakCount += 1;
                newTotal += 1;
              } else if (action === "uncheck" && h.checkedToday) {
                newStreakCount = Math.max(0, newStreakCount - 1);
                newTotal = Math.max(0, newTotal - 1);
              }
            }

            return {
              ...h,
              checkins: newCheckins,
              checkedToday: newCheckins.has(today),
              streak: {
                ...h.streak!,
                current_streak: newStreakCount,
                total_checkins: newTotal,
              },
            };
          }
          return h;
        });
      });
      return { prev };
    },
    onSuccess: ({ id, streakData }) => {
      // ✅ FIXED: Update cache with REAL streak from DB — no more revert after refresh
      qc.setQueryData<HabitWithStreak[]>(queryKey, (old) => {
        if (!old) return old;
        return old.map((h) => {
          if (h.id === id) {
            const sd = streakData as any;
            return {
              ...h,
              streak: {
                ...h.streak!,
                current_streak: sd.current_streak,
                longest_streak: sd.longest_streak,
                total_checkins: sd.total_checkins,
                last_checkin_day: sd.last_checkin_day ?? h.streak?.last_checkin_day ?? null,
                computed_at: sd.computed_at ?? new Date().toISOString(),
              },
            };
          }
          return h;
        });
      });
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(queryKey, ctx.prev);
    },
    // ✅ FIXED: Only invalidate the current month, not all months
    onSettled: () => {
      qc.invalidateQueries({ queryKey });
    },
    retry: 0,
  });

  const addHabit = useMutation({
    mutationFn: async (habit: Partial<Habit>) => {
      const { data: authData } = await supabase.auth.getSession();
      if (!authData.session) throw new Error("Not logged in");
      const userId = authData.session.user.id;

      const newHabitPayload: Record<string, unknown> = {
        title: habit.title,
        description: habit.description ?? null,
        icon: habit.icon ?? "✨",
        color: habit.color ?? "green",
        cadence: habit.cadence ?? "daily",
        target_per_period: habit.target_per_period ?? 1,
        active_weekdays: habit.active_weekdays ?? [0, 1, 2, 3, 4, 5, 6],
        grace_days: habit.grace_days ?? 0,
        is_private: habit.is_private ?? false,
        sort_order: habit.sort_order ?? 0,
        user_id: userId,
        is_deleted: false,
        habit_type: (habit as any).habit_type || 'good',
        saved_value_per_day: (habit as any).saved_value_per_day,
        saved_unit: (habit as any).saved_unit
      };

      const { data, error } = await supabase
        .from("habits")
        .insert(newHabitPayload)
        .select()
        .single();
        
      if (error) throw error;
      return data;
    },
    onMutate: async (newHabit) => {
      await qc.cancelQueries({ queryKey });
      const previousHabits = qc.getQueryData<HabitWithStreak[]>(queryKey);

      const optimisticId = `optimistic-${Date.now()}`;
      const optimisticHabit: HabitWithStreak = {
        id: optimisticId,
        title: newHabit.title || "",
        description: newHabit.description || null,
        icon: newHabit.icon || "✨",
        color: newHabit.color || "blue",
        cadence: newHabit.cadence || "daily",
        target_per_period: newHabit.target_per_period || 1,
        active_weekdays: newHabit.active_weekdays || [0, 1, 2, 3, 4, 5, 6],
        grace_days: newHabit.grace_days || 0,
        is_private: newHabit.is_private || false,
        sort_order: newHabit.sort_order || 0,
        user_id: "optimistic",
        habit_type: (newHabit as any).habit_type || 'good',
        checkins: new Set(),
        checkedToday: false,
        freezes: new Set(),
        frozenToday: false,
        streak: {
          habit_id: optimisticId,
          user_id: "optimistic",
          current_streak: 0,
          longest_streak: 0,
          last_checkin_day: null,
          total_checkins: 0,
          computed_at: new Date().toISOString(),
        },
      };

      qc.setQueryData<HabitWithStreak[]>(queryKey, (old) => {
        return old ? [...old, optimisticHabit] : [optimisticHabit];
      });

      return { previousHabits, optimisticId };
    },
    onSuccess: (data, _newHabit, context) => {
      // Replace the optimistic entry with the real DB row if we got one
      if (data?.id && context?.optimisticId) {
        qc.setQueryData<HabitWithStreak[]>(queryKey, (old) => {
          if (!old) return old;
          return old.map((h) => {
            if (h.id === context.optimisticId) {
              return {
                ...h,
                id: data.id,
                user_id: data.user_id || h.user_id,
                sort_order: data.sort_order ?? h.sort_order,
              };
            }
            return h;
          });
        });
      }
    },
    onError: (err: any, _newHabit, context) => {
      console.error("❌ addHabit FAILED:", err);
      if (context?.previousHabits) {
        qc.setQueryData(queryKey, context.previousHabits);
      }
      toast.error("فشل حفظ العادة — " + (err?.message || 'تحقق من الاتصال بالإنترنت'));
    },
    // ✅ FIXED: Only invalidate the current month query, not ALL months
    onSettled: () => {
      qc.invalidateQueries({ queryKey });
    },
    retry: 0,
  });

  const updateHabit = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Habit> }) => {
      const { data, error } = await supabase
        .from("habits")
        .update(updates)
        .eq("id", id)
        .select()
        .single();
        
      if (error) throw error;
      return data;
    },
    onMutate: async ({ id, updates }) => {
      await qc.cancelQueries({ queryKey });
      const previous = qc.getQueryData<HabitWithStreak[]>(queryKey);

      // Optimistically update the local cache
      qc.setQueryData<HabitWithStreak[]>(queryKey, (old) => {
        if (!old) return old;
        return old.map((h) => (h.id === id ? { ...h, ...updates } : h));
      });

      return { previous };
    },
    onError: (err: any, _vars, ctx) => {
      console.error("❌ updateHabit FAILED:", err);
      if (ctx?.previous) qc.setQueryData(queryKey, ctx.previous);
      toast.error("فشل تعديل العادة — " + (err?.message || 'تحقق من الاتصال بالإنترنت'));
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey });
    },
    retry: 0,
  });

  const deleteHabit = useMutation({
    mutationFn: async (id: string) => {
      // Soft delete
      const { error } = await supabase
        .from("habits")
        .update({ is_deleted: true })
        .eq("id", id);
      if (error) throw error;
    },
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey });
      const previous = qc.getQueryData<HabitWithStreak[]>(queryKey);
      qc.setQueryData<HabitWithStreak[]>(queryKey, (old) =>
        old ? old.filter((h) => h.id !== id) : old
      );
      return { previous };
    },
    onError: (_err, _id, ctx) => {
      if (ctx?.previous) qc.setQueryData(queryKey, ctx.previous);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey });
    },
    retry: 0,
  });

  const undeleteHabit = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("habits")
        .update({ is_deleted: false })
        .eq("id", id);
      if (error) throw error;
    },
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey });
      const previous = qc.getQueryData<HabitWithStreak[]>(queryKey);
      // It's hard to optimistically restore because it's no longer in the cache,
      // but we will just let onSettled refetch.
      return { previous };
    },
    onError: (_err, _id, ctx) => {
      if (ctx?.previous) qc.setQueryData(queryKey, ctx.previous);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey });
    },
    retry: 0,
  });

  const freezeHabit = useMutation({
    mutationFn: async ({ id, dateStr, monthStr }: { id: string, dateStr: string, monthStr: string }) => {
      const { data: authData } = await supabase.auth.getSession();
      if (!authData.session) throw new Error("Not logged in");
      const userId = authData.session.user.id;
      
      // ✅ FIXED: DB column is 'freeze_day' not 'day_local'
      const { error } = await supabase.from("habit_freezes").insert({
        habit_id: id,
        user_id: userId,
        freeze_day: dateStr
      });
      if (error && error.code !== "23505") throw error; // ignore duplicate
      return { id, dateStr };
    },
    onMutate: async ({ id, dateStr }) => {
      await qc.cancelQueries({ queryKey });
      const prev = qc.getQueryData<HabitWithStreak[]>(queryKey);
      const today = new Intl.DateTimeFormat("en-CA", { timeZone: tz() }).format(new Date());
      qc.setQueryData<HabitWithStreak[]>(queryKey, (old) => {
        if (!old) return old;
        return old.map(h => {
          if (h.id === id) {
            const newFreezes = new Set(h.freezes);
            newFreezes.add(dateStr);
            return { ...h, freezes: newFreezes, frozenToday: dateStr === today };
          }
          return h;
        });
      });
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(queryKey, ctx.prev);
    },
    onSettled: () => qc.invalidateQueries({ queryKey }),
  });

  const resetStreak = async (habitId: string, reason: string) => {
    const { data: authData } = await supabase.auth.getSession();
    if (!authData.session) throw new Error("Not logged in");
    const userId = authData.session.user.id;

    // Reset current streak in DB
    await supabase
      .from("habit_streaks")
      .update({ current_streak: 0 })
      .eq("habit_id", habitId);
    
    // Log relapse reason
    await supabase.from("habit_relapses").insert({
      habit_id: habitId,
      user_id: userId,
      reason: reason
    });

    qc.invalidateQueries({ queryKey });
  };

  return {
    habits: query.data || [],
    isLoading: query.isLoading,
    error: query.error,
    checkIn: (id: string, dayLocal?: string, action?: "check" | "uncheck") =>
      checkIn.mutate({ id, dayLocal, action }),
    // Fire-and-forget version for quick UI updates (optimistic)
    addHabit: (habit: Partial<Habit>) => addHabit.mutate(habit),
    // Async version for callers that need to await completion (e.g. modal)
    addHabitAsync: (habit: Partial<Habit>) => addHabit.mutateAsync(habit),
    updateHabit: (id: string, updates: Partial<Habit>) => updateHabit.mutate({ id, updates }),
    updateHabitAsync: (id: string, updates: Partial<Habit>) => updateHabit.mutateAsync({ id, updates }),
    deleteHabit: (id: string) => deleteHabit.mutateAsync(id),
    undeleteHabit: (id: string) => undeleteHabit.mutateAsync(id),
    freezeHabit: (id: string, dateStr: string, monthStr: string) => freezeHabit.mutateAsync({ id, dateStr, monthStr }),
    resetStreak,
    isAddingHabit: addHabit.isPending,
    isUpdatingHabit: updateHabit.isPending,
  };
}
