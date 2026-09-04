import { useState, useEffect, useRef, useMemo } from 'react';
import { ArrowUpRight, ArrowDownRight, TrendingUp, Plus, ChevronDown, Check } from 'lucide-react';
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

export const Dashboard = () => {
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

  const cardBaseClasses = "bg-white/80 dark:bg-zinc-900/60 backdrop-blur-md border border-zinc-200/80 dark:border-white/10 shadow-md rounded-2xl sm:rounded-3xl p-4 sm:p-5 lg:p-6 flex flex-col justify-between transition-all duration-300 min-w-0 overflow-hidden";
  const labelClasses = "text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 truncate";

  const periods = ['Mês Atual', 'Mês Anterior', 'Últimos 3 meses', 'Últimos 6 meses'];

  return (
    <div className="w-full h-full flex flex-col animate-[fadeIn_0.3s_ease] overflow-y-auto p-3.5 sm:p-6 lg:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-6 sm:mb-8 gap-3 sm:gap-4">
        <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-zinc-900 dark:text-white">Visão Geral</h2>
        <div className="flex items-center gap-2.5 sm:gap-3">
          <Link to="/expenses" className="bg-[#34C759] hover:bg-[#30B753] text-white font-bold text-xs sm:text-sm px-3.5 sm:px-4 py-2 rounded-xl sm:rounded-full shadow-xs hover:shadow-md active:scale-95 transition-all flex items-center gap-1.5 cursor-pointer">
            <Plus size={16} strokeWidth={2.5} />
            <span>Nova Transação</span>
          </Link>
          
          <div className="relative z-30" ref={periodDropdownRef}>
            <button
              type="button"
              onClick={() => setIsPeriodDropdownOpen(!isPeriodDropdownOpen)}
              className="bg-white/80 dark:bg-zinc-800/80 hover:bg-zinc-100 dark:hover:bg-zinc-700/80 text-zinc-800 dark:text-zinc-200 border border-zinc-200/80 dark:border-zinc-700/60 text-xs font-semibold rounded-xl px-3 sm:px-3.5 py-2 outline-none flex items-center gap-2 transition-all shadow-xs cursor-pointer"
            >
              <span className="truncate">{selectedPeriod}</span>
              <ChevronDown size={14} className={`text-zinc-400 transition-transform duration-200 shrink-0 ${isPeriodDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {isPeriodDropdownOpen && (
              <div className="absolute right-0 mt-2 w-44 bg-white dark:bg-[#18181b] border border-zinc-200 dark:border-zinc-700 rounded-2xl p-1.5 shadow-2xl z-50 animate-[scaleIn_0.12s_ease]">
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
        </div>
      </div>
      
      {/* KPI Grid - Responsive 1 -> 2 -> 4 Columns */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3.5 sm:gap-4 lg:gap-5 mb-6 sm:mb-8">
        
        {/* Card 1: Saldo Atual */}
        <div className={`${cardBaseClasses} relative bg-white dark:bg-zinc-900`}>
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 dark:bg-blue-500/10 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none"></div>
          <p className={`${labelClasses} z-10`}>Saldo Atual</p>
          <h1 
            className="text-2xl sm:text-3xl lg:text-[1.85rem] font-black tabular-nums tracking-tight text-zinc-900 dark:text-white mt-2 truncate min-w-0 z-10" 
            title={formatBRL(balance)}
          >
            {loading ? '...' : formatBRL(balance)}
          </h1>
          <div className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-1 truncate">
            {selectedPeriod}
          </div>
        </div>

        {/* Card 2: Receitas Totais */}
        <div className={cardBaseClasses}>
          <div className="flex items-center gap-2 mb-2 min-w-0">
            <div className="bg-emerald-100/60 dark:bg-emerald-500/15 p-1.5 rounded-xl text-emerald-600 dark:text-emerald-400 shrink-0">
              <ArrowUpRight size={16} strokeWidth={2.8} /> 
            </div>
            <span className={labelClasses}>Receitas</span>
          </div>
          <h3 
            className="text-xl sm:text-2xl xl:text-[1.65rem] font-black tabular-nums tracking-tight text-emerald-600 dark:text-emerald-400 mt-1 truncate min-w-0" 
            title={formatBRL(totalIncome)}
          >
            {loading ? '...' : formatBRL(totalIncome)}
          </h3>
          <div className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-1 truncate">
            {filteredIncomes.length === 1 ? '1 entrada' : `${filteredIncomes.length} entradas`}
          </div>
        </div>

        {/* Card 3: Despesas Totais */}
        <div className={cardBaseClasses}>
          <div className="flex items-center gap-2 mb-2 min-w-0">
            <div className="bg-rose-100/60 dark:bg-rose-500/15 p-1.5 rounded-xl text-rose-600 dark:text-rose-400 shrink-0">
              <ArrowDownRight size={16} strokeWidth={2.8} /> 
            </div>
            <span className={labelClasses}>Despesas</span>
          </div>
          <h3 
            className="text-xl sm:text-2xl xl:text-[1.65rem] font-black tabular-nums tracking-tight text-rose-600 dark:text-rose-400 mt-1 truncate min-w-0" 
            title={formatBRL(totalExpense)}
          >
            {loading ? '...' : formatBRL(totalExpense)}
          </h3>
          <div className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-1 truncate">
            {filteredExpenses.length === 1 ? '1 conta no período' : `${filteredExpenses.length} contas no período`}
          </div>
        </div>

        {/* Card 4: Investimentos */}
        <Link to="/investments" className={`${cardBaseClasses} hover:border-indigo-400/50 hover:shadow-xl transition-all cursor-pointer group`}>
          <div className="flex items-center justify-between mb-2 min-w-0">
            <div className="flex items-center gap-2 min-w-0">
              <div className="bg-indigo-100/60 dark:bg-indigo-500/15 p-1.5 rounded-xl text-indigo-600 dark:text-indigo-400 group-hover:scale-110 transition-transform shrink-0">
                <TrendingUp size={16} strokeWidth={2.8} /> 
              </div>
              <span className={labelClasses}>Investimentos</span>
            </div>
            <ArrowUpRight size={14} className="text-zinc-400 group-hover:text-indigo-500 transition-colors shrink-0" />
          </div>
          <h3 
            className="text-xl sm:text-2xl xl:text-[1.65rem] font-black tabular-nums tracking-tight text-indigo-600 dark:text-indigo-400 mt-1 truncate min-w-0" 
            title={formatBRL(totalInvested)}
          >
            {loading ? '...' : formatBRL(totalInvested)}
          </h3>
          <span className="text-[11px] font-semibold text-zinc-500 dark:text-zinc-400 mt-1 truncate">
            {investments.length === 1 ? '1 ativo na carteira' : `${investments.length} ativos na carteira`}
          </span>
        </Link>

      </div>

      {/* Main Area - Charts Grid */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5 sm:gap-6 flex-1 min-h-[380px]">
        
        {/* Gráfico de Barras */}
        <div className={`${cardBaseClasses} justify-start`}>
          <h3 className="text-sm sm:text-[15px] font-bold text-zinc-900 dark:text-white mb-4 sm:mb-6 tracking-tight">Comparativo Mensal</h3>
          <div className="w-full h-64 sm:h-72 relative -mx-1 sm:-mx-2">
            <IncomeExpenseBarChart incomes={incomes} expenses={expenses} />
          </div>
        </div>

        {/* Gráfico de Pizza */}
        <div className={`${cardBaseClasses} justify-start`}>
          <h3 className="text-sm sm:text-[15px] font-bold text-zinc-900 dark:text-white mb-4 sm:mb-6 tracking-tight">Despesas por Categoria</h3>
          <div className="w-full h-64 sm:h-72 relative">
            <ExpensesPieChart expenses={filteredExpenses} />
          </div>
        </div>

      </div>
    </div>
  );
};
