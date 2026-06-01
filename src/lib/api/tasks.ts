import { supabase, Task, Board, BoardColumn } from "@/lib/supabase";

// =====================================================
// TASKS / KANBAN API
// =====================================================

export async function getBoards(userId: string): Promise<{ data: Board[]; error: Error | null }> {
  const { data, error } = await supabase
    .from("boards")
    .select("*")
    .eq("user_id", userId)
    .order("position", { ascending: true });

  return { data: (data || []) as Board[], error };
}

export async function createBoard(
  userId: string,
  board: Partial<Board>
): Promise<{ data: Board | null; error: Error | null }> {
  const { data, error } = await supabase
    .from("boards")
    .insert({ ...board, user_id: userId })
    .select()
    .single();

  return { data: data as Board | null, error };
}

export async function getBoardColumns(
  boardId: string
): Promise<{ data: BoardColumn[]; error: Error | null }> {
  const { data, error } = await supabase
    .from("board_columns")
    .select("*")
    .eq("board_id", boardId)
    .order("position", { ascending: true });

  return { data: (data || []) as BoardColumn[], error };
}

export async function createBoardColumn(
  userId: string,
  boardId: string,
  column: Partial<BoardColumn>
): Promise<{ data: BoardColumn | null; error: Error | null }> {
  const { data, error } = await supabase
    .from("board_columns")
    .insert({ ...column, user_id: userId, board_id: boardId })
    .select()
    .single();

  return { data: data as BoardColumn | null, error };
}

export async function getTasks(
  userId: string,
  options?: {
    boardId?: string;
    columnId?: string;
    status?: string;
    archived?: boolean;
  }
): Promise<{ data: Task[]; error: Error | null }> {
  let query = supabase
    .from("tasks")
    .select("*")
    .eq("user_id", userId)
    .eq("is_archived", options?.archived ?? false);

  if (options?.boardId) query = query.eq("board_id", options.boardId);
  if (options?.columnId) query = query.eq("column_id", options.columnId);
  if (options?.status) query = query.eq("status", options.status);

  const { data, error } = await query.order("position", { ascending: true });

  return { data: (data || []) as Task[], error };
}

export async function createTask(
  userId: string,
  task: Partial<Task>
): Promise<{ data: Task | null; error: Error | null }> {
  const { data, error } = await supabase
    .from("tasks")
    .insert({ ...task, user_id: userId })
    .select()
    .single();

  return { data: data as Task | null, error };
}

export async function updateTask(
  taskId: string,
  updates: Partial<Task>
): Promise<{ error: Error | null }> {
  const payload: Partial<Task> & { completed_at?: string | null } = { ...updates };

  if (updates.status === "done" && !updates.completed_at) {
    payload.completed_at = new Date().toISOString();
  } else if (updates.status && updates.status !== "done") {
    (payload as any).completed_at = null;
  }

  const { error } = await supabase.from("tasks").update(payload).eq("id", taskId);
  return { error };
}

export async function deleteTask(taskId: string): Promise<{ error: Error | null }> {
  const { error } = await supabase.from("tasks").delete().eq("id", taskId);
  return { error };
}

export async function moveTask(
  taskId: string,
  columnId: string,
  position: number
): Promise<{ error: Error | null }> {
  const { error } = await supabase
    .from("tasks")
    .update({ column_id: columnId, position })
    .eq("id", taskId);

  return { error };
}

export async function getTasksDueToday(
  userId: string
): Promise<{ data: Task[]; error: Error | null }> {
  const today = new Date().toISOString().split("T")[0];

  const { data, error } = await supabase
    .from("tasks")
    .select("*")
    .eq("user_id", userId)
    .eq("is_archived", false)
    .neq("status", "done")
    .gte("due_date", today + "T00:00:00")
    .lte("due_date", today + "T23:59:59")
    .order("priority", { ascending: false });

  return { data: (data || []) as Task[], error };
}
