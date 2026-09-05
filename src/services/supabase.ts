import { createClient } from '@supabase/supabase-js';
import { invoke, isTauri } from '@tauri-apps/api/core';
import { once } from '@tauri-apps/api/event';
import { renameCategoryStyle, deleteCategoryStyle } from './categoryStyles';

const FALLBACK_SUPABASE_URL = 'https://jxnjbqtwbvpivlwxfcxz.supabase.co';
const FALLBACK_SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Imp4bmpicXR3YnZwaXZsd3hmY3h6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODYzMDQxNjIsImV4cCI6MjEwMTg4MDE2Mn0.b7twbYa27qPffvcPDROjUeMdY2FnkOdRihKrVhy_dGk';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || FALLBACK_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || FALLBACK_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: false
  }
});

export interface ExpenseRecord {
  id?: number;
  description?: string;
  company?: string;
  amount: number;
  paid_amount?: number;
  due_date: string;
  paid_date?: string;
  payment_method?: 'PIX' | 'Crédito' | 'Débito' | 'Boleto' | string;
  notes?: string;
  excess_type?: 'late_fee' | 'overpayment';
  late_fee?: number;
  bill_attachment?: string;
  bill_name?: string;
  receipt_attachment?: string;
  receipt_name?: string;
  type: string;
  status: 'pending' | 'paid';
  created_at?: string;
}

export const DEFAULT_PAYMENT_METHODS = ['PIX', 'Crédito', 'Débito', 'Boleto'] as const;

export const uploadExpenseAttachment = async (
  file: File,
  folder: 'bills' | 'receipts' = 'bills'
): Promise<{ url: string; name: string }> => {
  const fileExt = file.name.split('.').pop() || 'dat';
  const fileName = `${folder}_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.${fileExt}`;
  const filePath = `${folder}/${fileName}`;

  try {
    const { data, error } = await supabase.storage
      .from('finante_attachments')
      .upload(filePath, file, { upsert: true });

    if (!error && data) {
      const { data: publicUrlData } = supabase.storage
        .from('finante_attachments')
        .getPublicUrl(filePath);

      if (publicUrlData?.publicUrl) {
        return { url: publicUrlData.publicUrl, name: file.name };
      }
    }
  } catch (storageErr) {
    console.warn('Supabase storage upload fallback to base64 DataURL:', storageErr);
  }

  // Graceful fallback to DataURL so attachments always work flawlessly
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      resolve({ url: reader.result as string, name: file.name });
    };
    reader.onerror = (err) => reject(err);
    reader.readAsDataURL(file);
  });
};

export interface IncomeRecord {
  id?: number;
  source: string;
  amount: number;
  date: string;
  created_at?: string;
}

