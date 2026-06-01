import { supabase, Note, NoteFolder } from "@/lib/supabase";

// =====================================================
// NOTES API
// =====================================================

export async function getNotes(
  userId: string,
  options?: {
    folderId?: string | null;
    archived?: boolean;
    pinned?: boolean;
    search?: string;
    limit?: number;
  }
): Promise<{ data: Note[]; error: Error | null }> {
  let query = supabase
    .from("notes")
    .select("*")
    .eq("user_id", userId)
    .eq("is_archived", options?.archived ?? false);

  if (options?.folderId !== undefined) {
    if (options.folderId === null) {
      query = query.is("folder_id", null);
    } else {
      query = query.eq("folder_id", options.folderId);
    }
  }

  if (options?.pinned !== undefined) {
    query = query.eq("is_pinned", options.pinned);
  }

  if (options?.search) {
    query = query.or(
      `title.ilike.%${options.search}%,content.ilike.%${options.search}%`
    );
  }

  query = query
    .order("is_pinned", { ascending: false })
    .order("updated_at", { ascending: false })
    .limit(options?.limit ?? 100);

  const { data, error } = await query;
  return { data: (data || []) as Note[], error };
}

export async function createNote(
  userId: string,
  note: Partial<Note>
): Promise<{ data: Note | null; error: Error | null }> {
  const { data, error } = await supabase
    .from("notes")
    .insert({ ...note, user_id: userId })
    .select()
    .single();

  return { data: data as Note | null, error };
}

export async function updateNote(
  noteId: string,
  updates: Partial<Note>
): Promise<{ error: Error | null }> {
  // Auto-calculate word count
  if (updates.content !== undefined) {
    updates.word_count = updates.content
      .trim()
      .split(/\s+/)
      .filter(Boolean).length;
  }

  const { error } = await supabase.from("notes").update(updates).eq("id", noteId);
  return { error };
}

export async function deleteNote(noteId: string): Promise<{ error: Error | null }> {
  const { error } = await supabase.from("notes").delete().eq("id", noteId);
  return { error };
}

export async function togglePinNote(
  noteId: string,
  pinned: boolean
): Promise<{ error: Error | null }> {
  return updateNote(noteId, { is_pinned: pinned });
}

export async function archiveNote(
  noteId: string,
  archived: boolean
): Promise<{ error: Error | null }> {
  return updateNote(noteId, { is_archived: archived });
}

// =====================================================
// NOTE FOLDERS API
// =====================================================

export async function getNoteFolders(
  userId: string
): Promise<{ data: NoteFolder[]; error: Error | null }> {
  const { data, error } = await supabase
    .from("note_folders")
    .select("*")
    .eq("user_id", userId)
    .order("position", { ascending: true });

  return { data: (data || []) as NoteFolder[], error };
}

export async function createNoteFolder(
  userId: string,
  folder: Partial<NoteFolder>
): Promise<{ data: NoteFolder | null; error: Error | null }> {
  const { data, error } = await supabase
    .from("note_folders")
    .insert({ ...folder, user_id: userId })
    .select()
    .single();

  return { data: data as NoteFolder | null, error };
}

export async function deleteNoteFolder(folderId: string): Promise<{ error: Error | null }> {
  // This will set folder_id to NULL for all notes in this folder (via ON DELETE SET NULL)
  const { error } = await supabase.from("note_folders").delete().eq("id", folderId);
  return { error };
}
