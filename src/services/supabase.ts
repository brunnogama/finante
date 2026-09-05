import { createClient } from '@supabase/supabase-js';
import { invoke, isTauri } from '@tauri-apps/api/core';
import { once } from '@tauri-apps/api/event';

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

export const getExpenses = async (): Promise<ExpenseRecord[]> => {
  try {
    const { data, error } = await supabase
      .from('expenses')
      .select('*')
      .order('due_date', { ascending: true });
      
    if (error) {
      console.warn('Supabase getExpenses warning:', error.message);
      const local = localStorage.getItem('finante_local_expenses');
      return local ? JSON.parse(local) : [];
    }

    const enrichments = getEnrichments();
    const normalized = (data || []).map((item: any) => {
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
        bill_attachment: billAttachment,
        bill_name: billName,
        receipt_attachment: receiptAttachment,
        receipt_name: receiptName,
        status: (paidAmount >= amount && amount > 0) || item.status === 'paid' ? 'paid' : 'pending'
      };
    });

    localStorage.setItem('finante_local_expenses', JSON.stringify(normalized));
    return normalized;
  } catch (err) {
    console.error('Error in getExpenses:', err);
    const local = localStorage.getItem('finante_local_expenses');
    return local ? JSON.parse(local) : [];
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
    bill_attachment: expense.bill_attachment || null,
    bill_name: expense.bill_name || null,
    receipt_attachment: expense.receipt_attachment || null,
    receipt_name: expense.receipt_name || null,
    type: expense.type,
    status: status
  };

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
        return [{ ...stdData[0], ...fullPayload, id }];
      }
    }

    if (data && data[0]) {
      saveEnrichment(data[0].id, fullPayload);
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
  try {
    const { data, error } = await supabase
      .from('incomes')
      .select('*')
      .order('date', { ascending: false });
      
    if (error) {
      console.warn('Supabase getIncomes warning:', error.message);
      const local = localStorage.getItem('finante_local_incomes');
      return local ? JSON.parse(local) : [];
    }
    
    if (data) {
      localStorage.setItem('finante_local_incomes', JSON.stringify(data));
      return data;
    }
    return [];
  } catch (err) {
    console.error('Error fetching incomes:', err);
    const local = localStorage.getItem('finante_local_incomes');
    return local ? JSON.parse(local) : [];
  }
};

export const addIncome = async (income: IncomeRecord) => {
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
  try {
    const { data, error } = await supabase
      .from('incomes')
      .update(income)
      .eq('id', id)
      .select();

    if (error) {
      console.warn('Updating local storage fallback for income:', error.message);
      const local = JSON.parse(localStorage.getItem('finante_local_incomes') || '[]');
      const updated = local.map((item: any) => item.id === id ? { ...item, ...income } : item);
      localStorage.setItem('finante_local_incomes', JSON.stringify(updated));
      return updated.filter((item: any) => item.id === id);
    }
    return data;
  } catch (err) {
    console.error('Error updating income:', err);
    const local = JSON.parse(localStorage.getItem('finante_local_incomes') || '[]');
    const updated = local.map((item: any) => item.id === id ? { ...item, ...income } : item);
    localStorage.setItem('finante_local_incomes', JSON.stringify(updated));
    return updated.filter((item: any) => item.id === id);
  }
};

export const deleteIncome = async (id: number) => {
  try {
    const { data, error } = await supabase
      .from('incomes')
      .delete()
      .eq('id', id);
    if (error) {
      console.warn('Error deleting income from supabase, removing from local storage:', error);
    }
    const local = JSON.parse(localStorage.getItem('finante_local_incomes') || '[]');
    const filtered = local.filter((item: any) => item.id !== id);
    localStorage.setItem('finante_local_incomes', JSON.stringify(filtered));
    return data;
  } catch (err) {
    console.error('Error deleting income:', err);
    const local = JSON.parse(localStorage.getItem('finante_local_incomes') || '[]');
    const filtered = local.filter((item: any) => item.id !== id);
    localStorage.setItem('finante_local_incomes', JSON.stringify(filtered));
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
        const local = JSON.parse(localStorage.getItem('finante_local_expenses') || '[]');
        const updated = local.map((item: any) => item.id === id ? { ...item, ...updatePayload } : item);
        localStorage.setItem('finante_local_expenses', JSON.stringify(updated));
        return updated.filter((item: any) => item.id === id);
      }
      return stdData ? [{ ...stdData[0], ...updatePayload }] : stdData;
    }
    return data;
  } catch (err) {
    console.error('Error updating expense:', err);
    const local = JSON.parse(localStorage.getItem('finante_local_expenses') || '[]');
    const updated = local.map((item: any) => item.id === id ? { ...item, ...updatePayload } : item);
    localStorage.setItem('finante_local_expenses', JSON.stringify(updated));
    return updated.filter((item: any) => item.id === id);
  }
};