const getEnrichments = (): Record<string, Partial<ExpenseRecord>> => {
  try {
    const raw = localStorage.getItem('finante_expense_enrichments');
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
};

const saveEnrichment = (id: number | string, data: Record<string, any>) => {
  try {
    if (!id) return;
    const enrichments = getEnrichments();
    enrichments[String(id)] = {
      ...(enrichments[String(id)] || {}),
      ...data
    };
    localStorage.setItem('finante_expense_enrichments', JSON.stringify(enrichments));
  } catch (err) {
    console.warn('Failed to save expense enrichment locally:', err);
  }
};

const deleteEnrichment = (id: number | string) => {
  try {
    if (!id) return;
    const enrichments = getEnrichments();
    delete enrichments[String(id)];
    localStorage.setItem('finante_expense_enrichments', JSON.stringify(enrichments));
  } catch (err) {
    console.warn('Failed to delete expense enrichment locally:', err);
  }
};

export const isUserOfflineOrUnauthenticated = async (): Promise<boolean> => {
  const isOffline = localStorage.getItem('finante_offline_mode') === 'true';
  if (isOffline) return true;
  try {
    const { data: { session } } = await supabase.auth.getSession();
    return !session?.user;
  } catch {
    return true;
  }
};

export const getExpenses = async (): Promise<ExpenseRecord[]> => {
  const localRaw = localStorage.getItem('finante_local_expenses');
  const localList: ExpenseRecord[] = localRaw ? JSON.parse(localRaw) : [];

  const offline = await isUserOfflineOrUnauthenticated();
  if (offline) {
    return localList;
  }

  try {
    const { data, error } = await supabase
      .from('expenses')
      .select('*')
      .order('due_date', { ascending: true });
      
    if (error) {
      console.warn('Supabase getExpenses warning:', error.message);
      return localList;
    }

    const enrichments = getEnrichments();

    if (data && data.length > 0) {
      const normalized = data.map((item: any) => {
        const enrichment = enrichments[String(item.id)] || {};
        const company = item.company || item.description || enrichment.company || 'Despesa';
        const paidAmount = item.paid_amount !== undefined && item.paid_amount !== null 
          ? Number(item.paid_amount) 
          : (enrichment.paid_amount !== undefined ? Number(enrichment.paid_amount) : (item.status === 'paid' ? Number(item.amount) : 0));
        const amount = Number(item.amount || enrichment.amount || 0);
        const paidDate = item.paid_date || enrichment.paid_date || (paidAmount > 0 ? (item.due_date || new Date().toISOString().split('T')[0]) : undefined);
        const paymentMethod = item.payment_method || enrichment.payment_method || (paidAmount > 0 ? 'PIX' : undefined);
        const notes = (item.notes !== undefined && item.notes !== null && item.notes !== '') ? item.notes : (enrichment.notes || '');
        const billAttachment = item.bill_attachment || enrichment.bill_attachment || undefined;
        const billName = item.bill_name || enrichment.bill_name || (billAttachment ? 'Boleto / Conta' : undefined);
        const receiptAttachment = item.receipt_attachment || enrichment.receipt_attachment || undefined;
        const receiptName = item.receipt_name || enrichment.receipt_name || (receiptAttachment ? 'Comprovante' : undefined);
        const excessType = item.excess_type || enrichment.excess_type || (paidDate && item.due_date && paidDate.split('T')[0] > item.due_date.split('T')[0] && paidAmount > amount ? 'late_fee' : 'overpayment');
        const lateFee = item.late_fee !== undefined && item.late_fee !== null ? Number(item.late_fee) : (enrichment.late_fee !== undefined ? Number(enrichment.late_fee) : undefined);

        return {
          ...item,
          company,
          description: company,
          paid_amount: paidAmount,
          amount,
          type: item.type || enrichment.type || 'Outros',
          due_date: item.due_date || enrichment.due_date || new Date().toISOString().split('T')[0],
          paid_date: paidDate,
          payment_method: paymentMethod,
          notes,
          excess_type: excessType,
          late_fee: lateFee,
          bill_attachment: billAttachment,
          bill_name: billName,
          receipt_attachment: receiptAttachment,
          receipt_name: receiptName,
          status: (paidAmount >= amount && amount > 0) || item.status === 'paid' ? 'paid' : 'pending'
        };
      });

      // Preserve any offline-created items that haven't synced yet (id > 1000000000)
      const remoteIds = new Set(normalized.map(e => e.id));
      const unsyncedLocal = localList.filter(l => l.id && !remoteIds.has(l.id) && l.id > 1000000000);

      // Filter out any unsyncedLocal that matches an existing remote item by content
      const deduplicatedUnsynced = unsyncedLocal.filter(local => {
        const isDuplicateOfRemote = normalized.some(rem => 
          (rem.company || rem.description || '').trim().toLowerCase() === (local.company || local.description || '').trim().toLowerCase() &&
          (rem.due_date ? rem.due_date.split('T')[0] : '') === (local.due_date ? local.due_date.split('T')[0] : '') &&
          Number(rem.amount || 0) === Number(local.amount || 0) &&
          (rem.type || '').trim().toLowerCase() === (local.type || '').trim().toLowerCase()
        );
        return !isDuplicateOfRemote;
      });

      // Also clean up any exact duplicate records that might have been inserted into Supabase
      const seenKeys = new Set<string>();
      const deduplicatedNormalized: ExpenseRecord[] = [];
      for (const item of normalized) {
        const key = `${(item.company || item.description || '').trim().toLowerCase()}:::${item.due_date?.split('T')[0]}:::${Number(item.amount || 0)}:::${(item.type || '').trim().toLowerCase()}:::${item.paid_amount || 0}`;
        if (!seenKeys.has(key)) {
          seenKeys.add(key);
          deduplicatedNormalized.push(item);
        }
      }

      const combined = [...deduplicatedNormalized, ...deduplicatedUnsynced].sort((a, b) => (a.due_date || '').localeCompare(b.due_date || ''));

      localStorage.setItem('finante_local_expenses', JSON.stringify(combined));
      return combined;
    }

    // If Supabase returned [] but we have local items, PRESERVE local items!
    if (localList.length > 0) {
      return localList;
    }

    localStorage.setItem('finante_local_expenses', JSON.stringify([]));
    return [];
  } catch (err) {
    console.error('Error in getExpenses:', err);
    return localList;
  }
};

const generateUniqueId = (): number => {
  return Date.now() + Math.floor(Math.random() * 1000000);
};

export const addExpense = async (expense: ExpenseRecord) => {
  const company = expense.company?.trim() || expense.description?.trim() || 'Despesa';
  const amount = Number(expense.amount) || 0;
  const paid_amount = Number(expense.paid_amount) || 0;
  const status = paid_amount >= amount && amount > 0 ? 'paid' : 'pending';

  const fullPayload = {
    description: company,
    company: company,
    amount: amount,
    paid_amount: paid_amount,
    due_date: expense.due_date,
    paid_date: expense.paid_date || (paid_amount > 0 ? expense.due_date : null),
    payment_method: paid_amount > 0 ? (expense.payment_method || 'PIX') : null,
    notes: expense.notes?.trim() || '',
    excess_type: expense.excess_type || (paid_amount > amount ? (expense.paid_date && expense.due_date && expense.paid_date > expense.due_date ? 'late_fee' : 'overpayment') : undefined),
    late_fee: expense.late_fee !== undefined ? Number(expense.late_fee) : null,
    bill_attachment: expense.bill_attachment || null,
    bill_name: expense.bill_name || null,
    receipt_attachment: expense.receipt_attachment || null,
    receipt_name: expense.receipt_name || null,
    type: expense.type,
    status: status
  };

  const offline = await isUserOfflineOrUnauthenticated();
  if (offline) {
    const local = JSON.parse(localStorage.getItem('finante_local_expenses') || '[]');
    const newRecord = { ...fullPayload, id: generateUniqueId() };
    saveEnrichment(newRecord.id, fullPayload);
    localStorage.setItem('finante_local_expenses', JSON.stringify([...local, newRecord]));
    return [newRecord];
  }

  try {
    const { data, error } = await supabase
      .from('expenses')
      .insert([fullPayload])
      .select();

    if (error) {
      console.warn('Retrying insert without newer columns:', error.message);
      const standardPayload = {
        description: company,
        amount: amount,
        due_date: expense.due_date,
        type: expense.type,
        status: status
      };
      const { data: stdData, error: stdError } = await supabase
        .from('expenses')
        .insert([standardPayload])
        .select();

      if (stdError) {
        console.warn('Fallback to local storage due to Supabase error:', stdError.message);
        const local = JSON.parse(localStorage.getItem('finante_local_expenses') || '[]');
        const newRecord = { ...fullPayload, id: generateUniqueId() };
        saveEnrichment(newRecord.id, fullPayload);
        localStorage.setItem('finante_local_expenses', JSON.stringify([...local, newRecord]));
        return [newRecord];
      }

      if (stdData && stdData[0]) {
        const id = stdData[0].id;
        saveEnrichment(id, fullPayload);
        const record = { ...stdData[0], ...fullPayload, id };
        const local = JSON.parse(localStorage.getItem('finante_local_expenses') || '[]');
        localStorage.setItem('finante_local_expenses', JSON.stringify([...local.filter((e: any) => e.id !== id), record]));
        return [record];
      }
    }

    if (data && data[0]) {
      saveEnrichment(data[0].id, fullPayload);
      const local = JSON.parse(localStorage.getItem('finante_local_expenses') || '[]');
      localStorage.setItem('finante_local_expenses', JSON.stringify([...local.filter((e: any) => e.id !== data[0].id), data[0]]));
    }
    return data;
  } catch (err) {
    console.error('Error adding expense:', err);
    const local = JSON.parse(localStorage.getItem('finante_local_expenses') || '[]');
    const newRecord = { ...fullPayload, id: generateUniqueId() };
    saveEnrichment(newRecord.id, fullPayload);
    localStorage.setItem('finante_local_expenses', JSON.stringify([...local, newRecord]));
    return [newRecord];
  }
};

export const getIncomes = async (): Promise<IncomeRecord[]> => {
  const localRaw = localStorage.getItem('finante_local_incomes');
  const localList: IncomeRecord[] = localRaw ? JSON.parse(localRaw) : [];

  const offline = await isUserOfflineOrUnauthenticated();
  if (offline) {
    return localList;
  }

  try {
    const { data, error } = await supabase
      .from('incomes')
      .select('*')
      .order('date', { ascending: false });
      
    if (error) {
      console.warn('Supabase getIncomes warning:', error.message);
      return localList;
    }
    
    if (data && data.length > 0) {
      const remoteIds = new Set(data.map((i: any) => i.id));
      const unsyncedLocal = localList.filter(l => l.id && !remoteIds.has(l.id) && l.id > 1000000000);
      const combined = [...data, ...unsyncedLocal].sort((a, b) => (b.date || '').localeCompare(a.date || ''));
      localStorage.setItem('finante_local_incomes', JSON.stringify(combined));
      return combined;
    }

    if (localList.length > 0) {
      return localList;
    }

    localStorage.setItem('finante_local_incomes', JSON.stringify([]));
    return [];
  } catch (err) {
    console.error('Error fetching incomes:', err);
    return localList;
  }
};

export const addIncome = async (income: IncomeRecord) => {
  const offline = await isUserOfflineOrUnauthenticated();
  if (offline) {
    const local = JSON.parse(localStorage.getItem('finante_local_incomes') || '[]');
    const newRecord = { ...income, id: generateUniqueId() };
    localStorage.setItem('finante_local_incomes', JSON.stringify([newRecord, ...local]));
    return [newRecord];
  }

  try {
    const { data, error } = await supabase
      .from('incomes')
      .insert([income])
      .select();
      
    if (error) {
      console.warn('Fallback to local storage for income:', error.message);
      const local = JSON.parse(localStorage.getItem('finante_local_incomes') || '[]');
      const newRecord = { ...income, id: generateUniqueId() };
      localStorage.setItem('finante_local_incomes', JSON.stringify([newRecord, ...local]));
      return [newRecord];
    }
    if (data && data[0]) {
      const local = JSON.parse(localStorage.getItem('finante_local_incomes') || '[]');
      localStorage.setItem('finante_local_incomes', JSON.stringify([data[0], ...local.filter((i: any) => i.id !== data[0].id)]));
    }
    return data;
  } catch (err) {
    console.error('Error adding income:', err);
    const local = JSON.parse(localStorage.getItem('finante_local_incomes') || '[]');
    const newRecord = { ...income, id: generateUniqueId() };
    localStorage.setItem('finante_local_incomes', JSON.stringify([newRecord, ...local]));
    return [newRecord];
  }
};

export const updateIncome = async (id: number, income: Partial<IncomeRecord>) => {
  const local = JSON.parse(localStorage.getItem('finante_local_incomes') || '[]');
  const updated = local.map((item: any) => item.id === id ? { ...item, ...income } : item);
  localStorage.setItem('finante_local_incomes', JSON.stringify(updated));

  const offline = await isUserOfflineOrUnauthenticated();
  if (offline) {
    return updated.filter((item: any) => item.id === id);
  }

  try {
    const { data, error } = await supabase
      .from('incomes')
      .update(income)
      .eq('id', id)
      .select();

    if (error) {
      console.warn('Updating local storage fallback for income:', error.message);
      return updated.filter((item: any) => item.id === id);
    }
    return data;
  } catch (err) {
    console.error('Error updating income:', err);
    return updated.filter((item: any) => item.id === id);
  }
};

export const deleteIncome = async (id: number) => {
  const local = JSON.parse(localStorage.getItem('finante_local_incomes') || '[]');
  const filtered = local.filter((item: any) => item.id !== id);
  localStorage.setItem('finante_local_incomes', JSON.stringify(filtered));

  const offline = await isUserOfflineOrUnauthenticated();
  if (offline) {
    return true;
  }

  try {
    const { data, error } = await supabase
      .from('incomes')
      .delete()
      .eq('id', id);
    if (error) {
      console.warn('Error deleting income from supabase, removed from local storage:', error);
    }
    return data;
  } catch (err) {
    console.error('Error deleting income:', err);
    return null;
  }
};

export const updateExpense = async (id: number, expense: Partial<ExpenseRecord>) => {
  const company = expense.company || expense.description;
  const updatePayload: any = { ...expense };
  if (company) {
    updatePayload.description = company;
    updatePayload.company = company;
  }
  if (expense.paid_amount !== undefined && expense.amount !== undefined) {
    updatePayload.status = Number(expense.paid_amount) >= Number(expense.amount) ? 'paid' : 'pending';
    if (Number(expense.paid_amount) > 0 && !updatePayload.paid_date) {
      updatePayload.paid_date = new Date().toISOString().split('T')[0];
    }
  }

  // Always save enrichment locally so attachments & extended metadata are never lost
  saveEnrichment(id, updatePayload);

  const local = JSON.parse(localStorage.getItem('finante_local_expenses') || '[]');
  const updated = local.map((item: any) => item.id === id ? { ...item, ...updatePayload } : item);
  localStorage.setItem('finante_local_expenses', JSON.stringify(updated));

  const offline = await isUserOfflineOrUnauthenticated();
  if (offline) {
    return updated.filter((item: any) => item.id === id);
  }

  try {
    const { data, error } = await supabase
      .from('expenses')
      .update(updatePayload)
      .eq('id', id)
      .select();

    if (error) {
      console.warn('Retrying update with standard columns:', error.message);
      const standardPayload: any = {};
      if (company) standardPayload.description = company;
      if (expense.amount !== undefined) standardPayload.amount = expense.amount;
      if (expense.due_date !== undefined) standardPayload.due_date = expense.due_date;
      if (expense.type !== undefined) standardPayload.type = expense.type;
      if (updatePayload.status !== undefined) standardPayload.status = updatePayload.status;

      const { data: stdData, error: stdError } = await supabase
        .from('expenses')
        .update(standardPayload)
        .eq('id', id)
        .select();

      if (stdError) {
        console.warn('Updating local storage fallback:', stdError.message);
        return updated.filter((item: any) => item.id === id);
      }
      return stdData ? [{ ...stdData[0], ...updatePayload }] : stdData;
    }
    return data;
  } catch (err) {
    console.error('Error updating expense:', err);
    return updated.filter((item: any) => item.id === id);
  }
};

export const deleteExpense = async (id: number) => {
  deleteEnrichment(id);
  const local = JSON.parse(localStorage.getItem('finante_local_expenses') || '[]');
  const filtered = local.filter((item: any) => item.id !== id);
  localStorage.setItem('finante_local_expenses', JSON.stringify(filtered));

  const offline = await isUserOfflineOrUnauthenticated();
  if (offline) {
    return true;
  }

  try {
    const { data, error } = await supabase
      .from('expenses')
      .delete()
      .eq('id', id);
    if (error) {
      console.warn('Error deleting expense from supabase, removed from local storage:', error);
    }
    return data;
  } catch (err) {
    console.error('Error deleting expense:', err);
    return null;
  }
};

// ==========================================
// EXPENSE TYPES / CATEGORIES MANAGEMENT
// ==========================================
export const DEFAULT_EXPENSE_TYPES = [
  'Alimentação',
  'Assinaturas',
  'Educação',
  'Lazer',
  'Moradia',
  'Outros',
  'Saúde',
  'Serviços',
  'Transporte'
];

const getDeletedExpenseTypes = (): string[] => {
  try {
    const raw = localStorage.getItem('finante_deleted_expense_types');
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

const markExpenseTypeDeleted = (name: string) => {
  const clean = name.trim().toLowerCase();
  const list = getDeletedExpenseTypes();
  if (!list.some(item => item.trim().toLowerCase() === clean)) {
    localStorage.setItem('finante_deleted_expense_types', JSON.stringify([...list, clean]));
  }
};

const unmarkExpenseTypeDeleted = (name: string) => {
  const clean = name.trim().toLowerCase();
  const list = getDeletedExpenseTypes();
  localStorage.setItem('finante_deleted_expense_types', JSON.stringify(list.filter(item => item.trim().toLowerCase() !== clean)));
};

export const getExpenseTypes = async (): Promise<string[]> => {
  const deleted = getDeletedExpenseTypes().map(d => d.trim().toLowerCase());

  // Always try to fetch freshest list from Supabase first
  try {
    const { data, error } = await supabase
      .from('expense_types')
      .select('name')
      .order('name', { ascending: true });

    if (!error && data && data.length > 0) {
      const names = data
        .map((d: any) => d.name)
        .filter((n: string) => n && !deleted.includes(n.trim().toLowerCase()))
        .sort((a: string, b: string) => a.localeCompare(b, 'pt-BR'));
      localStorage.setItem('finante_expense_types', JSON.stringify(names));
      return names.length > 0 ? names : ['Outros'];
    }
  } catch (err) {
    console.warn('Supabase expense_types fetch error:', err);
  }

  // Fallback to local cache if offline or table not present
  const local = localStorage.getItem('finante_expense_types');
  if (local) {
    try {
      const parsed = JSON.parse(local);
      if (Array.isArray(parsed) && parsed.length > 0) {
        const filtered = parsed
          .filter((n: string) => n && !deleted.includes(n.trim().toLowerCase()))
          .sort((a: string, b: string) => a.localeCompare(b, 'pt-BR'));
        return filtered.length > 0 ? filtered : ['Outros'];
      }
    } catch (e) {
      console.error('Error parsing local expense types:', e);
    }
  }

  const sorted = [...DEFAULT_EXPENSE_TYPES]
    .filter(n => !deleted.includes(n.trim().toLowerCase()))
    .sort((a, b) => a.localeCompare(b, 'pt-BR'));
  const finalDefault = sorted.length > 0 ? sorted : ['Outros'];
  localStorage.setItem('finante_expense_types', JSON.stringify(finalDefault));
  return finalDefault;
};

export const addExpenseType = async (typeName: string): Promise<string[]> => {
  const cleanName = typeName.trim();
  if (!cleanName) return await getExpenseTypes();

  unmarkExpenseTypeDeleted(cleanName);

  const currentTypes = await getExpenseTypes();
  if (currentTypes.some(t => t.toLowerCase() === cleanName.toLowerCase())) {
    return currentTypes; // already exists
  }

  const updated = [...currentTypes, cleanName];
  localStorage.setItem('finante_expense_types', JSON.stringify(updated));

  try {
    await supabase.from('expense_types').insert([{ name: cleanName }]);
  } catch (err) {
    console.warn('Supabase insert expense_type fallback:', err);
  }

  return updated;
};

export const updateExpenseType = async (oldName: string, newName: string): Promise<string[]> => {
  const cleanNew = newName.trim();
  if (!cleanNew || oldName === cleanNew) return await getExpenseTypes();

  unmarkExpenseTypeDeleted(cleanNew);
  markExpenseTypeDeleted(oldName);
  renameCategoryStyle(oldName, cleanNew);

  const currentTypes = await getExpenseTypes();
  const updated = currentTypes.map(t => t === oldName ? cleanNew : t);
  localStorage.setItem('finante_expense_types', JSON.stringify(updated));

  // Update associated expenses locally
  const localExp = JSON.parse(localStorage.getItem('finante_local_expenses') || '[]');
  const updatedExp = localExp.map((exp: any) => exp.type === oldName ? { ...exp, type: cleanNew } : exp);
  localStorage.setItem('finante_local_expenses', JSON.stringify(updatedExp));

  // Update associated companies locally
  const localComp = JSON.parse(localStorage.getItem('finante_companies') || '[]');
  const updatedComp = localComp.map((comp: any) => comp.default_type === oldName ? { ...comp, default_type: cleanNew } : comp);
  localStorage.setItem('finante_companies', JSON.stringify(updatedComp));

  try {
    await Promise.allSettled([
      supabase.from('expense_types').update({ name: cleanNew }).eq('name', oldName),
      supabase.from('expenses').update({ type: cleanNew }).eq('type', oldName),
      supabase.from('companies').update({ default_type: cleanNew }).eq('default_type', oldName)
    ]);
  } catch (err) {
    console.warn('Supabase update expense_type fallback:', err);
  }

  return updated;
};

export const deleteExpenseType = async (nameToDelete: string): Promise<string[]> => {
  const clean = nameToDelete.trim();
  markExpenseTypeDeleted(clean);
  deleteCategoryStyle(clean);

  const localRaw = localStorage.getItem('finante_expense_types');
  let currentTypes: string[] = [];
  try {
    currentTypes = localRaw ? JSON.parse(localRaw) : [...DEFAULT_EXPENSE_TYPES];
  } catch {
    currentTypes = [...DEFAULT_EXPENSE_TYPES];
  }

  const updated = currentTypes.filter(t => t.trim().toLowerCase() !== clean.toLowerCase());
  const finalTypes = updated.length > 0 ? updated : ['Outros'];
  localStorage.setItem('finante_expense_types', JSON.stringify(finalTypes));

  // Migrate any expenses using this deleted type to 'Outros' or first available
  const fallbackType = finalTypes[0] || 'Outros';
  const localExp = JSON.parse(localStorage.getItem('finante_local_expenses') || '[]');
  const updatedExp = localExp.map((exp: any) => (exp.type || '').trim().toLowerCase() === clean.toLowerCase() ? { ...exp, type: fallbackType } : exp);
  localStorage.setItem('finante_local_expenses', JSON.stringify(updatedExp));

  const localComp = JSON.parse(localStorage.getItem('finante_companies') || '[]');
  const updatedComp = localComp.map((comp: any) => (comp.default_type || '').trim().toLowerCase() === clean.toLowerCase() ? { ...comp, default_type: fallbackType } : comp);
  localStorage.setItem('finante_companies', JSON.stringify(updatedComp));

  try {
    await Promise.allSettled([
      supabase.from('expense_types').delete().eq('name', clean),
      supabase.from('expenses').update({ type: fallbackType }).eq('type', clean),
      supabase.from('companies').update({ default_type: fallbackType }).eq('default_type', clean)
    ]);
  } catch (err) {
    console.warn('Supabase delete expense_type fallback:', err);
  }

  return finalTypes;
};

// ==========================================
// COMPANIES / VENDORS MANAGEMENT
// ==========================================
export interface CompanyRecord {
  id?: number;
  name: string;
  default_type: string;
  created_at?: string;
}

export const DEFAULT_COMPANIES: CompanyRecord[] = [
  { id: 7, name: 'Aluguel', default_type: 'Moradia' },
  { id: 8, name: 'Condomínio', default_type: 'Moradia' },
  { id: 3, name: 'Copel', default_type: 'Serviços' },
  { id: 4, name: 'Enel', default_type: 'Serviços' },
  { id: 9, name: 'Farmácia', default_type: 'Saúde' },
  { id: 1, name: 'Netflix', default_type: 'Assinaturas' },
  { id: 5, name: 'Nubank', default_type: 'Serviços' },
  { id: 10, name: 'Posto de Gasolina', default_type: 'Transporte' },
  { id: 2, name: 'Spotify', default_type: 'Assinaturas' },
  { id: 6, name: 'Supermercado', default_type: 'Alimentação' }
];

const makeCompanyKey = (name: string, type?: string) => {
  const cleanName = name.trim().toLowerCase();
  const cleanType = (type || '').trim().toLowerCase();
  return cleanType ? `${cleanName}:::${cleanType}` : cleanName;
};

const getDeletedCompanies = (): string[] => {
  try {
    const raw = localStorage.getItem('finante_deleted_companies');
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

const isCompanyDeleted = (name: string, type?: string): boolean => {
  const list = getDeletedCompanies();
  const cleanName = name.trim().toLowerCase();
  const cleanType = (type || '').trim().toLowerCase();
  const specificKey = `${cleanName}:::${cleanType}`;

  return list.some(item => {
    const cleanItem = item.trim().toLowerCase();
    if (cleanItem.includes(':::')) {
      return cleanItem === specificKey;
    }
    // Backward-compatibility: if stored without type, match
    return cleanItem === cleanName;
  });
};

const markCompanyDeleted = (name: string, type?: string) => {
  const key = makeCompanyKey(name, type);
  const list = getDeletedCompanies();
  if (!list.some(item => item.trim().toLowerCase() === key.toLowerCase())) {
    localStorage.setItem('finante_deleted_companies', JSON.stringify([...list, key]));
  }
};

const unmarkCompanyDeleted = (name: string, type?: string) => {
  const specificKey = makeCompanyKey(name, type);
  const cleanName = name.trim().toLowerCase();
  const list = getDeletedCompanies();
  localStorage.setItem(
    'finante_deleted_companies',
    JSON.stringify(list.filter(item => {
      const cleanItem = item.trim().toLowerCase();
      return cleanItem !== specificKey.toLowerCase() && cleanItem !== cleanName;
    }))
  );
};

export const getCompanies = async (): Promise<CompanyRecord[]> => {
  // Always try to fetch freshest list from Supabase first
  try {
    const { data, error } = await supabase
      .from('companies')
      .select('*')
      .order('name', { ascending: true });

    if (!error && data && data.length > 0) {
      const sorted = data
        .filter((c: any) => c.name && !isCompanyDeleted(c.name, c.default_type))
        .sort((a: any, b: any) => a.name.localeCompare(b.name, 'pt-BR') || (a.default_type || '').localeCompare(b.default_type || '', 'pt-BR'));
      localStorage.setItem('finante_companies', JSON.stringify(sorted));
      return sorted;
    }
  } catch (err) {
    console.warn('Supabase companies fetch error:', err);
  }

  // Fallback to local cache if offline or table not present
  const local = localStorage.getItem('finante_companies');
  if (local) {
    try {
      const parsed = JSON.parse(local);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed
          .filter((c: any) => c.name && !isCompanyDeleted(c.name, c.default_type))
          .sort((a: any, b: any) => a.name.localeCompare(b.name, 'pt-BR') || (a.default_type || '').localeCompare(b.default_type || '', 'pt-BR'));
      }
    } catch (e) {
      console.error('Error parsing local companies:', e);
    }
  }

  const defaultSorted = DEFAULT_COMPANIES
    .filter(c => !isCompanyDeleted(c.name, c.default_type))
    .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR') || (a.default_type || '').localeCompare(b.default_type || '', 'pt-BR'));
  localStorage.setItem('finante_companies', JSON.stringify(defaultSorted));
  return defaultSorted;
};

export const addCompany = async (company: { name: string; default_type: string }): Promise<CompanyRecord[]> => {
  const cleanName = company.name.trim();
  const cleanType = (company.default_type || 'Outros').trim();
  if (!cleanName) return await getCompanies();

  unmarkCompanyDeleted(cleanName, cleanType);

  const current = await getCompanies();
  // Only duplicate if BOTH name AND default_type match
  const exists = current.find(c => 
    c.name.trim().toLowerCase() === cleanName.toLowerCase() && 
    (c.default_type || 'Outros').trim().toLowerCase() === cleanType.toLowerCase()
  );
  if (exists) {
    return current;
  }

  const newCompany: CompanyRecord = {
    name: cleanName,
    default_type: cleanType
  };

  try {
    const { data, error } = await supabase
      .from('companies')
      .insert([{ name: newCompany.name, default_type: newCompany.default_type }])
      .select();

    if (!error && data && data[0]) {
      const updated = [...current.filter(c => !(c.name.trim().toLowerCase() === cleanName.toLowerCase() && (c.default_type || 'Outros').trim().toLowerCase() === cleanType.toLowerCase())), data[0]]
        .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR') || (a.default_type || '').localeCompare(b.default_type || '', 'pt-BR'));
      localStorage.setItem('finante_companies', JSON.stringify(updated));
      return updated;
    }
  } catch (err) {
    console.warn('Supabase addCompany error, using fallback:', err);
  }

  const fallbackRecord: CompanyRecord = {
    ...newCompany,
    id: generateUniqueId(),
    created_at: new Date().toISOString()
  };
  const updated = [...current, fallbackRecord].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR') || (a.default_type || '').localeCompare(b.default_type || '', 'pt-BR'));
  localStorage.setItem('finante_companies', JSON.stringify(updated));
  return updated;
};

export const updateCompany = async (id: number, updates: Partial<CompanyRecord>): Promise<CompanyRecord[]> => {
  const current = await getCompanies();
  const existing = current.find(c => c.id === id);
  const targetName = updates.name ? updates.name.trim() : (existing?.name || '');
  const targetType = updates.default_type ? updates.default_type.trim() : (existing?.default_type || 'Outros');

  if (targetName) {
    unmarkCompanyDeleted(targetName, targetType);
  }

  const updated = current.map(c => c.id === id ? { 
    ...c, 
    ...updates, 
    name: updates.name ? updates.name.trim() : c.name,
    default_type: updates.default_type ? updates.default_type.trim() : c.default_type 
  } : c)
    .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR') || (a.default_type || '').localeCompare(b.default_type || '', 'pt-BR'));
  localStorage.setItem('finante_companies', JSON.stringify(updated));

  try {
    await supabase.from('companies').update(updates).eq('id', id);
  } catch (err) {
    console.warn('Supabase updateCompany fallback:', err);
  }

  return updated;
};

export const deleteCompany = async (companyOrId: CompanyRecord | number | string): Promise<CompanyRecord[]> => {
  const current = await getCompanies();
  let nameToDelete = '';
  let typeToDelete = '';
  let idToDelete: number | string | undefined;

  if (typeof companyOrId === 'object' && companyOrId !== null) {
    nameToDelete = companyOrId.name?.trim() || '';
    typeToDelete = companyOrId.default_type?.trim() || '';
    idToDelete = companyOrId.id;
  } else if (typeof companyOrId === 'string' && isNaN(Number(companyOrId))) {
    nameToDelete = companyOrId.trim();
  } else {
    idToDelete = companyOrId;
    const found = current.find(c => String(c.id) === String(companyOrId));
    if (found) {
      nameToDelete = found.name.trim();
      typeToDelete = found.default_type?.trim() || '';
    }
  }

  if (nameToDelete) {
    markCompanyDeleted(nameToDelete, typeToDelete);
  }

  const updated = current.filter(c => {
    if (idToDelete !== undefined && String(c.id) === String(idToDelete)) return false;
    if (nameToDelete && typeToDelete) {
      if (c.name.trim().toLowerCase() === nameToDelete.toLowerCase() && (c.default_type || 'Outros').trim().toLowerCase() === typeToDelete.toLowerCase()) return false;
    } else if (nameToDelete) {
      if (c.name.trim().toLowerCase() === nameToDelete.toLowerCase()) return false;
    }
    return true;
  });

  localStorage.setItem('finante_companies', JSON.stringify(updated));

  try {
    if (idToDelete !== undefined) {
      await supabase.from('companies').delete().eq('id', idToDelete);
    } else if (nameToDelete && typeToDelete) {
      await supabase.from('companies').delete().match({ name: nameToDelete, default_type: typeToDelete });
    } else if (nameToDelete) {
      await supabase.from('companies').delete().eq('name', nameToDelete);
    }
  } catch (err) {
    console.warn('Supabase deleteCompany fallback:', err);
  }

  return updated;
};

export interface InvestmentRecord {
  id?: number;
  asset: string;
  category: string;
  amount: number;
  date: string;
  notes?: string;
  created_at?: string;
}

export const getInvestments = async (): Promise<InvestmentRecord[]> => {
  const localRaw = localStorage.getItem('finante_local_investments');
  const localList: InvestmentRecord[] = localRaw ? JSON.parse(localRaw) : [];

  const offline = await isUserOfflineOrUnauthenticated();
  if (offline) {
    return localList;
  }

  try {
    const { data, error } = await supabase
      .from('investments')
      .select('*')
      .order('date', { ascending: false });

    if (error) {
      console.warn('Supabase getInvestments warning:', error.message);
      return localList;
    }

    if (data && data.length > 0) {
      const normalized = data.map((item: any) => ({
        ...item,
        amount: Number(item.amount || 0),
        asset: item.asset || 'Ativo',
        category: item.category || 'Renda Fixa',
        date: item.date || new Date().toISOString().split('T')[0]
      }));

      const remoteIds = new Set(normalized.map((i: any) => i.id));
      const unsyncedLocal = localList.filter(l => l.id && !remoteIds.has(l.id) && l.id > 1000000000);
      const combined = [...normalized, ...unsyncedLocal];
      localStorage.setItem('finante_local_investments', JSON.stringify(combined));
      return combined;
    }

    if (localList.length > 0) {
      return localList;
    }

    localStorage.setItem('finante_local_investments', JSON.stringify([]));
    return [];
  } catch (err) {
    console.error('Error in getInvestments:', err);
    return localList;
  }
};

export const addInvestment = async (investment: Omit<InvestmentRecord, 'id' | 'created_at'>) => {
  const payload = {
    ...investment,
    amount: Number(investment.amount || 0),
    asset: investment.asset.trim(),
    category: investment.category || 'Renda Fixa',
    date: investment.date || new Date().toISOString().split('T')[0]
  };

  const offline = await isUserOfflineOrUnauthenticated();
  if (offline) {
    const newRecord = {
      ...payload,
      id: generateUniqueId(),
      created_at: new Date().toISOString()
    };
    const local = JSON.parse(localStorage.getItem('finante_local_investments') || '[]');
    localStorage.setItem('finante_local_investments', JSON.stringify([newRecord, ...local]));
    return [newRecord];
  }

  try {
    const { data, error } = await supabase
      .from('investments')
      .insert([payload])
      .select();

    if (error) {
      console.warn('Inserting fallback into local storage for investments:', error.message);
      const newRecord = {
        ...payload,
        id: generateUniqueId(),
        created_at: new Date().toISOString()
      };
      const local = JSON.parse(localStorage.getItem('finante_local_investments') || '[]');
      localStorage.setItem('finante_local_investments', JSON.stringify([newRecord, ...local]));
      return [newRecord];
    }

    if (data && data[0]) {
      const local = JSON.parse(localStorage.getItem('finante_local_investments') || '[]');
      localStorage.setItem('finante_local_investments', JSON.stringify([data[0], ...local.filter((i: any) => i.id !== data[0].id)]));
    }

    return data;
  } catch (err) {
    console.error('Error adding investment:', err);
    const newRecord = {
      ...investment,
      amount: Number(investment.amount || 0),
      id: generateUniqueId(),
      created_at: new Date().toISOString()
    };
    const local = JSON.parse(localStorage.getItem('finante_local_investments') || '[]');
    localStorage.setItem('finante_local_investments', JSON.stringify([newRecord, ...local]));
    return [newRecord];
  }
};

export const updateInvestment = async (id: number, investment: Partial<InvestmentRecord>) => {
  const local = JSON.parse(localStorage.getItem('finante_local_investments') || '[]');
  const updated = local.map((item: any) => item.id === id ? { ...item, ...investment } : item);
  localStorage.setItem('finante_local_investments', JSON.stringify(updated));

  const offline = await isUserOfflineOrUnauthenticated();
  if (offline) {
    return updated.filter((item: any) => item.id === id);
  }

  try {
    const { data, error } = await supabase
      .from('investments')
      .update(investment)
      .eq('id', id)
      .select();

    if (error) {
      console.warn('Updating local storage fallback for investment:', error.message);
      return updated.filter((item: any) => item.id === id);
    }
    return data;
  } catch (err) {
    console.error('Error updating investment:', err);
    return updated.filter((item: any) => item.id === id);
  }
};

export const deleteInvestment = async (id: number) => {
  const local = JSON.parse(localStorage.getItem('finante_local_investments') || '[]');
  const filtered = local.filter((item: any) => item.id !== id);
  localStorage.setItem('finante_local_investments', JSON.stringify(filtered));

  const offline = await isUserOfflineOrUnauthenticated();
  if (offline) {
    return true;
  }

  try {
    const { data, error } = await supabase
      .from('investments')
      .delete()
      .eq('id', id);
    if (error) {
      console.warn('Error deleting investment from supabase:', error);
    }
    return data;
  } catch (err) {
    console.error('Error deleting investment:', err);
    return null;
  }
};

/* =========================================================
   AUTH SERVICES (Google OAuth, Email & Session)
========================================================= */

export const setSessionFromUrl = async (urlOrHash: string) => {
  const text = urlOrHash.trim();
  if (!text) throw new Error('Cole o link completo da barra de endereços do navegador.');

  let paramString = text;
  if (text.includes('#')) {
    paramString = text.split('#')[1];
  } else if (text.includes('?')) {
    paramString = text.split('?')[1];
  }

  const params = new URLSearchParams(paramString);
  const accessToken = params.get('access_token');
  const refreshToken = params.get('refresh_token');
  const code = params.get('code');
  const error = params.get('error_description') || params.get('error');

  if (error) {
    throw new Error(`Erro na autenticação: ${decodeURIComponent(error)}`);
  }

  if (accessToken && refreshToken) {
    const { data, error: sessionErr } = await supabase.auth.setSession({
      access_token: accessToken,
      refresh_token: refreshToken
    });
    if (sessionErr) throw sessionErr;
    return data;
  } else if (code) {
    const { data, error: codeErr } = await supabase.auth.exchangeCodeForSession(code);
    if (codeErr) throw codeErr;
    return data;
  }

  throw new Error('Não foi possível identificar as credenciais de acesso no link informado. Certifique-se de copiar todo o link da barra de endereços.');
};

export const signInWithGoogle = async () => {
  const isDesktopTauri = typeof window !== 'undefined' && (isTauri() || '__TAURI_INTERNALS__' in window);

  if (isDesktopTauri) {
    try {
      // 1. Iniciar servidor loopback local na porta 38291
      await invoke('start_oauth_server');

      // 2. Preparar promessa para receber os tokens do callback OAuth
      const oauthPromise = new Promise<{ access_token?: string; refresh_token?: string; code?: string; error?: string }>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Tempo limite para login com Google excedido. Caso o navegador tenha aberto, copie o link gerado e cole no aplicativo.'));
        }, 120000);

        once('oauth-callback', (event: any) => {
          clearTimeout(timeout);
          resolve(event.payload);
        }).catch((err) => {
          clearTimeout(timeout);
          reject(err);
        });
      });

      // 3. Obter URL do Google OAuth no Supabase sem navegar na janela interna
      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: 'http://localhost:38291',
          skipBrowserRedirect: true
        }
      });

      if (error) throw error;
      if (!data?.url) throw new Error('Não foi possível gerar a URL de autorização do Google.');

      // 4. Abrir no navegador padrão do sistema (onde o usuário já está logado)
      await invoke('open_browser', { url: data.url });

      // 5. Aguardar retorno do callback do navegador
      const payload = await oauthPromise;
      if (payload.error) {
        throw new Error(payload.error);
      }

      if (payload.access_token && payload.refresh_token) {
        const { data: sessionData, error: sessionErr } = await supabase.auth.setSession({
          access_token: payload.access_token,
          refresh_token: payload.refresh_token
        });
        if (sessionErr) throw sessionErr;
        return sessionData;
      } else if (payload.code) {
        const { data: codeData, error: codeErr } = await supabase.auth.exchangeCodeForSession(payload.code);
        if (codeErr) throw codeErr;
        return codeData;
      }

      throw new Error('Tokens de autenticação não foram recebidos.');
    } catch (desktopOAuthErr) {
      console.error('Desktop Google OAuth error:', desktopOAuthErr);
      throw desktopOAuthErr;
    }
  }

  // Fallback para Web / Navegador regular
  const isDev = window.location.hostname === 'localhost' && window.location.port !== '';
  const redirectUrl = isDev ? window.location.origin : 'http://localhost:38291';

  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: redirectUrl
    }
  });
  if (error) throw error;
  return data;
};

