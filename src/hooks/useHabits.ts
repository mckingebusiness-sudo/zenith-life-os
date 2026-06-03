import { useMutation, useQuery, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

const KEY = ["habits"];

// Helper: delayed invalidation to avoid race conditions with DB triggers.
// onSuccess already wrote the real data to cache; this is a safety-net refetch.
const REFETCH_DELAY_MS = 1500;

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
  created_at?: string;
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
  relapses?: Set<string>;
  relapseLogs?: { date: string; reason: string }[];
  checkedToday?: boolean;
  frozenToday?: boolean;
  relapsedToday?: boolean;
  avoidedToday?: boolean;
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
    .eq("user_id", authData.session.user.id)
    .or("is_deleted.eq.false,is_deleted.is.null")
    .order("sort_order");

  if (habitsError) throw habitsError;

  // Fetch check-ins for the selected month + previous 6 months for deep AI analytics
  const startDate = new Date(year, month - 6, 1);
  const endDate = new Date(year, month + 1, 0);

  const startStr = new Intl.DateTimeFormat("en-CA", { timeZone: tz() }).format(startDate);
  const endStr = new Intl.DateTimeFormat("en-CA", { timeZone: tz() }).format(endDate);

  const { data: recentCheckins, error: checkinsError } = await supabase
    .from("habit_checkins")
    .select("habit_id, day_local")
    .eq("user_id", authData.session.user.id)
    .gte("day_local", startStr)
    .lte("day_local", endStr);
  if (checkinsError) throw checkinsError;

  const checkinsByHabit = new Map<string, Set<string>>();
  recentCheckins?.forEach((c) => {
    if (!checkinsByHabit.has(c.habit_id)) checkinsByHabit.set(c.habit_id, new Set());
    checkinsByHabit.get(c.habit_id)!.add(c.day_local);
  });

  // Fetch freezes — column is 'freeze_day' in DB (not 'day_local')
  const { data: recentFreezes, error: freezesError } = await supabase
    .from("habit_freezes")
    .select("habit_id, freeze_day")
    .eq("user_id", authData.session.user.id)
    .gte("freeze_day", startStr)
    .lte("freeze_day", endStr);
  if (freezesError) throw freezesError;

  const freezesByHabit = new Map<string, Set<string>>();
  recentFreezes?.forEach((f) => {
    if (!freezesByHabit.has(f.habit_id)) freezesByHabit.set(f.habit_id, new Set());
    // freeze_day comes as a date string like '2026-06-01'
    const dayStr = typeof f.freeze_day === 'string' ? f.freeze_day : String(f.freeze_day);
    freezesByHabit.get(f.habit_id)!.add(dayStr);
  });

  const { data: recentRelapses, error: relapsesError } = await supabase
    .from("habit_relapses")
    .select("habit_id, day_local, reason")
    .eq("user_id", authData.session.user.id)
    .gte("day_local", startStr)
    .lte("day_local", endStr);
  if (relapsesError) throw relapsesError;

  const relapsesByHabit = new Map<string, Set<string>>();
  const relapseLogsByHabit = new Map<string, { date: string; reason: string }[]>();
  recentRelapses?.forEach((r) => {
    if (!relapsesByHabit.has(r.habit_id)) relapsesByHabit.set(r.habit_id, new Set());
    if (!relapseLogsByHabit.has(r.habit_id)) relapseLogsByHabit.set(r.habit_id, []);
    relapsesByHabit.get(r.habit_id)!.add(r.day_local);
    relapseLogsByHabit.get(r.habit_id)!.push({ date: r.day_local, reason: r.reason || "" });
  });

  return (habits || []).map((h: any) => {
    const habitCheckins = checkinsByHabit.get(h.id) || new Set<string>();
    const habitFreezes = freezesByHabit.get(h.id) || new Set<string>();
    const habitRelapses = relapsesByHabit.get(h.id) || new Set<string>();
    const habitRelapseLogs = relapseLogsByHabit.get(h.id) || [];
    const habitType = h.habit_type || 'good';
    const relapsedToday = habitRelapses.has(today);

    let dbStreak = (Array.isArray(h.streak) ? h.streak[0] : h.streak) || { current_streak: 0, longest_streak: 0, total_checkins: 0 };

    // ✅ FIX: Calculate streak client-side for ALL good habits so freezes count as +1.
    // The DB trigger bridges gaps but does NOT add +1 to the streak for frozen days.
    const cadence: HabitCadence = h.cadence || 'daily';
    if (habitType !== 'quit') {
      const handledDates = Array.from(new Set([...habitCheckins, ...habitFreezes])).sort() as string[];
      const totalCheckins = habitCheckins.size; // DB total_checkins only counts actual checkins

      // Allowed gap (in days) between consecutive handled days before streak breaks
      // daily → 1 day, weekly → 7 days, monthly → 31 days, times_per_week → 7 days
      const allowedGap = cadence === 'monthly' ? 31 : cadence === 'weekly' || cadence === 'times_per_week' ? 7 : 1;

      let calculatedCurrentStreak = 0;
      let longestStreak = 0;
      let runLen = 0;

      // Calculate longest streak in our fetched window
      for (let i = 0; i < handledDates.length; i++) {
        const curr = new Date(handledDates[i]);
        if (i === 0) {
          runLen = 1;
        } else {
          const prev = new Date(handledDates[i - 1]);
          const diffDays = Math.round((curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24));
          if (diffDays <= allowedGap) {
            runLen += 1;
          } else {
            runLen = 1;
          }
        }
        longestStreak = Math.max(longestStreak, runLen);
      }

      // Calculate current streak backwards from latest handled date
      if (handledDates.length > 0) {
        const lastHandled = new Date(handledDates[handledDates.length - 1]);
        const todayDate = new Date(today);
        const daysSinceLast = Math.round((todayDate.getTime() - lastHandled.getTime()) / (1000 * 60 * 60 * 24));
        
        if (daysSinceLast <= allowedGap) {
          calculatedCurrentStreak = 1;
          for (let i = handledDates.length - 1; i > 0; i--) {
            const curr = new Date(handledDates[i]);
            const prev = new Date(handledDates[i - 1]);
            const diffDays = Math.round((curr.getTime() - prev.getTime()) / (1000 * 60 * 60 * 24));
            if (diffDays <= allowedGap) {
              calculatedCurrentStreak++;
            } else {
              break;
            }
          }
        }
      }

      let currentStreak = calculatedCurrentStreak;
      // If the entire fetched window is one unbroken streak, the real streak may extend
      // further back than our 6-month fetch. Take the max of client (includes freezes as
      // streak-days) and DB (checkins-only but may cover a longer history).
      // Old formula added ALL habitFreezes.size to DB streak → double-counted freeze days.
      if (calculatedCurrentStreak === handledDates.length && handledDates.length > 0) {
         currentStreak = Math.max(calculatedCurrentStreak, dbStreak.current_streak || 0);
      }

      dbStreak = {
        ...dbStreak,
        current_streak: currentStreak,
        longest_streak: Math.max(dbStreak.longest_streak || 0, longestStreak),
        total_checkins: totalCheckins,
      };
    }

    // ✅ FIX: Calculate streak client-side for quit habits since DB triggers only process checkins
    if (habitType === 'quit') {
      const relapseDates = Array.from(habitRelapses).sort();
      let avoidedStreak = 0;
      if (relapseDates.length === 0) {
        if (h.created_at) {
          const createdAt = new Date(h.created_at);
          const createdDay = new Intl.DateTimeFormat("en-CA", { timeZone: tz() }).format(createdAt);
          if (createdDay <= today) {
            const todayDate = new Date(today);
            const createdDate = new Date(createdDay);
            const diffDays = Math.floor((todayDate.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24));
            avoidedStreak = diffDays;
          }
        }
      } else {
        const lastRelapse = relapseDates[relapseDates.length - 1];
        const lastRelapseDate = new Date(lastRelapse);
        const todayDate = new Date(today);
        avoidedStreak = Math.max(0, Math.floor((todayDate.getTime() - lastRelapseDate.getTime()) / (1000 * 60 * 60 * 24)));
      }
      
      dbStreak = {
        ...dbStreak,
        current_streak: avoidedStreak,
        longest_streak: Math.max(dbStreak.longest_streak || 0, avoidedStreak)
      };
    }

    // ✅ FIX: Don't auto-succeed quit habits for today if the habit was created today or later
    // Only consider "avoided" if the habit existed before today
    let avoidedToday: boolean | undefined = undefined;
    if (habitType === 'quit') {
      if (h.created_at) {
        const createdDate = new Date(h.created_at);
        const createdStr = new Intl.DateTimeFormat("en-CA", { timeZone: tz() }).format(createdDate);
        // Only count as avoided if the habit existed on or before today AND no relapse
        avoidedToday = createdStr <= today && !relapsedToday;
      } else {
        avoidedToday = !relapsedToday;
      }
    }

    return {
      ...h,
      habit_type: habitType,
      streak: dbStreak,
      checkins: habitCheckins,
      freezes: habitFreezes,
      relapses: habitRelapses,
      relapseLogs: habitRelapseLogs,
      checkedToday: habitCheckins.has(today), // Explicit checkin applies to ALL habits now
      frozenToday: habitFreezes.has(today),
      relapsedToday,
      avoidedToday,
    };
  });
}



