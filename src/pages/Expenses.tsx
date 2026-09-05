import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Plus, 
  Search, 
  Calendar, 
  Building2, 
  Tag, 
  CheckCircle2, 
  AlertCircle, 
  Clock, 
  Edit3, 
  Trash2, 
  X, 
  Check, 
  ChevronRight, 
  ChevronLeft,
  ChevronDown, 
  BookmarkPlus, 
  Wallet, 
  Receipt, 
  PiggyBank, 
  AlertTriangle, 
  FileText, 
  Flame, 
  CreditCard,
  Paperclip,
  Eye,
  Download,
  UploadCloud,
  Repeat,
  Handshake
} from 'lucide-react';
import { 
  getExpenses, 
  addExpense, 
  updateExpense, 
  deleteExpense, 
  getExpenseTypes, 
  getCompanies, 
  addCompany, 
  getIncomes,
  uploadExpenseAttachment,
  supabase, 
  type ExpenseRecord, 
  type CompanyRecord,
  type IncomeRecord
} from '../services/supabase';
import { ManageCategoriesModal } from '../components/ManageCategoriesModal';
import { NegotiateExpensesModal } from '../components/NegotiateExpensesModal';
import { CategoryIcon } from '../components/CategoryIcon';
import { DatePicker } from '../components/DatePicker';
import { PortalDropdown } from '../components/PortalDropdown';

