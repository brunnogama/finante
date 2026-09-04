import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  Plus, 
  Search, 
  Calendar, 
  Wallet, 
  ArrowDownLeft, 
  TrendingUp, 
  Edit3, 
  Trash2, 
  X, 
  Check, 
  ChevronDown, 
  AlertCircle,
  Sparkles
} from 'lucide-react';
import { 
  getIncomes, 
  addIncome, 
  updateIncome, 
  deleteIncome, 
  supabase, 
  type IncomeRecord 
} from '../services/supabase';
import { DatePicker } from '../components/DatePicker';

const QUICK_INCOME_SOURCES = [
  'Adiantamento',
  'Aluguel Recebido',
  'Bônus / PLR',
  'Dividendos',
  'Freelance',
  'Outros',
  'Rendimentos',
  'Salário',
  'Venda'
];

export const Income: React.FC = () => {
  const [incomes, setIncomes] = useState<IncomeRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // Search & Filter
  const currentMonthKey = new Date().toISOString().substring(0, 7);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedMonth, setSelectedMonth] = useState<string>(currentMonthKey);
  const [isMonthDropdownOpen, setIsMonthDropdownOpen] = useState(false);
  const monthDropdownRef = useRef<HTMLDivElement>(null);

  // Modal States
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);

  // Form Fields
  const [editingId, setEditingId] = useState<number | null>(null);
  const [source, setSource] = useState('');
  const [amountInput, setAmountInput] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurringMonths, setRecurringMonths] = useState(12);

  // Close dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (monthDropdownRef.current && !monthDropdownRef.current.contains(event.target as Node)) {
        setIsMonthDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Fetch data & Realtime subscription
  useEffect(() => {
    fetchIncomes();

    const channel = supabase
      .channel('schema-db-changes-income-page')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'incomes' }, () => {
        fetchIncomes();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchIncomes = async () => {
    setLoading(true);
    const data = await getIncomes();
    setIncomes(data);
    setLoading(false);
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

  // Currency helpers
  const formatCurrency = (val: number) => {
    return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '');
    if (value === '') {
      setAmountInput('');
      return;
    }
    const numericValue = parseInt(value, 10) / 100;
    setAmountInput(numericValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }));
  };

  const parseCurrencyInput = (valueStr: string): number => {
    if (!valueStr) return 0;
    const digitsOnly = valueStr.replace(/\D/g, '');
    if (!digitsOnly) return 0;
    return parseInt(digitsOnly, 10) / 100;
  };

  // Month list calculation
  const availableMonths = useMemo(() => {
    const monthSet = new Set<string>();
    incomes.forEach(item => {
      const m = extractMonth(item.date);
      if (m) monthSet.add(m);
    });
    // Ensure current month is available
    const curMonth = new Date().toISOString().substring(0, 7);
    monthSet.add(curMonth);

    return Array.from(monthSet).sort().reverse();
  }, [incomes]);

  const formatMonthLabel = (yyyyMm: string) => {
    if (yyyyMm === 'all') return 'Todos os Meses';
    const parts = yyyyMm.split('-');
    if (parts.length < 2) return yyyyMm;
    const [year, month] = parts;
    const dateObj = new Date(parseInt(year, 10), parseInt(month, 10) - 1, 1);
    const monthName = dateObj.toLocaleDateString('pt-BR', { month: 'long' });
    return `${monthName.charAt(0).toUpperCase() + monthName.slice(1)} de ${year}`;
  };

  // Filtered incomes
  const filteredIncomes = useMemo(() => {
    return incomes.filter(item => {
      const matchSearch = item.source.toLowerCase().includes(searchTerm.toLowerCase());
      const matchMonth = selectedMonth === 'all' || extractMonth(item.date) === selectedMonth;
      return matchSearch && matchMonth;
    });
  }, [incomes, searchTerm, selectedMonth]);

  // Statistics
  const stats = useMemo(() => {
    const total = filteredIncomes.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
    const count = filteredIncomes.length;
    const average = count > 0 ? total / count : 0;
    return { total, count, average };
  }, [filteredIncomes]);

  // Modal Handlers
  const handleOpenAddModal = () => {
    setEditingId(null);
    setSource('');
    setAmountInput('');
    setDate(new Date().toISOString().split('T')[0]);
    setIsRecurring(false);
    setRecurringMonths(12);
    setIsFormModalOpen(true);
  };

  const handleOpenEditModal = (inc: IncomeRecord) => {
    setEditingId(inc.id || null);
    setSource(inc.source);
    setAmountInput(formatCurrency(inc.amount));
    setDate(inc.date);
    setIsRecurring(false);
    setIsFormModalOpen(true);
  };

  const handleSaveIncome = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!source.trim()) {
      alert('Informe a fonte da receita.');
      return;
    }
    const amount = parseCurrencyInput(amountInput);
    if (amount <= 0) {
      alert('Informe um valor válido.');
      return;
    }
    if (!date) {
      alert('Informe a data de recebimento.');
      return;
    }

    if (editingId) {
      // Update existing
      await updateIncome(editingId, {
        source: source.trim(),
        amount,
        date
      });
    } else {
      // Add new
      if (isRecurring) {
        const baseDate = new Date(date + 'T00:00:00');
        for (let i = 0; i < recurringMonths; i++) {
          const nextDate = new Date(baseDate.getFullYear(), baseDate.getMonth() + i, baseDate.getDate());
          const dateStr = nextDate.toISOString().split('T')[0];
          await addIncome({
            source: `${source.trim()} (${i + 1}/${recurringMonths})`,
            amount,
            date: dateStr
          });
        }
      } else {
        await addIncome({
          source: source.trim(),
          amount,
          date
        });
      }
    }

    setIsFormModalOpen(false);
    fetchIncomes();
  };

  const handleDeleteIncome = async (id: number) => {
    await deleteIncome(id);
    setDeleteConfirmId(null);
    fetchIncomes();
  };

  return (
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-5 animate-fadeIn pb-24 md:pb-8">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight text-zinc-900 dark:text-white flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-lg bg-[#2ec27e]/10 dark:bg-[#2ec27e]/20 text-[#2ec27e] flex items-center justify-center shrink-0">
              <Wallet size={18} strokeWidth={2.3} />
            </span>
            Receitas
          </h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            Controle de salários, dividendos e entradas financeiras
          </p>
        </div>

        <button
          onClick={handleOpenAddModal}
          className="adw-btn suggested-action"
        >
          <Plus size={16} strokeWidth={2.5} />
          <span>Nova Receita</span>
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        {/* Total Receitas */}
        <div className="bg-white dark:bg-white/[0.06] rounded-xl p-4 sm:p-5 border border-black/10 dark:border-white/10 shadow-xs relative overflow-hidden min-w-0">
          <div className="flex items-center justify-between mb-2 min-w-0">
            <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 truncate">
              Total em Receitas
            </span>
            <div className="w-7 h-7 rounded-lg bg-[#2ec27e]/10 dark:bg-[#2ec27e]/20 text-[#2ec27e] flex items-center justify-center shrink-0">
              <ArrowDownLeft size={15} strokeWidth={2.5} />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-bold text-[#2ec27e] tracking-tight truncate min-w-0" title={formatCurrency(stats.total)}>
            {formatCurrency(stats.total)}
          </div>
          <div className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-1 truncate">
            {selectedMonth === 'all' ? 'Histórico completo' : formatMonthLabel(selectedMonth)}
          </div>
        </div>

        {/* Quantidade de Entradas */}
        <div className="bg-white dark:bg-white/[0.06] rounded-xl p-4 sm:p-5 border border-black/10 dark:border-white/10 shadow-xs relative overflow-hidden min-w-0">
          <div className="flex items-center justify-between mb-2 min-w-0">
            <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 truncate">
              Lançamentos
            </span>
            <div className="w-7 h-7 rounded-lg bg-[#3584e4]/10 dark:bg-[#3584e4]/20 text-[#3584e4] flex items-center justify-center shrink-0">
              <Sparkles size={15} strokeWidth={2.5} />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-white tracking-tight truncate min-w-0">
            {stats.count} <span className="text-xs font-normal text-zinc-400">registros</span>
          </div>
          <div className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-1 truncate">
            {stats.count === 1 ? '1 entrada cadastrada' : `${stats.count} entradas cadastradas`}
          </div>
        </div>

        {/* Média por Entrada */}
        <div className="bg-white dark:bg-white/[0.06] rounded-xl p-4 sm:p-5 border border-black/10 dark:border-white/10 shadow-xs relative overflow-hidden min-w-0">
          <div className="flex items-center justify-between mb-2 min-w-0">
            <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 truncate">
              Média por Entrada
            </span>
            <div className="w-7 h-7 rounded-lg bg-[#21a1a9]/10 dark:bg-[#21a1a9]/20 text-[#21a1a9] flex items-center justify-center shrink-0">
              <TrendingUp size={15} strokeWidth={2.5} />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-white tracking-tight truncate min-w-0" title={formatCurrency(stats.average)}>
            {formatCurrency(stats.average)}
          </div>
          <div className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-1 truncate">
            Valor médio por recebimento
          </div>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white dark:bg-white/[0.06] rounded-xl p-3 border border-black/10 dark:border-white/10 shadow-xs flex flex-col md:flex-row gap-2.5 items-center justify-between relative z-20">
        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 pointer-events-none" />
          <input
            type="text"
            placeholder="Buscar por fonte (ex: Salário)..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-lg pl-8.5 pr-7 py-1.5 text-xs sm:text-sm text-zinc-900 dark:text-zinc-100 placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-[#3584e4]/30 transition-all"
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

        {/* Month Selector Popover */}
        <div className="relative w-full md:w-auto" ref={monthDropdownRef}>
          <button
            type="button"
            onClick={() => setIsMonthDropdownOpen(!isMonthDropdownOpen)}
            className="w-full md:w-auto flex items-center justify-between gap-2 px-3 py-1.5 bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-lg text-xs font-semibold text-zinc-800 dark:text-zinc-200 hover:bg-black/10 dark:hover:bg-white/10 transition-all cursor-pointer"
          >
            <div className="flex items-center gap-1.5">
              <Calendar size={13} className="text-zinc-400" />
              <span>{formatMonthLabel(selectedMonth)}</span>
            </div>
            <ChevronDown size={13} className={`text-zinc-400 transition-transform duration-200 ${isMonthDropdownOpen ? 'rotate-180' : ''}`} />
          </button>

          {isMonthDropdownOpen && (
            <div className="absolute right-0 mt-1.5 w-64 adw-popover rounded-xl shadow-2xl z-50 p-1.5 overflow-hidden animate-[scaleIn_0.12s_ease] max-h-72 overflow-y-auto">
              <button
                onClick={() => {
                  setSelectedMonth('all');
                  setIsMonthDropdownOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-semibold text-left transition-colors cursor-pointer ${
                  selectedMonth === 'all' 
                    ? 'font-bold text-white bg-[#3584e4]' 
                    : 'text-zinc-700 dark:text-zinc-300 hover:bg-black/5 dark:hover:bg-white/10'
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
                  className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-sm font-semibold text-left transition-colors cursor-pointer ${
                    selectedMonth === m 
                      ? 'font-bold text-white bg-[#3584e4]' 
                      : 'text-zinc-700 dark:text-zinc-300 hover:bg-black/5 dark:hover:bg-white/10'
                  }`}
                >
                  <span>{formatMonthLabel(m)}</span>
                  {selectedMonth === m && <Check size={16} className="text-white" />}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Income Records Boxed List */}
      <div className="space-y-3">
        {loading ? (
          <div className="py-16 text-center text-zinc-400 flex flex-col items-center gap-3">
            <div className="w-7 h-7 border-2 border-[#3584e4] border-t-transparent rounded-full animate-spin" />
            <p className="text-xs">Carregando receitas...</p>
          </div>
        ) : filteredIncomes.length === 0 ? (
          <div className="bg-white dark:bg-white/[0.06] rounded-xl p-10 text-center border border-black/10 dark:border-white/10">
            <div className="w-12 h-12 rounded-xl bg-[#2ec27e]/10 text-[#2ec27e] flex items-center justify-center mx-auto mb-2.5">
              <Wallet size={24} strokeWidth={2} />
            </div>
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-white">Nenhuma receita encontrada</h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 max-w-sm mx-auto">
              {searchTerm 
                ? 'Tente ajustar os filtros ou pesquisar por outro termo.' 
                : 'Cadastre suas receitas e rendimentos para acompanhar seus ganhos mensais.'}
            </p>
            <button
              onClick={handleOpenAddModal}
              className="mt-3 adw-btn suggested-action"
            >
              <Plus size={15} strokeWidth={2.5} />
              <span>Adicionar Primeira Receita</span>
            </button>
          </div>
        ) : (
          <div className="boxed-list">
            {filteredIncomes.map((inc) => (
              <div
                key={inc.id}
                className="boxed-list-row group"
              >
                {/* Left Info */}
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-[#2ec27e]/10 text-[#2ec27e] flex items-center justify-center flex-shrink-0">
                    <ArrowDownLeft size={16} strokeWidth={2.4} />
                  </div>
                  <div className="min-w-0">
                    <div className="font-semibold text-zinc-900 dark:text-zinc-100 text-xs sm:text-sm truncate">
                      {inc.source}
                    </div>
                    <div className="flex items-center gap-2 text-[11px] text-zinc-400 dark:text-zinc-500 mt-0.5">
                      <span className="flex items-center gap-1">
                        <Calendar size={11} className="opacity-70" />
                        {inc.date ? inc.date.split('-').reverse().join('/') : '-'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Right Info & Actions */}
                <div className="flex items-center gap-3 flex-shrink-0">
                  <div className="text-right">
                    <div className="text-sm sm:text-base font-bold text-[#2ec27e] tracking-tight">
                      +{formatCurrency(inc.amount)}
                    </div>
                  </div>

                  <div className="flex items-center gap-1 opacity-70 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => handleOpenEditModal(inc)}
                      className="p-1.5 rounded-md text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer"
                      title="Editar Receita"
                    >
                      <Edit3 size={15} />
                    </button>
                    <button
                      onClick={() => setDeleteConfirmId(inc.id || null)}
                      className="p-1.5 rounded-md text-zinc-400 hover:text-[#e01b24] hover:bg-[#e01b24]/10 transition-colors cursor-pointer"
                      title="Excluir Receita"
                    >
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal: Nova / Editar Receita */}
      {isFormModalOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="adw-dialog max-w-md w-full shadow-2xl animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="px-5 py-3.5 border-b border-black/10 dark:border-white/10 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-[#2ec27e]/10 text-[#2ec27e] flex items-center justify-center">
                  <Wallet size={16} strokeWidth={2.3} />
                </div>
                <h3 className="text-sm font-bold text-zinc-900 dark:text-white">
                  {editingId ? 'Editar Receita' : 'Nova Receita'}
                </h3>
              </div>
              <button
                onClick={() => setIsFormModalOpen(false)}
                className="p-1 rounded-md text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSaveIncome} className="p-5 space-y-4">
              {/* Quick Suggestion Chips */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1.5">
                  Sugestões Rápidas
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {QUICK_INCOME_SOURCES.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setSource(s)}
                      className={`text-xs px-2.5 py-1 rounded-lg border transition-all cursor-pointer ${
                        source === s
                          ? 'bg-[#3584e4] text-white border-[#3584e4] font-semibold'
                          : 'bg-black/5 dark:bg-white/5 text-zinc-700 dark:text-zinc-300 border-black/10 dark:border-white/10 hover:bg-black/10 dark:hover:bg-white/10'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>

              {/* Source Field */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1.5">
                  Fonte ou Descrição *
                </label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Salário Empresa X"
                  value={source}
                  onChange={(e) => setSource(e.target.value)}
                  className="w-full bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-lg px-3 py-2 text-sm text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-[#3584e4]/30"
                />
              </div>

              {/* Amount Field */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1.5">
                  Valor (R$) *
                </label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 text-sm font-semibold">
                    R$
                  </span>
                  <input
                    type="text"
                    required
                    placeholder="0,00"
                    value={amountInput.replace('R$', '').trim()}
                    onChange={handleAmountChange}
                    className="w-full bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-lg pl-9 pr-3 py-2 text-sm font-semibold text-zinc-900 dark:text-white placeholder-zinc-400 focus:outline-none focus:ring-2 focus:ring-[#3584e4]/30"
                  />
                </div>
              </div>

              {/* Date Field */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1.5">
                  Data de Recebimento *
                </label>
                <DatePicker
                  value={date}
                  onChange={(d) => setDate(d)}
                  required
                />
              </div>

              {/* Recurring Toggle (Only for new records) */}
              {!editingId && (
                <div className="p-3 rounded-lg bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 flex items-center justify-between">
                  <div>
                    <div className="text-xs font-semibold text-zinc-900 dark:text-white">
                      Repetir Mensalmente
                    </div>
                    <div className="text-[11px] text-zinc-500 dark:text-zinc-400">
                      Gera lançamentos automáticos futuros (12 meses)
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setIsRecurring(!isRecurring)}
                    className={`w-10 h-6 flex items-center rounded-full p-0.5 transition-colors duration-200 cursor-pointer ${
                      isRecurring ? 'bg-[#3584e4]' : 'bg-zinc-300 dark:bg-zinc-700'
                    }`}
                  >
                    <div
                      className={`bg-white w-5 h-5 rounded-full shadow-md transform transition-transform duration-200 ${
                        isRecurring ? 'translate-x-4' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setIsFormModalOpen(false)}
                  className="flex-1 adw-btn"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="flex-1 adw-btn suggested-action"
                >
                  {editingId ? 'Salvar Alterações' : 'Cadastrar Receita'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmId !== null && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-150">
          <div className="adw-dialog max-w-sm w-full p-5 text-center animate-in zoom-in-95 duration-150">
            <div className="w-10 h-10 rounded-lg bg-[#e01b24]/10 text-[#e01b24] flex items-center justify-center mx-auto mb-3">
              <AlertCircle size={22} />
            </div>
            <h3 className="text-sm font-bold text-zinc-900 dark:text-white">
              Excluir Receita?
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 mb-5">
              Esta ação não pode ser desfeita. O lançamento será removido permanentemente.
            </p>
            <div className="flex gap-2.5">
              <button
                onClick={() => setDeleteConfirmId(null)}
                className="flex-1 adw-btn"
              >
                Cancelar
              </button>
              <button
                onClick={() => handleDeleteIncome(deleteConfirmId)}
                className="flex-1 adw-btn destructive-action"
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
