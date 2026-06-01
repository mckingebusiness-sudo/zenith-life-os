import { supabase, VaultItem } from "@/lib/supabase";

// =====================================================
// VAULT API - Client-side encryption for maximum security
// =====================================================

// Simple client-side AES-GCM encryption
async function getEncryptionKey(password: string): Promise<CryptoKey> {
  const encoder = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    "raw",
    encoder.encode(password),
    { name: "PBKDF2" },
    false,
    ["deriveKey"]
  );

  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: encoder.encode("zenith-life-os-salt"),
      iterations: 100000,
      hash: "SHA-256",
    },
    keyMaterial,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"]
  );
}

export async function encryptData(data: string, masterKey: string): Promise<string> {
  const key = await getEncryptionKey(masterKey);
  const encoder = new TextEncoder();
  const iv = crypto.getRandomValues(new Uint8Array(12));

  const encrypted = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    key,
    encoder.encode(data)
  );

  const combined = new Uint8Array(iv.length + encrypted.byteLength);
  combined.set(iv);
  combined.set(new Uint8Array(encrypted), iv.length);

  return btoa(String.fromCharCode(...combined));
}

export async function decryptData(encryptedData: string, masterKey: string): Promise<string> {
  const key = await getEncryptionKey(masterKey);
  const combined = Uint8Array.from(atob(encryptedData), (c) => c.charCodeAt(0));

  const iv = combined.slice(0, 12);
  const encrypted = combined.slice(12);

  const decrypted = await crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, encrypted);

  return new TextDecoder().decode(decrypted);
}

// =====================================================
// VAULT DB API
// =====================================================

export async function getVaultItems(
  userId: string,
  type?: string
): Promise<{ data: VaultItem[]; error: Error | null }> {
  let query = supabase
    .from("vault_items")
    .select("id, user_id, title, type, icon, folder, tags, is_favorite, last_accessed_at, created_at, updated_at")
    // Note: We don't select encrypted_data in the list view for security
    .eq("user_id", userId);

  if (type) query = query.eq("type", type);

  const { data, error } = await query
    .order("is_favorite", { ascending: false })
    .order("updated_at", { ascending: false });

  return { data: (data || []) as VaultItem[], error };
}

export async function getVaultItem(
  itemId: string,
  userId: string
): Promise<{ data: VaultItem | null; error: Error | null }> {
  const { data, error } = await supabase
    .from("vault_items")
    .select("*")
    .eq("id", itemId)
    .eq("user_id", userId)
    .single();

  if (!error) {
    // Update last accessed timestamp
    await supabase
      .from("vault_items")
      .update({ last_accessed_at: new Date().toISOString() })
      .eq("id", itemId);
  }

  return { data: data as VaultItem | null, error };
}

export async function createVaultItem(
  userId: string,
  item: Partial<VaultItem>
): Promise<{ data: VaultItem | null; error: Error | null }> {
  const { data, error } = await supabase
    .from("vault_items")
    .insert({ ...item, user_id: userId })
    .select()
    .single();

  return { data: data as VaultItem | null, error };
}

export async function updateVaultItem(
  itemId: string,
  updates: Partial<VaultItem>
): Promise<{ error: Error | null }> {
  const { error } = await supabase
    .from("vault_items")
    .update(updates)
    .eq("id", itemId);

  return { error };
}

export async function deleteVaultItem(itemId: string): Promise<{ error: Error | null }> {
  const { error } = await supabase.from("vault_items").delete().eq("id", itemId);
  return { error };
}
