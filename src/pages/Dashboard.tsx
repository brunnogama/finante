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
import { PaymentPunctualityChart } from '../components/widgets/PaymentPunctualityChart';
import { CheckCircle2 } from 'lucide-react';

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
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-5 animate-fadeIn pb-24 md:pb-8">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight text-zinc-900 dark:text-white flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-lg bg-[#3584e4]/10 dark:bg-[#3584e4]/20 text-[#3584e4] flex items-center justify-center shrink-0">
              <LayoutDashboard size={18} strokeWidth={2.3} />
            </span>
            Visão Geral
          </h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            Resumo consolidado de receitas, despesas, saldo e investimentos
          </p>
        </div>

        <div className="flex items-center gap-2.5 sm:gap-3 flex-wrap sm:flex-nowrap">
          {/* Period Selector Dropdown */}
          <div className="relative z-30" ref={periodDropdownRef}>
            <button
              type="button"
              onClick={() => setIsPeriodDropdownOpen(!isPeriodDropdownOpen)}
              className="bg-black/5 dark:bg-white/5 hover:bg-black/10 dark:hover:bg-white/10 text-zinc-800 dark:text-zinc-200 border border-black/10 dark:border-white/10 text-xs sm:text-sm font-semibold rounded-lg px-3 py-2 outline-none flex items-center gap-2 transition-all cursor-pointer"
            >
              <Calendar size={14} className="text-[#3584e4] shrink-0" />
              <span className="truncate">{selectedPeriod}</span>
              <ChevronDown size={14} className={`text-zinc-400 transition-transform duration-200 shrink-0 ${isPeriodDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {isPeriodDropdownOpen && (
              <div className="absolute right-0 mt-2 w-52 adw-popover rounded-xl p-1.5 shadow-2xl z-50 animate-[scaleIn_0.12s_ease]">
                {periods.map(p => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => {
                      setSelectedPeriod(p);
                      setIsPeriodDropdownOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 rounded-lg text-sm font-semibold flex items-center justify-between transition-colors cursor-pointer ${
                      selectedPeriod === p 
                        ? 'bg-[#3584e4] text-white font-bold' 
                        : 'text-zinc-700 dark:text-zinc-300 hover:bg-black/5 dark:hover:bg-white/10'
                    }`}
                  >
                    <span>{p}</span>
                    {selectedPeriod === p && <Check size={16} className="text-white" />}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Quick Action Button */}
          <Link
            to="/expenses"
            className="adw-btn suggested-action"
          >
            <Plus size={16} strokeWidth={2.5} />
            <span>Nova Despesa</span>
          </Link>
        </div>
      </div>
      
      {/* Summary KPI Cards - 1 -> 2 -> 4 Columns */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
        
        {/* Card 1: Saldo Líquido */}
        <div className="bg-white dark:bg-white/[0.06] rounded-xl p-4 sm:p-5 border border-black/10 dark:border-white/10 shadow-xs relative overflow-hidden min-w-0 transition-all duration-150">
          <div className="flex items-center justify-between mb-2 min-w-0">
            <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 truncate">
              Saldo Líquido
            </span>
            <div className="w-7 h-7 rounded-lg bg-[#3584e4]/10 dark:bg-[#3584e4]/20 text-[#3584e4] flex items-center justify-center shrink-0">
              <Wallet size={15} strokeWidth={2.5} />
            </div>
          </div>
          <div 
            className={`text-xl sm:text-2xl font-bold tracking-tight truncate min-w-0 ${
              balance >= 0 ? 'text-zinc-900 dark:text-white' : 'text-[#e01b24]'
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
        <div className="bg-white dark:bg-white/[0.06] rounded-xl p-4 sm:p-5 border border-black/10 dark:border-white/10 shadow-xs relative overflow-hidden min-w-0 transition-all duration-150">
          <div className="flex items-center justify-between mb-2 min-w-0">
            <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 truncate">
              Receitas
            </span>
            <div className="w-7 h-7 rounded-lg bg-[#2ec27e]/10 dark:bg-[#2ec27e]/20 text-[#2ec27e] flex items-center justify-center shrink-0">
              <ArrowUpRight size={15} strokeWidth={2.5} />
            </div>
          </div>
          <div 
            className="text-xl sm:text-2xl font-bold text-[#2ec27e] tracking-tight truncate min-w-0" 
            title={formatBRL(totalIncome)}
          >
            {loading ? '...' : formatBRL(totalIncome)}
          </div>
          <div className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-1 truncate">
            {filteredIncomes.length === 1 ? '1 entrada no período' : `${filteredIncomes.length} entradas no período`}
          </div>
        </div>

        {/* Card 3: Despesas Totais */}
        <div className="bg-white dark:bg-white/[0.06] rounded-xl p-4 sm:p-5 border border-black/10 dark:border-white/10 shadow-xs relative overflow-hidden min-w-0 transition-all duration-150">
          <div className="flex items-center justify-between mb-2 min-w-0">
            <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 truncate">
              Despesas
            </span>
            <div className="w-7 h-7 rounded-lg bg-[#e01b24]/10 dark:bg-[#e01b24]/20 text-[#e01b24] flex items-center justify-center shrink-0">
              <ArrowDownRight size={15} strokeWidth={2.5} />
            </div>
          </div>
          <div 
            className="text-xl sm:text-2xl font-bold text-[#e01b24] tracking-tight truncate min-w-0" 
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
          className="bg-white dark:bg-white/[0.06] rounded-xl p-4 sm:p-5 border border-black/10 dark:border-white/10 shadow-xs relative overflow-hidden min-w-0 transition-all duration-150 hover:bg-black/5 dark:hover:bg-white/10 group block cursor-pointer"
        >
          <div className="flex items-center justify-between mb-2 min-w-0">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 truncate">
                Investimentos
              </span>
              <ArrowRight size={12} className="text-zinc-400 opacity-0 group-hover:opacity-100 transition-opacity" />
            </div>
            <div className="w-7 h-7 rounded-lg bg-[#9141ac]/10 dark:bg-[#9141ac]/20 text-[#9141ac] flex items-center justify-center shrink-0 group-hover:scale-105 transition-transform">
              <Layers size={15} strokeWidth={2.5} />
            </div>
          </div>
          <div 
            className="text-xl sm:text-2xl font-bold text-[#9141ac] tracking-tight truncate min-w-0" 
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
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        
        {/* Gráfico de Barras - Comparativo Mensal */}
        <div className="bg-white dark:bg-white/[0.06] rounded-xl p-5 border border-black/10 dark:border-white/10 shadow-xs flex flex-col justify-start min-h-[360px]">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-zinc-900 dark:text-white tracking-tight flex items-center gap-2">
              <BarChart3 size={16} className="text-[#2ec27e]" />
              Comparativo Mensal
            </h3>
            <span className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 bg-black/5 dark:bg-white/10 px-2 py-0.5 rounded-md">
              Últimos 6 meses
            </span>
          </div>
          <div className="w-full h-64 relative -mx-1 sm:-mx-2">
            <IncomeExpenseBarChart incomes={incomes} expenses={expenses} />
          </div>
        </div>

        {/* Gráfico de Pizza - Despesas por Categoria */}
        <div className="bg-white dark:bg-white/[0.06] rounded-xl p-5 border border-black/10 dark:border-white/10 shadow-xs flex flex-col justify-start min-h-[360px]">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-zinc-900 dark:text-white tracking-tight flex items-center gap-2">
              <PieChartIcon size={16} className="text-[#3584e4]" />
              Despesas por Categoria
            </h3>
            <span className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 bg-black/5 dark:bg-white/10 px-2 py-0.5 rounded-md">
              {selectedPeriod}
            </span>
          </div>
          <div className="w-full h-64 relative">
            <ExpensesPieChart expenses={filteredExpenses} />
          </div>
        </div>

        {/* Gráfico 3: Pontualidade de Pagamentos & Multas */}
        <div className="bg-white dark:bg-white/[0.06] rounded-xl p-5 border border-black/10 dark:border-white/10 shadow-xs flex flex-col justify-start xl:col-span-2">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-bold text-zinc-900 dark:text-white tracking-tight flex items-center gap-2">
              <CheckCircle2 size={16} className="text-[#2ec27e]" />
              Pontualidade de Pagamentos & Juros
            </h3>
            <span className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 bg-black/5 dark:bg-white/10 px-2 py-0.5 rounded-md">
              {selectedPeriod}
            </span>
          </div>
          <div className="w-full">
            <PaymentPunctualityChart expenses={filteredExpenses} />
          </div>
        </div>

      </div>

      {/* Quick Navigation Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 pt-1">
        <Link 
          to="/income" 
          className="bg-white dark:bg-white/[0.06] rounded-xl p-3.5 border border-black/10 dark:border-white/10 shadow-xs hover:bg-black/5 dark:hover:bg-white/10 transition-all flex items-center gap-3 cursor-pointer"
        >
          <div className="w-8 h-8 rounded-lg bg-[#2ec27e]/10 dark:bg-[#2ec27e]/20 text-[#2ec27e] flex items-center justify-center shrink-0">
            <Wallet size={16} strokeWidth={2.3} />
          </div>
          <div className="min-w-0">
            <div className="text-xs font-bold text-zinc-900 dark:text-white truncate">Receitas</div>
            <div className="text-[10px] text-zinc-400 truncate">Gerenciar entradas</div>
          </div>
        </Link>

        <Link 
          to="/expenses" 
          className="bg-white dark:bg-white/[0.06] rounded-xl p-3.5 border border-black/10 dark:border-white/10 shadow-xs hover:bg-black/5 dark:hover:bg-white/10 transition-all flex items-center gap-3 cursor-pointer"
        >
          <div className="w-8 h-8 rounded-lg bg-[#e01b24]/10 dark:bg-[#e01b24]/20 text-[#e01b24] flex items-center justify-center shrink-0">
            <Receipt size={16} strokeWidth={2.3} />
          </div>
          <div className="min-w-0">
            <div className="text-xs font-bold text-zinc-900 dark:text-white truncate">Despesas</div>
            <div className="text-[10px] text-zinc-400 truncate">Contas e boletos</div>
          </div>
        </Link>

        <Link 
          to="/calendar" 
          className="bg-white dark:bg-white/[0.06] rounded-xl p-3.5 border border-black/10 dark:border-white/10 shadow-xs hover:bg-black/5 dark:hover:bg-white/10 transition-all flex items-center gap-3 cursor-pointer"
        >
          <div className="w-8 h-8 rounded-lg bg-[#3584e4]/10 dark:bg-[#3584e4]/20 text-[#3584e4] flex items-center justify-center shrink-0">
            <Calendar size={16} strokeWidth={2.3} />
          </div>
          <div className="min-w-0">
            <div className="text-xs font-bold text-zinc-900 dark:text-white truncate">Calendário</div>
            <div className="text-[10px] text-zinc-400 truncate">Vencimentos do mês</div>
          </div>
        </Link>

        <Link 
          to="/investments" 
          className="bg-white dark:bg-white/[0.06] rounded-xl p-3.5 border border-black/10 dark:border-white/10 shadow-xs hover:bg-black/5 dark:hover:bg-white/10 transition-all flex items-center gap-3 cursor-pointer"
        >
          <div className="w-8 h-8 rounded-lg bg-[#9141ac]/10 dark:bg-[#9141ac]/20 text-[#9141ac] flex items-center justify-center shrink-0">
            <TrendingUp size={16} strokeWidth={2.3} />
          </div>
          <div className="min-w-0">
            <div className="text-xs font-bold text-zinc-900 dark:text-white truncate">Investimentos</div>
            <div className="text-[10px] text-zinc-400 truncate">Aportes e carteira</div>
          </div>
        </Link>
      </div>
    </div>
  );
};