export const deleteExpense = async (id: number) => {
  deleteEnrichment(id);
  try {
    const { data, error } = await supabase
      .from('expenses')
      .delete()
      .eq('id', id);
    if (error) {
      console.warn('Error deleting expense from supabase, removing from local storage:', error);
    }
    const local = JSON.parse(localStorage.getItem('finante_local_expenses') || '[]');
    const filtered = local.filter((item: any) => item.id !== id);
    localStorage.setItem('finante_local_expenses', JSON.stringify(filtered));
    return data;
  } catch (err) {
    console.error('Error deleting expense:', err);
    const local = JSON.parse(localStorage.getItem('finante_local_expenses') || '[]');
    const filtered = local.filter((item: any) => item.id !== id);
    localStorage.setItem('finante_local_expenses', JSON.stringify(filtered));
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

export const getExpenseTypes = async (): Promise<string[]> => {
  // Always try to fetch freshest list from Supabase first
  try {
    const { data, error } = await supabase
      .from('expense_types')
      .select('name')
      .order('name', { ascending: true });

    if (!error && data && data.length > 0) {
      const names = data.map((d: any) => d.name).sort((a: string, b: string) => a.localeCompare(b, 'pt-BR'));
      localStorage.setItem('finante_expense_types', JSON.stringify(names));
      return names;
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
        return parsed.sort((a: string, b: string) => a.localeCompare(b, 'pt-BR'));
      }
    } catch (e) {
      console.error('Error parsing local expense types:', e);
    }
  }

  const sorted = [...DEFAULT_EXPENSE_TYPES].sort((a, b) => a.localeCompare(b, 'pt-BR'));
  localStorage.setItem('finante_expense_types', JSON.stringify(sorted));
  return sorted;
};

export const addExpenseType = async (typeName: string): Promise<string[]> => {
  const cleanName = typeName.trim();
  if (!cleanName) return await getExpenseTypes();

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
  const currentTypes = await getExpenseTypes();
  const updated = currentTypes.filter(t => t !== nameToDelete);
  const finalTypes = updated.length > 0 ? updated : ['Outros'];
  localStorage.setItem('finante_expense_types', JSON.stringify(finalTypes));

  // Migrate any expenses using this deleted type to 'Outros' or first available
  const fallbackType = finalTypes[0] || 'Outros';
  const localExp = JSON.parse(localStorage.getItem('finante_local_expenses') || '[]');
  const updatedExp = localExp.map((exp: any) => exp.type === nameToDelete ? { ...exp, type: fallbackType } : exp);
  localStorage.setItem('finante_local_expenses', JSON.stringify(updatedExp));

  const localComp = JSON.parse(localStorage.getItem('finante_companies') || '[]');
  const updatedComp = localComp.map((comp: any) => comp.default_type === nameToDelete ? { ...comp, default_type: fallbackType } : comp);
  localStorage.setItem('finante_companies', JSON.stringify(updatedComp));

  try {
    await Promise.allSettled([
      supabase.from('expense_types').delete().eq('name', nameToDelete),
      supabase.from('expenses').update({ type: fallbackType }).eq('type', nameToDelete),
      supabase.from('companies').update({ default_type: fallbackType }).eq('default_type', nameToDelete)
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

export const getCompanies = async (): Promise<CompanyRecord[]> => {
  // Always try to fetch freshest list from Supabase first
  try {
    const { data, error } = await supabase
      .from('companies')
      .select('*')
      .order('name', { ascending: true });

    if (!error && data && data.length > 0) {
      const sorted = [...data].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
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
        return parsed.sort((a: any, b: any) => a.name.localeCompare(b.name, 'pt-BR'));
      }
    } catch (e) {
      console.error('Error parsing local companies:', e);
    }
  }

  const defaultSorted = [...DEFAULT_COMPANIES].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));
  localStorage.setItem('finante_companies', JSON.stringify(defaultSorted));
  return defaultSorted;
};

export const addCompany = async (company: { name: string; default_type: string }): Promise<CompanyRecord[]> => {
  const cleanName = company.name.trim();
  if (!cleanName) return await getCompanies();

  const current = await getCompanies();
  const exists = current.find(c => c.name.toLowerCase() === cleanName.toLowerCase());
  if (exists) {
    return await updateCompany(exists.id!, { default_type: company.default_type });
  }

  const newCompany: CompanyRecord = {
    name: cleanName,
    default_type: company.default_type || 'Outros'
  };

  try {
    const { data, error } = await supabase
      .from('companies')
      .insert([{ name: newCompany.name, default_type: newCompany.default_type }])
      .select();

    if (!error && data && data[0]) {
      const updated = [...current.filter(c => c.name.toLowerCase() !== cleanName.toLowerCase()), data[0]]
        .sort((a, b) => a.name.localeCompare(b.name));
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
  const updated = [...current, fallbackRecord].sort((a, b) => a.name.localeCompare(b.name));
  localStorage.setItem('finante_companies', JSON.stringify(updated));
  return updated;
};

export const updateCompany = async (id: number, updates: Partial<CompanyRecord>): Promise<CompanyRecord[]> => {
  const current = await getCompanies();
  const updated = current.map(c => c.id === id ? { ...c, ...updates, name: updates.name ? updates.name.trim() : c.name } : c)
    .sort((a, b) => a.name.localeCompare(b.name));
  localStorage.setItem('finante_companies', JSON.stringify(updated));

  try {
    await supabase.from('companies').update(updates).eq('id', id);
  } catch (err) {
    console.warn('Supabase updateCompany fallback:', err);
  }

  return updated;
};

export const deleteCompany = async (id: number): Promise<CompanyRecord[]> => {
  const current = await getCompanies();
  const updated = current.filter(c => c.id !== id);
  localStorage.setItem('finante_companies', JSON.stringify(updated));

  try {
    await supabase.from('companies').delete().eq('id', id);
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
  try {
    const { data, error } = await supabase
      .from('investments')
      .select('*')
      .order('date', { ascending: false });

    if (error) {
      console.warn('Supabase getInvestments warning:', error.message);
      const local = localStorage.getItem('finante_local_investments');
      return local ? JSON.parse(local) : [];
    }

    const normalized = (data || []).map((item: any) => ({
      ...item,
      amount: Number(item.amount || 0),
      asset: item.asset || 'Ativo',
      category: item.category || 'Renda Fixa',
      date: item.date || new Date().toISOString().split('T')[0]
    }));

    localStorage.setItem('finante_local_investments', JSON.stringify(normalized));
    return normalized;
  } catch (err) {
    console.error('Error in getInvestments:', err);
    const local = localStorage.getItem('finante_local_investments');
    return local ? JSON.parse(local) : [];
  }
};

export const addInvestment = async (investment: Omit<InvestmentRecord, 'id' | 'created_at'>) => {
  try {
    const payload = {
      ...investment,
      amount: Number(investment.amount || 0),
      asset: investment.asset.trim(),
      category: investment.category || 'Renda Fixa',
      date: investment.date || new Date().toISOString().split('T')[0]
    };

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
  try {
    const { data, error } = await supabase
      .from('investments')
      .update(investment)
      .eq('id', id)
      .select();

    if (error) {
      console.warn('Updating local storage fallback for investment:', error.message);
      const local = JSON.parse(localStorage.getItem('finante_local_investments') || '[]');
      const updated = local.map((item: any) => item.id === id ? { ...item, ...investment } : item);
      localStorage.setItem('finante_local_investments', JSON.stringify(updated));
      return updated.filter((item: any) => item.id === id);
    }
    return data;
  } catch (err) {
    console.error('Error updating investment:', err);
    const local = JSON.parse(localStorage.getItem('finante_local_investments') || '[]');
    const updated = local.map((item: any) => item.id === id ? { ...item, ...investment } : item);
    localStorage.setItem('finante_local_investments', JSON.stringify(updated));
    return updated.filter((item: any) => item.id === id);
  }
};

export const deleteInvestment = async (id: number) => {
  try {
    const { data, error } = await supabase
      .from('investments')
      .delete()
      .eq('id', id);
    if (error) {
      console.warn('Error deleting investment from supabase:', error);
    }
    const local = JSON.parse(localStorage.getItem('finante_local_investments') || '[]');
    const filtered = local.filter((item: any) => item.id !== id);
    localStorage.setItem('finante_local_investments', JSON.stringify(filtered));
    return data;
  } catch (err) {
    console.error('Error deleting investment:', err);
    const local = JSON.parse(localStorage.getItem('finante_local_investments') || '[]');
    const filtered = local.filter((item: any) => item.id !== id);
    localStorage.setItem('finante_local_investments', JSON.stringify(filtered));
    return null;
  }
};

/* =========================================================
   AUTH SERVICES (Google OAuth, Email & Session)
========================================================= */

export const signInWithGoogle = async () => {
  const isDesktopTauri = typeof window !== 'undefined' && (isTauri() || '__TAURI_INTERNALS__' in window);

  if (isDesktopTauri) {
    try {
      // 1. Iniciar servidor loopback local na porta 38291
      await invoke('start_oauth_server');

      // 2. Preparar promessa para receber os tokens do callback OAuth
      const oauthPromise = new Promise<{ access_token?: string; refresh_token?: string; code?: string; error?: string }>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('Tempo limite para login com Google excedido. Tente novamente.'));
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