export const signInWithEmail = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim(),
    password
  });
  if (error) throw error;
  return data;
};

export const signUpWithEmail = async (email: string, password: string) => {
  const { data, error } = await supabase.auth.signUp({
    email: email.trim(),
    password
  });
  if (error) throw error;
  return data;
};

export const signOutUser = async () => {
  try {
    await supabase.auth.signOut();
  } catch (err) {
    console.warn('Sign out error:', err);
  }
  localStorage.removeItem('finante_pin');
  localStorage.removeItem('finante_offline_mode');
};

export const getCurrentSession = async () => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    return session;
  } catch {
    return null;
  }
};

export const getCurrentUser = async () => {
  try {
    const { data: { user } } = await supabase.auth.getUser();
    return user;
  } catch {
    return null;
  }
};

export interface NegotiationData {
  selectedExpenses: ExpenseRecord[];
  agreementTitle: string;
  installmentsCount: number;
  installmentAmount: number;
  dueDates: string[];
  category: string;
  paymentMethod: 'PIX' | 'Crédito' | 'Débito' | 'Boleto' | string;
  totalOriginal: number;
  totalNegotiated: number;
  interestTotal: number;
  markOriginalsPaid?: boolean;
}

export const negotiateExpenses = async (data: NegotiationData): Promise<ExpenseRecord[]> => {
  const {
    selectedExpenses,
    agreementTitle,
    installmentsCount,
    installmentAmount,
    dueDates,
    category,
    paymentMethod,
    totalOriginal,
    totalNegotiated,
    interestTotal,
    markOriginalsPaid = true
  } = data;

  const today = new Date().toISOString().split('T')[0];
  const agreementName = agreementTitle.trim() || 'Acordo de Negociação';

  // 1. Mark original selected expenses as settled/paid by agreement
  if (markOriginalsPaid) {
    for (const exp of selectedExpenses) {
      if (exp.id) {
        const existingNotes = exp.notes ? `${exp.notes} | ` : '';
        await updateExpense(exp.id, {
          status: 'paid',
          paid_amount: exp.amount,
          paid_date: today,
          notes: `${existingNotes}Quitada via ${agreementName} (${installmentsCount}x de R$ ${installmentAmount.toFixed(2)})`
        });
      }
    }
  }

  // 2. Compute interest per installment and create new installments
  const createdInstallments: ExpenseRecord[] = [];
  const baseLateFee = interestTotal > 0 ? Math.floor((interestTotal / installmentsCount) * 100) / 100 : 0;
  let remainingLateFee = interestTotal > 0 ? Number((interestTotal - (baseLateFee * (installmentsCount - 1))).toFixed(2)) : 0;

  const originalCompanies = Array.from(new Set(selectedExpenses.map(e => e.company || e.description).filter(Boolean))).join(', ');

  for (let i = 0; i < installmentsCount; i++) {
    const isLast = i === installmentsCount - 1;
    const curLateFee = interestTotal > 0 ? (isLast ? remainingLateFee : baseLateFee) : 0;
    const installmentDueDate = dueDates[i] || today;

    const installmentRecord: ExpenseRecord = {
      company: agreementName,
      description: `${agreementName} (${i + 1}/${installmentsCount})`,
      amount: installmentAmount,
      paid_amount: 0,
      due_date: installmentDueDate,
      status: 'pending',
      type: category || 'Outros',
      payment_method: paymentMethod || 'PIX',
      late_fee: curLateFee > 0 ? curLateFee : undefined,
      excess_type: curLateFee > 0 ? 'late_fee' : undefined,
      notes: `Negociação Parcela ${i + 1}/${installmentsCount} | Contas: [${originalCompanies}] | Dívida orig: R$ ${totalOriginal.toFixed(2)} | Total acordo: R$ ${totalNegotiated.toFixed(2)} | Juros/Multa parcela: R$ ${curLateFee.toFixed(2)}`
    };

    const added = await addExpense(installmentRecord);
    if (added && added[0]) {
      createdInstallments.push(added[0]);
    }
  }

  return createdInstallments;
};

