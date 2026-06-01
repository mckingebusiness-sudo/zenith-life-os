import { supabase, CalendarEvent } from "@/lib/supabase";

// =====================================================
// CALENDAR API
// =====================================================

export async function getCalendarEvents(
  userId: string,
  options?: {
    dateFrom?: string;
    dateTo?: string;
    category?: string;
  }
): Promise<{ data: CalendarEvent[]; error: Error | null }> {
  let query = supabase
    .from("calendar_events")
    .select("*")
    .eq("user_id", userId)
    .eq("is_cancelled", false);

  if (options?.dateFrom) query = query.gte("start_at", options.dateFrom);
  if (options?.dateTo) query = query.lte("start_at", options.dateTo);
  if (options?.category) query = query.eq("category", options.category);

  const { data, error } = await query.order("start_at", { ascending: true });

  return { data: (data || []) as CalendarEvent[], error };
}

export async function createCalendarEvent(
  userId: string,
  event: Partial<CalendarEvent>
): Promise<{ data: CalendarEvent | null; error: Error | null }> {
  const { data, error } = await supabase
    .from("calendar_events")
    .insert({ ...event, user_id: userId })
    .select()
    .single();

  return { data: data as CalendarEvent | null, error };
}

export async function updateCalendarEvent(
  eventId: string,
  updates: Partial<CalendarEvent>
): Promise<{ error: Error | null }> {
  const { error } = await supabase
    .from("calendar_events")
    .update(updates)
    .eq("id", eventId);

  return { error };
}

export async function deleteCalendarEvent(eventId: string): Promise<{ error: Error | null }> {
  const { error } = await supabase.from("calendar_events").delete().eq("id", eventId);
  return { error };
}

export async function getTodayEvents(
  userId: string
): Promise<{ data: CalendarEvent[]; error: Error | null }> {
  const today = new Date();
  const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();
  const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1).toISOString();

  return getCalendarEvents(userId, { dateFrom: startOfDay, dateTo: endOfDay });
}

export async function getWeekEvents(
  userId: string
): Promise<{ data: CalendarEvent[]; error: Error | null }> {
  const today = new Date();
  const startOfWeek = new Date(today);
  startOfWeek.setDate(today.getDate() - today.getDay());

  const endOfWeek = new Date(startOfWeek);
  endOfWeek.setDate(startOfWeek.getDate() + 7);

  return getCalendarEvents(userId, {
    dateFrom: startOfWeek.toISOString(),
    dateTo: endOfWeek.toISOString(),
  });
}
