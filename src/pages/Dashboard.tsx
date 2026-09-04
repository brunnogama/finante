import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  LayoutDashboard,
  ArrowUpRight, 
  ArrowDownRight, 
  TrendingUp, 
  Plus, 
  ChevronDown, 
  Check, 
  Wallet, 
  Receipt, 
  Calendar, 
  BarChart3, 
  PieChart as PieChartIcon, 
  Layers,
  ArrowRight
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { 
  getExpenses, 
  getIncomes, 
  getInvestments,
  supabase, 
  type ExpenseRecord, 
  type IncomeRecord, 
  type InvestmentRecord 
} from '../services/supabase';
import { ExpensesPieChart } from '../components/widgets/ExpensesPieChart';
import { IncomeExpenseBarChart } from '../components/widgets/IncomeExpenseBarChart';

const extractMonth = (dateStr?: string): string => {
  if (!dateStr) return '';
  if (dateStr.includes('-')) {
    const parts = dateStr.split('-');
    if (parts.length >= 2) {
      return `${parts[0]}-${parts[1].padStart(2, '0')}`;
    }
  }
  const d = new Date(dateStr);
  if (!isNaN(d.getTime())) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }
  return '';
};

const getMonthKeysForPeriod = (period: string): string[] => {
  const now = new Date();
  const getMonthKey = (offset: number) => {
    const d = new Date(now.getFullYear(), now.getMonth() - offset, 1);
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  };

  switch (period) {
    case 'Mês Anterior':
      return [getMonthKey(1)];
    case 'Últimos 3 meses':
      return [getMonthKey(0), getMonthKey(1), getMonthKey(2)];
    case 'Últimos 6 meses':
      return [0, 1, 2, 3, 4, 5].map(getMonthKey);
    case 'Mês Atual':
    default:
      return [getMonthKey(0)];
  }
};

