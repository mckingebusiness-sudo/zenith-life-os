import { supabase, Transaction, ExpenseCategory } from "@/lib/supabase";

// =====================================================
// FINANCES API
// =====================================================

export async function getTransactions(
  userId: string,
  options?: {
    limit?: number;
    offset?: number;
    type?: string;
    categoryId?: string;
    dateFrom?: string;
    dateTo?: string;
  }
): Promise<{ data: Transaction[]; total: number; error: Error | null }> {
  let query = supabase
    .from("transactions")
    .select("*, expense_categories(name, icon, color)", { count: "exact" })
    .eq("user_id", userId);

  if (options?.type) query = query.eq("type", options.type);
  if (options?.categoryId) query = query.eq("category_id", options.categoryId);
  if (options?.dateFrom) query = query.gte("date", options.dateFrom);
  if (options?.dateTo) query = query.lte("date", options.dateTo);

  query = query
    .order("date", { ascending: false })
    .range(options?.offset ?? 0, (options?.offset ?? 0) + (options?.limit ?? 50) - 1);

  const { data, error, count } = await query;

  return { data: (data || []) as Transaction[], total: count ?? 0, error };
}

export async function createTransaction(
  userId: string,
  transaction: Partial<Transaction>
): Promise<{ data: Transaction | null; error: Error | null }> {
  const { data, error } = await supabase
    .from("transactions")
    .insert({ ...transaction, user_id: userId })
    .select()
    .single();

  return { data: data as Transaction | null, error };
}

export async function updateTransaction(
  transactionId: string,
  updates: Partial<Transaction>
): Promise<{ error: Error | null }> {
  const { error } = await supabase
    .from("transactions")
    .update(updates)
    .eq("id", transactionId);

  return { error };
}

export async function deleteTransaction(transactionId: string): Promise<{ error: Error | null }> {
  const { error } = await supabase.from("transactions").delete().eq("id", transactionId);
  return { error };
}

export async function getExpenseCategories(
  userId: string
): Promise<{ data: ExpenseCategory[]; error: Error | null }> {
  const { data, error } = await supabase
    .from("expense_categories")
    .select("*")
    .eq("user_id", userId)
    .order("name", { ascending: true });

  return { data: (data || []) as ExpenseCategory[], error };
}

export async function createExpenseCategory(
  userId: string,
  category: Partial<ExpenseCategory>
): Promise<{ data: ExpenseCategory | null; error: Error | null }> {
  const { data, error } = await supabase
    .from("expense_categories")
    .insert({ ...category, user_id: userId })
    .select()
    .single();

  return { data: data as ExpenseCategory | null, error };
}

export interface MonthlyStats {
  totalIncome: number;
  totalExpenses: number;
  totalSavings: number;
  netFlow: number;
  byCategory: { name: string; amount: number; color: string; icon: string }[];
  byDay: { date: string; income: number; expense: number }[];
}

export async function getMonthlyStats(
  userId: string,
  year: number,
  month: number
): Promise<{ data: MonthlyStats | null; error: Error | null }> {
  const dateFrom = `${year}-${String(month).padStart(2, "0")}-01`;
  const dateTo = new Date(year, month, 0).toISOString().split("T")[0];

  const { data, error } = await supabase
    .from("transactions")
    .select("*, expense_categories(name, icon, color)")
    .eq("user_id", userId)
    .gte("date", dateFrom)
    .lte("date", dateTo);

  if (error) return { data: null, error };

  const transactions = data || [];

  const totalIncome = transactions
    .filter((t) => t.type === "income")
    .reduce((sum, t) => sum + t.amount, 0);

  const totalExpenses = transactions
    .filter((t) => t.type === "expense")
    .reduce((sum, t) => sum + t.amount, 0);

  const totalSavings = transactions
    .filter((t) => t.type === "saving")
    .reduce((sum, t) => sum + t.amount, 0);

  // Group by category
  const categoryMap = new Map<string, { name: string; amount: number; color: string; icon: string }>();
  transactions
    .filter((t) => t.type === "expense")
    .forEach((t) => {
      const cat = t.expense_categories;
      const key = t.category_id || "other";
      const existing = categoryMap.get(key);
      if (existing) {
        existing.amount += t.amount;
      } else {
        categoryMap.set(key, {
          name: cat?.name || "أخرى",
          amount: t.amount,
          color: cat?.color || "#4ADE80",
          icon: cat?.icon || "💰",
        });
      }
    });

  // Group by day
  const dayMap = new Map<string, { income: number; expense: number }>();
  transactions.forEach((t) => {
    const existing = dayMap.get(t.date) || { income: 0, expense: 0 };
    if (t.type === "income") existing.income += t.amount;
    if (t.type === "expense") existing.expense += t.amount;
    dayMap.set(t.date, existing);
  });

  return {
    data: {
      totalIncome,
      totalExpenses,
      totalSavings,
      netFlow: totalIncome - totalExpenses - totalSavings,
      byCategory: Array.from(categoryMap.values()),
      byDay: Array.from(dayMap.entries()).map(([date, vals]) => ({ date, ...vals })),
    },
    error: null,
  };
}