export const Expenses: React.FC = () => {
  const [expenses, setExpenses] = useState<ExpenseRecord[]>([]);
  const [incomes, setIncomes] = useState<IncomeRecord[]>([]);
  const [types, setTypes] = useState<string[]>([]);
  const [companies, setCompanies] = useState<CompanyRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // Search and filters
  const currentMonthKey = new Date().toISOString().substring(0, 7);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonthKey);
  const [selectedCategory, setSelectedCategory] = useState('Todas');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'partial' | 'paid'>('all');

  // Custom Dropdown Open States
  const [isMonthDropdownOpen, setIsMonthDropdownOpen] = useState(false);
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);
  const [isCompanySuggestionsOpen, setIsCompanySuggestionsOpen] = useState(false);

  const monthDropdownRef = useRef<HTMLDivElement>(null);
  const categoryDropdownRef = useRef<HTMLDivElement>(null);
  const companyInputRef = useRef<HTMLDivElement>(null);

  // Modal States
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isNegotiateModalOpen, setIsNegotiateModalOpen] = useState(false);
  const [isManageModalOpen, setIsManageModalOpen] = useState(false);
  const [manageModalInitialTab, setManageModalInitialTab] = useState<'companies' | 'types'>('companies');
  const [selectedExpense, setSelectedExpense] = useState<ExpenseRecord | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);
  const [replicateConfirmExpense, setReplicateConfirmExpense] = useState<ExpenseRecord | null>(null);
  const [isReplicating, setIsReplicating] = useState(false);

  // Form Field States
  const [editingId, setEditingId] = useState<number | null>(null);
  const [dueDate, setDueDate] = useState(new Date().toISOString().split('T')[0]);
  const [paidDate, setPaidDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [expenseType, setExpenseType] = useState('Moradia');
  const [company, setCompany] = useState('');
  const [amountToPayInput, setAmountToPayInput] = useState('');
  const [amountPaidInput, setAmountPaidInput] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'PIX' | 'Crédito' | 'Débito' | 'Boleto'>('PIX');
  const [isPaymentSectionOpen, setIsPaymentSectionOpen] = useState(false);
  const [excessType, setExcessType] = useState<'late_fee' | 'overpayment'>('late_fee');
  const [saveCompanyToFavorites, setSaveCompanyToFavorites] = useState(true);
  const [isRecurring, setIsRecurring] = useState(false);

  // Attachment states
  const [billAttachment, setBillAttachment] = useState<string | null>(null);
  const [billName, setBillName] = useState<string>('');
  const [receiptAttachment, setReceiptAttachment] = useState<string | null>(null);
  const [receiptName, setReceiptName] = useState<string>('');
  const [isUploadingBill, setIsUploadingBill] = useState(false);
  const [isUploadingReceipt, setIsUploadingReceipt] = useState(false);

  // Document preview modal
  const [previewDoc, setPreviewDoc] = useState<{ url: string; name: string; title: string } | null>(null);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (monthDropdownRef.current && !monthDropdownRef.current.contains(event.target as Node)) {
        setIsMonthDropdownOpen(false);
      }
      if (categoryDropdownRef.current && !categoryDropdownRef.current.contains(event.target as Node)) {
        setIsCategoryDropdownOpen(false);
      }
      if (companyInputRef.current && !companyInputRef.current.contains(event.target as Node)) {
        setIsCompanySuggestionsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Initial Fetch & Realtime subscription
  useEffect(() => {
    loadAllData();

    const channel = supabase
      .channel('schema-db-changes-expenses-page')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'expenses' }, () => {
        loadExpensesOnly();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'incomes' }, () => {
        loadIncomesOnly();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'expense_types' }, () => {
        loadAllData();
      })
      .on('postgres_changes', { event: '*', schema: 'public', table: 'companies' }, () => {
        loadAllData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  // Close any open modal on Escape key press
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (previewDoc) {
          setPreviewDoc(null);
        } else if (deleteConfirmId !== null) {
          setDeleteConfirmId(null);
        } else if (replicateConfirmExpense !== null) {
          setReplicateConfirmExpense(null);
        } else if (selectedExpense !== null) {
          setSelectedExpense(null);
        } else if (isFormModalOpen) {
          setIsFormModalOpen(false);
        } else if (isNegotiateModalOpen) {
          setIsNegotiateModalOpen(false);
        } else if (isManageModalOpen) {
          setIsManageModalOpen(false);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [previewDoc, deleteConfirmId, replicateConfirmExpense, selectedExpense, isFormModalOpen, isNegotiateModalOpen, isManageModalOpen]);

  const loadAllData = async () => {
    setLoading(true);
    const [exp, inc, t, comp] = await Promise.all([
      getExpenses(),
      getIncomes(),
      getExpenseTypes(),
      getCompanies()
    ]);
    setExpenses(exp);
    setIncomes(inc);
    setTypes(t);
    setCompanies(comp);
    if (t.length > 0 && !t.includes(expenseType)) {
      setExpenseType(t[0]);
    }
    setLoading(false);
  };

  const loadExpensesOnly = async () => {
    const data = await getExpenses();
    setExpenses(data);
  };

  const loadIncomesOnly = async () => {
    const data = await getIncomes();
    setIncomes(data);
  };

  // Helper to extract YYYY-MM safely
  const extractMonth = (dateStr?: string): string => {
    if (!dateStr) return '';
    const clean = dateStr.split('T')[0];
    const parts = clean.split('-');
    if (parts.length >= 2) {
      return `${parts[0]}-${parts[1].padStart(2, '0')}`;
    }
    return '';
  };

  // Currency Helpers
  const formatCurrency = (val: number) => {
    return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const parseCurrencyInput = (valueStr: string): number => {
    if (!valueStr) return 0;
    const digitsOnly = valueStr.replace(/\D/g, '');
    if (!digitsOnly) return 0;
    return parseInt(digitsOnly, 10) / 100;
  };

  const formatCurrencyString = (valueStr: string): string => {
    const digitsOnly = valueStr.replace(/\D/g, '');
    if (!digitsOnly) return '';
    const num = parseInt(digitsOnly, 10) / 100;
    return num.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const handleAmountToPayChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAmountToPayInput(formatCurrencyString(e.target.value));
  };

  const handleAmountPaidChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setAmountPaidInput(formatCurrencyString(e.target.value));
  };

  // Month list calculation
  const availableMonths = useMemo(() => {
    const monthSet = new Set<string>();
    expenses.forEach(item => {
      const m = extractMonth(item.due_date);
      if (m) monthSet.add(m);
    });
    incomes.forEach(item => {
      const m = extractMonth(item.date);
      if (m) monthSet.add(m);
    });
    
    // Add past 12 months and future 12 months from now so user can navigate seamlessly
    const now = new Date();
    for (let i = -12; i <= 12; i++) {
      const d = new Date(now.getFullYear(), now.getMonth() + i, 1);
      const m = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      monthSet.add(m);
    }

    return Array.from(monthSet).sort().reverse();
  }, [expenses, incomes]);

  const formatMonthLabel = (yyyyMm: string) => {
    if (yyyyMm === 'all') return 'Todos os Meses';
    const parts = yyyyMm.split('-');
    if (parts.length < 2) return yyyyMm;
    const [year, month] = parts;
    const dateObj = new Date(parseInt(year, 10), parseInt(month, 10) - 1, 1);
    const monthName = dateObj.toLocaleDateString('pt-BR', { month: 'long' });
    return `${monthName.charAt(0).toUpperCase() + monthName.slice(1)} de ${year}`;
  };

  const formatMonthShort = (dateStr?: string) => {
    if (!dateStr) return '';
    const parts = dateStr.split('T')[0].split('-');
    if (parts.length < 2) return dateStr;
    const dateObj = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, 1);
    const rawMonth = dateObj.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '');
    return `${rawMonth.charAt(0).toUpperCase() + rawMonth.slice(1)}/${parts[0].slice(-2)}`;
  };

  const handlePrevMonth = () => {
    if (selectedMonth === 'all') {
      setSelectedMonth(currentMonthKey);
      return;
    }
    const parts = selectedMonth.split('-');
    if (parts.length >= 2) {
      const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, 1);
      d.setMonth(d.getMonth() - 1);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      setSelectedMonth(`${y}-${m}`);
    }
  };

  const handleNextMonth = () => {
    if (selectedMonth === 'all') {
      setSelectedMonth(currentMonthKey);
      return;
    }
    const parts = selectedMonth.split('-');
    if (parts.length >= 2) {
      const d = new Date(parseInt(parts[0], 10), parseInt(parts[1], 10) - 1, 1);
      d.setMonth(d.getMonth() + 1);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      setSelectedMonth(`${y}-${m}`);
    }
  };

  // Helper to check if an expense is overdue from a previous month relative to real-world current month
  const isOverdueFromPast = (exp: ExpenseRecord): boolean => {
    const expMonth = extractMonth(exp.due_date);
    if (!expMonth) return false;
    const isPastMonth = expMonth < currentMonthKey;
    const amount = Number(exp.amount || 0);
    const paid = Number(exp.paid_amount || 0);
    const remaining = amount - paid;
    return isPastMonth && (exp.status !== 'paid' && remaining > 0);
  };

  // Helper to calculate the next N months due dates on the same day safely
  const calculateNextDueDates = (baseDateStr: string, count: number = 6): string[] => {
    if (!baseDateStr) return [];

    let baseYear = 0;
    let baseMonth = 0; // 0-indexed
    let baseDay = 1;

    const cleanStr = String(baseDateStr).trim();

    // Check YYYY-MM-DD or YYYY/MM/DD
    const isoMatch = cleanStr.match(/^(\d{4})[-/](\d{1,2})[-/](\d{1,2})/);
    // Check DD/MM/YYYY or DD-MM-YYYY (Brazilian format)
    const brMatch = cleanStr.match(/^(\d{1,2})[-/](\d{1,2})[-/](\d{4})/);

    if (isoMatch) {
      baseYear = parseInt(isoMatch[1], 10);
      baseMonth = parseInt(isoMatch[2], 10) - 1;
      baseDay = parseInt(isoMatch[3], 10);
    } else if (brMatch) {
      baseYear = parseInt(brMatch[3], 10);
      baseMonth = parseInt(brMatch[2], 10) - 1;
      baseDay = parseInt(brMatch[1], 10);
    } else {
      const d = new Date(cleanStr);
      if (!isNaN(d.getTime())) {
        baseYear = d.getFullYear();
        baseMonth = d.getMonth();
        baseDay = d.getDate();
      } else {
        const now = new Date();
        baseYear = now.getFullYear();
        baseMonth = now.getMonth();
        baseDay = now.getDate();
      }
    }

    if (isNaN(baseYear) || baseYear < 1900 || baseYear > 2200) {
      baseYear = new Date().getFullYear();
    }
    if (isNaN(baseMonth) || baseMonth < 0 || baseMonth > 11) {
      baseMonth = new Date().getMonth();
    }
    if (isNaN(baseDay) || baseDay < 1 || baseDay > 31) {
      baseDay = new Date().getDate();
    }

    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth();

    // If the base date is from a past month (before current month),
    // calculate future installments starting from the upcoming months
    const isPastMonth = (baseYear < currentYear) || (baseYear === currentYear && baseMonth < currentMonth);
    const startYear = isPastMonth ? currentYear : baseYear;
    const startMonth = isPastMonth ? currentMonth : baseMonth;

    const dates: string[] = [];
    for (let i = 1; i <= count; i++) {
      const targetMonthIndex = startMonth + i;
      const targetYear = startYear + Math.floor(targetMonthIndex / 12);
      const targetMonth = ((targetMonthIndex % 12) + 12) % 12;

      const maxDaysInMonth = new Date(targetYear, targetMonth + 1, 0).getDate();
      const finalDay = Math.min(baseDay, maxDaysInMonth);

      const monthPadded = String(targetMonth + 1).padStart(2, '0');
      const dayPadded = String(finalDay).padStart(2, '0');
      dates.push(`${targetYear}-${monthPadded}-${dayPadded}`);
    }
    return dates;
  };

  // Helper to get total income for a specific month
  const getMonthIncome = (monthKey: string) => {
    if (monthKey === 'all' || monthKey === 'Sem Data') return 0;
    return incomes
      .filter(i => extractMonth(i.date) === monthKey)
      .reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
  };

  // Live calculation of Saldo for Form
  const currentAmountToPay = parseCurrencyInput(amountToPayInput);
  const currentAmountPaid = parseCurrencyInput(amountPaidInput);
  const currentFormBalance = Math.max(0, currentAmountToPay - currentAmountPaid);

  // Upload handlers
  const handleBillFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingBill(true);
    try {
      const res = await uploadExpenseAttachment(file, 'bills');
      setBillAttachment(res.url);
      setBillName(res.name);
    } catch (err) {
      console.error('Error uploading bill:', err);
      alert('Erro ao carregar o arquivo do boleto/conta.');
    } finally {
      setIsUploadingBill(false);
      e.target.value = '';
    }
  };

  const handleReceiptFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsUploadingReceipt(true);
    try {
      const res = await uploadExpenseAttachment(file, 'receipts');
      setReceiptAttachment(res.url);
      setReceiptName(res.name);
    } catch (err) {
      console.error('Error uploading receipt:', err);
      alert('Erro ao carregar o comprovante.');
    } finally {
      setIsUploadingReceipt(false);
      e.target.value = '';
    }
  };

  // Form Reset
  const resetForm = () => {
    setEditingId(null);
    setDueDate(new Date().toISOString().split('T')[0]);
    setPaidDate(new Date().toISOString().split('T')[0]);
    setPaymentMethod('PIX');
    setIsPaymentSectionOpen(false);
    setNotes('');
    setExcessType('late_fee');
    setExpenseType(types[0] || 'Moradia');
    setCompany('');
    setAmountToPayInput('');
    setAmountPaidInput('');
    setBillAttachment(null);
    setBillName('');
    setReceiptAttachment(null);
    setReceiptName('');
    setIsCompanySuggestionsOpen(false);
    setSaveCompanyToFavorites(true);
    setIsRecurring(false);
  };

  const handleOpenNewModal = () => {
    resetForm();
    setIsFormModalOpen(true);
  };

  const handleOpenEditModal = (expense: ExpenseRecord) => {
    const hasPayment = Number(expense.paid_amount || 0) > 0;
    setEditingId(expense.id || null);
    setDueDate(expense.due_date || new Date().toISOString().split('T')[0]);
    setPaidDate(expense.paid_date || (expense.paid_amount ? expense.due_date : new Date().toISOString().split('T')[0]));
    setPaymentMethod((expense.payment_method as any) || 'PIX');
    setIsPaymentSectionOpen(hasPayment);
    setNotes(expense.notes || '');
    setExcessType(expense.excess_type || (expense.paid_date && expense.due_date && expense.paid_date > expense.due_date ? 'late_fee' : 'overpayment'));
    setExpenseType(expense.type || (types[0] || 'Moradia'));
    setCompany(expense.company || expense.description || '');
    setAmountToPayInput(formatCurrency(expense.amount || 0));
    setAmountPaidInput(hasPayment ? formatCurrency(expense.paid_amount || 0) : '');
    setBillAttachment(expense.bill_attachment || null);
    setBillName(expense.bill_name || '');
    setReceiptAttachment(expense.receipt_attachment || null);
    setReceiptName(expense.receipt_name || '');
    setIsCompanySuggestionsOpen(false);
    setSaveCompanyToFavorites(false);
    setIsRecurring(false);
    
    setSelectedExpense(null);
    setIsFormModalOpen(true);
  };

  const handleSelectRegisteredCompany = (comp: CompanyRecord) => {
    setCompany(comp.name);
    if (comp.default_type && types.includes(comp.default_type)) {
      setExpenseType(comp.default_type);
    }
    setIsCompanySuggestionsOpen(false);
  };

  const handleSaveExpense = async (e: React.FormEvent) => {
    e.preventDefault();

    const cleanCompany = company.trim();
    if (!cleanCompany) {
      alert('Por favor, informe a Empresa ou Beneficiário.');
      return;
    }
    if (!dueDate) {
      alert('Por favor, selecione a Data de Vencimento.');
      return;
    }
    if (currentAmountToPay <= 0) {
      alert('Por favor, informe um Valor a Pagar válido maior que zero.');
      return;
    }

    if (saveCompanyToFavorites) {
      const exists = companies.some(
        c => c.name.toLowerCase() === cleanCompany.toLowerCase() && 
             (c.default_type || 'Outros').toLowerCase() === expenseType.toLowerCase()
      );
      if (!exists) {
        await addCompany({
          name: cleanCompany,
          default_type: expenseType
        });
      }
    }

    const actualPaidAmount = isPaymentSectionOpen ? currentAmountPaid : 0;

    const payload: ExpenseRecord = {
      company: cleanCompany,
      description: cleanCompany,
      type: expenseType,
      due_date: dueDate,
      paid_date: actualPaidAmount > 0 ? (paidDate || dueDate) : undefined,
      payment_method: actualPaidAmount > 0 ? paymentMethod : undefined,
      notes: notes.trim(),
      excess_type: actualPaidAmount > currentAmountToPay ? excessType : undefined,
      bill_attachment: billAttachment || undefined,
      bill_name: billName || (billAttachment ? 'Boleto / Conta' : undefined),
      receipt_attachment: receiptAttachment || undefined,
      receipt_name: receiptName || (receiptAttachment ? 'Comprovante' : undefined),
      amount: currentAmountToPay,
      paid_amount: actualPaidAmount,
      status: actualPaidAmount >= currentAmountToPay && currentAmountToPay > 0 ? 'paid' : 'pending'
    };

    if (editingId) {
      await updateExpense(editingId, payload);
    } else {
      await addExpense(payload);
    }

    // Replicar para os próximos 6 meses se marcado como despesa recorrente
    if (isRecurring && currentAmountToPay > 0) {
      const futureDates = calculateNextDueDates(dueDate, 6);
      for (const futureDate of futureDates) {
        await addExpense({
          company: cleanCompany,
          description: cleanCompany,
          type: expenseType || types[0] || 'Moradia',
          due_date: futureDate,
          paid_date: undefined,
          payment_method: undefined,
          notes: notes ? notes.trim() : '',
          amount: currentAmountToPay,
          paid_amount: 0,
          status: 'pending',
          bill_attachment: billAttachment || undefined,
          bill_name: billName || (billAttachment ? 'Boleto / Conta' : undefined)
        });
      }
    }

    setIsFormModalOpen(false);
    resetForm();
    await loadAllData();
  };

  const executeReplicate6Months = async (expense: ExpenseRecord) => {
    if (!expense) return;
    const amountVal = Number(expense.amount || 0);
    if (amountVal <= 0) {
      alert('Esta despesa não possui um valor válido para ser agendada.');
      return;
    }
    const companyTitle = expense.company?.trim() || expense.description?.trim() || 'Despesa';
    const baseDueDate = expense.due_date || new Date().toISOString().split('T')[0];

    setIsReplicating(true);
    try {
      const futureDates = calculateNextDueDates(baseDueDate, 6);
      if (futureDates.length === 0) {
        alert('Não foi possível calcular as próximas datas de vencimento.');
        return;
      }
      for (const futureDate of futureDates) {
        await addExpense({
          company: companyTitle,
          description: companyTitle,
          type: expense.type || types[0] || 'Moradia',
          due_date: futureDate,
          paid_date: undefined,
          payment_method: undefined,
          notes: expense.notes ? expense.notes.trim() : '',
          amount: amountVal,
          paid_amount: 0,
          status: 'pending',
          bill_attachment: expense.bill_attachment || undefined,
          bill_name: expense.bill_name || undefined
        });
      }
      setReplicateConfirmExpense(null);
      setSelectedExpense(null);
      await loadAllData();
      alert(`6 parcelas de ${formatCurrency(amountVal)} foram agendadas com sucesso para os próximos meses.`);
    } catch (err) {
      console.error('Error replicating expense:', err);
      alert('Ocorreu um erro ao agendar as contas futuras.');
    } finally {
      setIsReplicating(false);
    }
  };

  const handleDeleteExpense = async (id: number) => {
    await deleteExpense(id);
    setDeleteConfirmId(null);
    setSelectedExpense(null);
    await loadExpensesOnly();
  };

  const handleQuickPayFull = async (expense: ExpenseRecord) => {
    if (!expense.id) return;
    const today = new Date().toISOString().split('T')[0];
    const updatePayload = {
      paid_amount: expense.amount,
      paid_date: today,
      payment_method: expense.payment_method || 'PIX',
      status: 'paid' as const
    };
    await updateExpense(expense.id, updatePayload);
    setSelectedExpense({
      ...expense,
      ...updatePayload
    });
    await loadExpensesOnly();
  };

  // Due date helper
  const formatDateBR = (dateStr: string) => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateStr;
  };

  const getDueDateStatus = (dueDateStr: string, isPaid: boolean) => {
    if (isPaid) return { label: 'Quitada', color: 'text-emerald-700 dark:text-emerald-400 bg-emerald-100/70 dark:bg-emerald-500/20' };
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(dueDateStr + 'T00:00:00');
    
    const diffTime = due.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) {
      return { label: `Atrasada (${Math.abs(diffDays)}d)`, color: 'text-rose-700 dark:text-rose-400 bg-rose-100/80 dark:bg-rose-500/20' };
    } else if (diffDays === 0) {
      return { label: 'Vence Hoje', color: 'text-amber-700 dark:text-amber-400 bg-amber-100/80 dark:bg-amber-500/20' };
    } else if (diffDays <= 3) {
      return { label: `Em ${diffDays} dias`, color: 'text-amber-600 dark:text-amber-300 bg-amber-50 dark:bg-amber-500/10' };
    } else {
      return { label: `Em ${diffDays} dias`, color: 'text-zinc-600 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800' };
    }
  };

  // Filtered expenses
  const displayedExpenses = useMemo(() => {
    return expenses.filter(exp => {
      let matchMonth = false;
      if (selectedMonth === 'all') {
        matchMonth = true;
      } else if (selectedMonth === currentMonthKey) {
        // In current month, include both current month's expenses AND past unpaid overdue expenses
        matchMonth = extractMonth(exp.due_date) === currentMonthKey || isOverdueFromPast(exp);
      } else {
        matchMonth = extractMonth(exp.due_date) === selectedMonth;
      }
      if (!matchMonth) return false;

      const companyName = (exp.company || exp.description || '').toLowerCase();
      const typeName = (exp.type || '').toLowerCase();
      const matchesSearch = !searchTerm.trim() || companyName.includes(searchTerm.toLowerCase()) || typeName.includes(searchTerm.toLowerCase());
      if (!matchesSearch) return false;

      const matchesCategory = selectedCategory === 'Todas' || exp.type === selectedCategory;
      if (!matchesCategory) return false;

      const amount = Number(exp.amount || 0);
      const paid = Number(exp.paid_amount || 0);
      const balance = amount - paid;

      if (statusFilter === 'paid') return balance <= 0 && amount > 0;
      if (statusFilter === 'pending') return paid === 0;
      if (statusFilter === 'partial') return paid > 0 && balance > 0;

      return true;
    }).sort((a, b) => {
      // If viewing current month, prioritize overdue items from previous months at top
      if (selectedMonth === currentMonthKey) {
        const aOverdue = isOverdueFromPast(a);
        const bOverdue = isOverdueFromPast(b);
        if (aOverdue && !bOverdue) return -1;
        if (!aOverdue && bOverdue) return 1;
      }
      return new Date(a.due_date).getTime() - new Date(b.due_date).getTime();
    });
  }, [expenses, selectedMonth, searchTerm, selectedCategory, statusFilter, currentMonthKey]);

  // Grouped expenses by Month when "all" is selected
  const groupedExpenses = useMemo(() => {
    if (selectedMonth !== 'all') {
      return [{ monthKey: selectedMonth, items: displayedExpenses }];
    }

    const groups: { [key: string]: ExpenseRecord[] } = {};
    displayedExpenses.forEach(exp => {
      const key = extractMonth(exp.due_date) || 'Sem Data';
      if (!groups[key]) groups[key] = [];
      groups[key].push(exp);
    });

    return Object.keys(groups)
      .sort()
      .reverse()
      .map(key => ({
        monthKey: key,
        items: groups[key]
      }));
  }, [displayedExpenses, selectedMonth]);

  // Financial Statistics for the selected month (or total)
  const stats = useMemo(() => {
    let monthExpenses: ExpenseRecord[] = [];
    if (selectedMonth === 'all') {
      monthExpenses = expenses;
    } else if (selectedMonth === currentMonthKey) {
      monthExpenses = expenses.filter(e => extractMonth(e.due_date) === currentMonthKey || isOverdueFromPast(e));
    } else {
      monthExpenses = expenses.filter(e => extractMonth(e.due_date) === selectedMonth);
    }

    // Month incomes
    const monthIncomes = selectedMonth === 'all'
      ? incomes
      : incomes.filter(i => extractMonth(i.date) === selectedMonth);

    const totalExpenses = monthExpenses.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
    const totalPaid = monthExpenses.reduce((acc, curr) => acc + (Number(curr.paid_amount) || 0), 0);
    const totalBalance = Math.max(0, totalExpenses - totalPaid);
    const pendingCount = monthExpenses.filter(e => (Number(e.amount || 0) - Number(e.paid_amount || 0)) > 0).length;

    const overdueList = monthExpenses.filter(e => isOverdueFromPast(e));
    const overdueCount = overdueList.length;
    const overdueBalance = overdueList.reduce((acc, curr) => acc + Math.max(0, (Number(curr.amount) || 0) - (Number(curr.paid_amount) || 0)), 0);

    // Calculate late fees (when categorized as late_fee or default late with excess)
    const totalLateFees = monthExpenses.reduce((acc, exp) => {
      const amt = Number(exp.amount || 0);
      const paid = Number(exp.paid_amount || 0);
      const due = exp.due_date ? exp.due_date.split('T')[0] : '';
      const pDate = exp.paid_date ? exp.paid_date.split('T')[0] : '';
      const isLate = pDate ? pDate > due : false;
      const isLateFee = (exp.excess_type === 'late_fee') || (!exp.excess_type && isLate && paid > amt);
      const lateFee = (exp.late_fee !== undefined && Number(exp.late_fee) > 0)
        ? Number(exp.late_fee)
        : (isLateFee && paid > amt ? (paid - amt) : 0);
      return acc + lateFee;
    }, 0);

    const totalIncome = monthIncomes.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
    const remainingAfterAllExpenses = totalIncome - totalExpenses; // Sobra após quitar todas as contas
    const currentAvailable = totalIncome - totalPaid; // Saldo atual após o que já foi pago

    return {
      totalExpenses,
      totalPaid,
      totalBalance,
      totalLateFees,
      pendingCount,
      overdueCount,
      overdueBalance,
      totalIncome,
      remainingAfterAllExpenses,
      currentAvailable,
      count: monthExpenses.length
    };
  }, [expenses, incomes, selectedMonth, currentMonthKey]);

  const companySuggestions = useMemo(() => {
    const list = !company.trim() 
      ? companies 
      : companies.filter(c => c.name.toLowerCase().includes(company.toLowerCase()));
    return [...list].sort((a, b) => a.name.localeCompare(b.name, 'pt-BR') || (a.default_type || '').localeCompare(b.default_type || '', 'pt-BR'));
  }, [companies, company]);

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-5 animate-fadeIn pb-24 md:pb-8">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight text-zinc-900 dark:text-white flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-lg bg-[#e5a50a]/10 dark:bg-[#e5a50a]/20 text-[#e5a50a] flex items-center justify-center shrink-0">
              <Receipt size={18} strokeWidth={2.3} />
            </span>
            Despesas
          </h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            Controle de contas a pagar, fornecedores e vencimentos
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsNegotiateModalOpen(true)}
            className="adw-btn"
            title="Renegociar contas em aberto e parcelar com juros calculados"
          >
            <Handshake size={16} strokeWidth={2.2} />
            <span>Renegociação</span>
          </button>

          <button
            onClick={handleOpenNewModal}
            className="adw-btn suggested-action"
          >
            <Plus size={16} strokeWidth={2.5} />
            <span>Nova Despesa</span>
          </button>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
        
        {/* Card 1: Total Despesas */}
        <div className="bg-white dark:bg-white/[0.06] rounded-xl p-4 sm:p-5 border border-black/10 dark:border-white/10 shadow-xs relative overflow-hidden min-w-0">
          <div className="flex items-center justify-between mb-2 min-w-0">
            <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 truncate">
              Total Despesas
            </span>
            <div className="w-7 h-7 rounded-lg bg-[#e5a50a]/10 dark:bg-[#e5a50a]/20 text-[#e5a50a] flex items-center justify-center shrink-0">
              <Receipt size={15} strokeWidth={2.5} />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-white tracking-tight truncate min-w-0" title={formatCurrency(stats.totalExpenses)}>
            {formatCurrency(stats.totalExpenses)}
          </div>
          <div className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-1 truncate">
            {stats.count} {stats.count === 1 ? 'conta cadastrada' : 'contas cadastradas'}
          </div>
        </div>

        {/* Card 2: Receita do Mês */}
        <div className="bg-white dark:bg-white/[0.06] rounded-xl p-4 sm:p-5 border border-black/10 dark:border-white/10 shadow-xs relative overflow-hidden min-w-0">
          <div className="flex items-center justify-between mb-2 min-w-0">
            <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 truncate">
              Receita do Mês
            </span>
            <div className="w-7 h-7 rounded-lg bg-[#2ec27e]/10 dark:bg-[#2ec27e]/20 text-[#2ec27e] flex items-center justify-center shrink-0">
              <Wallet size={15} strokeWidth={2.5} />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-bold text-[#2ec27e] tracking-tight truncate min-w-0" title={formatCurrency(stats.totalIncome)}>
            {formatCurrency(stats.totalIncome)}
          </div>
          <div className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-1 truncate">
            {selectedMonth === 'all' ? 'Total acumulado' : formatMonthLabel(selectedMonth)}
          </div>
        </div>

        {/* Card 3: Saldo Previsto (Receitas - Despesas) */}
        <div className="bg-white dark:bg-white/[0.06] rounded-xl p-4 sm:p-5 border border-black/10 dark:border-white/10 shadow-xs relative overflow-hidden min-w-0">
          <div className="flex items-center justify-between mb-2 min-w-0">
            <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 truncate">
              Saldo Previsto
            </span>
            <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
              stats.remainingAfterAllExpenses >= 0
                ? 'bg-[#2ec27e]/10 dark:bg-[#2ec27e]/20 text-[#2ec27e]'
                : 'bg-[#e01b24]/10 dark:bg-[#e01b24]/20 text-[#e01b24]'
            }`}>
              <PiggyBank size={15} strokeWidth={2.5} />
            </div>
          </div>
          <div className={`text-xl sm:text-2xl font-bold tracking-tight truncate min-w-0 ${
            stats.remainingAfterAllExpenses >= 0 
              ? 'text-[#2ec27e]' 
              : 'text-[#e01b24]'
          }`} title={formatCurrency(stats.remainingAfterAllExpenses)}>
            {stats.remainingAfterAllExpenses >= 0 ? '+' : ''}{formatCurrency(stats.remainingAfterAllExpenses)}
          </div>
          <div className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-1 truncate">
            {stats.remainingAfterAllExpenses >= 0 ? 'Após quitar todas as despesas' : 'Déficit previsto após quitar tudo'}
          </div>
        </div>

        {/* Card 4: Saldo Devedor / Pendente */}
        <div className="bg-white dark:bg-white/[0.06] rounded-xl p-4 sm:p-5 border border-black/10 dark:border-white/10 shadow-xs relative overflow-hidden min-w-0">
          <div className="flex items-center justify-between mb-2 min-w-0">
            <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 truncate">
              Saldo a Pagar
            </span>
            <div className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
              stats.totalBalance > 0
                ? 'bg-[#e5a50a]/10 dark:bg-[#e5a50a]/20 text-[#e5a50a]'
                : 'bg-[#2ec27e]/10 dark:bg-[#2ec27e]/20 text-[#2ec27e]'
            }`}>
              {stats.totalBalance > 0 ? <Clock size={15} strokeWidth={2.5} /> : <CheckCircle2 size={15} strokeWidth={2.5} />}
            </div>
          </div>
          <div className={`text-xl sm:text-2xl font-bold tracking-tight truncate min-w-0 ${
            stats.totalBalance > 0 ? 'text-[#e5a50a]' : 'text-[#2ec27e]'
          }`} title={formatCurrency(stats.totalBalance)}>
            {formatCurrency(stats.totalBalance)}
          </div>
          <div className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-1 truncate">
            {stats.totalBalance === 0 
              ? 'Todas as contas quitadas' 
              : `${formatCurrency(stats.totalPaid)} já pago (${stats.totalExpenses > 0 ? ((stats.totalPaid / stats.totalExpenses) * 100).toFixed(0) : 0}%)`}
          </div>
        </div>

      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-white/[0.06] rounded-xl p-3 border border-black/10 dark:border-white/10 shadow-xs flex flex-col md:flex-row gap-2.5 items-center justify-between relative z-20">
        
        {/* Search */}
        <div className="relative w-full md:w-72">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Buscar por empresa ou tipo..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-lg pl-9 pr-7 py-2 text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-[#3584e4]/30 transition-all"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 p-0.5"
            >
              <X size={13} />
            </button>
          )}
        </div>

        {/* Dropdowns & Pills */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-start md:justify-end">
          
          {/* Month Paginator & Selector */}
          <div className="flex items-center gap-1.5">
            <div className="inline-flex items-center bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-lg p-0.5">
              {/* Botão Mês Anterior */}
              <button
                type="button"
                onClick={handlePrevMonth}
                disabled={selectedMonth === 'all'}
                className="p-1.5 text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 rounded-md transition-all disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
                title="Mês Anterior"
              >
                <ChevronLeft size={16} strokeWidth={2.5} />
              </button>

              {/* Dropdown Popover Trigger */}
              <div className="relative" ref={monthDropdownRef}>
                <button
                  type="button"
                  onClick={() => setIsMonthDropdownOpen(!isMonthDropdownOpen)}
                  className="flex items-center gap-2 px-2.5 py-1 text-sm font-semibold text-zinc-800 dark:text-zinc-200 hover:bg-black/5 dark:hover:bg-white/10 rounded-md transition-all cursor-pointer"
                >
                  <Calendar size={15} className="text-zinc-400 shrink-0" />
                  <span className="truncate max-w-[140px] sm:max-w-none">{formatMonthLabel(selectedMonth)}</span>
                  <ChevronDown size={14} className={`text-zinc-400 transition-transform duration-200 ${isMonthDropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {isMonthDropdownOpen && (
                  <div className="absolute left-0 sm:right-0 sm:left-auto mt-1.5 w-64 adw-popover bg-white dark:bg-[#383838] border border-black/15 dark:border-white/15 rounded-xl shadow-2xl z-50 py-1.5 overflow-hidden animate-in fade-in zoom-in-95 duration-100 max-h-72 overflow-y-auto">
                    <button
                      onClick={() => {
                        setSelectedMonth('all');
                        setIsMonthDropdownOpen(false);
                      }}
                      className={`w-full flex items-center justify-between px-3.5 py-2 text-sm text-left hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer ${
                        selectedMonth === 'all' 
                          ? 'font-bold text-white bg-[#3584e4]' 
                          : 'text-zinc-700 dark:text-zinc-300'
                      }`}
                    >
                      <span>Todos os Meses</span>
                      {selectedMonth === 'all' && <Check size={16} className="text-white" />}
                    </button>
                    
                    <div className="h-px bg-black/10 dark:bg-white/10 my-1" />

                    {availableMonths.map((m) => (
                      <button
                        key={m}
                        onClick={() => {
                          setSelectedMonth(m);
                          setIsMonthDropdownOpen(false);
                        }}
                        className={`w-full flex items-center justify-between px-3.5 py-2 text-sm text-left hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer ${
                          selectedMonth === m 
                            ? 'font-bold text-white bg-[#3584e4]' 
                            : 'text-zinc-700 dark:text-zinc-300'
                        }`}
                      >
                        <span className="flex items-center gap-2">
                          {m === currentMonthKey && <span className="w-1.5 h-1.5 rounded-full bg-[#3584e4]" />}
                          {formatMonthLabel(m)}
                        </span>
                        {selectedMonth === m && <Check size={16} className="text-white" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Botão Próximo Mês */}
              <button
                type="button"
                onClick={handleNextMonth}
                disabled={selectedMonth === 'all'}
                className="p-1.5 text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 rounded-md transition-all disabled:opacity-30 disabled:pointer-events-none cursor-pointer"
                title="Próximo Mês"
              >
                <ChevronRight size={16} strokeWidth={2.5} />
              </button>
            </div>

            {/* Atalho Hoje */}
            {selectedMonth !== currentMonthKey && (
              <button
                type="button"
                onClick={() => setSelectedMonth(currentMonthKey)}
                className="px-2.5 py-1.5 bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-zinc-700 dark:text-zinc-300 border border-black/10 dark:border-white/10 rounded-lg text-xs font-semibold transition-all cursor-pointer"
                title="Ir para o mês atual"
              >
                Hoje
              </button>
            )}
          </div>

          {/* Category Dropdown */}
          <div className="relative" ref={categoryDropdownRef}>
            <button
              type="button"
              onClick={() => setIsCategoryDropdownOpen(!isCategoryDropdownOpen)}
              className="bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-zinc-800 dark:text-zinc-200 border border-black/10 dark:border-white/10 text-sm font-semibold rounded-lg px-3.5 py-2 outline-none flex items-center gap-2 transition-all cursor-pointer"
            >
              <Tag size={15} className="text-zinc-400" />
              <span>{selectedCategory === 'Todas' ? 'Todas Categorias' : selectedCategory}</span>
              <ChevronDown size={14} className={`text-zinc-400 transition-transform duration-200 ${isCategoryDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {isCategoryDropdownOpen && (
              <div className="absolute left-0 sm:right-0 sm:left-auto mt-1.5 w-60 adw-popover bg-white dark:bg-[#383838] border border-black/15 dark:border-white/15 rounded-xl p-1.5 shadow-2xl z-50 animate-in fade-in zoom-in-95 duration-100 max-h-72 overflow-y-auto">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedCategory('Todas');
                    setIsCategoryDropdownOpen(false);
                  }}
                  className={`w-full text-left px-3.5 py-2 rounded-lg text-sm font-semibold flex items-center justify-between transition-colors cursor-pointer ${
                    selectedCategory === 'Todas' 
                      ? 'bg-[#3584e4] text-white font-bold' 
                      : 'text-zinc-700 dark:text-zinc-300 hover:bg-black/5 dark:hover:bg-white/10'
                  }`}
                >
                  <span>Todas Categorias</span>
                  {selectedCategory === 'Todas' && <Check size={16} className="text-white" />}
                </button>
                <div className="my-1 border-t border-black/10 dark:border-white/10" />
                {[...types].sort((a, b) => a.localeCompare(b, 'pt-BR')).map(cat => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => {
                      setSelectedCategory(cat);
                      setIsCategoryDropdownOpen(false);
                    }}
                    className={`w-full text-left px-3.5 py-2 rounded-lg text-sm font-semibold flex items-center justify-between transition-colors cursor-pointer ${
                      selectedCategory === cat 
                        ? 'bg-[#3584e4] text-white font-bold' 
                        : 'text-zinc-700 dark:text-zinc-300 hover:bg-black/5 dark:hover:bg-white/10'
                    }`}
                  >
                    <span>{cat}</span>
                    {selectedCategory === cat && <Check size={16} className="text-white" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Status Filter Pill (Libadwaita ViewSwitcher style) */}
          <div className="adw-view-switcher">
            <button
              onClick={() => setStatusFilter('all')}
              className={`adw-view-switcher-item ${statusFilter === 'all' ? 'active' : ''}`}
            >
              Todas
            </button>
            <button
              onClick={() => setStatusFilter('pending')}
              className={`adw-view-switcher-item ${statusFilter === 'pending' ? 'active' : ''}`}
            >
              Pendentes
            </button>
            <button
              onClick={() => setStatusFilter('partial')}
              className={`adw-view-switcher-item ${statusFilter === 'partial' ? 'active' : ''}`}
            >
              Parciais
            </button>
            <button
              onClick={() => setStatusFilter('paid')}
              className={`adw-view-switcher-item ${statusFilter === 'paid' ? 'active' : ''}`}
            >
              Pagas
            </button>
          </div>

        </div>
      </div>

      {/* Expenses Content - Grouped by Month */}
      <div className="space-y-6">
        {loading ? (
          <div className="py-16 text-center text-zinc-400 flex flex-col items-center gap-3">
            <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
            <p className="text-sm">Carregando despesas...</p>
          </div>
        ) : displayedExpenses.length === 0 ? (
          <div className="bg-white dark:bg-zinc-900/60 rounded-3xl p-12 text-center border border-zinc-200/70 dark:border-white/10">
            <div className="w-14 h-14 rounded-2xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto mb-3">
              <Receipt size={28} strokeWidth={2} />
            </div>
            <h3 className="text-base font-semibold text-zinc-900 dark:text-white">Nenhuma despesa encontrada</h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 max-w-sm mx-auto">
              {searchTerm || selectedCategory !== 'Todas' || statusFilter !== 'all' || selectedMonth !== 'all'
                ? 'Tente ajustar os filtros ou pesquisar por outro termo.' 
                : 'Cadastre suas contas e despesas para acompanhar seus pagamentos.'}
            </p>
            <button
              onClick={handleOpenNewModal}
              className="mt-4 inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-600/20 active:scale-95 transition-all cursor-pointer"
            >
              <Plus size={16} strokeWidth={2.5} />
              <span>Adicionar Primeira Despesa</span>
            </button>
          </div>
        ) : (
          <>
            {/* Overdue alert banner when viewing current month */}
            {selectedMonth === currentMonthKey && stats.overdueCount > 0 && (
              <div className="bg-amber-500/10 dark:bg-amber-500/15 border border-amber-500/30 rounded-2xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-xs sm:text-sm shadow-xs">
                <div className="flex items-center gap-3 text-amber-900 dark:text-amber-100">
                  <div className="w-9 h-9 rounded-xl bg-amber-500/20 flex items-center justify-center shrink-0 text-amber-600 dark:text-amber-400">
                    <AlertTriangle size={18} strokeWidth={2.5} />
                  </div>
                  <div>
                    <div className="font-bold text-sm">
                      {stats.overdueCount === 1 ? '1 conta atrasada de meses anteriores' : `${stats.overdueCount} contas atrasadas de meses anteriores`}
                    </div>
                    <div className="text-xs text-amber-800/80 dark:text-amber-300/80 mt-0.5">
                      O saldo devedor acumulado de <strong className="font-bold text-amber-950 dark:text-white">{formatCurrency(stats.overdueBalance)}</strong> está somado automaticamente nas despesas deste mês corrente.
                    </div>
                  </div>
                </div>
              </div>
            )}

            {groupedExpenses.map((group) => {
              const groupTotal = group.items.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
              const groupPaid = group.items.reduce((acc, curr) => acc + (Number(curr.paid_amount) || 0), 0);
              const groupPending = Math.max(0, groupTotal - groupPaid);
              const groupIncome = getMonthIncome(group.monthKey);
              const groupRemaining = groupIncome - groupTotal;

              return (
                <div key={group.monthKey} className="space-y-3">
                  
                  {/* Month Group Header */}
                  <div className="flex flex-wrap items-center justify-between gap-2 px-1">
                    <div className="flex items-center gap-2">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                      <h2 className="text-sm md:text-base font-bold text-zinc-900 dark:text-white">
                        {formatMonthLabel(group.monthKey)}
                      </h2>
                      <span className="text-xs text-zinc-400 dark:text-zinc-500">
                        ({group.items.length} {group.items.length === 1 ? 'conta' : 'contas'})
                      </span>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 text-xs">
                      {groupIncome > 0 && (
                        <span className="text-emerald-600 dark:text-emerald-400 font-semibold bg-emerald-500/10 px-2.5 py-1 rounded-xl flex items-center gap-1">
                          <Wallet size={12} />
                          <span>Receita: {formatCurrency(groupIncome)}</span>
                        </span>
                      )}
                      <span className="text-zinc-600 dark:text-zinc-300 font-medium bg-zinc-100 dark:bg-zinc-800 px-2.5 py-1 rounded-xl">
                        Despesas: <strong className="text-zinc-900 dark:text-white">{formatCurrency(groupTotal)}</strong>
                      </span>
                      {groupIncome > 0 && (
                        <span className={`font-semibold px-2.5 py-1 rounded-xl flex items-center gap-1 ${
                          groupRemaining >= 0 
                            ? 'text-emerald-700 dark:text-emerald-400 bg-emerald-500/10' 
                            : 'text-rose-700 dark:text-rose-400 bg-rose-500/10'
                        }`}>
                          <span>Saldo Previsto: {groupRemaining >= 0 ? '+' : ''}{formatCurrency(groupRemaining)}</span>
                        </span>
                      )}
                      {groupPending > 0 ? (
                        <span className="text-amber-600 dark:text-amber-400 font-semibold bg-amber-500/10 px-2.5 py-1 rounded-xl">
                          Pendente: {formatCurrency(groupPending)}
                        </span>
                      ) : (
                        <span className="text-emerald-600 dark:text-emerald-400 font-semibold bg-emerald-500/10 px-2.5 py-1 rounded-xl">
                          100% Quitado
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Table Container */}
                  <div className="bg-white dark:bg-zinc-900/60 backdrop-blur-md rounded-2xl border border-zinc-200/70 dark:border-white/10 shadow-xs overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-zinc-200/70 dark:border-white/10 text-[11px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 bg-zinc-50/60 dark:bg-zinc-800/30">
                            <th className="py-3 px-4 font-bold">Vencimento</th>
                            <th className="py-3 px-4 font-bold">Empresa / Beneficiário</th>
                            <th className="py-3 px-4 font-bold">Categoria</th>
                            <th className="py-3 px-4 font-bold text-right">Valor</th>
                            <th className="py-3 px-4 font-bold text-right">Pago</th>
                            <th className="py-3 px-4 font-bold text-right">Saldo</th>
                            <th className="py-3 px-4 font-bold text-center w-10"></th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-200/60 dark:divide-white/5 text-sm">
                          {group.items.map((exp) => {
                            const amount = Number(exp.amount || 0);
                            const paid = Number(exp.paid_amount || 0);
                            const balance = Math.max(0, amount - paid);
                            const isPaid = balance <= 0 && amount > 0;
                            const dueInfo = getDueDateStatus(exp.due_date, isPaid);

                            const due = exp.due_date ? exp.due_date.split('T')[0] : '';
                            const pDate = exp.paid_date ? exp.paid_date.split('T')[0] : '';
                            const isLate = pDate ? pDate > due : false;
                            const isLateFee = (exp.excess_type === 'late_fee') || (!exp.excess_type && isLate && paid > amount);
                            const lateFee = (exp.late_fee !== undefined && Number(exp.late_fee) > 0)
                              ? Number(exp.late_fee)
                              : (isLateFee && paid > amount ? (paid - amount) : 0);
                            const overpayment = !isLateFee && paid > amount ? (paid - amount) : 0;

                            return (
                              <tr
                                key={exp.id}
                                onClick={() => setSelectedExpense(exp)}
                                className={`hover:bg-zinc-100/80 dark:hover:bg-zinc-800/40 cursor-pointer transition-colors group select-none ${
                                  selectedMonth === currentMonthKey && isOverdueFromPast(exp) ? 'bg-rose-500/[0.03] dark:bg-rose-500/[0.05]' : ''
                                }`}
                              >
                                {/* Vencimento / Pagamento */}
                                <td className="py-3.5 px-4 whitespace-nowrap">
                                  <div className="flex items-center gap-2">
                                    <span className="font-semibold text-zinc-900 dark:text-zinc-100 text-xs md:text-sm">
                                      {formatDateBR(exp.due_date)}
                                    </span>
                                    {selectedMonth === currentMonthKey && isOverdueFromPast(exp) ? (
                                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full text-rose-700 dark:text-rose-400 bg-rose-500/15 border border-rose-500/30 flex items-center gap-1">
                                        <AlertTriangle size={10} strokeWidth={2.5} />
                                        Atrasada ({formatMonthShort(exp.due_date)})
                                      </span>
                                    ) : (
                                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${dueInfo.color}`}>
                                        {dueInfo.label}
                                      </span>
                                    )}
                                    {paid === 0 && exp.late_fee && Number(exp.late_fee) > 0 && (
                                      <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400 bg-rose-500/10 dark:bg-rose-500/20 px-1.5 py-0.2 rounded-md">
                                        +{formatCurrency(Number(exp.late_fee))} juros
                                      </span>
                                    )}
                                  </div>
                                {paid > 0 && exp.paid_date && (
                                  <div className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-0.5 flex flex-wrap items-center gap-1.5">
                                    <span>Pago em {formatDateBR(exp.paid_date)}</span>
                                    {exp.payment_method && (
                                      <span className="text-[10px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-500/10 dark:bg-emerald-500/20 px-1.5 py-0.2 rounded-md">
                                        {exp.payment_method}
                                      </span>
                                    )}
                                    {lateFee > 0 && (
                                      <span className="text-[10px] font-bold text-rose-600 dark:text-rose-400 bg-rose-500/10 dark:bg-rose-500/20 px-1.5 py-0.2 rounded-md">
                                        +{formatCurrency(lateFee)} Juros
                                      </span>
                                    )}
                                    {overpayment > 0 && (
                                      <span className="text-[10px] font-bold text-blue-600 dark:text-blue-400 bg-blue-500/10 dark:bg-blue-500/20 px-1.5 py-0.2 rounded-md">
                                        +{formatCurrency(overpayment)} a maior
                                      </span>
                                    )}
                                  </div>
                                )}
                              </td>

                              {/* Empresa */}
                              <td className="py-3.5 px-4">
                                <div className="flex items-center gap-2.5 font-bold text-zinc-900 dark:text-white">
                                  <CategoryIcon type={exp.type} size={15} />
                                  <span className="truncate max-w-[180px] sm:max-w-none text-xs md:text-sm">
                                    {exp.company || exp.description || 'Despesa'}
                                  </span>
                                </div>
                              </td>

                              {/* Categoria */}
                              <td className="py-3.5 px-4 whitespace-nowrap">
                                <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-medium bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 border border-zinc-200/50 dark:border-zinc-700/50">
                                  <Tag size={11} className="text-zinc-400" />
                                  {exp.type}
                                </span>
                              </td>

                              {/* Valor */}
                              <td className="py-3.5 px-4 text-right whitespace-nowrap">
                                <span className="font-bold tabular-nums text-zinc-900 dark:text-zinc-100 text-xs md:text-sm">
                                  {formatCurrency(amount)}
                                </span>
                              </td>

                              {/* Pago */}
                              <td className="py-3.5 px-4 text-right whitespace-nowrap">
                                <span className={`font-semibold tabular-nums text-xs md:text-sm ${
                                  paid > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-zinc-400 dark:text-zinc-500'
                                }`}>
                                  {formatCurrency(paid)}
                                </span>
                                {lateFee > 0 && (
                                  <div className="text-[10px] font-bold text-rose-600 dark:text-rose-400">
                                    +{formatCurrency(lateFee)} juros
                                  </div>
                                )}
                                {overpayment > 0 && (
                                  <div className="text-[10px] font-bold text-blue-600 dark:text-blue-400">
                                    +{formatCurrency(overpayment)} a maior
                                  </div>
                                )}
                              </td>

                              {/* Saldo */}
                              <td className="py-3.5 px-4 text-right whitespace-nowrap">
                                {isPaid ? (
                                  <span className="inline-flex items-center gap-1 text-xs font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-500/10 px-2 py-0.5 rounded-full">
                                    <Check size={12} strokeWidth={3} />
                                    Quitada
                                  </span>
                                ) : (
                                  <span className="font-bold tabular-nums text-rose-600 dark:text-rose-400 text-xs md:text-sm">
                                    {formatCurrency(balance)}
                                  </span>
                                )}
                              </td>

                              {/* Chevron */}
                              <td className="py-3.5 px-4 text-center">
                                <ChevronRight size={15} className="text-zinc-400 group-hover:text-zinc-800 dark:group-hover:text-white transition-colors" />
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>

              </div>
            );
          })}
        </>
        )}
      </div>

      {/* ========================================================================= */}
      {/* EXPENSE DETAIL MODAL */}
      {/* ========================================================================= */}
      {selectedExpense && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div 
            className="adw-dialog max-w-lg w-full p-6 shadow-2xl animate-scaleIn overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-start justify-between pb-4 border-b border-black/5 dark:border-white/5">
              <div className="flex items-center gap-3">
                <CategoryIcon type={selectedExpense.type} size={24} containerClassName="w-11 h-11 rounded-xl shadow-xs" />
                <div>
                  <h3 className="text-lg md:text-xl font-bold text-zinc-900 dark:text-white leading-tight">
                    {selectedExpense.company || selectedExpense.description}
                  </h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-black/5 dark:bg-white/10 text-zinc-600 dark:text-zinc-300">
                      {selectedExpense.type}
                    </span>
                    {(() => {
                      const amount = Number(selectedExpense.amount || 0);
                      const paid = Number(selectedExpense.paid_amount || 0);
                      const isPaid = (amount - paid) <= 0 && amount > 0;
                      const dueInfo = getDueDateStatus(selectedExpense.due_date, isPaid);
                      return (
                        <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${dueInfo.color}`}>
                          {dueInfo.label}
                        </span>
                      );
                    })()}
                  </div>
                </div>
              </div>

              <button 
                onClick={() => setSelectedExpense(null)}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="py-5 space-y-4">
              
              {/* Financial Breakdown Grid */}
              <div className="grid grid-cols-3 gap-3 p-4 rounded-xl bg-black/[0.03] dark:bg-white/[0.04] border border-black/5 dark:border-white/5">
                <div>
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 block">
                    Valor a Pagar
                  </span>
                  <span className="text-sm md:text-base font-bold tabular-nums text-zinc-900 dark:text-white mt-0.5 block">
                    {formatCurrency(Number(selectedExpense.amount || 0))}
                  </span>
                </div>

                <div>
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 block">
                    Valor Pago
                  </span>
                  <span className="text-sm md:text-base font-bold tabular-nums text-[#2ec27e] mt-0.5 block">
                    {formatCurrency(Number(selectedExpense.paid_amount || 0))}
                  </span>
                </div>

                <div>
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 block">
                    Restante
                  </span>
                  <span className="text-sm md:text-base font-bold tabular-nums text-[#e01b24] mt-0.5 block">
                    {(() => {
                      const amount = Number(selectedExpense.amount || 0);
                      const paid = Number(selectedExpense.paid_amount || 0);
                      const remaining = Math.max(0, amount - paid);
                      return formatCurrency(remaining);
                    })()}
                  </span>
                </div>
              </div>

              {/* Progress Bar */}
              {(() => {
                const amount = Number(selectedExpense.amount || 0);
                const paid = Number(selectedExpense.paid_amount || 0);
                const pct = amount > 0 ? Math.min(100, Math.round((paid / amount) * 100)) : 0;
                return (
                  <div>
                    <div className="flex justify-between text-xs font-semibold text-zinc-500 dark:text-zinc-400 mb-1.5">
                      <span>Progresso do Pagamento</span>
                      <span>{pct}% quitado</span>
                    </div>
                    <div className="w-full bg-zinc-200 dark:bg-zinc-800 h-2.5 rounded-full overflow-hidden">
                      <div 
                        className={`h-full transition-all duration-300 ${pct === 100 ? 'bg-emerald-500' : 'bg-emerald-500'}`}
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })()}

              {/* Info Rows */}
              <div className="space-y-2 text-xs font-medium text-zinc-600 dark:text-zinc-300">
                <div className="flex items-center justify-between py-1.5 border-b border-zinc-100 dark:border-zinc-800">
                  <span className="text-zinc-400">Data de Vencimento:</span>
                  <span className="font-semibold text-zinc-900 dark:text-white flex items-center gap-1.5">
                    <Calendar size={14} className="text-zinc-400" />
                    {formatDateBR(selectedExpense.due_date)}
                  </span>
                </div>
                {selectedExpense.paid_date && Number(selectedExpense.paid_amount || 0) > 0 && (
                  <>
                    <div className="flex items-center justify-between py-1.5 border-b border-zinc-100 dark:border-zinc-800">
                      <span className="text-zinc-400">Data de Pagamento:</span>
                      <span className="font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                        <CheckCircle2 size={14} />
                        {formatDateBR(selectedExpense.paid_date)}
                        {selectedExpense.paid_date > selectedExpense.due_date && (
                          <span className="text-[10px] font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 px-2 py-0.5 rounded-full">
                            Após Vencimento
                          </span>
                        )}
                      </span>
                    </div>
                    {selectedExpense.payment_method && (
                      <div className="flex items-center justify-between py-1.5 border-b border-zinc-100 dark:border-zinc-800">
                        <span className="text-zinc-400">Meio de Pagamento:</span>
                        <span className="font-semibold text-zinc-900 dark:text-white flex items-center gap-1.5">
                          <CreditCard size={14} className="text-emerald-500" />
                          {selectedExpense.payment_method}
                        </span>
                      </div>
                    )}
                  </>
                )}
                <div className="flex items-center justify-between py-1.5 border-b border-zinc-100 dark:border-zinc-800">
                  <span className="text-zinc-400">Categoria:</span>
                  <span className="font-semibold text-zinc-900 dark:text-white">
                    {selectedExpense.type}
                  </span>
                </div>
                {(() => {
                  const amt = Number(selectedExpense.amount || 0);
                  const pd = Number(selectedExpense.paid_amount || 0);
                  const due = selectedExpense.due_date ? selectedExpense.due_date.split('T')[0] : '';
                  const pDate = selectedExpense.paid_date ? selectedExpense.paid_date.split('T')[0] : '';
                  const isLate = pDate ? pDate > due : false;
                  const isLateFee = (selectedExpense.excess_type === 'late_fee') || (!selectedExpense.excess_type && isLate && pd > amt);
                  const lateFee = (selectedExpense.late_fee !== undefined && Number(selectedExpense.late_fee) > 0)
                    ? Number(selectedExpense.late_fee)
                    : (isLateFee && pd > amt ? pd - amt : 0);
                  const overpayment = !isLateFee && pd > amt ? pd - amt : 0;
                  if (lateFee > 0) {
                    return (
                      <div className="flex items-center justify-between py-1.5 border-b border-zinc-100 dark:border-zinc-800 text-rose-600 dark:text-rose-400">
                        <span className="flex items-center gap-1 font-semibold">
                          <Flame size={14} />
                          {selectedExpense.late_fee ? 'Multa e Juros (Acordo):' : 'Multa e Juros por Atraso:'}
                        </span>
                        <span className="font-bold">
                          + {formatCurrency(lateFee)}
                        </span>
                      </div>
                    );
                  }
                  if (overpayment > 0) {
                    return (
                      <div className="flex items-center justify-between py-1.5 border-b border-zinc-100 dark:border-zinc-800 text-blue-600 dark:text-blue-400">
                        <span className="flex items-center gap-1 font-semibold">
                          <Wallet size={14} />
                          Pagamento a Maior:
                        </span>
                        <span className="font-bold">
                          + {formatCurrency(overpayment)}
                        </span>
                      </div>
                    );
                  }
                  return null;
                })()}
                {selectedExpense.notes && (
                  <div className="py-2">
                    <span className="text-zinc-400 block mb-1">Observações:</span>
                    <p className="bg-zinc-50 dark:bg-zinc-800/60 rounded-xl p-2.5 text-zinc-800 dark:text-zinc-200 text-xs font-normal whitespace-pre-wrap border border-zinc-200/50 dark:border-zinc-700/50">
                      {selectedExpense.notes}
                    </p>
                  </div>
                )}

                {/* Document & Receipt Attachments in Detail Modal */}
                {(selectedExpense.bill_attachment || selectedExpense.receipt_attachment) && (
                  <div className="pt-3 border-t border-black/5 dark:border-white/5 space-y-2.5">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 flex items-center gap-1.5">
                        <Paperclip size={14} className="text-[#3584e4]" />
                        Documentos e Comprovantes
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                      {selectedExpense.bill_attachment && (
                        <div className="p-3 rounded-xl bg-indigo-500/10 dark:bg-indigo-500/15 border border-indigo-500/30 flex items-center justify-between gap-2.5">
                          <div className="flex items-center gap-2.5 truncate min-w-0">
                            <div className="w-8 h-8 rounded-lg bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                              <FileText size={16} />
                            </div>
                            <div className="truncate min-w-0">
                              <div className="text-xs font-bold text-zinc-900 dark:text-white truncate" title={selectedExpense.bill_name || 'Boleto / Conta'}>
                                {selectedExpense.bill_name || 'Boleto / Conta'}
                              </div>
                              <div className="text-[10px] text-zinc-500 dark:text-zinc-400">Boleto / Documento</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => setPreviewDoc({
                                url: selectedExpense.bill_attachment!,
                                name: selectedExpense.bill_name || 'Boleto/Conta',
                                title: 'Boleto / Documento da Conta'
                              })}
                              className="adw-btn text-xs font-semibold py-1.5 px-2.5 text-indigo-700 dark:text-indigo-300 bg-indigo-500/20 hover:bg-indigo-500/30 cursor-pointer"
                              title="Visualizar documento"
                            >
                              <Eye size={14} />
                              <span>Ver</span>
                            </button>
                            <a
                              href={selectedExpense.bill_attachment}
                              download={selectedExpense.bill_name || 'boleto_conta'}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="adw-btn text-xs font-semibold p-1.5 text-indigo-700 dark:text-indigo-300 bg-indigo-500/20 hover:bg-indigo-500/30 cursor-pointer"
                              title="Baixar arquivo"
                            >
                              <Download size={14} />
                            </a>
                          </div>
                        </div>
                      )}

                      {selectedExpense.receipt_attachment && (
                        <div className="p-3 rounded-xl bg-emerald-500/10 dark:bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-between gap-2.5">
                          <div className="flex items-center gap-2.5 truncate min-w-0">
                            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                              <Receipt size={16} />
                            </div>
                            <div className="truncate min-w-0">
                              <div className="text-xs font-bold text-zinc-900 dark:text-white truncate" title={selectedExpense.receipt_name || 'Comprovante'}>
                                {selectedExpense.receipt_name || 'Comprovante'}
                              </div>
                              <div className="text-[10px] text-zinc-500 dark:text-zinc-400">Recibo de Pagamento</div>
                            </div>
                          </div>
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() => setPreviewDoc({
                                url: selectedExpense.receipt_attachment!,
                                name: selectedExpense.receipt_name || 'Comprovante',
                                title: 'Comprovante de Pagamento'
                              })}
                              className="adw-btn text-xs font-semibold py-1.5 px-2.5 text-emerald-700 dark:text-emerald-300 bg-emerald-500/20 hover:bg-emerald-500/30 cursor-pointer"
                              title="Visualizar comprovante"
                            >
                              <Eye size={14} />
                              <span>Ver</span>
                            </button>
                            <a
                              href={selectedExpense.receipt_attachment}
                              download={selectedExpense.receipt_name || 'comprovante'}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="adw-btn text-xs font-semibold p-1.5 text-emerald-700 dark:text-emerald-300 bg-emerald-500/20 hover:bg-emerald-500/30 cursor-pointer"
                              title="Baixar arquivo"
                            >
                              <Download size={14} />
                            </a>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Quick Pay Action */}
              {((Number(selectedExpense.amount || 0) - Number(selectedExpense.paid_amount || 0)) > 0) && (
                <button
                  type="button"
                  onClick={() => handleQuickPayFull(selectedExpense)}
                  className="adw-btn suggested-action w-full py-2.5 px-4 text-xs font-bold cursor-pointer"
                >
                  <CheckCircle2 size={16} />
                  <span>Quitar Valor Restante ({formatCurrency(Math.max(0, Number(selectedExpense.amount || 0) - Number(selectedExpense.paid_amount || 0)))})</span>
                </button>
              )}
            </div>

            {/* Bottom Actions */}
            <div className="pt-4 border-t border-black/5 dark:border-white/5 flex items-center justify-between gap-3 flex-wrap">
              <div className="flex items-center gap-2">
                <button 
                  type="button"
                  onClick={() => setDeleteConfirmId(selectedExpense.id!)}
                  className="adw-btn destructive-action text-xs font-semibold cursor-pointer"
                >
                  <Trash2 size={15} />
                  <span>Excluir</span>
                </button>
                <button
                  type="button"
                  onClick={() => setReplicateConfirmExpense(selectedExpense)}
                  className="adw-btn text-xs font-semibold flex items-center gap-1.5 cursor-pointer text-zinc-700 dark:text-zinc-200 hover:bg-black/5 dark:hover:bg-white/10"
                >
                  <Repeat size={14} className="text-[#3584e4]" />
                  <span>Replicar (+6 meses)</span>
                </button>
              </div>

              <div className="flex items-center gap-2">
                <button 
                  type="button"
                  onClick={() => setSelectedExpense(null)}
                  className="adw-btn text-xs font-semibold cursor-pointer"
                >
                  Fechar
                </button>
                <button 
                  type="button"
                  onClick={() => handleOpenEditModal(selectedExpense)}
                  className="adw-btn suggested-action text-xs font-semibold cursor-pointer"
                >
                  <Edit3 size={15} />
                  <span>Editar</span>
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* ADD / EDIT MODAL (RESPONSIVE 2-COLUMN LAYOUT) */}
      {/* ========================================================================= */}
      {isFormModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div 
            className={`adw-dialog ${
              isPaymentSectionOpen ? 'max-w-4xl' : 'max-w-xl'
            } w-full p-6 shadow-2xl animate-scaleIn overflow-y-auto max-h-[92vh]`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-4 border-b border-zinc-100 dark:border-zinc-800/80 mb-5">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                  <Receipt size={18} strokeWidth={2.3} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-zinc-900 dark:text-white leading-tight">
                    {editingId ? 'Editar Despesa' : 'Nova Despesa'}
                  </h3>
                  {isPaymentSectionOpen && (
                    <span className="text-[11px] font-medium text-zinc-400 dark:text-zinc-500">
                      Preencha os dados da conta e o comprovante do pagamento
                    </span>
                  )}
                </div>
              </div>
              <button 
                onClick={() => setIsFormModalOpen(false)}
                className="p-1.5 rounded-full text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveExpense} className="space-y-4">
              
              <div className={`grid grid-cols-1 ${isPaymentSectionOpen ? 'md:grid-cols-2' : ''} gap-5`}>
                
                {/* ============================================================= */}
                {/* COLUNA ESQUERDA: DADOS DA DESPESA / CONTA */}
                {/* ============================================================= */}
                <div className="space-y-4">
                  {isPaymentSectionOpen && (
                    <div className="flex items-center gap-2 pb-2 border-b border-zinc-100 dark:border-zinc-800 text-xs font-bold text-zinc-900 dark:text-white">
                      <Receipt size={15} className="text-indigo-500" />
                      <span>1. Dados da Conta / Despesa</span>
                    </div>
                  )}

                  {/* Empresa with Autocomplete */}
                  <div className="relative z-30" ref={companyInputRef}>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                        Empresa / Beneficiário *
                      </label>
                      <button
                        type="button"
                        onClick={() => {
                          setManageModalInitialTab('companies');
                          setIsManageModalOpen(true);
                        }}
                        className="text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline flex items-center gap-1"
                      >
                        <span>Gerenciar</span>
                      </button>
                    </div>

                    <div className="relative">
                      <Building2 size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
                      <input 
                        type="text"
                        required
                        placeholder="Ex: Netflix, Copel, Aluguel, Nubank..."
                        value={company}
                        onFocus={() => setIsCompanySuggestionsOpen(true)}
                        onChange={(e) => {
                          setCompany(e.target.value);
                          setIsCompanySuggestionsOpen(true);
                        }}
                        className="w-full bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-xl pl-10 pr-4 py-2.5 text-sm text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-[#3584e4]/40 font-semibold"
                      />
                    </div>

                    {/* Company Suggestions Dropdown */}
                    {isCompanySuggestionsOpen && companySuggestions.length > 0 && (
                      <div className="absolute left-0 right-0 mt-1 adw-popover bg-white dark:bg-[#383838] border border-black/15 dark:border-white/15 rounded-xl p-1.5 shadow-2xl z-50 max-h-52 overflow-y-auto">
                        <div className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 px-3 py-1.5">
                          Empresas Cadastradas
                        </div>
                        {companySuggestions.map(comp => (
                          <button
                            key={comp.id ? `comp-${comp.id}` : `${comp.name}-${comp.default_type}`}
                            type="button"
                            onClick={() => handleSelectRegisteredCompany(comp)}
                            className="w-full text-left px-3 py-2 rounded-lg text-sm font-semibold flex items-center justify-between hover:bg-black/5 dark:hover:bg-white/10 transition-colors group cursor-pointer"
                          >
                            <div className="flex items-center gap-2.5">
                              <CategoryIcon type={comp.default_type} size={15} containerClassName="w-7 h-7 rounded-lg" />
                              <span className="font-semibold text-zinc-900 dark:text-white">{comp.name}</span>
                            </div>
                            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-black/5 dark:bg-white/10 text-zinc-600 dark:text-zinc-300 group-hover:bg-[#3584e4] group-hover:text-white transition-colors">
                              {comp.default_type}
                            </span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Grid: Tipo de Despesa & Data de Vencimento */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                    
                    {/* Category Dropdown */}
                    <div>
                      <div className="flex items-center justify-between mb-1.5">
                        <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                          Tipo de Despesa *
                        </label>
                        <button
                          type="button"
                          onClick={() => {
                            setManageModalInitialTab('types');
                            setIsManageModalOpen(true);
                          }}
                          className="text-xs font-bold text-[#3584e4] hover:underline cursor-pointer"
                        >
                          + Novo
                        </button>
                      </div>
                      <PortalDropdown
                        value={expenseType}
                        options={[...types].sort((a, b) => a.localeCompare(b, 'pt-BR')).map(cat => ({
                          value: cat,
                          label: cat,
                          icon: <CategoryIcon type={cat} size={15} />
                        }))}
                        onChange={setExpenseType}
                        buttonClassName="w-full bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-xl px-3.5 py-2.5 text-sm text-zinc-900 dark:text-zinc-100 outline-none flex items-center justify-between font-semibold cursor-pointer"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1.5">
                        Data de Vencimento *
                      </label>
                      <DatePicker 
                        value={dueDate} 
                        onChange={(d) => setDueDate(d)} 
                        required 
                      />
                    </div>
                  </div>

                  {/* Valor a Pagar */}
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1.5">
                      Valor a Pagar *
                    </label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 text-sm font-semibold">
                        R$
                      </span>
                      <input 
                        type="text"
                        required
                        placeholder="0,00"
                        value={amountToPayInput.replace('R$', '').trim()}
                        onChange={handleAmountToPayChange}
                        className="w-full bg-zinc-100/80 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 rounded-xl pl-10 pr-3.5 py-2.5 text-sm font-semibold text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                      />
                    </div>
                  </div>

                  {/* Observações */}
                  <div>
                    <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1.5">
                      Observações (Opcional)
                    </label>
                    <textarea
                      rows={2}
                      placeholder="Informações adicionais, código de barras, parcelamento..."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                      className="w-full bg-zinc-100/80 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3.5 py-2 text-sm text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 resize-none font-medium"
                    />
                  </div>

                  {/* Anexar Boleto / Fatura / Conta */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                        Boleto / Conta / Fatura (Opcional)
                      </label>
                      {billAttachment && (
                        <button
                          type="button"
                          onClick={() => setPreviewDoc({ url: billAttachment, name: billName || 'Boleto/Conta', title: 'Boleto / Documento da Conta' })}
                          className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
                        >
                          <Eye size={12} />
                          <span>Visualizar</span>
                        </button>
                      )}
                    </div>

                    {!billAttachment ? (
                      <label className={`flex items-center justify-center gap-2.5 p-3 rounded-2xl border border-dashed border-zinc-300 dark:border-zinc-700 hover:border-indigo-500/70 dark:hover:border-indigo-500/70 bg-zinc-50/70 hover:bg-indigo-50/30 dark:bg-zinc-800/30 dark:hover:bg-zinc-800/60 cursor-pointer transition-all ${isUploadingBill ? 'opacity-50 pointer-events-none' : ''}`}>
                        <input 
                          type="file" 
                          accept="image/*,application/pdf" 
                          onChange={handleBillFileUpload} 
                          className="hidden" 
                        />
                        <UploadCloud size={17} className="text-zinc-400 dark:text-zinc-500 group-hover:text-indigo-500" />
                        <span className="text-xs font-semibold text-zinc-600 dark:text-zinc-300">
                          {isUploadingBill ? 'Carregando documento...' : 'Anexar Boleto ou Fatura (PDF / Foto)'}
                        </span>
                      </label>
                    ) : (
                      <div className="flex items-center justify-between p-2.5 rounded-xl bg-indigo-500/10 dark:bg-indigo-500/15 border border-indigo-500/30">
                        <div className="flex items-center gap-2 truncate max-w-[220px]">
                          <FileText size={15} className="text-indigo-600 dark:text-indigo-400 shrink-0" />
                          <span className="text-xs font-bold text-zinc-900 dark:text-white truncate">
                            {billName || 'Boleto/Conta anexada'}
                          </span>
                        </div>
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => setPreviewDoc({ url: billAttachment, name: billName || 'Boleto/Conta', title: 'Boleto / Documento da Conta' })}
                            className="p-1 rounded-lg hover:bg-indigo-500/20 text-indigo-700 dark:text-indigo-300 cursor-pointer"
                            title="Visualizar"
                          >
                            <Eye size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              setBillAttachment(null);
                              setBillName('');
                            }}
                            className="p-1 rounded-lg hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 cursor-pointer"
                            title="Remover anexo"
                          >
                            <X size={14} />
                          </button>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Option to save company if new */}
                  {!editingId && company.trim() && !companies.some(c => c.name.toLowerCase() === company.trim().toLowerCase() && (c.default_type || 'Outros').toLowerCase() === expenseType.toLowerCase()) && (
                    <label className="flex items-center gap-2 text-xs font-medium text-zinc-600 dark:text-zinc-400 cursor-pointer select-none">
                      <input 
                        type="checkbox"
                        checked={saveCompanyToFavorites}
                        onChange={(e) => setSaveCompanyToFavorites(e.target.checked)}
                        className="rounded border-zinc-300 dark:border-zinc-700 text-emerald-600 focus:ring-0"
                      />
                      <span className="flex items-center gap-1">
                        <BookmarkPlus size={14} className="text-emerald-500" />
                        Salvar "{company.trim()}" em Fornecedores favoritos ({expenseType})
                      </span>
                    </label>
                  )}

                  {/* Opção: Despesa Recorrente (Replicar para 6 meses) */}
                  <div className="p-3 rounded-2xl bg-black/[0.03] dark:bg-white/[0.04] border border-black/10 dark:border-white/10 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 transition-colors ${
                        isRecurring ? 'bg-[#3584e4]/15 text-[#3584e4]' : 'bg-black/5 dark:bg-white/5 text-zinc-400'
                      }`}>
                        <Repeat size={16} strokeWidth={2.3} />
                      </div>
                      <div>
                        <label htmlFor="recurring-toggle" className="text-xs font-bold text-zinc-900 dark:text-white block cursor-pointer">
                          Despesa Recorrente (6 Meses)
                        </label>
                        <span className="text-[11px] text-zinc-500 dark:text-zinc-400 block">
                          {editingId 
                            ? 'Agendar automaticamente 6 faturas mensais futuras a partir desta data'
                            : 'Replicar mensalmente para os próximos 6 meses com o mesmo valor'
                          }
                        </span>
                      </div>
                    </div>
                    <label className="relative inline-flex items-center cursor-pointer shrink-0">
                      <input 
                        id="recurring-toggle"
                        type="checkbox"
                        checked={isRecurring}
                        onChange={(e) => setIsRecurring(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-zinc-300 dark:bg-zinc-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-zinc-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[#3584e4]"></div>
                    </label>
                  </div>

                  {/* If payment is NOT open, show the "+ Registrar Pagamento" banner */}
                  {!isPaymentSectionOpen && (
                    <div className="pt-2">
                      <button
                        type="button"
                        onClick={() => {
                          setIsPaymentSectionOpen(true);
                          if (!amountPaidInput && currentAmountToPay > 0) {
                            setAmountPaidInput(formatCurrency(currentAmountToPay));
                          }
                        }}
                        className="w-full py-3 px-4 rounded-2xl bg-zinc-100/80 hover:bg-zinc-200/80 dark:bg-zinc-800/60 dark:hover:bg-zinc-800 border border-dashed border-emerald-500/50 hover:border-emerald-500 text-zinc-700 dark:text-zinc-200 text-xs font-bold flex items-center justify-between transition-all cursor-pointer group shadow-xs"
                      >
                        <div className="flex items-center gap-2.5">
                          <div className="w-8 h-8 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center group-hover:scale-105 transition-transform">
                            <Wallet size={16} strokeWidth={2.3} />
                          </div>
                          <div className="text-left">
                            <div className="font-bold text-zinc-900 dark:text-white">Registrar Pagamento</div>
                            <div className="text-[11px] font-normal text-zinc-500 dark:text-zinc-400">Informar data, meio (PIX, Boleto, Cartão), valor e recibo</div>
                          </div>
                        </div>
                        <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400 flex items-center gap-1 bg-emerald-500/10 px-3 py-1.5 rounded-xl">
                          <Plus size={14} />
                          Adicionar Pagamento
                        </span>
                      </button>
                    </div>
                  )}
                </div>

                {/* ============================================================= */}
                {/* COLUNA DIREITA: DADOS DO PAGAMENTO (QUANDO ABERTO) */}
                {/* ============================================================= */}
                {isPaymentSectionOpen && (
                  <div className="p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200 dark:border-zinc-700/70 space-y-3.5 flex flex-col justify-between">
                    <div className="space-y-3.5">
                      <div className="flex items-center justify-between pb-2 border-b border-zinc-200/80 dark:border-zinc-700/80">
                        <div className="flex items-center gap-2 text-xs font-bold text-zinc-900 dark:text-white">
                          <Wallet size={15} className="text-emerald-500" />
                          <span>2. Dados do Pagamento</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => {
                            setIsPaymentSectionOpen(false);
                            setAmountPaidInput('');
                            setReceiptAttachment(null);
                            setReceiptName('');
                          }}
                          className="text-[11px] font-semibold text-rose-600 dark:text-rose-400 hover:underline flex items-center gap-1 cursor-pointer"
                        >
                          <X size={13} />
                          <span>Cancelar Pagamento</span>
                        </button>
                      </div>

                      {/* Grid: Valor Pago & Meio de Pagamento */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                        <div>
                          <div className="flex items-center justify-between mb-1.5">
                            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                              Valor Pago *
                            </label>
                            {currentAmountToPay > 0 && (
                              <button
                                type="button"
                                onClick={() => setAmountPaidInput(formatCurrency(currentAmountToPay))}
                                className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline"
                              >
                                Pagar Total
                              </button>
                            )}
                          </div>
                          <div className="relative">
                            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 text-sm font-semibold">
                              R$
                            </span>
                            <input 
                              type="text"
                              placeholder="0,00"
                              value={amountPaidInput.replace('R$', '').trim()}
                              onChange={handleAmountPaidChange}
                              className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl pl-10 pr-3.5 py-2.5 text-sm font-semibold text-emerald-600 dark:text-emerald-400 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                            />
                          </div>
                        </div>

                        {/* Meio de Pagamento */}
                        <div>
                          <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1.5">
                            Meio de Pagamento *
                          </label>
                          <div className="grid grid-cols-2 gap-1.5">
                            {(['PIX', 'Crédito', 'Débito', 'Boleto'] as const).map((method) => (
                              <button
                                key={method}
                                type="button"
                                onClick={() => setPaymentMethod(method)}
                                className={`py-2 px-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1.5 ${
                                  paymentMethod === method
                                    ? 'bg-emerald-600 text-white shadow-xs'
                                    : 'bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                                }`}
                              >
                                {paymentMethod === method && <Check size={12} strokeWidth={3} />}
                                <span>{method}</span>
                              </button>
                            ))}
                          </div>
                        </div>
                      </div>

                      {/* Data de Pagamento */}
                      <div>
                        <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1.5">
                          Data de Pagamento *
                        </label>
                        <DatePicker 
                          value={paidDate} 
                          onChange={(d) => setPaidDate(d)} 
                          required 
                        />
                        <div className="text-xs pt-1.5">
                          {paidDate && dueDate && paidDate > dueDate ? (
                            <span className="text-amber-600 dark:text-amber-400 font-semibold flex items-center gap-1.5">
                              <AlertTriangle size={14} className="shrink-0" />
                              Pago após a data de vencimento
                            </span>
                          ) : (
                            <span className="text-emerald-600 dark:text-emerald-400 font-semibold flex items-center gap-1.5">
                              <CheckCircle2 size={14} className="shrink-0" />
                              Pago em dia
                            </span>
                          )}
                        </div>
                      </div>

                      {/* Anexo de Comprovante / Recibo */}
                      <div>
                        <div className="flex items-center justify-between mb-1.5">
                          <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                            Comprovante / Recibo (Opcional)
                          </label>
                          {receiptAttachment && (
                            <button
                              type="button"
                              onClick={() => setPreviewDoc({ url: receiptAttachment, name: receiptName || 'Comprovante', title: 'Comprovante de Pagamento' })}
                              className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
                            >
                              <Eye size={12} />
                              <span>Visualizar</span>
                            </button>
                          )}
                        </div>

                        {!receiptAttachment ? (
                          <label className={`flex items-center justify-center gap-2.5 p-3 rounded-2xl border border-dashed border-zinc-300 dark:border-zinc-700 hover:border-emerald-500/70 dark:hover:border-emerald-500/70 bg-white/70 hover:bg-emerald-50/30 dark:bg-zinc-900/60 dark:hover:bg-zinc-900/90 cursor-pointer transition-all ${isUploadingReceipt ? 'opacity-50 pointer-events-none' : ''}`}>
                            <input 
                              type="file" 
                              accept="image/*,application/pdf" 
                              onChange={handleReceiptFileUpload} 
                              className="hidden" 
                            />
                            <UploadCloud size={17} className="text-zinc-400 dark:text-zinc-500 group-hover:text-emerald-500" />
                            <span className="text-xs font-semibold text-zinc-600 dark:text-zinc-300">
                              {isUploadingReceipt ? 'Carregando comprovante...' : 'Anexar Comprovante (PDF / Foto)'}
                            </span>
                          </label>
                        ) : (
                          <div className="flex items-center justify-between p-2.5 rounded-xl bg-emerald-500/10 dark:bg-emerald-500/15 border border-emerald-500/30">
                            <div className="flex items-center gap-2 truncate max-w-[220px]">
                              <Receipt size={15} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
                              <span className="text-xs font-bold text-zinc-900 dark:text-white truncate">
                                {receiptName || 'Comprovante anexado'}
                              </span>
                            </div>
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => setPreviewDoc({ url: receiptAttachment, name: receiptName || 'Comprovante', title: 'Comprovante de Pagamento' })}
                                className="p-1 rounded-lg hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-300 cursor-pointer"
                                title="Visualizar"
                              >
                                <Eye size={14} />
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setReceiptAttachment(null);
                                  setReceiptName('');
                                }}
                                className="p-1 rounded-lg hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 cursor-pointer"
                                title="Remover anexo"
                              >
                                <X size={14} />
                              </button>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Classificação da Diferença Paga a Mais */}
                      {currentAmountPaid > currentAmountToPay && (
                        <div className="p-3.5 rounded-2xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-700/80 space-y-2.5 animate-in fade-in duration-150">
                          <div className="flex items-start gap-2">
                            <div className="w-6 h-6 rounded-lg bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0 mt-0.5">
                              <AlertTriangle size={13} strokeWidth={2.5} />
                            </div>
                            <div>
                              <h4 className="text-xs font-bold text-zinc-900 dark:text-white leading-tight">
                                Diferença paga a mais: <span className="text-emerald-600 dark:text-emerald-400 font-extrabold">+{formatCurrency(currentAmountPaid - currentAmountToPay)}</span>
                              </h4>
                              <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mt-0.5">
                                Como categorizar essa quantia excedente?
                              </p>
                            </div>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-0.5">
                            {/* Opção: Multa e Juros */}
                            <button
                              type="button"
                              onClick={() => setExcessType('late_fee')}
                              className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-1 ${
                                excessType === 'late_fee'
                                  ? 'bg-rose-500/10 dark:bg-rose-500/15 border-rose-500 text-rose-900 dark:text-rose-100 ring-1 ring-rose-500'
                                  : 'bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:border-zinc-300 dark:hover:border-zinc-600'
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-1.5 text-xs font-bold text-rose-600 dark:text-rose-400">
                                  <Flame size={13} />
                                  <span>Multa e Juros</span>
                                </div>
                                <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                                  excessType === 'late_fee' ? 'border-rose-500 bg-rose-500 text-white' : 'border-zinc-400'
                                }`}>
                                  {excessType === 'late_fee' && <Check size={8} strokeWidth={3} />}
                                </div>
                              </div>
                              <p className="text-[10px] text-zinc-500 dark:text-zinc-400 leading-snug">
                                Soma como despesa de Multa e Juros nos relatórios.
                              </p>
                            </button>

                            {/* Opção: Pagamento a Maior */}
                            <button
                              type="button"
                              onClick={() => setExcessType('overpayment')}
                              className={`p-2.5 rounded-xl border text-left transition-all cursor-pointer flex flex-col justify-between gap-1 ${
                                excessType === 'overpayment'
                                  ? 'bg-blue-500/10 dark:bg-blue-500/15 border-blue-500 text-blue-900 dark:text-blue-100 ring-1 ring-blue-500'
                                  : 'bg-zinc-50 dark:bg-zinc-800 border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 hover:border-zinc-300 dark:hover:border-zinc-600'
                              }`}
                            >
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-1.5 text-xs font-bold text-blue-600 dark:text-blue-400">
                                  <Wallet size={13} />
                                  <span>Pagamento a Maior</span>
                                </div>
                                <div className={`w-3.5 h-3.5 rounded-full border flex items-center justify-center ${
                                  excessType === 'overpayment' ? 'border-blue-500 bg-blue-500 text-white' : 'border-zinc-400'
                                }`}>
                                  {excessType === 'overpayment' && <Check size={8} strokeWidth={3} />}
                                </div>
                              </div>
                              <p className="text-[10px] text-zinc-500 dark:text-zinc-400 leading-snug">
                                Registra sem incidência de juros por atraso.
                              </p>
                            </button>
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Saldo Restante e Status */}
                    <div className="p-3 rounded-xl bg-white dark:bg-zinc-900 border border-zinc-200/80 dark:border-zinc-700/80 flex items-center justify-between mt-2">
                      <div>
                        <span className="text-[10px] font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 block">
                          Saldo Restante
                        </span>
                        <span className={`text-sm font-bold tabular-nums ${
                          currentFormBalance === 0 && currentAmountToPay > 0 
                            ? 'text-emerald-600 dark:text-emerald-400' 
                            : 'text-zinc-900 dark:text-white'
                        }`}>
                          {formatCurrency(currentFormBalance)}
                        </span>
                      </div>
                      <div>
                        {currentFormBalance === 0 && currentAmountToPay > 0 ? (
                          <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 flex items-center gap-1">
                            <Check size={12} strokeWidth={3} />
                            Quitada ({paymentMethod})
                          </span>
                        ) : currentAmountPaid > 0 && currentFormBalance > 0 ? (
                          <span className="px-2.5 py-1 rounded-full text-[11px] font-bold bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400">
                            Parcial ({paymentMethod})
                          </span>
                        ) : null}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Actions Footer */}
              <div className="flex gap-3 pt-3 border-t border-black/5 dark:border-white/5">
                <button 
                  type="button"
                  onClick={() => setIsFormModalOpen(false)}
                  className="adw-btn flex-1 py-2.5 text-xs font-semibold cursor-pointer"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  className="adw-btn suggested-action flex-1 py-2.5 text-xs font-semibold cursor-pointer"
                >
                  {editingId ? 'Salvar Alterações' : 'Cadastrar Despesa'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* DOCUMENT PREVIEW MODAL */}
      {/* ========================================================================= */}
      {previewDoc && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fadeIn">
          <div 
            className="adw-dialog max-w-2xl w-full p-6 shadow-2xl animate-scaleIn flex flex-col max-h-[90vh]"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-4 border-b border-black/5 dark:border-white/5">
              <div className="flex items-center gap-2.5 truncate">
                <div className="w-8 h-8 rounded-xl bg-[#3584e4]/10 text-[#3584e4] flex items-center justify-center shrink-0">
                  <FileText size={18} />
                </div>
                <div className="truncate">
                  <h3 className="text-sm font-bold text-zinc-900 dark:text-white truncate">
                    {previewDoc.title}
                  </h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 truncate">
                    {previewDoc.name}
                  </p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <a
                  href={previewDoc.url}
                  download={previewDoc.name}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="adw-btn text-xs font-semibold px-3 py-1.5 inline-flex items-center gap-1.5 cursor-pointer"
                >
                  <Download size={14} />
                  <span>Baixar</span>
                </a>
                <button 
                  onClick={() => setPreviewDoc(null)}
                  className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer"
                >
                  <X size={18} />
                </button>
              </div>
            </div>

            <div className="py-4 flex-1 overflow-auto flex items-center justify-center min-h-[300px]">
              {previewDoc.url.startsWith('data:image/') || previewDoc.url.match(/\.(jpeg|jpg|gif|png|webp)($|\?)/i) ? (
                <img 
                  src={previewDoc.url} 
                  alt={previewDoc.name} 
                  className="max-h-[60vh] max-w-full rounded-2xl object-contain shadow-md"
                />
              ) : previewDoc.url.startsWith('data:application/pdf') || previewDoc.url.match(/\.pdf($|\?)/i) ? (
                <iframe 
                  src={previewDoc.url} 
                  title={previewDoc.name}
                  className="w-full h-[60vh] rounded-2xl border border-zinc-200 dark:border-zinc-800"
                />
              ) : (
                <div className="text-center p-8">
                  <FileText size={48} className="mx-auto text-zinc-400 mb-3" />
                  <p className="text-sm font-semibold text-zinc-700 dark:text-zinc-300 mb-2">
                    Pré-visualização do documento
                  </p>
                  <a
                    href={previewDoc.url}
                    download={previewDoc.name}
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs cursor-pointer"
                  >
                    <Download size={14} />
                    <span>Baixar Arquivo</span>
                  </a>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* REPLICATE 6 MONTHS CONFIRMATION DIALOG */}
      {/* ========================================================================= */}
      {replicateConfirmExpense && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div 
            className="adw-dialog max-w-md w-full p-6 shadow-2xl animate-scaleIn text-left"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start gap-3.5">
              <div className="w-11 h-11 rounded-2xl bg-[#3584e4]/15 text-[#3584e4] flex items-center justify-center shrink-0">
                <Repeat size={22} strokeWidth={2.3} />
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="text-base font-bold text-zinc-900 dark:text-white">
                  Repetir Conta por 6 Meses?
                </h4>
                <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 leading-relaxed">
                  Serão agendadas automaticamente 6 faturas mensais para esta despesa:
                </p>
                
                <div className="my-3.5 p-3.5 rounded-xl bg-black/[0.03] dark:bg-white/[0.04] border border-black/10 dark:border-white/10 space-y-2 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="text-zinc-500 dark:text-zinc-400 font-medium">Empresa / Conta:</span>
                    <strong className="text-zinc-900 dark:text-white truncate max-w-[180px]">
                      {replicateConfirmExpense.company || replicateConfirmExpense.description}
                    </strong>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-zinc-500 dark:text-zinc-400 font-medium">Valor de cada fatura:</span>
                    <strong className="text-emerald-600 dark:text-emerald-400 font-bold text-sm">
                      {formatCurrency(Number(replicateConfirmExpense.amount || 0))}
                    </strong>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-zinc-500 dark:text-zinc-400 font-medium">Categoria:</span>
                    <span className="font-semibold text-zinc-700 dark:text-zinc-300">
                      {replicateConfirmExpense.type}
                    </span>
                  </div>
                </div>

                {/* Preview of generated months */}
                {(() => {
                  const previewDates = calculateNextDueDates(replicateConfirmExpense.due_date, 6);
                  return (
                    <div className="mb-4 p-2.5 rounded-xl bg-black/[0.02] dark:bg-white/[0.03] border border-black/5 dark:border-white/5">
                      <span className="text-[10px] uppercase font-bold text-zinc-400 block mb-1.5">
                        Datas das faturas que serão agendadas:
                      </span>
                      <div className="grid grid-cols-3 gap-1.5 text-center">
                        {previewDates.map((pDate, idx) => (
                          <span key={idx} className="text-[11px] font-semibold py-1 px-1.5 rounded-lg bg-white dark:bg-zinc-800 text-zinc-700 dark:text-zinc-200 border border-black/5 dark:border-white/5 shadow-2xs">
                            {formatDateBR(pDate)}
                          </span>
                        ))}
                      </div>
                    </div>
                  );
                })()}

                <p className="text-[11px] text-zinc-500 dark:text-zinc-400 mb-5 leading-relaxed">
                  As faturas serão salvas como pendentes para acompanhamento mensal no painel e relatórios.
                </p>

                <div className="flex gap-2.5 justify-end">
                  <button 
                    type="button"
                    onClick={() => setReplicateConfirmExpense(null)}
                    disabled={isReplicating}
                    className="adw-btn py-2 px-4 text-xs font-semibold cursor-pointer"
                  >
                    Cancelar
                  </button>
                  <button 
                    type="button"
                    onClick={() => executeReplicate6Months(replicateConfirmExpense)}
                    disabled={isReplicating}
                    className="adw-btn suggested-action py-2 px-4 text-xs font-semibold cursor-pointer flex items-center gap-1.5"
                  >
                    {isReplicating ? (
                      <>
                        <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                        <span>Agendando...</span>
                      </>
                    ) : (
                      <>
                        <Check size={14} strokeWidth={2.5} />
                        <span>Confirmar e Agendar</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* DELETE CONFIRMATION DIALOG */}
      {/* ========================================================================= */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div className="adw-dialog max-w-sm w-full p-6 shadow-2xl text-center animate-scaleIn">
            <div className="w-12 h-12 rounded-2xl bg-[#e01b24]/10 text-[#e01b24] flex items-center justify-center mx-auto mb-4">
              <AlertCircle size={26} />
            </div>
            <h4 className="text-base font-bold text-zinc-900 dark:text-white">Excluir Despesa?</h4>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1.5 mb-6">
              Esta ação removerá o registro permanentemente.
            </p>
            <div className="flex gap-3">
              <button 
                onClick={() => setDeleteConfirmId(null)}
                className="adw-btn flex-1 py-2 text-xs font-semibold cursor-pointer"
              >
                Cancelar
              </button>
              <button 
                onClick={() => handleDeleteExpense(deleteConfirmId)}
                className="adw-btn destructive-action flex-1 py-2 text-xs font-semibold cursor-pointer"
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* MANAGE CATEGORIES & COMPANIES MODAL */}
      {/* ========================================================================= */}
      {isManageModalOpen && (
        <ManageCategoriesModal 
          initialTab={manageModalInitialTab}
          onClose={() => setIsManageModalOpen(false)}
          onUpdated={loadAllData}
        />
      )}

      {/* ========================================================================= */}
      {/* NEGOTIATE EXPENSES MODAL */}
      {/* ========================================================================= */}
      {isNegotiateModalOpen && (
        <NegotiateExpensesModal
          expenses={expenses}
          types={types}
          onClose={() => setIsNegotiateModalOpen(false)}
          onSuccess={async () => {
            setIsNegotiateModalOpen(false);
            await loadAllData();
          }}
        />
      )}

    </div>
  );
};



