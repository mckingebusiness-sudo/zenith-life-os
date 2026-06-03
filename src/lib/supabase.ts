import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

// Safe storage for SSR (TanStack Start)
const isBrowser = typeof window !== "undefined";

const customFetch = async (url: RequestInfo | URL, options?: RequestInit) => {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), 15000); // 15s timeout (raised from 8s for larger historical payloads on slow connections)
  try {
    const response = await fetch(url, { ...options, signal: controller.signal });
    return response;
  } finally {
    clearTimeout(id);
  }
};

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: isBrowser,
    storage: isBrowser ? window.localStorage : undefined,
  },
  global: {
    fetch: customFetch
  }
});

// =====================================================
// TYPESCRIPT TYPES
// =====================================================

export interface Profile {
  id: string;
  username?: string;
  full_name?: string;
  avatar_url?: string;
  bio?: string;
  timezone: string;
  language: string;
  theme: string;
  life_score: number;
  subscription_plan: "free" | "pro" | "elite";
  onboarding_completed: boolean;
  created_at: string;
  updated_at: string;
}

export interface UserSettings {
  id: string;
  user_id: string;
  sidebar_collapsed: boolean;
  sidebar_width: number;
  notifications_enabled: boolean;
  ai_suggestions_enabled: boolean;
  focus_mode_enabled: boolean;
  currency: string;
  budget_monthly: number;
  work_hours_start: string;
  work_hours_end: string;
  created_at: string;
  updated_at: string;
}

/**
 * @deprecated Use the Habit type from '@/hooks/useHabits' instead.
 * This legacy type is kept only for backward compatibility with non-habit modules.
 * The actual DB schema uses: title, cadence, target_per_period, active_weekdays,
 * habit_type, is_deleted, tracking_type.
 */
export interface Habit {
  id: string;
  user_id: string;
  title: string;
  description?: string | null;
  icon?: string | null;
  color: string;
  cadence: "daily" | "weekly" | "monthly" | "times_per_week";
  target_per_period: number;
  active_weekdays: number[];
  grace_days: number;
  is_private: boolean;
  sort_order: number;
  habit_type: "good" | "quit";
  is_deleted: boolean;
  is_paused?: boolean;
  pause_until?: string | null;
  tracking_type?: "checkbox" | "quantitative";
  target_value?: number | null;
  target_unit?: string | null;
  saved_value_per_day?: number | null;
  saved_unit?: string | null;
  created_at: string;
  updated_at?: string;
}

/**
 * @deprecated HabitCompletion is replaced by habit_checkins table.
 * Kept for type compatibility only.
 */
export interface HabitCompletion {
  id: string;
  habit_id: string;
  user_id: string;
  day_local: string;
  created_at: string;
}

export interface HabitUrgeLog {
  id: string;
  user_id: string;
  habit_id: string;
  day_local: string;
  urge_level: number;
  trigger?: string;
  created_at: string;
}

export interface HabitRecoveryEvent {
  id: string;
  user_id: string;
  habit_id: string;
  day_local: string;
  action_taken: string;
  created_at: string;
}

export interface HabitSOSSession {
  id: string;
  user_id: string;
  habit_id: string;
  feeling?: string;
  suggested_alternative?: string;
  outcome?: string;
  created_at: string;
}

export interface HabitWhyWall {
  id: string;
  user_id: string;
  habit_id: string;
  reason: string;
  created_at: string;
  updated_at: string;
}

export interface Goal {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  category:
    | "career"
    | "health"
    | "finance"
    | "learning"
    | "relationships"
    | "personal"
    | "spiritual"
    | "other";
  priority: "low" | "medium" | "high" | "critical";
  status: "draft" | "active" | "paused" | "completed" | "abandoned";
  progress: number;
  target_date?: string;
  completed_at?: string;
  parent_goal_id?: string;
  milestones: Milestone[];
  tags: string[];
  created_at: string;
  updated_at: string;
}

export interface Milestone {
  id: string;
  title: string;
  completed: boolean;
  due_date?: string;
}

export interface Board {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  color: string;
  icon: string;
  is_default: boolean;
  position: number;
  created_at: string;
  updated_at: string;
}