/* =========================================================
   CLOUD SYNCHRONIZATION & BACKUP / RESTORE
========================================================= */

export const syncLocalDataToCloud = async (): Promise<{ expensesSynced: number; incomesSynced: number; investmentsSynced: number }> => {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session?.user) {
    throw new Error('Você precisa estar conectado à sua conta para sincronizar dados com a nuvem.');
  }

  let expensesSynced = 0;
  let incomesSynced = 0;
  let investmentsSynced = 0;

  // 1. Sincronizar despesas criadas offline (identificadas por ID temporário gerado localmente > 1000000000)
  const localExpenses: ExpenseRecord[] = JSON.parse(localStorage.getItem('finante_local_expenses') || '[]');
  const unsyncedExpenses = localExpenses.filter(e => e.id && e.id > 1000000000);

  for (const exp of unsyncedExpenses) {
    try {
      const company = exp.company?.trim() || exp.description?.trim() || 'Despesa';
      const payload: any = {
        description: company,
        company: company,
        amount: Number(exp.amount) || 0,
        paid_amount: Number(exp.paid_amount) || 0,
        due_date: exp.due_date,
        paid_date: exp.paid_date || null,
        payment_method: exp.payment_method || null,
        notes: exp.notes || '',
        excess_type: exp.excess_type || null,
        late_fee: exp.late_fee !== undefined ? Number(exp.late_fee) : null,
        bill_attachment: exp.bill_attachment || null,
        bill_name: exp.bill_name || null,
        receipt_attachment: exp.receipt_attachment || null,
        receipt_name: exp.receipt_name || null,
        type: exp.type || 'Outros',
        status: exp.status || 'pending',
        user_id: session.user.id
      };

      const { data, error } = await supabase.from('expenses').insert([payload]).select();
      if (!error && data?.[0]) {
        expensesSynced++;
        // Atualizar o ID no local com o ID definitivo do banco para não duplicar
        saveEnrichment(data[0].id, payload);
        const currentLoc = JSON.parse(localStorage.getItem('finante_local_expenses') || '[]');
        const updatedLoc = currentLoc.map((item: any) => item.id === exp.id ? { ...item, ...data[0], id: data[0].id } : item);
        localStorage.setItem('finante_local_expenses', JSON.stringify(updatedLoc));
      }
    } catch (e) {
      console.warn('Erro ao sincronizar despesa:', e);
    }
  }

  // 2. Sincronizar receitas locais
  const localIncomes: IncomeRecord[] = JSON.parse(localStorage.getItem('finante_local_incomes') || '[]');
  const unsyncedIncomes = localIncomes.filter(i => i.id && i.id > 1000000000);

  for (const inc of unsyncedIncomes) {
    try {
      const payload: any = {
        source: inc.source,
        amount: Number(inc.amount) || 0,
        date: inc.date,
        user_id: session.user.id
      };
      const { data, error } = await supabase.from('incomes').insert([payload]).select();
      if (!error && data?.[0]) {
        incomesSynced++;
        const currentLoc = JSON.parse(localStorage.getItem('finante_local_incomes') || '[]');
        const updatedLoc = currentLoc.map((item: any) => item.id === inc.id ? { ...item, ...data[0], id: data[0].id } : item);
        localStorage.setItem('finante_local_incomes', JSON.stringify(updatedLoc));
      }
    } catch (e) {
      console.warn('Erro ao sincronizar receita:', e);
    }
  }

  // 3. Sincronizar investimentos locais
  const localInvestments: InvestmentRecord[] = JSON.parse(localStorage.getItem('finante_local_investments') || '[]');
  const unsyncedInvestments = localInvestments.filter(i => i.id && i.id > 1000000000);

  for (const inv of unsyncedInvestments) {
    try {
      const payload: any = {
        asset: inv.asset,
        category: inv.category || 'Renda Fixa',
        amount: Number(inv.amount) || 0,
        date: inv.date,
        notes: inv.notes || '',
        user_id: session.user.id
      };
      const { data, error } = await supabase.from('investments').insert([payload]).select();
      if (!error && data?.[0]) {
        investmentsSynced++;
        const currentLoc = JSON.parse(localStorage.getItem('finante_local_investments') || '[]');
        const updatedLoc = currentLoc.map((item: any) => item.id === inv.id ? { ...item, ...data[0], id: data[0].id } : item);
        localStorage.setItem('finante_local_investments', JSON.stringify(updatedLoc));
      }
    } catch (e) {
      console.warn('Erro ao sincronizar investimento:', e);
    }
  }

  // Recarregar dados frescos da nuvem
  await getExpenses();
  await getIncomes();
  await getInvestments();

  return { expensesSynced, incomesSynced, investmentsSynced };
};