export const Dashboard: React.FC = () => {
  const [expenses, setExpenses] = useState<ExpenseRecord[]>([]);
  const [incomes, setIncomes] = useState<IncomeRecord[]>([]);
  const [investments, setInvestments] = useState<InvestmentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState('Mês Atual');
  const [isPeriodDropdownOpen, setIsPeriodDropdownOpen] = useState(false);
  const periodDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (periodDropdownRef.current && !periodDropdownRef.current.contains(event.target as Node)) {
        setIsPeriodDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    fetchDashboardData();
    
    const channel = supabase.channel('schema-db-changes-dashboard')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'expenses' }, () => fetchDashboardData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'incomes' }, () => fetchDashboardData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'investments' }, () => fetchDashboardData())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchDashboardData = async () => {
    const [exp, inc, inv] = await Promise.all([getExpenses(), getIncomes(), getInvestments()]);
    
    setExpenses(exp);
    setIncomes(inc);
    setInvestments(inv);
    setLoading(false);
  };

  const activeMonthKeys = useMemo(() => getMonthKeysForPeriod(selectedPeriod), [selectedPeriod]);

  // Exclude future incomes and only include transactions matching the selected period
  const filteredIncomes = useMemo(() => {
    return incomes.filter(inc => activeMonthKeys.includes(extractMonth(inc.date)));
  }, [incomes, activeMonthKeys]);

  const filteredExpenses = useMemo(() => {
    return expenses.filter(exp => activeMonthKeys.includes(extractMonth(exp.due_date)));
  }, [expenses, activeMonthKeys]);

  const totalIncome = useMemo(() => {
    return filteredIncomes.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
  }, [filteredIncomes]);

  const totalExpense = useMemo(() => {
    return filteredExpenses.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
  }, [filteredExpenses]);

  const totalInvested = useMemo(() => {
    return investments.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
  }, [investments]);

  const balance = totalIncome - totalExpense;

  const formatBRL = (val: number) => val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const periods = ['Mês Atual', 'Mês Anterior', 'Últimos 3 meses', 'Últimos 6 meses'];

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6 animate-fadeIn pb-24 md:pb-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-zinc-900 dark:text-white flex items-center gap-2.5">
            <span className="w-9 h-9 rounded-2xl bg-blue-500/10 dark:bg-blue-500/15 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
              <LayoutDashboard size={20} strokeWidth={2.3} />
            </span>
            Visão Geral
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            Resumo consolidado de receitas, despesas, saldo e investimentos
          </p>
        </div>

        <div className="flex items-center gap-2.5 sm:gap-3 flex-wrap sm:flex-nowrap">
          {/* Period Selector Dropdown */}
          <div className="relative z-30" ref={periodDropdownRef}>
            <button
              type="button"
              onClick={() => setIsPeriodDropdownOpen(!isPeriodDropdownOpen)}
              className="bg-white dark:bg-zinc-900/60 backdrop-blur-md hover:bg-zinc-50 dark:hover:bg-zinc-800/80 text-zinc-800 dark:text-zinc-200 border border-zinc-200/70 dark:border-white/10 text-xs sm:text-sm font-semibold rounded-xl px-3.5 py-2.5 outline-none flex items-center gap-2 transition-all shadow-xs cursor-pointer"
            >
              <Calendar size={15} className="text-blue-500 shrink-0" />
              <span className="truncate">{selectedPeriod}</span>
              <ChevronDown size={14} className={`text-zinc-400 transition-transform duration-200 shrink-0 ${isPeriodDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {isPeriodDropdownOpen && (
              <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-[#18181b] border border-zinc-200 dark:border-zinc-700 rounded-2xl p-1.5 shadow-2xl z-50 animate-[scaleIn_0.12s_ease]">
                {periods.map(p => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => {
                      setSelectedPeriod(p);
                      setIsPeriodDropdownOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-between transition-colors ${
                      selectedPeriod === p 
                        ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white font-bold' 
                        : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                    }`}
                  >
                    <span>{p}</span>
                    {selectedPeriod === p && <Check size={14} className="text-blue-500" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Quick Action Button */}
          <Link
            to="/expenses"
            style={{ backgroundColor: '#34C759' }}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl text-white font-semibold text-sm shadow-sm hover:opacity-95 active:scale-[0.98] transition-all cursor-pointer shrink-0"
          >
            <Plus size={18} strokeWidth={2.5} />
            <span>Nova Despesa</span>
          </Link>
        </div>
      </div>
      
      {/* Summary KPI Cards - 1 -> 2 -> 4 Columns */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3.5 sm:gap-4">
        
        {/* Card 1: Saldo Líquido */}
        <div className="bg-white dark:bg-zinc-900/60 backdrop-blur-md rounded-2xl p-4 sm:p-5 border border-zinc-200/70 dark:border-white/10 shadow-xs relative overflow-hidden min-w-0 transition-all duration-200 hover:shadow-md">
          <div className="flex items-center justify-between mb-2 min-w-0">
            <span className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 truncate">
              Saldo Líquido
            </span>
            <div className="w-8 h-8 rounded-xl bg-blue-500/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
              <Wallet size={17} strokeWidth={2.5} />
            </div>
          </div>
          <div 
            className={`text-xl sm:text-2xl xl:text-3xl font-bold tracking-tight truncate min-w-0 ${
              balance >= 0 ? 'text-zinc-900 dark:text-white' : 'text-rose-600 dark:text-rose-400'
            }`}
            title={formatBRL(balance)}
          >
            {loading ? '...' : formatBRL(balance)}
          </div>
          <div className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-1 truncate">
            {selectedPeriod} • {balance >= 0 ? 'Superávit no período' : 'Déficit no período'}
          </div>
        </div>

        {/* Card 2: Receitas Totais */}
        <div className="bg-white dark:bg-zinc-900/60 backdrop-blur-md rounded-2xl p-4 sm:p-5 border border-zinc-200/70 dark:border-white/10 shadow-xs relative overflow-hidden min-w-0 transition-all duration-200 hover:shadow-md">
          <div className="flex items-center justify-between mb-2 min-w-0">
            <span className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 truncate">
              Receitas
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <ArrowUpRight size={17} strokeWidth={2.5} />
            </div>
          </div>
          <div 
            className="text-xl sm:text-2xl xl:text-3xl font-bold text-emerald-600 dark:text-emerald-400 tracking-tight truncate min-w-0" 
            title={formatBRL(totalIncome)}
          >
            {loading ? '...' : formatBRL(totalIncome)}
          </div>
          <div className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-1 truncate">
            {filteredIncomes.length === 1 ? '1 entrada no período' : `${filteredIncomes.length} entradas no período`}
          </div>
        </div>

        {/* Card 3: Despesas Totais */}
        <div className="bg-white dark:bg-zinc-900/60 backdrop-blur-md rounded-2xl p-4 sm:p-5 border border-zinc-200/70 dark:border-white/10 shadow-xs relative overflow-hidden min-w-0 transition-all duration-200 hover:shadow-md">
          <div className="flex items-center justify-between mb-2 min-w-0">
            <span className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 truncate">
              Despesas
            </span>
            <div className="w-8 h-8 rounded-xl bg-rose-500/10 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
              <ArrowDownRight size={17} strokeWidth={2.5} />
            </div>
          </div>
          <div 
            className="text-xl sm:text-2xl xl:text-3xl font-bold text-rose-600 dark:text-rose-400 tracking-tight truncate min-w-0" 
            title={formatBRL(totalExpense)}
          >
            {loading ? '...' : formatBRL(totalExpense)}
          </div>
          <div className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-1 truncate">
            {filteredExpenses.length === 1 ? '1 conta no período' : `${filteredExpenses.length} contas no período`}
          </div>
        </div>

        {/* Card 4: Investimentos */}
        <Link 
          to="/investments" 
          className="bg-white dark:bg-zinc-900/60 backdrop-blur-md rounded-2xl p-4 sm:p-5 border border-zinc-200/70 dark:border-white/10 shadow-xs relative overflow-hidden min-w-0 transition-all duration-200 hover:shadow-md hover:border-indigo-400/40 group block cursor-pointer"
        >
          <div className="flex items-center justify-between mb-2 min-w-0">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 truncate">
                Investimentos
              </span>
              <ArrowRight size={12} className="text-zinc-400 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <div className="w-8 h-8 rounded-xl bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <Layers size={17} strokeWidth={2.5} />
            </div>
          </div>
          <div 
            className="text-xl sm:text-2xl xl:text-3xl font-bold text-indigo-600 dark:text-indigo-400 tracking-tight truncate min-w-0" 
            title={formatBRL(totalInvested)}
          >
            {loading ? '...' : formatBRL(totalInvested)}
          </div>
          <div className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-1 truncate">
            {investments.length === 1 ? '1 ativo na carteira' : `${investments.length} ativos na carteira`}
          </div>
        </Link>

      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5 sm:gap-6">
        
        {/* Gráfico de Barras - Comparativo Mensal */}
        <div className="bg-white dark:bg-zinc-900/60 backdrop-blur-md rounded-3xl p-5 md:p-6 border border-zinc-200/70 dark:border-white/10 shadow-xl flex flex-col justify-start min-h-[380px]">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-bold text-zinc-900 dark:text-white tracking-tight flex items-center gap-2">
              <BarChart3 size={18} className="text-emerald-500" />
              Comparativo Mensal
            </h3>
            <span className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800/80 px-2.5 py-1 rounded-lg">
              Últimos 6 meses
            </span>
          </div>
          <div className="w-full h-64 sm:h-72 relative -mx-1 sm:-mx-2">
            <IncomeExpenseBarChart incomes={incomes} expenses={expenses} />
          </div>
        </div>

        {/* Gráfico de Pizza - Despesas por Categoria */}
        <div className="bg-white dark:bg-zinc-900/60 backdrop-blur-md rounded-3xl p-5 md:p-6 border border-zinc-200/70 dark:border-white/10 shadow-xl flex flex-col justify-start min-h-[380px]">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-base font-bold text-zinc-900 dark:text-white tracking-tight flex items-center gap-2">
              <PieChartIcon size={18} className="text-indigo-500" />
              Despesas por Categoria
            </h3>
            <span className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 bg-zinc-100 dark:bg-zinc-800/80 px-2.5 py-1 rounded-lg">
              {selectedPeriod}
            </span>
          </div>
          <div className="w-full h-64 sm:h-72 relative">
            <ExpensesPieChart expenses={filteredExpenses} />
          </div>
        </div>

      </div>

      {/* Quick Navigation Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4 pt-2">
        <Link 
          to="/income" 
          className="bg-white dark:bg-zinc-900/60 backdrop-blur-md rounded-2xl p-4 border border-zinc-200/70 dark:border-white/10 shadow-xs hover:border-emerald-500/40 hover:shadow-md transition-all group flex items-center gap-3 cursor-pointer"
        >
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
            <Wallet size={19} strokeWidth={2.3} />
          </div>
          <div className="min-w-0">
            <div className="text-xs font-bold text-zinc-900 dark:text-white truncate">Receitas</div>
            <div className="text-[11px] text-zinc-400 truncate">Gerenciar entradas</div>
          </div>
        </Link>

        <Link 
          to="/expenses" 
          className="bg-white dark:bg-zinc-900/60 backdrop-blur-md rounded-2xl p-4 border border-zinc-200/70 dark:border-white/10 shadow-xs hover:border-rose-500/40 hover:shadow-md transition-all group flex items-center gap-3 cursor-pointer"
        >
          <div className="w-10 h-10 rounded-xl bg-rose-500/10 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
            <Receipt size={19} strokeWidth={2.3} />
          </div>
          <div className="min-w-0">
            <div className="text-xs font-bold text-zinc-900 dark:text-white truncate">Despesas</div>
            <div className="text-[11px] text-zinc-400 truncate">Contas e boletos</div>
          </div>
        </Link>

        <Link 
          to="/calendar" 
          className="bg-white dark:bg-zinc-900/60 backdrop-blur-md rounded-2xl p-4 border border-zinc-200/70 dark:border-white/10 shadow-xs hover:border-blue-500/40 hover:shadow-md transition-all group flex items-center gap-3 cursor-pointer"
        >
          <div className="w-10 h-10 rounded-xl bg-blue-500/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
            <Calendar size={19} strokeWidth={2.3} />
          </div>
          <div className="min-w-0">
            <div className="text-xs font-bold text-zinc-900 dark:text-white truncate">Calendário</div>
            <div className="text-[11px] text-zinc-400 truncate">Vencimentos do mês</div>
          </div>
        </Link>

        <Link 
          to="/investments" 
          className="bg-white dark:bg-zinc-900/60 backdrop-blur-md rounded-2xl p-4 border border-zinc-200/70 dark:border-white/10 shadow-xs hover:border-indigo-500/40 hover:shadow-md transition-all group flex items-center gap-3 cursor-pointer"
        >
          <div className="w-10 h-10 rounded-xl bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
            <TrendingUp size={19} strokeWidth={2.3} />
          </div>
          <div className="min-w-0">
            <div className="text-xs font-bold text-zinc-900 dark:text-white truncate">Investimentos</div>
            <div className="text-[11px] text-zinc-400 truncate">Aportes e carteira</div>
          </div>
        </Link>
      </div>
    </div>
  );
};
