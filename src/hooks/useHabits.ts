import { useMutation, useQuery, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

const KEY = ["habits"];

// ─── localStorage fallback for columns that may not exist in DB ────────────
const LS_HABIT_META = "zenith_habit_meta";

function loadHabitMeta(): Record<string, { habit_type?: string; saved_value_per_day?: number; saved_unit?: string }> {
  try { return JSON.parse(localStorage.getItem(LS_HABIT_META) || "{}"); } catch { return {}; }
}
function saveHabitMetaField(id: string, fields: { habit_type?: string; saved_value_per_day?: number; saved_unit?: string }) {
  const meta = loadHabitMeta();
  meta[id] = { ...(meta[id] || {}), ...fields };
  localStorage.setItem(LS_HABIT_META, JSON.stringify(meta));
}
function deleteHabitMeta(id: string) {
  const meta = loadHabitMeta();
  delete meta[id];
  localStorage.setItem(LS_HABIT_META, JSON.stringify(meta));
}

// ─── localStorage fallback for freezes ────────────
const LS_HABIT_FREEZES = "zenith_habit_freezes";
const getHabitFreezes = (): Record<string, string[]> => {
  try { return JSON.parse(localStorage.getItem(LS_HABIT_FREEZES) || "{}"); } catch { return {}; }
};
const setHabitFreezes = (data: Record<string, string[]>) => {
  localStorage.setItem(LS_HABIT_FREEZES, JSON.stringify(data));
};
export const getMonthlyFreezeCount = (monthStr: string): number => {
  const freezes = getHabitFreezes();
  let count = 0;
  Object.values(freezes).forEach(days => {
    count += days.filter(d => d.startsWith(monthStr)).length;
  });
  return count;
};
const freezeHabitDay = (habitId: string, dateStr: string, monthStr: string) => {
  if (getMonthlyFreezeCount(monthStr) >= 3) return; // limit 3
  const freezes = getHabitFreezes();
  if (!freezes[habitId]) freezes[habitId] = [];
  if (!freezes[habitId].includes(dateStr)) {
    freezes[habitId].push(dateStr);
    setHabitFreezes(freezes);
  }
};


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

// Cache whether the habits table has certain optional columns (persist across reloads)
const getColCache = (col: string): boolean | null => {
  try {
    const val = sessionStorage.getItem(`zenith_col_${col}`);
    if (val === 'true') return true;
    if (val === 'false') return false;
  } catch {}
  return null;
};
const setColCache = (col: string, val: boolean) => {
  try { sessionStorage.setItem(`zenith_col_${col}`, String(val)); } catch {}
  colCacheState[col] = val;
};
const colCacheState: Record<string, boolean | null> = {
  is_deleted: getColCache('is_deleted'),
};

async function fetchHabits(year: number, month: number): Promise<HabitWithStreak[]> {
  const { data: authData } = await supabase.auth.getSession();
  if (!authData.session) throw new Error("Not logged in");

  const today = new Intl.DateTimeFormat("en-CA", { timeZone: tz() }).format(new Date());

  // Build query – don't filter on is_deleted if we know the column doesn't exist
  let query = supabase
    .from("habits")
    .select("*, streak:habit_streaks(*)");

  if (colCacheState.is_deleted !== false) {
    // Try with filter; if column doesn't exist we'll get an error and cache that
    query = query.or("is_deleted.eq.false,is_deleted.is.null") as any;
  }

  let { data: habits, error: habitsError } = await (query.order("sort_order") as any);

  // Detect "column not found" → cache the result and retry without filter
  if (
    habitsError &&
    (habitsError.code === "42703" ||
      habitsError.message?.toLowerCase().includes("is_deleted") ||
      habitsError.message?.toLowerCase().includes("column"))
  ) {
    setColCache('is_deleted', false);
    console.warn("is_deleted column not in schema, loading without filter");
    const { data: d2, error: e2 } = await supabase
      .from("habits")
      .select("*, streak:habit_streaks(*)")
      .order("sort_order");
    habits = d2;
    habitsError = e2;
  } else if (!habitsError) {
    setColCache('is_deleted', true);
  }

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

  const freezesData = getHabitFreezes();

  return (habits || []).map((h: any) => {
    const habitCheckins = checkinsByHabit.get(h.id) || new Set<string>();
    const habitFreezes = new Set(freezesData[h.id] || []);
    // Merge localStorage meta (habit_type, saved_value_per_day etc.) if not in DB
    const meta = loadHabitMeta()[h.id] || {};
    return {
      ...h,
      habit_type: h.habit_type ?? meta.habit_type ?? 'good',
      saved_value_per_day: h.saved_value_per_day ?? meta.saved_value_per_day,
      saved_unit: h.saved_unit ?? meta.saved_unit,
      streak: h.streak?.[0] || { current_streak: 0, longest_streak: 0, total_checkins: 0 },
      checkins: habitCheckins,
      freezes: habitFreezes,
      checkedToday: habitCheckins.has(today),
      frozenToday: habitFreezes.has(today),
    };
  });
}

// Safe insert: tries with optional fields, falls back to core-only on column error
async function safeInsertHabit(
  coreFields: Record<string, unknown>,
  optionalFields: Record<string, unknown>
) {
  const { data, error } = await supabase
    .from("habits")
    .insert({ ...coreFields, ...optionalFields })
    .select()
    .maybeSingle();

  if (!error) {
    // Always persist optional meta to localStorage as backup
    if (data?.id) {
      saveHabitMetaField(data.id, {
        habit_type: String(optionalFields.habit_type || coreFields.habit_type || 'good'),
        saved_value_per_day: optionalFields.saved_value_per_day as number | undefined,
        saved_unit: optionalFields.saved_unit as string | undefined,
      });
    }
    return data;
  }

  const isColError =
    error.code === "42703" ||
    error.code === "PGRST204" ||
    error.message?.toLowerCase().includes("column") ||
    error.message?.toLowerCase().includes("does not exist");

  if (isColError && Object.keys(optionalFields).length > 0) {
    console.warn("Optional columns not supported, retrying with core fields:", error.message);
    const { data: d2, error: e2 } = await supabase
      .from("habits")
      .insert(coreFields)
      .select()
      .maybeSingle();
    if (e2) throw e2;
    // Save to localStorage since DB doesn't have the column
    if (d2?.id) {
      saveHabitMetaField(d2.id, {
        habit_type: String(optionalFields.habit_type || 'good'),
        saved_value_per_day: optionalFields.saved_value_per_day as number | undefined,
        saved_unit: optionalFields.saved_unit as string | undefined,
      });
    }
    return d2;
  }

  throw error;
}

// Safe update: tries with all fields, falls back to core-only on column error
async function safeUpdateHabit(id: string, updates: Record<string, unknown>) {
  const { habit_type, saved_value_per_day, saved_unit, is_deleted, ...coreUpdates } = updates as any;
  const optionalUpdates: Record<string, unknown> = {};
  if (habit_type !== undefined) optionalUpdates.habit_type = habit_type;
  if (saved_value_per_day !== undefined) optionalUpdates.saved_value_per_day = saved_value_per_day;
  if (saved_unit !== undefined) optionalUpdates.saved_unit = saved_unit;

  // Always save to localStorage first (as backup)
  const metaToSave: { habit_type?: string; saved_value_per_day?: number; saved_unit?: string } = {};
  if (habit_type !== undefined) metaToSave.habit_type = String(habit_type);
  if (saved_value_per_day !== undefined) metaToSave.saved_value_per_day = Number(saved_value_per_day);
  if (saved_unit !== undefined) metaToSave.saved_unit = String(saved_unit);
  if (Object.keys(metaToSave).length > 0) saveHabitMetaField(id, metaToSave);

  const { data, error } = await supabase
    .from("habits")
    .update({ ...coreUpdates, ...optionalUpdates })
    .eq("id", id)
    .select()
    .maybeSingle(); // use maybeSingle to avoid PGRST116 errors

  if (!error) return data;

  const isColError =
    error.code === "42703" ||
    error.code === "PGRST204" ||
    error.message?.toLowerCase().includes("column") ||
    error.message?.toLowerCase().includes("does not exist");

  if (isColError && Object.keys(optionalUpdates).length > 0) {
    console.warn("Optional update columns not supported, retrying with core fields:", error.message);
    const { data: d2, error: e2 } = await supabase
      .from("habits")
      .update(coreUpdates)
      .eq("id", id)
      .select()
      .maybeSingle();
    if (e2) throw e2;
    return d2;
  }

  throw error;
}

export function useHabits(currentDate: Date = new Date()) {
  const qc = useQueryClient();
  const year = currentDate.getFullYear();
  // Use 1-indexed month to avoid year/month confusion in cache keys
  const month = currentDate.getMonth() + 1;

  const queryKey = [...KEY, year, month];

  const query = useQuery({
    queryKey,
    queryFn: () => fetchHabits(year, month - 1), // fetchHabits still expects 0-indexed
    staleTime: 10000,   // 10s — stays reasonably fresh
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

      return { success: true };
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
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(queryKey, ctx.prev);
    },
    onSettled: () => {
      qc.invalidateQueries({ queryKey: KEY });
    },
    retry: 0,
  });

  const addHabit = useMutation({
    mutationFn: async (habit: Partial<Habit>) => {
      const { data: authData } = await supabase.auth.getSession();
      if (!authData.session) throw new Error("Not logged in");
      const userId = authData.session.user.id;

      const coreFields: Record<string, unknown> = {
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
      };

      // is_deleted is optional — if column missing in DB, safeInsertHabit will retry without it
      const optionalFields: Record<string, unknown> = {
        is_deleted: false,
      };
      if ((habit as any).habit_type) optionalFields.habit_type = (habit as any).habit_type;
      if ((habit as any).saved_value_per_day != null) optionalFields.saved_value_per_day = (habit as any).saved_value_per_day;
      if ((habit as any).saved_unit) optionalFields.saved_unit = (habit as any).saved_unit;

      // 10 second timeout to prevent infinite loading
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('انتهت مدة الانتظار — تحقق من اتصالك بالإنترنت')), 10000)
      );
      const result = await Promise.race([safeInsertHabit(coreFields, optionalFields), timeoutPromise]);
      if (!result?.id) throw new Error('لم يتم حفظ العادة — حاول مرة أخرى');
      return result;
    },
    onMutate: async (newHabit) => {
      await qc.cancelQueries({ queryKey });
      const previousHabits = qc.getQueryData<HabitWithStreak[]>(queryKey);

      const optimisticHabit: HabitWithStreak = {
        id: `optimistic-${Date.now()}`,
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
          habit_id: "optimistic",
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

      return { previousHabits };
    },
    onSuccess: (data, _newHabit, context) => {
      // Replace the optimistic entry with the real DB row if we got one
      if (data?.id) {
        qc.setQueryData<HabitWithStreak[]>(queryKey, (old) => {
          if (!old) return old;
          return old.map((h) => {
            if (h.id.startsWith('optimistic-')) {
              return {
                ...h,
                id: data.id,
                user_id: data.user_id,
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
    onSettled: () => {
      // Force a fresh fetch from the server for all habit queries
      qc.invalidateQueries({ queryKey: KEY, refetchType: 'active' });
    },
    retry: 0,
  });
  const updateHabit = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Habit> }) => {
      const timeoutPromise = new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('انتهت مدة الانتظار — تحقق من اتصالك بالإنترنت')), 10000)
      );
      return Promise.race([safeUpdateHabit(id, updates as Record<string, unknown>), timeoutPromise]);
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
      // Force fresh fetch for all habit queries
      qc.invalidateQueries({ queryKey: KEY, refetchType: 'active' });
    },
    retry: 0,
  });

  const deleteHabit = useMutation({
    mutationFn: async (id: string) => {
      // Try soft delete first
      if (colCacheState.is_deleted !== false) {
        const { error } = await supabase
          .from("habits")
          .update({ is_deleted: true })
          .eq("id", id);

        if (!error) return;

        const isColError =
          error.code === "42703" ||
          error.message?.toLowerCase().includes("is_deleted") ||
          error.message?.toLowerCase().includes("column");

        if (isColError) {
          setColCache('is_deleted', false);
          // Hard delete
          const { error: e2 } = await supabase.from("habits").delete().eq("id", id);
          if (e2) throw e2;
          return;
        }
        throw error;
      }

      // Hard delete (is_deleted column confirmed absent)
      const { error } = await supabase.from("habits").delete().eq("id", id);
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
      qc.invalidateQueries({ queryKey: KEY, refetchType: 'active' });
    },
    retry: 0,
  });

    const freezeHabit = useMutation({
    mutationFn: async ({ id, dateStr, monthStr }: { id: string, dateStr: string, monthStr: string }) => {
      freezeHabitDay(id, dateStr, monthStr);
      return { id, dateStr };
    },
    onMutate: async ({ id, dateStr }) => {
      await qc.cancelQueries({ queryKey: KEY });
      const prev = qc.getQueryData<HabitWithStreak[]>(queryKey);
      qc.setQueryData<HabitWithStreak[]>(queryKey, (old) => {
        if (!old) return old;
        return old.map(h => {
          if (h.id === id) {
            const newFreezes = new Set(h.freezes);
            newFreezes.add(dateStr);
            return { ...h, freezes: newFreezes, frozenToday: dateStr === new Date().toLocaleDateString("en-CA") };
          }
          return h;
        });
      });
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(queryKey, ctx.prev);
    },
    onSettled: () => qc.invalidateQueries({ queryKey: KEY }),
  });

  const resetStreak = async (habitId: string, reason: string) => {
    const { data: authData } = await supabase.auth.getSession();
    if (!authData.session) throw new Error("Not logged in");
    await supabase
      .from("habit_streaks")
      .update({ current_streak: 0 })
      .eq("habit_id", habitId);
    const key = `relapse_logs_${habitId}`;
    const existing = JSON.parse(localStorage.getItem(key) || "[]");
    existing.push({ reason, date: new Date().toISOString() });
    localStorage.setItem(key, JSON.stringify(existing));
    qc.invalidateQueries({ queryKey: KEY });
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
    freezeHabit: (id: string, dateStr: string, monthStr: string) => freezeHabit.mutateAsync({ id, dateStr, monthStr }),
    resetStreak,
    isAddingHabit: addHabit.isPending,
    isUpdatingHabit: updateHabit.isPending,
  };
}