export interface FinanteBackupData {
  version: string;
  exportedAt: string;
  expenses: ExpenseRecord[];
  incomes: IncomeRecord[];
  investments: InvestmentRecord[];
  companies: CompanyRecord[];
  expense_types: string[];
  enrichments: Record<string, any>;
}

export const exportAllDataToJson = async (): Promise<string> => {
  const expenses = await getExpenses();
  const incomes = await getIncomes();
  const investments = await getInvestments();
  const companies = await getCompanies();
  const expenseTypes = await getExpenseTypes();
  const enrichments = getEnrichments();

  const backup: FinanteBackupData = {
    version: '1.0',
    exportedAt: new Date().toISOString(),
    expenses,
    incomes,
    investments,
    companies,
    expense_types: expenseTypes,
    enrichments
  };

  return JSON.stringify(backup, null, 2);
};

export const importDataFromJson = async (jsonString: string): Promise<{ success: boolean; message: string }> => {
  try {
    const backup: FinanteBackupData = JSON.parse(jsonString);
    if (!backup || (!backup.expenses && !backup.incomes)) {
      throw new Error('Arquivo de backup inválido ou incompatível.');
    }

    if (Array.isArray(backup.expenses)) {
      localStorage.setItem('finante_local_expenses', JSON.stringify(backup.expenses));
    }
    if (Array.isArray(backup.incomes)) {
      localStorage.setItem('finante_local_incomes', JSON.stringify(backup.incomes));
    }
    if (Array.isArray(backup.investments)) {
      localStorage.setItem('finante_local_investments', JSON.stringify(backup.investments));
    }
    if (Array.isArray(backup.companies)) {
      localStorage.setItem('finante_companies', JSON.stringify(backup.companies));
    }
    if (Array.isArray(backup.expense_types)) {
      localStorage.setItem('finante_expense_types', JSON.stringify(backup.expense_types));
    }
    if (backup.enrichments) {
      localStorage.setItem('finante_expense_enrichments', JSON.stringify(backup.enrichments));
    }

    // Se estiver logado, sincroniza com o Supabase também
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      try {
        await syncLocalDataToCloud();
      } catch (e) {
        console.warn('Erro ao sincronizar backup importado com a nuvem:', e);
      }
    }

    return { 
      success: true, 
      message: `Restauração concluída! ${backup.expenses?.length || 0} despesas, ${backup.incomes?.length || 0} receitas e ${backup.investments?.length || 0} investimentos restaurados com sucesso.`
    };
  } catch (err: any) {
    return { success: false, message: err.message || 'Falha ao importar arquivo de dados.' };
  }
};

