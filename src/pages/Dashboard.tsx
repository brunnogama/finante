import { useState, useEffect } from 'react';
import { ArrowUpRight, ArrowDownRight, TrendingUp, Plus } from 'lucide-react';
import { Link } from 'react-router-dom';
import { getExpenses, getIncomes, supabase, type ExpenseRecord, type IncomeRecord } from '../services/supabase';
import { ExpensesPieChart } from '../components/widgets/ExpensesPieChart';
import { IncomeExpenseBarChart } from '../components/widgets/IncomeExpenseBarChart';

export const Dashboard = () => {
  const [totals, setTotals] = useState({ income: 0, expense: 0, balance: 0 });
  const [expenses, setExpenses] = useState<ExpenseRecord[]>([]);
  const [incomes, setIncomes] = useState<IncomeRecord[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
    
    const channel = supabase.channel('schema-db-changes-dashboard')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'expenses' }, () => fetchDashboardData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'incomes' }, () => fetchDashboardData())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchDashboardData = async () => {
    const exp = await getExpenses();
    const inc = await getIncomes();
    
    setExpenses(exp);
    setIncomes(inc);

    const totalIncome = inc.reduce((acc, curr) => acc + curr.amount, 0);
    const totalExpense = exp.reduce((acc, curr) => acc + curr.amount, 0);
    const balance = totalIncome - totalExpense;
    
    setTotals({ income: totalIncome, expense: totalExpense, balance });
    setLoading(false);
  };

  const formatBRL = (val: number) => val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  const cardBaseClasses = "bg-white/80 dark:bg-zinc-900/50 backdrop-blur-md border border-zinc-200/80 dark:border-white/10 shadow-xl rounded-3xl p-6 flex flex-col justify-center transition-all duration-300";
  const labelClasses = "text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400";
  const valueClasses = "text-3xl font-extrabold tabular-nums tracking-tight text-zinc-900 dark:text-white mt-1";

  return (
    <div className="w-full h-full flex flex-col animate-[fadeIn_0.3s_ease] overflow-y-auto p-4 md:p-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4 mt-2 md:mt-0">
        <h2 className="text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-white">Visão Geral</h2>
        <div className="flex items-center gap-3">
          <Link to="/expenses" className="bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 font-semibold text-xs md:text-sm px-4 py-2 rounded-full shadow-sm hover:bg-zinc-800 dark:hover:bg-zinc-200 active:scale-95 transition-all flex items-center gap-1.5">
            <Plus size={16} strokeWidth={2.5} />
            Nova Transação
          </Link>
          <select className="bg-white/70 dark:bg-zinc-900/60 backdrop-blur-md border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300 text-sm font-medium rounded-xl px-4 py-2 outline-none focus:border-zinc-400 dark:focus:border-zinc-600 transition-all cursor-pointer shadow-sm">
            <option className="bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100">Mês Atual</option>
            <option className="bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100">Mês Anterior</option>
            <option className="bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100">Últimos 3 meses</option>
          </select>
        </div>
      </div>
      
      {/* KPI Grid - Top Row */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6 mb-8">
        
        {/* Card 1: Saldo Atual */}
        <div className={`${cardBaseClasses} col-span-2 md:col-span-1 relative overflow-hidden bg-white dark:bg-zinc-900`}>
          <div className="absolute top-0 right-0 w-32 h-32 bg-blue-500/5 dark:bg-blue-500/10 rounded-full blur-3xl -mr-10 -mt-10 pointer-events-none"></div>
          <p className={`${labelClasses} z-10`}>Saldo Atual</p>
          <h1 className={`${valueClasses} z-10 text-[2rem] leading-tight`}>
            {loading ? '...' : formatBRL(totals.balance)}
          </h1>
        </div>

        {/* Card 2: Receitas Totais */}
        <div className={cardBaseClasses}>
          <div className="flex items-center gap-2 mb-2">
            <div className="bg-emerald-100/50 dark:bg-emerald-500/10 p-1.5 rounded-full text-emerald-600 dark:text-emerald-400">
              <ArrowUpRight size={16} strokeWidth={3} /> 
            </div>
            <span className={labelClasses}>Receitas</span>
          </div>
          <h3 className={`${valueClasses} text-[1.75rem] leading-tight`}>
            {loading ? '...' : formatBRL(totals.income)}
          </h3>
        </div>

        {/* Card 3: Despesas Totais */}
        <div className={cardBaseClasses}>
          <div className="flex items-center gap-2 mb-2">
            <div className="bg-rose-100/50 dark:bg-rose-500/10 p-1.5 rounded-full text-rose-600 dark:text-rose-400">
              <ArrowDownRight size={16} strokeWidth={3} /> 
            </div>
            <span className={labelClasses}>Despesas</span>
          </div>
          <h3 className={`${valueClasses} text-[1.75rem] leading-tight`}>
            {loading ? '...' : formatBRL(totals.expense)}
          </h3>
        </div>

        {/* Card 4: Investimentos */}
        <div className={`${cardBaseClasses} opacity-80 col-span-2 md:col-span-1`}>
          <div className="flex items-center gap-2 mb-2">
            <div className="bg-zinc-100 dark:bg-zinc-800 p-1.5 rounded-full text-zinc-600 dark:text-zinc-400">
              <TrendingUp size={16} strokeWidth={3} /> 
            </div>
            <span className={labelClasses}>Investimentos</span>
          </div>
          <h3 className={`${valueClasses} text-[1.75rem] leading-tight`}>
            R$ 0,00
          </h3>
          <span className="text-[11px] font-semibold text-zinc-500 mt-1 uppercase tracking-widest">Em breve</span>
        </div>

      </div>

      {/* Main Area - Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 flex-1 min-h-[400px]">
        
        {/* Gráfico de Barras */}
        <div className={`${cardBaseClasses} justify-start`}>
          <h3 className="text-[15px] font-bold text-zinc-900 dark:text-white mb-6 tracking-tight">Comparativo Mensal</h3>
          <div className="flex-1 min-h-[280px] relative -mx-2">
            <IncomeExpenseBarChart incomes={incomes} expenses={expenses} />
          </div>
        </div>

        {/* Gráfico de Pizza */}
        <div className={`${cardBaseClasses} justify-start`}>
          <h3 className="text-[15px] font-bold text-zinc-900 dark:text-white mb-6 tracking-tight">Despesas por Categoria</h3>
          <div className="flex-1 min-h-[280px] relative">
            <ExpensesPieChart expenses={expenses} />
          </div>
        </div>

      </div>
    </div>
  );
};