export interface BoardColumn {
  id: string;
  board_id: string;
  user_id: string;
  title: string;
  color: string;
  position: number;
  max_cards?: number;
  created_at: string;
}

export interface Task {
  id: string;
  user_id: string;
  board_id?: string;
  column_id?: string;
  goal_id?: string;
  title: string;
  description?: string;
  priority: "low" | "medium" | "high" | "critical";
  status: "todo" | "in_progress" | "review" | "done" | "cancelled";
  tags: string[];
  attachments: Attachment[];
  checklists: ChecklistItem[];
  due_date?: string;
  estimated_minutes?: number;
  actual_minutes?: number;
  position: number;
  is_archived: boolean;
  completed_at?: string;
  created_at: string;
  updated_at: string;
}

export interface Attachment {
  id: string;
  name: string;
  url: string;
  type: string;
  size: number;
}

export interface ChecklistItem {
  id: string;
  text: string;
  completed: boolean;
}

export interface Note {
  id: string;
  user_id: string;
  title: string;
  content: string;
  content_json?: Record<string, unknown>;
  folder_id?: string;
  tags: string[];
  color: string;
  is_pinned: boolean;
  is_archived: boolean;
  is_encrypted: boolean;
  word_count: number;
  created_at: string;
  updated_at: string;
}

export interface NoteFolder {
  id: string;
  user_id: string;
  name: string;
  color: string;
  icon: string;
  parent_id?: string;
  position: number;
  created_at: string;
}

export interface CalendarEvent {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  location?: string;
  start_at: string;
  end_at: string;
  all_day: boolean;
  color: string;
  category:
    | "work"
    | "personal"
    | "health"
    | "social"
    | "learning"
    | "finance"
    | "general";
  recurrence?: "none" | "daily" | "weekly" | "monthly" | "yearly";
  recurrence_end?: string;
  reminder_minutes?: number;
  task_id?: string;
  goal_id?: string;
  is_cancelled: boolean;
  created_at: string;
  updated_at: string;
}

export interface ExpenseCategory {
  id: string;
  user_id: string;
  name: string;
  icon: string;
  color: string;
  budget_monthly?: number;
  type: "income" | "expense" | "saving" | "investment";
  created_at: string;
}

export interface Transaction {
  id: string;
  user_id: string;
  category_id?: string;
  title: string;
  description?: string;
  amount: number;
  currency: string;
  type: "income" | "expense" | "transfer" | "saving" | "investment";
  date: string;
  payment_method: "cash" | "card" | "bank_transfer" | "crypto" | "other";
  is_recurring: boolean;
  recurrence_period?: "daily" | "weekly" | "monthly" | "yearly";
  receipt_url?: string;
  tags: string[];
  created_at: string;
  updated_at: string;
}

export interface VaultItem {
  id: string;
  user_id: string;
  title: string;
  type: "password" | "note" | "card" | "identity" | "api_key" | "other";
  encrypted_data: string;
  icon: string;
  folder?: string;
  tags: string[];
  is_favorite: boolean;
  last_accessed_at?: string;
  created_at: string;
  updated_at: string;
}

export interface DailySummary {
  id: string;
  user_id: string;
  date: string;
  life_score: number;
  habits_completed: number;
  habits_total: number;
  tasks_completed: number;
  tasks_created: number;
  focus_minutes: number;
  mood?: number;
  energy_level?: number;
  notes_count: number;
  income_amount: number;
  expense_amount: number;
  journal_entry?: string;
  ai_insights: AIInsightEntry[];
  created_at: string;
}

export interface AIInsightEntry {
  id: string;
  type: string;
  content: string;
}

export interface AIInsight {
  id: string;
  user_id: string;
  type:
    | "productivity"
    | "habit"
    | "financial"
    | "goal"
    | "health"
    | "general";
  title: string;
  content: string;
  data_context?: Record<string, unknown>;
  is_applied: boolean;
  is_dismissed: boolean;
  applied_at?: string;
  created_at: string;
}

export interface FocusSession {
  id: string;
  user_id: string;
  task_id?: string;
  goal_id?: string;
  start_at: string;
  end_at?: string;
  duration_minutes?: number;
  type: "focus" | "short_break" | "long_break";
  completed: boolean;
  notes?: string;
  created_at: string;
}
