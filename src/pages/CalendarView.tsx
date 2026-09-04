import React, { useState, useEffect, useMemo } from 'react';
import { 
  Calendar as CalendarIcon, 
  ChevronLeft, 
  ChevronRight, 
  ArrowDownRight, 
  Clock, 
  X,
  Plus,
  TrendingUp,
  Wallet
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  isSameMonth, 
  isToday,
  isSameDay,
  startOfWeek, 
  endOfWeek 
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { getExpenses, getIncomes, supabase, type ExpenseRecord, type IncomeRecord } from '../services/supabase';
import { CategoryIcon } from '../components/CategoryIcon';

export const CalendarView: React.FC = () => {
  const [expenses, setExpenses] = useState<ExpenseRecord[]>([]);
  const [incomes, setIncomes] = useState<IncomeRecord[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchData();
    
    const channel = supabase
      .channel('schema-db-changes-calendar')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'expenses' }, () => fetchData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'incomes' }, () => fetchData())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchData = async () => {
    setLoading(true);
    const [expData, incData] = await Promise.all([getExpenses(), getIncomes()]);
    setExpenses(expData);
    setIncomes(incData);
    setLoading(false);
  };

  const nextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    setSelectedDay(null);
  };

  const prevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    setSelectedDay(null);
  };

  const goToToday = () => {
    const today = new Date();
    setCurrentDate(today);
    setSelectedDay(today);
  };

  // Calendar calculations
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart, { weekStartsOn: 0 }); // Sunday
  const endDate = endOfWeek(monthEnd, { weekStartsOn: 0 });
  const calendarDays = eachDayOfInterval({ start: startDate, end: endDate });

  // Map expenses by YYYY-MM-DD
  const expensesByDate = useMemo(() => {
    const map: Record<string, ExpenseRecord[]> = {};
    expenses.forEach(item => {
      const dateStr = (item.due_date || '').split('T')[0];
      if (dateStr) {
        if (!map[dateStr]) map[dateStr] = [];
        map[dateStr].push(item);
      }
    });
    return map;
  }, [expenses]);

  // Current month expenses
  const currentMonthExpenses = useMemo(() => {
    return expenses
      .filter(e => {
        if (!e.due_date) return false;
        const d = new Date(e.due_date + 'T00:00:00');
        return !isNaN(d.getTime()) && isSameMonth(d, monthStart);
      })
      .sort((a, b) => new Date(a.due_date).getTime() - new Date(b.due_date).getTime());
  }, [expenses, monthStart]);

  // Current month incomes
  const currentMonthIncomes = useMemo(() => {
    return incomes
      .filter(i => {
        if (!i.date) return false;
        const d = new Date(i.date + 'T00:00:00');
        return !isNaN(d.getTime()) && isSameMonth(d, monthStart);
      });
  }, [incomes, monthStart]);

  // Current month statistics
  const stats = useMemo(() => {
    const totalExpenses = currentMonthExpenses.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
    const totalIncomes = currentMonthIncomes.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
    const projectedBalance = totalIncomes - totalExpenses;
    
    const paidExpenses = currentMonthExpenses.filter(e => 
      e.status === 'paid' || (e.paid_amount !== undefined && Number(e.paid_amount) >= Number(e.amount))
    );
    const totalPaid = paidExpenses.reduce((acc, curr) => 
      acc + (curr.paid_amount !== undefined ? Number(curr.paid_amount) : Number(curr.amount)), 0
    );

    const pendingExpenses = currentMonthExpenses.filter(e => 
      e.status !== 'paid' && (!e.paid_amount || Number(e.paid_amount) < Number(e.amount))
    );
    const totalPending = pendingExpenses.reduce((acc, curr) => {
      const remaining = Number(curr.amount) - (Number(curr.paid_amount) || 0);
      return acc + Math.max(0, remaining);
    }, 0);

    return {
      totalExpenses,
      totalIncomes,
      projectedBalance,
      totalPaid,
      totalPending,
      count: currentMonthExpenses.length,
      paidCount: paidExpenses.length,
      pendingCount: pendingExpenses.length,
    };
  }, [currentMonthExpenses, currentMonthIncomes]);

  // Filtered expenses for side panel
  const displayedExpenses = useMemo(() => {
    if (!selectedDay) return currentMonthExpenses;
    const dayKey = format(selectedDay, 'yyyy-MM-dd');
    return expensesByDate[dayKey] || [];
  }, [selectedDay, currentMonthExpenses, expensesByDate]);

  const formatCurrency = (val: number) => {
    return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const isCurrentMonthActive = isSameMonth(currentDate, new Date());

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6 animate-fadeIn pb-24 md:pb-8">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-zinc-900 dark:text-white flex items-center gap-2.5">
            <span className="w-9 h-9 rounded-xl bg-[#3584e4]/10 text-[#3584e4] flex items-center justify-center">
              <CalendarIcon size={20} strokeWidth={2.3} />
            </span>
            Calendário
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            Visão mensal de vencimentos e controle de despesas por data
          </p>
        </div>

        <div className="flex items-center gap-2.5">
          {/* Month Navigation Pill */}
          <div className="flex items-center bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-xl p-1 shadow-xs">
            <button
              type="button"
              onClick={prevMonth}
              className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 text-zinc-700 dark:text-zinc-300 transition-colors cursor-pointer"
              title="Mês anterior"
            >
              <ChevronLeft size={18} />
            </button>
            <span className="font-bold text-xs sm:text-sm text-zinc-800 dark:text-zinc-100 px-3 min-w-[130px] sm:min-w-[150px] text-center capitalize select-none">
              {format(currentDate, 'MMMM yyyy', { locale: ptBR })}
            </span>
            <button
              type="button"
              onClick={nextMonth}
              className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 text-zinc-700 dark:text-zinc-300 transition-colors cursor-pointer"
              title="Próximo mês"
            >
              <ChevronRight size={18} />
            </button>
          </div>

          {!isCurrentMonthActive && (
            <button
              type="button"
              onClick={goToToday}
              className="adw-btn text-xs font-semibold px-3 py-2 cursor-pointer"
            >
              Hoje
            </button>
          )}

          <Link
            to="/expenses"
            className="adw-btn suggested-action text-xs sm:text-sm inline-flex items-center gap-1.5 px-3.5 py-2 cursor-pointer"
          >
            <Plus size={16} strokeWidth={2.5} />
            <span>Nova Despesa</span>
          </Link>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3.5 sm:gap-4">
        {/* Total Despesas */}
        <div className="adw-card p-4 sm:p-5 relative overflow-hidden min-w-0">
          <div className="flex items-center justify-between mb-2 min-w-0">
            <span className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 truncate">
              Despesas
            </span>
            <div className="w-8 h-8 rounded-xl bg-[#e01b24]/10 text-[#e01b24] flex items-center justify-center shrink-0">
              <ArrowDownRight size={17} strokeWidth={2.5} />
            </div>
          </div>
          <div className="text-xl sm:text-2xl xl:text-3xl font-bold text-[#e01b24] tracking-tight truncate min-w-0" title={formatCurrency(stats.totalExpenses)}>
            {formatCurrency(stats.totalExpenses)}
          </div>
          <div className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-1 truncate">
            {stats.count === 1 ? '1 vencimento' : `${stats.count} vencimentos`}
          </div>
        </div>

        {/* Receitas */}
        <div className="adw-card p-4 sm:p-5 relative overflow-hidden min-w-0">
          <div className="flex items-center justify-between mb-2 min-w-0">
            <span className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 truncate">
              Receitas
            </span>
            <div className="w-8 h-8 rounded-xl bg-[#2ec27e]/10 text-[#2ec27e] flex items-center justify-center shrink-0">
              <TrendingUp size={17} strokeWidth={2.5} />
            </div>
          </div>
          <div className="text-xl sm:text-2xl xl:text-3xl font-bold text-[#2ec27e] tracking-tight truncate min-w-0" title={formatCurrency(stats.totalIncomes)}>
            {formatCurrency(stats.totalIncomes)}
          </div>
          <div className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-1 truncate">
            {currentMonthIncomes.length === 1 ? '1 entrada' : `${currentMonthIncomes.length} entradas`}
          </div>
        </div>

        {/* Sobra Prevista */}
        <div className="adw-card p-4 sm:p-5 relative overflow-hidden min-w-0">
          <div className="flex items-center justify-between mb-2 min-w-0">
            <span className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 truncate">
              Sobra Prevista
            </span>
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
              stats.projectedBalance >= 0 
                ? 'bg-[#3584e4]/10 text-[#3584e4]' 
                : 'bg-[#e01b24]/10 text-[#e01b24]'
            }`}>
              <Wallet size={17} strokeWidth={2.5} />
            </div>
          </div>
          <div className={`text-xl sm:text-2xl xl:text-3xl font-bold tracking-tight truncate min-w-0 ${
            stats.projectedBalance >= 0 
              ? 'text-zinc-900 dark:text-white' 
              : 'text-[#e01b24]'
          }`} title={formatCurrency(stats.projectedBalance)}>
            {formatCurrency(stats.projectedBalance)}
          </div>
          <div className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-1 truncate">
            {stats.projectedBalance >= 0 ? 'Balanço positivo' : 'Atenção ao saldo'}
          </div>
        </div>

        {/* A Pagar / Pendente */}
        <div className="adw-card p-4 sm:p-5 relative overflow-hidden min-w-0">
          <div className="flex items-center justify-between mb-2 min-w-0">
            <span className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 truncate">
              A Pagar
            </span>
            <div className="w-8 h-8 rounded-xl bg-[#e5a50a]/10 text-[#e5a50a] flex items-center justify-center shrink-0">
              <Clock size={17} strokeWidth={2.5} />
            </div>
          </div>
          <div className="text-xl sm:text-2xl xl:text-3xl font-bold text-[#e5a50a] tracking-tight truncate min-w-0" title={formatCurrency(stats.totalPending)}>
            {formatCurrency(stats.totalPending)}
          </div>
          <div className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-1 truncate">
            {stats.paidCount}/{stats.count} pagas ({formatCurrency(stats.totalPaid)} pago)
          </div>
        </div>
      </div>

      {/* Main Grid: Calendar + Side List */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Calendar Card (Col 8) */}
        <div className="lg:col-span-8 adw-card p-4 sm:p-6">
          {/* Days of Week Header */}
          <div className="grid grid-cols-7 gap-1.5 sm:gap-2 mb-3 text-center text-[11px] sm:text-xs font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
            {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(day => (
              <div key={day} className="py-1">{day}</div>
            ))}
          </div>

          {/* Calendar Grid */}
          <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
            {calendarDays.map((day) => {
              const dayKey = format(day, 'yyyy-MM-dd');
              const isCurrentMonth = isSameMonth(day, monthStart);
              const isDayToday = isToday(day);
              const isSelected = selectedDay ? isSameDay(day, selectedDay) : false;
              
              const dayExpList = expensesByDate[dayKey] || [];
              const dayTotalSpent = dayExpList.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
              const allDayPaid = dayExpList.length > 0 && dayExpList.every(e => 
                e.status === 'paid' || (e.paid_amount !== undefined && Number(e.paid_amount) >= Number(e.amount))
              );

              return (
                <button
                  key={day.toString()}
                  type="button"
                  onClick={() => {
                    if (isSelected) {
                      setSelectedDay(null);
                    } else {
                      setSelectedDay(day);
                    }
                  }}
                  className={`min-h-[78px] sm:min-h-[92px] p-1.5 sm:p-2 rounded-xl flex flex-col items-center justify-between text-left transition-all duration-150 cursor-pointer relative overflow-hidden ${
                    isSelected
                      ? 'ring-2 ring-[#3584e4] bg-[#3584e4]/15 border-transparent shadow-xs'
                      : isCurrentMonth
                        ? 'bg-black/[0.02] dark:bg-white/[0.04] border border-black/5 dark:border-white/5 hover:bg-black/[0.05] dark:hover:bg-white/[0.08] hover:border-black/10 dark:hover:border-white/10'
                        : 'opacity-25 bg-transparent border border-transparent cursor-default'
                  }`}
                >
                  {/* Day Number Header */}
                  <div className="w-full flex items-center justify-between">
                    <span className={`text-xs font-bold w-6 h-6 sm:w-7 sm:h-7 rounded-full flex items-center justify-center transition-all ${
                      isDayToday
                        ? 'bg-[#3584e4] text-white shadow-xs'
                        : isSelected
                          ? 'text-[#3584e4] font-extrabold'
                          : isCurrentMonth
                            ? 'text-zinc-700 dark:text-zinc-300'
                            : 'text-zinc-400 dark:text-zinc-600'
                    }`}>
                      {format(day, 'd')}
                    </span>

                    {/* Status Dot */}
                    {dayExpList.length > 0 && (
                      <span className={`w-2 h-2 rounded-full ${allDayPaid ? 'bg-[#2ec27e]' : 'bg-[#e01b24]'}`} />
                    )}
                  </div>

                  {/* Expense Amount Pill */}
                  {dayTotalSpent > 0 && isCurrentMonth && (
                    <div className={`w-full mt-auto text-center rounded-lg px-1 py-0.5 text-[10px] sm:text-[11px] font-bold truncate transition-colors ${
                      allDayPaid
                        ? 'bg-[#2ec27e]/15 text-[#2ec27e] border border-[#2ec27e]/20'
                        : 'bg-[#e01b24]/15 text-[#e01b24] border border-[#e01b24]/20'
                    }`}>
                      {dayTotalSpent < 1000 
                        ? `R$ ${dayTotalSpent.toFixed(0)}` 
                        : `R$ ${(dayTotalSpent / 1000).toFixed(1)}k`}
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Side Panel: Vencimentos do Mês ou Dia Selecionado (Col 4) */}
        <div className="lg:col-span-4 adw-card p-5 flex flex-col max-h-[620px]">
          
          {/* Panel Header */}
          <div className="flex items-center justify-between pb-4 mb-3 border-b border-black/5 dark:border-white/5">
            <div>
              <h2 className="text-base font-bold text-zinc-900 dark:text-white">
                {selectedDay ? format(selectedDay, "dd 'de' MMMM", { locale: ptBR }) : 'Despesas do Mês'}
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                {displayedExpenses.length === 1 
                  ? '1 lançamento encontrado' 
                  : `${displayedExpenses.length} lançamentos encontrados`}
              </p>
            </div>

            {selectedDay && (
              <button
                type="button"
                onClick={() => setSelectedDay(null)}
                className="text-xs font-semibold text-[#3584e4] hover:underline flex items-center gap-1 cursor-pointer"
              >
                <X size={14} />
                <span>Ver Todos</span>
              </button>
            )}
          </div>

          {/* List Area */}
          <div className="space-y-2 overflow-y-auto pr-1 flex-1">
            {displayedExpenses.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-48 text-center text-zinc-400 dark:text-zinc-500">
                <CalendarIcon size={36} strokeWidth={1.5} className="mb-2 opacity-40" />
                <p className="text-sm font-semibold">Nenhum vencimento</p>
                <p className="text-xs mt-0.5 opacity-75">
                  {selectedDay ? 'Não há despesas para este dia.' : 'Nenhuma despesa para este mês.'}
                </p>
              </div>
            ) : (
              displayedExpenses.map((expense) => {
                const isPaid = expense.status === 'paid' || 
                  (expense.paid_amount !== undefined && Number(expense.paid_amount) >= Number(expense.amount));

                return (
                  <div
                    key={expense.id}
                    className="bg-black/[0.03] dark:bg-white/[0.04] hover:bg-black/[0.06] dark:hover:bg-white/[0.08] border border-black/5 dark:border-white/5 rounded-xl p-3 flex items-center justify-between transition-all gap-3"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <CategoryIcon type={expense.type} size={16} />
                      <div className="min-w-0">
                        <p className="text-xs sm:text-sm font-bold text-zinc-900 dark:text-white truncate">
                          {expense.description || expense.company}
                        </p>
                        <div className="flex items-center gap-1.5 mt-0.5">
                          <span className="text-[11px] text-zinc-400 dark:text-zinc-500">
                            {format(new Date(expense.due_date + 'T00:00:00'), "dd 'de' MMM", { locale: ptBR })}
                          </span>
                          <span className="text-[10px] text-zinc-300 dark:text-zinc-600">•</span>
                          <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded-md ${
                            isPaid 
                              ? 'bg-[#2ec27e]/15 text-[#2ec27e]' 
                              : 'bg-[#e5a50a]/15 text-[#e5a50a]'
                          }`}>
                            {isPaid ? 'Pago' : 'A Pagar'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <span className="font-bold text-xs sm:text-sm text-[#e01b24] tabular-nums shrink-0">
                      {formatCurrency(expense.amount)}
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>

      </div>

      {loading && (
        <div className="text-center text-xs text-zinc-400 dark:text-zinc-500 py-2">
          Atualizando dados em tempo real...
        </div>
      )}

    </div>
  );
};
