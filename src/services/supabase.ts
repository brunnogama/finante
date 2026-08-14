import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseKey);

export interface ExpenseRecord {
  id?: number;
  description: string;
  amount: number;
  due_date: string;
  type: string;
  status: 'pending' | 'paid';
  created_at?: string;
}

export interface IncomeRecord {
  id?: number;
  source: string;
  amount: number;
  date: string;
  created_at?: string;
}

export const getExpenses = async () => {
  const { data, error } = await supabase
    .from('expenses')
    .select('*')
    .order('due_date', { ascending: true });
    
  if (error) {
    console.error('Error fetching expenses:', error);
    return [];
  }
  return data || [];
};

export const addExpense = async (expense: ExpenseRecord) => {
  const { data, error } = await supabase
    .from('expenses')
    .insert([expense])
    .select();
  if (error) console.error('Error adding expense:', error);
  return data;
};

export const getIncomes = async () => {
  const { data, error } = await supabase
    .from('incomes')
    .select('*')
    .order('created_at', { ascending: false });
    
  if (error) {
    console.error('Error fetching incomes:', error);
    return [];
  }
  return data || [];
};

export const addIncome = async (income: IncomeRecord) => {
  const { data, error } = await supabase
    .from('incomes')
    .insert([income])
    .select();
  if (error) console.error('Error adding income:', error);
  return data;
};

export const updateExpense = async (id: number, expense: Partial<ExpenseRecord>) => {
  const { data, error } = await supabase
    .from('expenses')
    .update(expense)
    .eq('id', id)
    .select();
  if (error) console.error('Error updating expense:', error);
  return data;
};

export const deleteExpense = async (id: number) => {
  const { data, error } = await supabase
    .from('expenses')
    .delete()
    .eq('id', id);
  if (error) console.error('Error deleting expense:', error);
  return data;
};
