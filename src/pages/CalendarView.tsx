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
  Wallet,
  Edit2,
  Trash2,
  CheckCircle2,
  CreditCard,
  Calendar,
  Check
} from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
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
import { 
  getExpenses, 
  getIncomes, 
  deleteExpense, 
  updateExpense, 
  supabase, 
  type ExpenseRecord, 
  type IncomeRecord 
} from '../services/supabase';
import { CategoryIcon } from '../components/CategoryIcon';
import { SwipeableExpenseItem } from '../components/SwipeableExpenseItem';

export const CalendarView: React.FC = () => {
  const navigate = useNavigate();
  const [expenses, setExpenses] = useState<ExpenseRecord[]>([]);
  const [incomes, setIncomes] = useState<IncomeRecord[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [selectedDay, setSelectedDay] = useState<Date | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedExpense, setSelectedExpense] = useState<ExpenseRecord | null>(null);
  const [deleteConfirmExpense, setDeleteConfirmExpense] = useState<ExpenseRecord | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    fetchData();
    
    const channel = supabase
      .channel('schema-db-changes-calendar')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'expenses' }, () => fetchData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'incomes' }, () => fetchData())
      .subscribe();

    const handleRefresh = () => {
      fetchData();
    };
    window.addEventListener('finante_refresh_expenses', handleRefresh);

    return () => {
      supabase.removeChannel(channel);
      window.removeEventListener('finante_refresh_expenses', handleRefresh);
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

  const formatDateBR = (dateStr: string) => {
    if (!dateStr) return '';
    const parts = dateStr.split('-');
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateStr;
  };

  const getDueDateStatus = (dueDateStr: string, isPaid: boolean) => {
    if (isPaid) return { label: 'Quitada', color: 'text-emerald-700 dark:text-emerald-300 bg-emerald-100/80 dark:bg-emerald-500/20' };
    
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const due = new Date(dueDateStr + 'T00:00:00');
    
    const diffTime = due.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return { label: `Atrasada (${Math.abs(diffDays)}d)`, color: 'text-rose-700 dark:text-rose-300 bg-rose-100/80 dark:bg-rose-500/20' };
    if (diffDays === 0) return { label: 'Vence Hoje', color: 'text-amber-700 dark:text-amber-300 bg-amber-100/80 dark:bg-amber-500/20' };
    if (diffDays === 1) return { label: 'Vence Amanhã', color: 'text-amber-700 dark:text-amber-300 bg-amber-100/80 dark:bg-amber-500/20' };
    return { label: `Em ${diffDays} dias`, color: 'text-zinc-600 dark:text-zinc-300 bg-zinc-100 dark:bg-zinc-800' };
  };

  const handleQuickPayFull = async (expense: ExpenseRecord) => {
    if (!expense.id) return;
    try {
      const today = new Date().toISOString().split('T')[0];
      await updateExpense(expense.id, {
        paid_amount: expense.amount,
        paid_date: today,
        status: 'paid'
      });
      setSelectedExpense(null);
      await fetchData();
    } catch (err) {
      console.error('Erro ao quitar despesa:', err);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deleteConfirmExpense?.id) return;
    setIsDeleting(true);
    try {
      await deleteExpense(deleteConfirmExpense.id);
      setDeleteConfirmExpense(null);
      if (selectedExpense?.id === deleteConfirmExpense.id) {
        setSelectedExpense(null);
      }
      await fetchData();
    } catch (err) {
      console.error('Erro ao excluir despesa:', err);
    } finally {
      setIsDeleting(false);
    }
  };

  const handleEditExpense = (expense: ExpenseRecord) => {
    setSelectedExpense(null);
    navigate('/expenses', { state: { editExpenseId: expense.id } });
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
      .sort((a, b) => (a.due_date || '').localeCompare(b.due_date || ''));
  }, [expenses, monthStart]);

  // Current month incomes
  const currentMonthIncomes = useMemo(() => {
    return incomes.filter(i => {
      if (!i.date) return false;
      const d = new Date(i.date + 'T00:00:00');
      return !isNaN(d.getTime()) && isSameMonth(d, monthStart);
    });
  }, [incomes, monthStart]);

  // Monthly stats
  const stats = useMemo(() => {
    const totalExpenses = currentMonthExpenses.reduce((acc, e) => acc + Number(e.amount || 0), 0);
    const totalPaid = currentMonthExpenses.reduce((acc, e) => acc + Number(e.paid_amount || 0), 0);
    const totalPending = Math.max(0, totalExpenses - totalPaid);
    const paidCount = currentMonthExpenses.filter(e => {
      const amt = Number(e.amount || 0);
      const paid = Number(e.paid_amount || 0);
      return e.status === 'paid' || (amt > 0 && (amt - paid) <= 0);
    }).length;

    const totalIncomes = currentMonthIncomes.reduce((acc, i) => acc + Number(i.amount || 0), 0);
    const projectedBalance = totalIncomes - totalExpenses;

    return {
      totalExpenses,
      totalPaid,
      totalPending,
      count: currentMonthExpenses.length,
      paidCount,
      totalIncomes,
      projectedBalance
    };
  }, [currentMonthExpenses, currentMonthIncomes]);

  // Filtered expenses for side panel
  const displayedExpenses = useMemo(() => {
    if (selectedDay) {
      const key = format(selectedDay, 'yyyy-MM-dd');
      return expensesByDate[key] || [];
    }
    return currentMonthExpenses;
  }, [selectedDay, expensesByDate, currentMonthExpenses]);

  const formatCurrency = (val: number) => {
    return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6 animate-fadeIn pb-24 md:pb-8">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-zinc-900 dark:text-white capitalize">
              {format(currentDate, 'MMMM yyyy', { locale: ptBR })}
            </h1>
            <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-black/5 dark:bg-white/10 text-zinc-600 dark:text-zinc-400">
              Calendário
            </span>
          </div>
          <p className="text-xs sm:text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            Planejamento visual de vencimentos de contas e previsão de despesas do mês
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={goToToday}
            className="adw-btn text-xs font-semibold px-3 py-1.5 cursor-pointer"
          >
            Hoje
          </button>

          <div className="inline-flex rounded-xl bg-black/5 dark:bg-white/5 p-1 border border-black/5 dark:border-white/5">
            <button
              type="button"
              onClick={prevMonth}
              className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 text-zinc-600 dark:text-zinc-300 transition-colors cursor-pointer"
              title="Mês Anterior"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              type="button"
              onClick={nextMonth}
              className="p-1.5 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 text-zinc-600 dark:text-zinc-300 transition-colors cursor-pointer"
              title="Próximo Mês"
            >
              <ChevronRight size={18} />
            </button>
          </div>

          <Link
            to="/expenses"
            className="adw-btn adw-btn-primary text-xs font-semibold px-3 py-1.5 inline-flex items-center gap-1.5 cursor-pointer"
          >
            <Plus size={15} strokeWidth={2.5} />
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
            <div className="w-8 h-8 rounded-xl bg-rose-500/15 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
              <ArrowDownRight size={17} strokeWidth={2.5} />
            </div>
          </div>
          <div className="text-xl sm:text-2xl xl:text-3xl font-bold text-rose-600 dark:text-rose-400 tracking-tight truncate min-w-0" title={formatCurrency(stats.totalExpenses)}>
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
            Previstas no mês
          </div>
        </div>

        {/* Saldo Projetado */}
        <div className="adw-card p-4 sm:p-5 relative overflow-hidden min-w-0">
          <div className="flex items-center justify-between mb-2 min-w-0">
            <span className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 truncate">
              Saldo Projetado
            </span>
            <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
              stats.projectedBalance >= 0 
                ? 'bg-[#3584e4]/10 text-[#3584e4]' 
                : 'bg-rose-500/15 text-rose-600 dark:text-rose-400'
            }`}>
              <Wallet size={17} strokeWidth={2.5} />
            </div>
          </div>
          <div className={`text-xl sm:text-2xl xl:text-3xl font-bold tracking-tight truncate min-w-0 ${
            stats.projectedBalance >= 0 
              ? 'text-zinc-900 dark:text-white' 
              : 'text-rose-600 dark:text-rose-400'
          }`} title={formatCurrency(stats.projectedBalance)}>
            {formatCurrency(stats.projectedBalance)}
          </div>
          <div className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-1 truncate">
            {stats.projectedBalance >= 0 ? 'Superávit estimado' : 'Déficit estimado'}
          </div>
        </div>

        {/* A Pagar (Pendente) */}
        <div className="adw-card p-4 sm:p-5 relative overflow-hidden min-w-0">
          <div className="flex items-center justify-between mb-2 min-w-0">
            <span className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 truncate">
              A Pagar Restante
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

      {/* Main Grid: Calendar (Col 8) + Side Panel (Col 4) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        
        {/* Calendar Card (Col 8) */}
        <div className="lg:col-span-8 adw-card p-4 sm:p-6 flex flex-col">
          
          {/* Weekday headers */}
          <div className="grid grid-cols-7 gap-1 sm:gap-2 mb-2">
            {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map((day, idx) => (
              <div 
                key={day} 
                className={`text-center text-xs font-semibold py-1.5 ${
                  idx === 0 || idx === 6 ? 'text-zinc-400 dark:text-zinc-500' : 'text-zinc-600 dark:text-zinc-300'
                }`}
              >
                {day}
              </div>
            ))}
          </div>

          {/* Calendar Day Cells */}
          <div className="grid grid-cols-7 gap-1 sm:gap-2">
            {calendarDays.map((day) => {
              const dateKey = format(day, 'yyyy-MM-dd');
              const dayExpenses = expensesByDate[dateKey] || [];
              const hasExpenses = dayExpenses.length > 0;
              const isCurrentMonth = isSameMonth(day, monthStart);
              const isSelected = selectedDay && isSameDay(day, selectedDay);
              const isCurrentDay = isToday(day);

              const dayTotal = dayExpenses.reduce((sum, e) => sum + Number(e.amount || 0), 0);
              const allDayPaid = dayExpenses.every(e => {
                const amt = Number(e.amount || 0);
                const pd = Number(e.paid_amount || 0);
                return e.status === 'paid' || (amt > 0 && (amt - pd) <= 0);
              });

              return (
                <button
                  key={dateKey}
                  type="button"
                  onClick={() => setSelectedDay(isSelected ? null : day)}
                  className={`min-h-[70px] sm:min-h-[92px] p-1.5 sm:p-2 rounded-xl text-left transition-all relative flex flex-col justify-between border cursor-pointer ${
                    !isCurrentMonth 
                      ? 'opacity-30 bg-transparent border-transparent hover:opacity-50' 
                      : isSelected
                        ? 'bg-[#3584e4]/10 border-[#3584e4] shadow-xs'
                        : isCurrentDay
                          ? 'bg-black/[0.04] dark:bg-white/[0.06] border-black/10 dark:border-white/10'
                          : 'bg-black/[0.02] dark:bg-white/[0.02] hover:bg-black/[0.05] dark:hover:bg-white/[0.05] border-black/5 dark:border-white/5'
                  }`}
                >
                  {/* Day Number + Badges */}
                  <div className="flex items-center justify-between">
                    <span className={`text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center ${
                      isCurrentDay 
                        ? 'bg-[#3584e4] text-white' 
                        : isSelected 
                          ? 'text-[#3584e4]' 
                          : 'text-zinc-700 dark:text-zinc-300'
                    }`}>
                      {format(day, 'd')}
                    </span>

                    {hasExpenses && (
                      <span className={`w-2 h-2 rounded-full ${allDayPaid ? 'bg-[#2ec27e]' : 'bg-rose-500'}`} />
                    )}
                  </div>

                  {/* Day Amount summary */}
                  {hasExpenses && (
                    <div className="mt-auto pt-1">
                      <div className={`text-[10px] sm:text-xs font-bold truncate rounded px-1 py-0.5 ${
                        allDayPaid 
                          ? 'bg-[#2ec27e]/15 text-[#2ec27e] border border-[#2ec27e]/20' 
                          : 'bg-rose-500/15 text-rose-600 dark:text-rose-400 border border-rose-500/30'
                      }`}>
                        {formatCurrency(dayTotal)}
                      </div>
                      <div className="text-[9px] text-zinc-400 dark:text-zinc-500 truncate hidden sm:block mt-0.5">
                        {dayExpenses.length} {dayExpenses.length === 1 ? 'conta' : 'contas'}
                      </div>
                    </div>
                  )}
                </button>
              );
            })}
          </div>
        </div>

        {/* Side Panel: Vencimentos do Mês ou Dia Selecionado (Col 4) */}
        <div className="lg:col-span-4 adw-card p-4 sm:p-5 flex flex-col max-h-[660px]">
          
          {/* Panel Header */}
          <div className="flex items-center justify-between pb-3 mb-2 border-b border-black/5 dark:border-white/5">
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

          {/* List Area with Swipeable Items */}
          <div className="space-y-1.5 overflow-y-auto pr-1 flex-1">
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
                const amount = Number(expense.amount || 0);
                const paid = Number(expense.paid_amount || 0);
                const isPaid = expense.status === 'paid' || ((amount - paid) <= 0 && amount > 0);
                const dueInfo = getDueDateStatus(expense.due_date, isPaid);
                const isOverduePast = !isPaid && !!expense.due_date && expense.due_date.split('T')[0] < new Date().toISOString().split('T')[0];

                return (
                  <SwipeableExpenseItem
                    key={expense.id}
                    expense={expense}
                    dueInfo={dueInfo}
                    isOverduePast={isOverduePast}
                    formatDateBR={formatDateBR}
                    formatCurrency={formatCurrency}
                    onSelect={(exp) => setSelectedExpense(exp)}
                    onEdit={(exp) => handleEditExpense(exp)}
                    onDelete={(exp) => setDeleteConfirmExpense(exp)}
                  />
                );
              })
            )}
          </div>
        </div>

      </div>

      {/* EXPENSE DETAIL MODAL */}
      {selectedExpense && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn"
          onClick={() => setSelectedExpense(null)}
        >
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
            <div className="py-4 space-y-4 overflow-y-auto max-h-[65vh]">
              
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
                  <span className="text-sm md:text-base font-bold tabular-nums text-rose-600 dark:text-rose-400 mt-0.5 block">
                    {(() => {
                      const amount = Number(selectedExpense.amount || 0);
                      const paid = Number(selectedExpense.paid_amount || 0);
                      const remaining = Math.max(0, amount - paid);
                      return formatCurrency(remaining);
                    })()}
                  </span>
                </div>
              </div>

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
                  <div className="flex items-center justify-between py-1.5 border-b border-zinc-100 dark:border-zinc-800">
                    <span className="text-zinc-400">Data de Pagamento:</span>
                    <span className="font-semibold text-emerald-600 dark:text-emerald-400 flex items-center gap-1.5">
                      <CheckCircle2 size={14} />
                      {formatDateBR(selectedExpense.paid_date)}
                    </span>
                  </div>
                )}

                {selectedExpense.payment_method && (
                  <div className="flex items-center justify-between py-1.5 border-b border-zinc-100 dark:border-zinc-800">
                    <span className="text-zinc-400">Meio de Pagamento:</span>
                    <span className="font-semibold text-zinc-900 dark:text-white flex items-center gap-1.5">
                      <CreditCard size={14} className="text-emerald-500" />
                      {selectedExpense.payment_method}
                    </span>
                  </div>
                )}

                {selectedExpense.notes && (
                  <div className="p-3 bg-black/[0.02] dark:bg-white/[0.02] rounded-lg border border-black/5 dark:border-white/5">
                    <span className="text-zinc-400 block mb-1">Observações:</span>
                    <p className="text-zinc-800 dark:text-zinc-200">{selectedExpense.notes}</p>
                  </div>
                )}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="pt-4 border-t border-black/5 dark:border-white/5 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleEditExpense(selectedExpense)}
                  className="adw-btn text-xs font-semibold px-3 py-1.5 inline-flex items-center gap-1.5"
                >
                  <Edit2 size={13} />
                  <span>Editar</span>
                </button>
                <button
                  type="button"
                  onClick={() => setDeleteConfirmExpense(selectedExpense)}
                  className="adw-btn text-xs font-semibold px-3 py-1.5 text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 inline-flex items-center gap-1.5"
                >
                  <Trash2 size={13} />
                  <span>Excluir</span>
                </button>
              </div>

              {((Number(selectedExpense.amount || 0) - Number(selectedExpense.paid_amount || 0)) > 0) && (
                <button
                  type="button"
                  onClick={() => handleQuickPayFull(selectedExpense)}
                  className="adw-btn adw-btn-primary text-xs font-bold px-4 py-1.5 inline-flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-500 text-white"
                >
                  <Check size={14} strokeWidth={3} />
                  <span>Quitar Despesa</span>
                </button>
              )}
            </div>

          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteConfirmExpense && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn"
          onClick={() => setDeleteConfirmExpense(null)}
        >
          <div 
            className="adw-dialog max-w-sm w-full p-5 shadow-2xl animate-scaleIn text-center"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="w-11 h-11 rounded-full bg-rose-500/15 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto mb-3">
              <Trash2 size={20} />
            </div>
            <h3 className="text-base font-bold text-zinc-900 dark:text-white">
              Excluir Despesa?
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 mb-4">
              Deseja realmente remover "{deleteConfirmExpense.company || deleteConfirmExpense.description}"?
            </p>
            <div className="flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmExpense(null)}
                className="adw-btn text-xs font-semibold px-4 py-2 flex-1"
              >
                Cancelar
              </button>
              <button
                type="button"
                disabled={isDeleting}
                onClick={handleConfirmDelete}
                className="adw-btn text-xs font-semibold px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white flex-1 disabled:opacity-50"
              >
                {isDeleting ? 'Excluindo...' : 'Excluir'}
              </button>
            </div>
          </div>
        </div>
      )}

      {loading && (
        <div className="text-center text-xs text-zinc-400 dark:text-zinc-500 py-2">
          Atualizando dados em tempo real...
        </div>
      )}

    </div>
  );
};
