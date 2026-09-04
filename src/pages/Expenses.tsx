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
  ChevronDown, 
  BookmarkPlus,
  Wallet,
  Receipt,
  PiggyBank
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
  supabase, 
  type ExpenseRecord, 
  type CompanyRecord,
  type IncomeRecord
} from '../services/supabase';
import { ManageCategoriesModal } from '../components/ManageCategoriesModal';
import { CategoryIcon } from '../components/CategoryIcon';

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
  const [isFormCategoryDropdownOpen, setIsFormCategoryDropdownOpen] = useState(false);
  const [isCompanySuggestionsOpen, setIsCompanySuggestionsOpen] = useState(false);

  const monthDropdownRef = useRef<HTMLDivElement>(null);
  const categoryDropdownRef = useRef<HTMLDivElement>(null);
  const formCategoryDropdownRef = useRef<HTMLDivElement>(null);
  const companyInputRef = useRef<HTMLDivElement>(null);

  // Modal States
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [isManageModalOpen, setIsManageModalOpen] = useState(false);
  const [manageModalInitialTab, setManageModalInitialTab] = useState<'companies' | 'types'>('companies');
  const [selectedExpense, setSelectedExpense] = useState<ExpenseRecord | null>(null);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);

  // Form Field States
  const [editingId, setEditingId] = useState<number | null>(null);
  const [dueDate, setDueDate] = useState(new Date().toISOString().split('T')[0]);
  const [expenseType, setExpenseType] = useState('Moradia');
  const [company, setCompany] = useState('');
  const [amountToPayInput, setAmountToPayInput] = useState('');
  const [amountPaidInput, setAmountPaidInput] = useState('');
  const [saveCompanyToFavorites, setSaveCompanyToFavorites] = useState(true);

  // Close dropdowns on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (monthDropdownRef.current && !monthDropdownRef.current.contains(event.target as Node)) {
        setIsMonthDropdownOpen(false);
      }
      if (categoryDropdownRef.current && !categoryDropdownRef.current.contains(event.target as Node)) {
        setIsCategoryDropdownOpen(false);
      }
      if (formCategoryDropdownRef.current && !formCategoryDropdownRef.current.contains(event.target as Node)) {
        setIsFormCategoryDropdownOpen(false);
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
    const curMonth = new Date().toISOString().substring(0, 7);
    monthSet.add(curMonth);

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

  // Form Reset
  const resetForm = () => {
    setEditingId(null);
    setDueDate(new Date().toISOString().split('T')[0]);
    setExpenseType(types[0] || 'Moradia');
    setCompany('');
    setAmountToPayInput('');
    setAmountPaidInput('');
    setIsFormCategoryDropdownOpen(false);
    setIsCompanySuggestionsOpen(false);
    setSaveCompanyToFavorites(true);
  };

  const handleOpenNewModal = () => {
    resetForm();
    setIsFormModalOpen(true);
  };

  const handleOpenEditModal = (expense: ExpenseRecord) => {
    setEditingId(expense.id || null);
    setDueDate(expense.due_date || new Date().toISOString().split('T')[0]);
    setExpenseType(expense.type || (types[0] || 'Moradia'));
    setCompany(expense.company || expense.description || '');
    setAmountToPayInput(formatCurrency(expense.amount || 0));
    setAmountPaidInput(formatCurrency(expense.paid_amount || 0));
    setIsFormCategoryDropdownOpen(false);
    setIsCompanySuggestionsOpen(false);
    setSaveCompanyToFavorites(false);
    
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
      const exists = companies.some(c => c.name.toLowerCase() === cleanCompany.toLowerCase());
      if (!exists) {
        await addCompany({
          name: cleanCompany,
          default_type: expenseType
        });
      }
    }

    const payload: ExpenseRecord = {
      company: cleanCompany,
      description: cleanCompany,
      type: expenseType,
      due_date: dueDate,
      amount: currentAmountToPay,
      paid_amount: currentAmountPaid,
      status: currentAmountPaid >= currentAmountToPay ? 'paid' : 'pending'
    };

    if (editingId) {
      await updateExpense(editingId, payload);
    } else {
      await addExpense(payload);
    }

    setIsFormModalOpen(false);
    resetForm();
    await loadAllData();
  };

  const handleDeleteExpense = async (id: number) => {
    await deleteExpense(id);
    setDeleteConfirmId(null);
    setSelectedExpense(null);
    await loadExpensesOnly();
  };

  const handleQuickPayFull = async (expense: ExpenseRecord) => {
    if (!expense.id) return;
    await updateExpense(expense.id, {
      paid_amount: expense.amount,
      status: 'paid'
    });
    setSelectedExpense({
      ...expense,
      paid_amount: expense.amount,
      status: 'paid'
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
      return { label: `Vencida (${Math.abs(diffDays)}d)`, color: 'text-rose-700 dark:text-rose-400 bg-rose-100/80 dark:bg-rose-500/20' };
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
      const matchMonth = selectedMonth === 'all' || extractMonth(exp.due_date) === selectedMonth;
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
    });
  }, [expenses, selectedMonth, searchTerm, selectedCategory, statusFilter]);

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
    // Month expenses (before search/category filters to reflect total financial health for that period)
    const monthExpenses = selectedMonth === 'all'
      ? expenses
      : expenses.filter(e => extractMonth(e.due_date) === selectedMonth);

    // Month incomes
    const monthIncomes = selectedMonth === 'all'
      ? incomes
      : incomes.filter(i => extractMonth(i.date) === selectedMonth);

    const totalExpenses = monthExpenses.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
    const totalPaid = monthExpenses.reduce((acc, curr) => acc + (Number(curr.paid_amount) || 0), 0);
    const totalBalance = Math.max(0, totalExpenses - totalPaid);
    const pendingCount = monthExpenses.filter(e => (Number(e.amount || 0) - Number(e.paid_amount || 0)) > 0).length;

    const totalIncome = monthIncomes.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
    const remainingAfterAllExpenses = totalIncome - totalExpenses; // Sobra após quitar todas as contas
    const currentAvailable = totalIncome - totalPaid; // Saldo atual após o que já foi pago

    return {
      totalExpenses,
      totalPaid,
      totalBalance,
      pendingCount,
      totalIncome,
      remainingAfterAllExpenses,
      currentAvailable,
      count: monthExpenses.length
    };
  }, [expenses, incomes, selectedMonth]);

  const companySuggestions = useMemo(() => {
    if (!company.trim()) return companies;
    return companies.filter(c => c.name.toLowerCase().includes(company.toLowerCase()));
  }, [companies, company]);

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6 animate-fadeIn pb-24 md:pb-8">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-zinc-900 dark:text-white flex items-center gap-2.5">
            <span className="w-9 h-9 rounded-2xl bg-indigo-500/10 dark:bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <Receipt size={20} strokeWidth={2.3} />
            </span>
            Despesas
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            Controle de contas a pagar, fornecedores e vencimentos
          </p>
        </div>

        <button
          onClick={handleOpenNewModal}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm shadow-md shadow-emerald-600/20 active:scale-95 transition-all cursor-pointer"
        >
          <Plus size={18} strokeWidth={2.5} />
          <span>Nova Despesa</span>
        </button>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3.5 sm:gap-4">
        
        {/* Card 1: Total Despesas */}
        <div className="bg-white dark:bg-zinc-900/60 backdrop-blur-md rounded-2xl p-4 sm:p-5 border border-zinc-200/70 dark:border-white/10 shadow-xs relative overflow-hidden min-w-0">
          <div className="flex items-center justify-between mb-2 sm:mb-3 min-w-0">
            <span className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 truncate">
              Total Despesas
            </span>
            <div className="w-8 h-8 rounded-xl bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
              <Receipt size={17} strokeWidth={2.5} />
            </div>
          </div>
          <div className="text-xl sm:text-2xl xl:text-3xl font-bold text-zinc-900 dark:text-white tracking-tight truncate min-w-0" title={formatCurrency(stats.totalExpenses)}>
            {formatCurrency(stats.totalExpenses)}
          </div>
          <div className="text-xs text-zinc-400 dark:text-zinc-500 mt-1 truncate">
            {stats.count} {stats.count === 1 ? 'conta cadastrada' : 'contas cadastradas'}
          </div>
        </div>

        {/* Card 2: Receita do Mês */}
        <div className="bg-white dark:bg-zinc-900/60 backdrop-blur-md rounded-2xl p-4 sm:p-5 border border-zinc-200/70 dark:border-white/10 shadow-xs relative overflow-hidden min-w-0">
          <div className="flex items-center justify-between mb-2 sm:mb-3 min-w-0">
            <span className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 truncate">
              Receita do Mês
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <Wallet size={17} strokeWidth={2.5} />
            </div>
          </div>
          <div className="text-xl sm:text-2xl xl:text-3xl font-bold text-emerald-600 dark:text-emerald-400 tracking-tight truncate min-w-0" title={formatCurrency(stats.totalIncome)}>
            {formatCurrency(stats.totalIncome)}
          </div>
          <div className="text-xs text-zinc-400 dark:text-zinc-500 mt-1 truncate">
            {selectedMonth === 'all' ? 'Total acumulado' : formatMonthLabel(selectedMonth)}
          </div>
        </div>

        {/* Card 3: Sobra Estimada (Receitas - Despesas) */}
        <div className="bg-white dark:bg-zinc-900/60 backdrop-blur-md rounded-2xl p-4 sm:p-5 border border-zinc-200/70 dark:border-white/10 shadow-xs relative overflow-hidden min-w-0">
          <div className="flex items-center justify-between mb-2 sm:mb-3 min-w-0">
            <span className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 truncate">
              Sobra Prevista
            </span>
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
              stats.remainingAfterAllExpenses >= 0
                ? 'bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
                : 'bg-rose-500/10 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400'
            }`}>
              <PiggyBank size={17} strokeWidth={2.5} />
            </div>
          </div>
          <div className={`text-xl sm:text-2xl xl:text-3xl font-bold tracking-tight truncate min-w-0 ${
            stats.remainingAfterAllExpenses >= 0 
              ? 'text-emerald-600 dark:text-emerald-400' 
              : 'text-rose-600 dark:text-rose-400'
          }`} title={formatCurrency(stats.remainingAfterAllExpenses)}>
            {stats.remainingAfterAllExpenses >= 0 ? '+' : ''}{formatCurrency(stats.remainingAfterAllExpenses)}
          </div>
          <div className="text-xs text-zinc-400 dark:text-zinc-500 mt-1 truncate">
            {stats.remainingAfterAllExpenses >= 0 ? 'Após quitar todas as despesas' : 'Déficit previsto após quitar tudo'}
          </div>
        </div>

        {/* Card 4: Saldo Devedor / Pendente */}
        <div className="bg-white dark:bg-zinc-900/60 backdrop-blur-md rounded-2xl p-4 sm:p-5 border border-zinc-200/70 dark:border-white/10 shadow-xs relative overflow-hidden min-w-0">
          <div className="flex items-center justify-between mb-2 sm:mb-3 min-w-0">
            <span className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 truncate">
              Saldo a Pagar
            </span>
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
              stats.totalBalance > 0
                ? 'bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400'
                : 'bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400'
            }`}>
              {stats.totalBalance > 0 ? <Clock size={17} strokeWidth={2.5} /> : <CheckCircle2 size={17} strokeWidth={2.5} />}
            </div>
          </div>
          <div className={`text-xl sm:text-2xl xl:text-3xl font-bold tracking-tight truncate min-w-0 ${
            stats.totalBalance > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400'
          }`} title={formatCurrency(stats.totalBalance)}>
            {formatCurrency(stats.totalBalance)}
          </div>
          <div className="text-xs text-zinc-400 dark:text-zinc-500 mt-1 truncate">
            {stats.totalBalance === 0 
              ? 'Todas as contas quitadas' 
              : `${formatCurrency(stats.totalPaid)} já pago (${stats.totalExpenses > 0 ? ((stats.totalPaid / stats.totalExpenses) * 100).toFixed(0) : 0}%)`}
          </div>
        </div>

      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-zinc-900/60 backdrop-blur-md rounded-2xl p-4 border border-zinc-200/70 dark:border-white/10 shadow-xs flex flex-col md:flex-row gap-3 items-center justify-between relative z-20">
        
        {/* Search */}
        <div className="relative w-full md:w-72">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Buscar por empresa ou tipo..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-zinc-100/80 dark:bg-zinc-800/60 border border-zinc-200/80 dark:border-zinc-700/60 rounded-xl pl-9 pr-8 py-2 text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/30 transition-all"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 p-0.5"
            >
              <X size={14} />
            </button>
          )}
        </div>

        {/* Dropdowns & Pills */}
        <div className="flex flex-wrap items-center gap-2 w-full md:w-auto justify-start md:justify-end">
          
          {/* Month Selector Popover */}
          <div className="relative" ref={monthDropdownRef}>
            <button
              type="button"
              onClick={() => setIsMonthDropdownOpen(!isMonthDropdownOpen)}
              className="flex items-center justify-between gap-2 px-3.5 py-2 bg-zinc-100/80 dark:bg-zinc-800/60 border border-zinc-200/80 dark:border-zinc-700/60 rounded-xl text-xs font-semibold text-zinc-800 dark:text-zinc-200 hover:bg-zinc-200/70 dark:hover:bg-zinc-700/60 transition-all cursor-pointer"
            >
              <div className="flex items-center gap-1.5">
                <Calendar size={13} className="text-zinc-400" />
                <span>{formatMonthLabel(selectedMonth)}</span>
              </div>
              <ChevronDown size={14} className={`text-zinc-400 transition-transform duration-200 ${isMonthDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {isMonthDropdownOpen && (
              <div className="absolute left-0 sm:right-0 sm:left-auto mt-1.5 w-60 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700/80 rounded-2xl shadow-xl z-50 py-1.5 overflow-hidden animate-in fade-in zoom-in-95 duration-100 max-h-64 overflow-y-auto">
                <button
                  onClick={() => {
                    setSelectedMonth('all');
                    setIsMonthDropdownOpen(false);
                  }}
                  className={`w-full flex items-center justify-between px-3.5 py-2 text-xs text-left hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors ${
                    selectedMonth === 'all' 
                      ? 'font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 dark:bg-emerald-500/15' 
                      : 'text-zinc-700 dark:text-zinc-300'
                  }`}
                >
                  <span>Todos os Meses</span>
                  {selectedMonth === 'all' && <Check size={14} className="text-emerald-600 dark:text-emerald-400" />}
                </button>
                
                <div className="h-px bg-zinc-200 dark:bg-zinc-800 my-1" />

                {availableMonths.map((m) => (
                  <button
                    key={m}
                    onClick={() => {
                      setSelectedMonth(m);
                      setIsMonthDropdownOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-3.5 py-2 text-xs text-left hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors ${
                      selectedMonth === m 
                        ? 'font-bold text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 dark:bg-emerald-500/15' 
                        : 'text-zinc-700 dark:text-zinc-300'
                    }`}
                  >
                    <span>{formatMonthLabel(m)}</span>
                    {selectedMonth === m && <Check size={14} className="text-emerald-600 dark:text-emerald-400" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Category Dropdown */}
          <div className="relative" ref={categoryDropdownRef}>
            <button
              type="button"
              onClick={() => setIsCategoryDropdownOpen(!isCategoryDropdownOpen)}
              className="bg-zinc-100/80 hover:bg-zinc-200/80 dark:bg-zinc-800/80 dark:hover:bg-zinc-700/80 text-zinc-800 dark:text-zinc-200 border border-zinc-200/80 dark:border-zinc-700/60 text-xs font-semibold rounded-xl px-3.5 py-2 outline-none flex items-center gap-1.5 transition-all shadow-xs cursor-pointer"
            >
              <Tag size={13} className="text-zinc-400" />
              <span>{selectedCategory === 'Todas' ? 'Todas Categorias' : selectedCategory}</span>
              <ChevronDown size={14} className={`text-zinc-400 transition-transform duration-200 ${isCategoryDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {isCategoryDropdownOpen && (
              <div className="absolute left-0 sm:right-0 sm:left-auto mt-1.5 w-56 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700/80 rounded-2xl p-1.5 shadow-xl z-50 animate-in fade-in zoom-in-95 duration-100 max-h-64 overflow-y-auto">
                <button
                  type="button"
                  onClick={() => {
                    setSelectedCategory('Todas');
                    setIsCategoryDropdownOpen(false);
                  }}
                  className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-between transition-colors ${
                    selectedCategory === 'Todas' 
                      ? 'bg-emerald-500/10 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-bold' 
                      : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                  }`}
                >
                  <span>Todas Categorias</span>
                  {selectedCategory === 'Todas' && <Check size={14} className="text-emerald-600 dark:text-emerald-400" />}
                </button>
                <div className="my-1 border-t border-zinc-100 dark:border-zinc-800" />
                {types.map(cat => (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => {
                      setSelectedCategory(cat);
                      setIsCategoryDropdownOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-between transition-colors ${
                      selectedCategory === cat 
                        ? 'bg-emerald-500/10 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-bold' 
                        : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                    }`}
                  >
                    <span>{cat}</span>
                    {selectedCategory === cat && <Check size={14} className="text-emerald-600 dark:text-emerald-400" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Status Filter Pill */}
          <div className="flex bg-zinc-100/80 dark:bg-zinc-800/60 p-1 rounded-xl border border-zinc-200/80 dark:border-zinc-700/60 text-xs font-semibold">
            <button
              onClick={() => setStatusFilter('all')}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                statusFilter === 'all' 
                  ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-xs' 
                  : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
              }`}
            >
              Todas
            </button>
            <button
              onClick={() => setStatusFilter('pending')}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                statusFilter === 'pending' 
                  ? 'bg-white dark:bg-zinc-700 text-amber-600 dark:text-amber-400 shadow-xs' 
                  : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
              }`}
            >
              Pendentes
            </button>
            <button
              onClick={() => setStatusFilter('partial')}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                statusFilter === 'partial' 
                  ? 'bg-white dark:bg-zinc-700 text-blue-600 dark:text-blue-400 shadow-xs' 
                  : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
              }`}
            >
              Parciais
            </button>
            <button
              onClick={() => setStatusFilter('paid')}
              className={`px-2.5 py-1 rounded-lg transition-all cursor-pointer ${
                statusFilter === 'paid' 
                  ? 'bg-white dark:bg-zinc-700 text-emerald-600 dark:text-emerald-400 shadow-xs' 
                  : 'text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200'
              }`}
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
          groupedExpenses.map((group) => {
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
                        <span>Sobra: {groupRemaining >= 0 ? '+' : ''}{formatCurrency(groupRemaining)}</span>
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

                          return (
                            <tr
                              key={exp.id}
                              onClick={() => setSelectedExpense(exp)}
                              className="hover:bg-zinc-100/80 dark:hover:bg-zinc-800/40 cursor-pointer transition-colors group select-none"
                            >
                              {/* Vencimento */}
                              <td className="py-3.5 px-4 whitespace-nowrap">
                                <div className="flex items-center gap-2">
                                  <span className="font-semibold text-zinc-900 dark:text-zinc-100 text-xs md:text-sm">
                                    {formatDateBR(exp.due_date)}
                                  </span>
                                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${dueInfo.color}`}>
                                    {dueInfo.label}
                                  </span>
                                </div>
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
          })
        )}
      </div>

      {/* ========================================================================= */}
      {/* EXPENSE DETAIL MODAL */}
      {/* ========================================================================= */}
      {selectedExpense && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div 
            className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl animate-in zoom-in-95 duration-150 overflow-hidden flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-start justify-between pb-4 border-b border-zinc-100 dark:border-zinc-800/80">
              <div className="flex items-center gap-3">
                <CategoryIcon type={selectedExpense.type} size={24} containerClassName="w-12 h-12 rounded-2xl shadow-xs" />
                <div>
                  <h3 className="text-lg md:text-xl font-bold text-zinc-900 dark:text-white leading-tight">
                    {selectedExpense.company || selectedExpense.description}
                  </h3>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-xs font-semibold px-2.5 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300">
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
                className="p-1.5 rounded-full text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            {/* Modal Body */}
            <div className="py-5 space-y-4">
              
              {/* Financial Breakdown Grid */}
              <div className="grid grid-cols-3 gap-3 p-4 rounded-2xl bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200/60 dark:border-zinc-700/50">
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
                  <span className="text-sm md:text-base font-bold tabular-nums text-emerald-600 dark:text-emerald-400 mt-0.5 block">
                    {formatCurrency(Number(selectedExpense.paid_amount || 0))}
                  </span>
                </div>

                <div>
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 block">
                    Saldo
                  </span>
                  <span className={`text-sm md:text-base font-bold tabular-nums mt-0.5 block ${
                    (Number(selectedExpense.amount || 0) - Number(selectedExpense.paid_amount || 0)) <= 0 
                      ? 'text-emerald-600 dark:text-emerald-400' 
                      : 'text-rose-600 dark:text-rose-400'
                  }`}>
                    {formatCurrency(Math.max(0, Number(selectedExpense.amount || 0) - Number(selectedExpense.paid_amount || 0)))}
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
                <div className="flex items-center justify-between py-1.5 border-b border-zinc-100 dark:border-zinc-800">
                  <span className="text-zinc-400">Categoria:</span>
                  <span className="font-semibold text-zinc-900 dark:text-white">
                    {selectedExpense.type}
                  </span>
                </div>
              </div>

              {/* Quick Pay Action */}
              {((Number(selectedExpense.amount || 0) - Number(selectedExpense.paid_amount || 0)) > 0) && (
                <button
                  type="button"
                  onClick={() => handleQuickPayFull(selectedExpense)}
                  className="w-full py-2.5 px-4 rounded-xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400 font-bold text-xs flex items-center justify-center gap-2 border border-emerald-500/20 transition-all cursor-pointer"
                >
                  <CheckCircle2 size={16} />
                  <span>Quitar Valor Restante ({formatCurrency(Math.max(0, Number(selectedExpense.amount || 0) - Number(selectedExpense.paid_amount || 0)))})</span>
                </button>
              )}
            </div>

            {/* Bottom Actions */}
            <div className="pt-4 border-t border-zinc-100 dark:border-zinc-800 flex items-center justify-between gap-3">
              <button 
                type="button"
                onClick={() => setDeleteConfirmId(selectedExpense.id!)}
                className="px-4 py-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 dark:bg-rose-500/10 dark:hover:bg-rose-500/20 dark:text-rose-400 font-semibold text-xs flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <Trash2 size={15} />
                <span>Excluir</span>
              </button>

              <div className="flex items-center gap-2">
                <button 
                  type="button"
                  onClick={() => setSelectedExpense(null)}
                  className="px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 font-semibold text-xs hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                >
                  Fechar
                </button>
                <button 
                  type="button"
                  onClick={() => handleOpenEditModal(selectedExpense)}
                  className="px-5 py-2.5 rounded-xl bg-zinc-900 hover:bg-zinc-800 text-white dark:bg-white dark:hover:bg-zinc-200 dark:text-zinc-950 font-semibold text-xs flex items-center gap-1.5 shadow-xs transition-all cursor-pointer"
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
      {/* ADD / EDIT MODAL */}
      {/* ========================================================================= */}
      {isFormModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div 
            className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl max-w-lg w-full p-6 shadow-2xl animate-in zoom-in-95 duration-150 overflow-visible"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between pb-4 border-b border-zinc-100 dark:border-zinc-800/80 mb-5">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
                  <Receipt size={18} strokeWidth={2.3} />
                </div>
                <h3 className="text-lg font-bold text-zinc-900 dark:text-white">
                  {editingId ? 'Editar Despesa' : 'Nova Despesa'}
                </h3>
              </div>
              <button 
                onClick={() => setIsFormModalOpen(false)}
                className="p-1.5 rounded-full text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveExpense} className="space-y-4">
              
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
                    <span>Gerenciar Empresas</span>
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
                    className="w-full bg-zinc-100/80 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 rounded-xl pl-9 pr-4 py-2.5 text-sm text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/40 font-semibold"
                  />
                </div>

                {/* Company Suggestions Dropdown */}
                {isCompanySuggestionsOpen && companySuggestions.length > 0 && (
                  <div className="absolute left-0 right-0 mt-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-2xl p-1.5 shadow-2xl z-50 max-h-44 overflow-y-auto">
                    <div className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 px-3 py-1">
                      Empresas Cadastradas
                    </div>
                    {companySuggestions.map(comp => (
                      <button
                        key={comp.id || comp.name}
                        type="button"
                        onClick={() => handleSelectRegisteredCompany(comp)}
                        className="w-full text-left px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-between hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors group cursor-pointer"
                      >
                        <div className="flex items-center gap-2">
                          <CategoryIcon type={comp.default_type} size={13} containerClassName="w-6 h-6 rounded-lg" />
                          <span className="font-bold text-zinc-900 dark:text-white">{comp.name}</span>
                        </div>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-zinc-100 dark:bg-zinc-700 text-zinc-600 dark:text-zinc-300 group-hover:bg-emerald-500 group-hover:text-white transition-colors">
                          {comp.default_type}
                        </span>
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Grid: Tipo de Despesa & Data de Vencimento */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                
                {/* Category Dropdown */}
                <div className="relative z-20" ref={formCategoryDropdownRef}>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                      Tipo de Despesa *
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setIsFormCategoryDropdownOpen(false);
                        setManageModalInitialTab('types');
                        setIsManageModalOpen(true);
                      }}
                      className="text-[11px] font-bold text-blue-600 dark:text-blue-400 hover:underline"
                    >
                      + Novo
                    </button>
                  </div>
                  <button 
                    type="button"
                    onClick={() => setIsFormCategoryDropdownOpen(!isFormCategoryDropdownOpen)}
                    className="w-full bg-zinc-100/80 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3.5 py-2.5 text-sm text-zinc-900 dark:text-zinc-100 outline-none flex items-center justify-between font-semibold"
                  >
                    <span>{expenseType}</span>
                    <ChevronDown size={16} className={`text-zinc-400 transition-transform ${isFormCategoryDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {isFormCategoryDropdownOpen && (
                    <div className="absolute left-0 right-0 mt-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-2xl p-1.5 shadow-2xl z-50 max-h-48 overflow-y-auto">
                      {types.map(cat => (
                        <button
                          key={cat}
                          type="button"
                          onClick={() => {
                            setExpenseType(cat);
                            setIsFormCategoryDropdownOpen(false);
                          }}
                          className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-between transition-colors ${
                            expenseType === cat 
                              ? 'bg-emerald-500/10 dark:bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-bold' 
                              : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                          }`}
                        >
                          <span>{cat}</span>
                          {expenseType === cat && <Check size={14} className="text-emerald-600 dark:text-emerald-400" />}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1.5">
                    Data de Vencimento *
                  </label>
                  <div className="relative">
                    <input 
                      type="date"
                      required
                      value={dueDate}
                      onChange={(e) => setDueDate(e.target.value)}
                      className="w-full bg-zinc-100/80 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3.5 py-2.5 text-sm text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                    />
                  </div>
                </div>
              </div>

              {/* Grid: Valor a Pagar & Valor Pago */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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

                <div>
                  <div className="flex items-center justify-between mb-1.5">
                    <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400">
                      Valor Pago
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
                      className="w-full bg-zinc-100/80 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-700 rounded-xl pl-10 pr-3.5 py-2.5 text-sm font-semibold text-emerald-600 dark:text-emerald-400 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-emerald-500/40"
                    />
                  </div>
                </div>
              </div>

              {/* Live Saldo Feedback */}
              <div className="p-3.5 rounded-2xl bg-zinc-100/70 dark:bg-zinc-800/40 border border-zinc-200/60 dark:border-zinc-700/40 flex items-center justify-between">
                <div>
                  <span className="text-[11px] font-semibold uppercase tracking-wider text-zinc-400 dark:text-zinc-500 block">
                    Saldo Restante Calculado
                  </span>
                  <span className={`text-base font-bold tabular-nums ${
                    currentFormBalance === 0 && currentAmountToPay > 0 
                      ? 'text-emerald-600 dark:text-emerald-400' 
                      : 'text-zinc-900 dark:text-white'
                  }`}>
                    {formatCurrency(currentFormBalance)}
                  </span>
                </div>
                <div>
                  {currentFormBalance === 0 && currentAmountToPay > 0 ? (
                    <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-100 dark:bg-emerald-500/20 text-emerald-700 dark:text-emerald-400">
                      Quitada
                    </span>
                  ) : currentAmountPaid > 0 && currentFormBalance > 0 ? (
                    <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-blue-100 dark:bg-blue-500/20 text-blue-700 dark:text-blue-400">
                      Parcial
                    </span>
                  ) : (
                    <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300">
                      Pendente
                    </span>
                  )}
                </div>
              </div>

              {/* Option to save company if new */}
              {!editingId && company.trim() && !companies.some(c => c.name.toLowerCase() === company.trim().toLowerCase()) && (
                <label className="flex items-center gap-2 text-xs font-medium text-zinc-600 dark:text-zinc-400 cursor-pointer select-none">
                  <input 
                    type="checkbox"
                    checked={saveCompanyToFavorites}
                    onChange={(e) => setSaveCompanyToFavorites(e.target.checked)}
                    className="rounded border-zinc-300 dark:border-zinc-700 text-emerald-600 focus:ring-0"
                  />
                  <span className="flex items-center gap-1">
                    <BookmarkPlus size={14} className="text-emerald-500" />
                    Salvar "{company.trim()}" em Fornecedores favoritos
                  </span>
                </label>
              )}

              {/* Actions */}
              <div className="flex gap-3 pt-2">
                <button 
                  type="button"
                  onClick={() => setIsFormModalOpen(false)}
                  className="flex-1 px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 text-sm font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  className="flex-1 px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-bold shadow-md shadow-emerald-600/20 active:scale-[0.98] transition-all cursor-pointer"
                >
                  {editingId ? 'Salvar Alterações' : 'Cadastrar Despesa'}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* DELETE CONFIRMATION DIALOG */}
      {/* ========================================================================= */}
      {deleteConfirmId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl max-w-sm w-full p-6 shadow-2xl text-center animate-in zoom-in-95 duration-150">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto mb-4">
              <AlertCircle size={26} />
            </div>
            <h4 className="text-base font-bold text-zinc-900 dark:text-white">Excluir Despesa?</h4>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1.5 mb-6">
              Esta ação removerá o registro permanentemente.
            </p>
            <div className="flex gap-3">
              <button 
                onClick={() => setDeleteConfirmId(null)}
                className="flex-1 px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 text-sm font-semibold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button 
                onClick={() => handleDeleteExpense(deleteConfirmId)}
                className="flex-1 px-4 py-2.5 rounded-xl bg-rose-600 text-white text-sm font-semibold shadow-xs hover:bg-rose-700 transition-colors cursor-pointer"
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

    </div>
  );
};



