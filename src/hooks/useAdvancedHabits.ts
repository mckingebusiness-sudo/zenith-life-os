import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";
import { toast } from "sonner";

export interface DailyMood {
  id: string;
  user_id: string;
  date_local: string;
  mood_score: number;
  created_at: string;
}

export interface HabitReward {
  id: string;
  habit_id: string;
  user_id: string;
  required_streak: number;
  reward_text: string;
  is_claimed: boolean;
  created_at: string;
}

const tz = () => Intl.DateTimeFormat().resolvedOptions().timeZone;

export function useDailyMoods(year: number, month: number) {
  const qc = useQueryClient();
  const queryKey = ["daily_moods", year, month];

  const query = useQuery({
    queryKey,
    queryFn: async () => {
      const { data: authData } = await supabase.auth.getSession();
      if (!authData.session) throw new Error("Not logged in");

      const startDate = new Date(year, month - 1, 1);
      const endDate = new Date(year, month, 0);

      const startStr = new Intl.DateTimeFormat("en-CA", { timeZone: tz() }).format(startDate);
      const endStr = new Intl.DateTimeFormat("en-CA", { timeZone: tz() }).format(endDate);

      const { data, error } = await supabase
        .from("daily_moods")
        .select("*")
        .eq("user_id", authData.session.user.id)
        .gte("date_local", startStr)
        .lte("date_local", endStr);

      if (error) throw error;
      return data as DailyMood[];
    },
    staleTime: 60000,
  });

  const upsertMood = useMutation({
    mutationFn: async ({ date_local, mood_score }: { date_local: string; mood_score: number }) => {
      const { data: authData } = await supabase.auth.getSession();
      if (!authData.session) throw new Error("Not logged in");
      const userId = authData.session.user.id;

      const { data, error } = await supabase
        .from("daily_moods")
        .upsert({ user_id: userId, date_local, mood_score }, { onConflict: "user_id,date_local" })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["daily_moods"] });
      toast.success("Mood updated");
    },
    onError: (err: any) => {
      console.error("Failed to update mood:", err);
      toast.error("Failed to update mood: " + err.message);
    }
  });

  return {
    moods: query.data || [],
    isLoading: query.isLoading,
    upsertMood: (date_local: string, mood_score: number) => upsertMood.mutateAsync({ date_local, mood_score }),
  };
}

export function useHabitRewards(habitId?: string) {
  const qc = useQueryClient();
  const queryKey = habitId ? ["habit_rewards", habitId] : ["habit_rewards"];

  const query = useQuery({
    queryKey,
    queryFn: async () => {
      const { data: authData } = await supabase.auth.getSession();
      if (!authData.session) throw new Error("Not logged in");

      let req = supabase.from("habit_rewards").select("*").eq("user_id", authData.session.user.id);
      if (habitId) {
        req = req.eq("habit_id", habitId);
      }

      const { data, error } = await req;
      if (error) throw error;
      return data as HabitReward[];
    },
    staleTime: 60000,
  });

  const addReward = useMutation({
    mutationFn: async (reward: Partial<HabitReward>) => {
      const { data: authData } = await supabase.auth.getSession();
      if (!authData.session) throw new Error("Not logged in");
      const userId = authData.session.user.id;

      const { data, error } = await supabase
        .from("habit_rewards")
        .insert({ ...reward, user_id: userId })
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["habit_rewards"] });
      toast.success("Reward added");
    }
  });

  const claimReward = useMutation({
    mutationFn: async (rewardId: string) => {
      const { data: authData } = await supabase.auth.getSession();
      if (!authData.session) throw new Error("Not logged in");

      const { data, error } = await supabase
        .from("habit_rewards")
        .update({ is_claimed: true })
        .eq("id", rewardId)
        .eq("user_id", authData.session.user.id)
        .select()
        .single();
      
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["habit_rewards"] });
      toast.success("Reward claimed!");
    }
  });

  const updateReward = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<HabitReward> }) => {
      const { data: authData } = await supabase.auth.getSession();
      if (!authData.session) throw new Error("Not logged in");

      const { data, error } = await supabase
        .from("habit_rewards")
        .update(updates)
        .eq("id", id)
        .eq("user_id", authData.session.user.id)
        .select()
        .single();
        
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["habit_rewards"] });
      toast.success("Reward updated");
    }
  });

  const deleteReward = useMutation({
    mutationFn: async (id: string) => {
      const { data: authData } = await supabase.auth.getSession();
      if (!authData.session) throw new Error("Not logged in");

      const { error } = await supabase
        .from("habit_rewards")
        .delete()
        .eq("id", id)
        .eq("user_id", authData.session.user.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["habit_rewards"] });
      toast.success("Reward deleted");
    }
  });

  return {
    rewards: query.data || [],
    isLoading: query.isLoading,
    addReward: (reward: Partial<HabitReward>) => addReward.mutateAsync(reward),
    claimReward: (id: string) => claimReward.mutateAsync(id),
    updateReward: (id: string, updates: Partial<HabitReward>) => updateReward.mutateAsync({ id, updates }),
    deleteReward: (id: string) => deleteReward.mutateAsync(id),
  };
}