// ─── Streak recalculation in DB ───────────────────────────────────────
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
          user_id: userId,
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
            if (action === "check" && !h.checkedToday && targetDay === today) {
              newStreakCount += 1;
              newTotal += 1;
            } else if (action === "uncheck" && h.checkedToday && targetDay === today) {
              newStreakCount = Math.max(0, newStreakCount - 1);
              newTotal = Math.max(0, newTotal - 1);
            } else if (targetDay !== today) {
              if (action === "check") {
                newTotal += 1;
                if (newStreakCount === 0) newStreakCount = 1;
              } else {
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
    onError: (err, _vars, ctx) => {
      console.error("❌ checkIn FAILED:", err);
      toast.error(`خطأ في تسجيل العادة: ${err?.message || 'حدث خطأ غير معروف'}`);
      // ✅ FIX: rollback key mismatch — onMutate returns { prev }, not { previousHabits }
      if (ctx?.prev) qc.setQueryData(queryKey, ctx.prev);
    },
    onSettled: () => {
      // Delayed refetch: gives DB triggers time to finish before re-querying
      setTimeout(() => { void qc.invalidateQueries({ queryKey }); }, REFETCH_DELAY_MS);
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
        saved_value_per_day: (habit as any).saved_value_per_day ?? null,
        saved_unit: (habit as any).saved_unit ?? null,
        is_paused: habit.is_paused ?? false,
        pause_until: habit.pause_until ?? null,
        tracking_type: habit.tracking_type ?? "checkbox",
        target_value: habit.target_value ?? null,
        target_unit: habit.target_unit ?? null,
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
        saved_value_per_day: (newHabit as any).saved_value_per_day ?? undefined,
        saved_unit: (newHabit as any).saved_unit ?? undefined,
        is_paused: newHabit.is_paused ?? false,
        pause_until: newHabit.pause_until ?? null,
        tracking_type: newHabit.tracking_type ?? "checkbox",
        target_value: newHabit.target_value ?? null,
        target_unit: newHabit.target_unit ?? null,
        checkins: new Set(),
        relapses: new Set(),
        relapseLogs: [],
        checkedToday: false, // quit habits need explicit checkin too
        freezes: new Set(),
        frozenToday: false,
        relapsedToday: false,
        avoidedToday: (newHabit as any).habit_type === "quit",
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
        const realHabit: HabitWithStreak = {
          ...(data as Habit),
          habit_type: (data as any).habit_type || "good",
          checkins: new Set(),
          freezes: new Set(),
          relapses: new Set(),
          relapseLogs: [],
          checkedToday: false,
          frozenToday: false,
          relapsedToday: false,
          avoidedToday: (data as any).habit_type === "quit",
          streak: {
            habit_id: data.id,
            user_id: data.user_id,
            current_streak: 0,
            longest_streak: 0,
            last_checkin_day: null,
            total_checkins: 0,
            computed_at: new Date().toISOString(),
          },
        };
        qc.setQueryData<HabitWithStreak[]>(queryKey, (old) => {
          if (!old) return old;
          return old.map((h) => (h.id === context.optimisticId ? realHabit : h));
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
    // ✅ FIX: targeted + non-blocking invalidation. Do NOT return the promise — returning it
    // keeps addHabit.mutateAsync pending until the background refetch settles, which freezes
    // the modal in an infinite loading spinner. onSuccess already wrote the real row to cache.
    onSettled: () => {
      setTimeout(() => { void qc.invalidateQueries({ queryKey }); }, REFETCH_DELAY_MS);
    },
    retry: 0,
  });

  const bulkAddHabits = useMutation({
    mutationFn: async (habits: Partial<Habit>[]) => {
      const { data: authData } = await supabase.auth.getSession();
      if (!authData.session) throw new Error("Not logged in");
      const userId = authData.session.user.id;

      const payloads = habits.map((habit, i) => ({
        title: habit.title,
        description: habit.description ?? null,
        icon: habit.icon ?? "✨",
        color: habit.color ?? "green",
        cadence: habit.cadence ?? "daily",
        target_per_period: habit.target_per_period ?? 1,
        active_weekdays: habit.active_weekdays ?? [0, 1, 2, 3, 4, 5, 6],
        grace_days: habit.grace_days ?? 0,
        is_private: habit.is_private ?? false,
        sort_order: habit.sort_order ?? i,
        user_id: userId,
        is_deleted: false,
        habit_type: (habit as any).habit_type || 'good',
        saved_value_per_day: (habit as any).saved_value_per_day ?? null,
        saved_unit: (habit as any).saved_unit ?? null,
        is_paused: habit.is_paused ?? false,
        pause_until: habit.pause_until ?? null,
        tracking_type: habit.tracking_type ?? "checkbox",
        target_value: habit.target_value ?? null,
        target_unit: habit.target_unit ?? null,
      }));

      const { data, error } = await supabase
        .from("habits")
        .insert(payloads)
        .select();
        
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      // ✅ FIX: targeted invalidation of the current month only — invalidating KEY (all months)
      // forced full refetches that could wipe unsynced optimistic data.
      void qc.invalidateQueries({ queryKey });
    },
    onError: (err: any) => {
      console.error("❌ bulkAddHabits FAILED:", err);
      toast.error("فشل حفظ العادات — " + (err?.message || 'تحقق من الاتصال بالإنترنت'));
    },
    retry: 0,
  });

  const updateHabit = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Habit> }) => {
      const { data: authData } = await supabase.auth.getSession();
      if (!authData.session) throw new Error("Not logged in");

      const { data, error } = await supabase
        .from("habits")
        .update(updates)
        .eq("id", id)
        .eq("user_id", authData.session.user.id)
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
    onSuccess: (data, variables) => {
      qc.setQueryData<HabitWithStreak[]>(queryKey, (old) => {
        if (!old) return old;
        return old.map((h) => {
          if (h.id === variables.id) {
            return { ...h, ...(data as any) };
          }
          return h;
        });
      });
    },
    onError: (err: any, _vars, ctx) => {
      console.error("❌ updateHabit FAILED:", err);
      if (ctx?.previous) qc.setQueryData(queryKey, ctx.previous);
      toast.error("فشل تعديل العادة — " + (err?.message || 'تحقق من الاتصال بالإنترنت'));
    },
    // ✅ FIX: targeted + non-blocking invalidation so updateHabit.mutateAsync settles
    // immediately (returning the promise froze edits — e.g. color change — in infinite loading).
    onSettled: () => {
      setTimeout(() => { void qc.invalidateQueries({ queryKey }); }, REFETCH_DELAY_MS);
    },
    retry: 0,
  });

  const deleteHabit = useMutation({
    mutationFn: async (id: string) => {
      const { data: authData } = await supabase.auth.getSession();
      if (!authData.session) throw new Error("Not logged in");

      // Soft delete
      const { error } = await supabase
        .from("habits")
        .update({ is_deleted: true })
        .eq("id", id)
        .eq("user_id", authData.session.user.id);
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
      setTimeout(() => { void qc.invalidateQueries({ queryKey }); }, REFETCH_DELAY_MS);
    },
    retry: 0,
  });

  const undeleteHabit = useMutation({
    mutationFn: async (id: string) => {
      const { data: authData } = await supabase.auth.getSession();
      if (!authData.session) throw new Error("Not logged in");

      const { error } = await supabase
        .from("habits")
        .update({ is_deleted: false })
        .eq("id", id)
        .eq("user_id", authData.session.user.id);
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
      setTimeout(() => { void qc.invalidateQueries({ queryKey }); }, REFETCH_DELAY_MS);
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
    onSettled: () => { setTimeout(() => { void qc.invalidateQueries({ queryKey }); }, REFETCH_DELAY_MS); },
  });

  const resetStreak = async (habitId: string, reason: string) => {
    const { data: authData } = await supabase.auth.getSession();
    if (!authData.session) throw new Error("Not logged in");
    const userId = authData.session.user.id;

    const today = new Intl.DateTimeFormat("en-CA", { timeZone: tz() }).format(new Date());
    const { error } = await supabase.from("habit_relapses").upsert({
      habit_id: habitId,
      user_id: userId,
      day_local: today,
      reason: reason
    }, { onConflict: "habit_id,day_local" });
    if (error) throw error;

    qc.invalidateQueries({ queryKey });
  };

  // ─── Undo Today's Relapse ───────────────────────────────────────────
  const undoRelapse = async (habitId: string) => {
    const { data: authData } = await supabase.auth.getSession();
    if (!authData.session) throw new Error("Not logged in");
    const userId = authData.session.user.id;

    const today = new Intl.DateTimeFormat("en-CA", { timeZone: tz() }).format(new Date());
    const { error } = await supabase
      .from("habit_relapses")
      .delete()
      .match({ habit_id: habitId, user_id: userId, day_local: today });

    if (error) throw error;

    // Optimistically update the cache immediately
    qc.setQueryData<HabitWithStreak[]>(queryKey, (old) => {
      if (!old) return old;
      return old.map((h) => {
        if (h.id === habitId) {
          const newRelapses = new Set(h.relapses);
          newRelapses.delete(today);
          const newRelapseLogs = (h.relapseLogs || []).filter(l => l.date !== today);

          // Re-calculate streak optimistically
          const relapseDates = Array.from(newRelapses).sort();
          let avoidedStreak = 0;
          if (relapseDates.length === 0) {
            if (h.created_at) {
              const createdAt = new Date(h.created_at);
              const createdDay = new Intl.DateTimeFormat("en-CA", { timeZone: tz() }).format(createdAt);
              if (createdDay <= today) {
                const todayDate = new Date(today);
                const createdDate = new Date(createdDay);
                avoidedStreak = Math.floor((todayDate.getTime() - createdDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
              }
            }
          } else {
            const lastRelapse = relapseDates[relapseDates.length - 1];
            const lastRelapseDate = new Date(lastRelapse);
            const todayDate = new Date(today);
            avoidedStreak = Math.max(0, Math.floor((todayDate.getTime() - lastRelapseDate.getTime()) / (1000 * 60 * 60 * 24)));
          }

          return {
            ...h,
            relapses: newRelapses,
            relapseLogs: newRelapseLogs,
            relapsedToday: false,
            avoidedToday: true,
            streak: {
              ...h.streak!,
              current_streak: avoidedStreak,
              total_checkins: newRelapses.size
            }
          };
        }
        return h;
      });
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
    bulkAddHabits: (habits: Partial<Habit>[]) => bulkAddHabits.mutateAsync(habits),
    updateHabit: (id: string, updates: Partial<Habit>) => updateHabit.mutate({ id, updates }),
    updateHabitAsync: (id: string, updates: Partial<Habit>) => updateHabit.mutateAsync({ id, updates }),
    deleteHabit: (id: string) => deleteHabit.mutateAsync(id),
    undeleteHabit: (id: string) => undeleteHabit.mutateAsync(id),
    freezeHabit: (id: string, dateStr: string, monthStr: string) => freezeHabit.mutateAsync({ id, dateStr, monthStr }),
    resetStreak,
    undoRelapse,
    isAddingHabit: addHabit.isPending,
    isUpdatingHabit: updateHabit.isPending,
  };
}