export const cleanDuplicateExpenses = async (): Promise<number> => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    const userId = session?.user?.id;

    let query = supabase.from('expenses').select('*');
    if (userId) {
      query = query.or(`user_id.eq.${userId},user_id.is.null`);
    }
    const { data, error } = await query;
    if (error || !data) return 0;

    const seen = new Map<string, any>();
    const duplicateIds: number[] = [];

    for (const exp of data) {
      const company = (exp.company || exp.description || '').trim().toLowerCase();
      const dueDate = exp.due_date ? exp.due_date.split('T')[0] : '';
      const amount = Number(exp.amount || 0);
      const type = (exp.type || '').trim().toLowerCase();
      const key = `${company}:::${dueDate}:::${amount}:::${type}`;

      if (seen.has(key)) {
        duplicateIds.push(exp.id);
      } else {
        seen.set(key, exp);
      }
    }

    if (duplicateIds.length > 0) {
      await supabase.from('expenses').delete().in('id', duplicateIds);
      const local = JSON.parse(localStorage.getItem('finante_local_expenses') || '[]');
      const dupSet = new Set(duplicateIds);
      const cleaned = local.filter((e: any) => !dupSet.has(e.id));
      localStorage.setItem('finante_local_expenses', JSON.stringify(cleaned));
      window.dispatchEvent(new CustomEvent('finante_data_updated'));
    }

    return duplicateIds.length;
  } catch (err) {
    console.warn('Erro ao limpar duplicatas de despesas:', err);
    return 0;
  }
};

export const resetAllAppData = async (): Promise<{ success: boolean; message: string }> => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    const userId = session?.user?.id;

    if (userId) {
      await Promise.allSettled([
        supabase.from('expenses').delete().eq('user_id', userId),
        supabase.from('incomes').delete().eq('user_id', userId),
        supabase.from('investments').delete().eq('user_id', userId),
        supabase.from('companies').delete().eq('user_id', userId),
        supabase.from('expense_types').delete().eq('user_id', userId),
      ]);
    } else {
      await Promise.allSettled([
        supabase.from('expenses').delete().is('user_id', null),
        supabase.from('incomes').delete().is('user_id', null),
        supabase.from('investments').delete().is('user_id', null),
        supabase.from('companies').delete().is('user_id', null),
        supabase.from('expense_types').delete().is('user_id', null),
      ]);
    }

    // Limpar todos os storages locais do Finante
    localStorage.removeItem('finante_local_expenses');
    localStorage.removeItem('finante_local_incomes');
    localStorage.removeItem('finante_local_investments');
    localStorage.removeItem('finante_expense_enrichments');
    localStorage.removeItem('finante_deleted_companies');
    localStorage.removeItem('finante_deleted_expense_types');
    localStorage.removeItem('finante_category_styles');
    localStorage.removeItem('finante_backup');

    // Restaurar padrões
    localStorage.setItem('finante_companies', JSON.stringify(DEFAULT_COMPANIES));
    localStorage.setItem('finante_expense_types', JSON.stringify(DEFAULT_EXPENSE_TYPES));

    // Notificar todas as páginas
    window.dispatchEvent(new CustomEvent('finante_data_reset'));
    window.dispatchEvent(new CustomEvent('finante_data_updated'));
    window.dispatchEvent(new CustomEvent('finante_category_styles_updated'));

    return { success: true, message: 'Todos os dados foram resetados com sucesso!' };
  } catch (err: any) {
    console.error('Erro ao resetar dados:', err);
    return { success: false, message: err?.message || 'Erro ao resetar dados.' };
  }
};

