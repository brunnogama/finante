import { useState, useEffect } from 'react';
import { getExpenses, supabase, type ExpenseRecord } from '../services/supabase';
import { 
  format, 
  startOfMonth, 
  endOfMonth, 
  eachDayOfInterval, 
  isSameMonth, 
  isToday,
  startOfWeek,
  endOfWeek
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { ChevronLeft, ChevronRight } from 'lucide-react';

export const CalendarView = () => {
  const [expenses, setExpenses] = useState<ExpenseRecord[]>([]);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchExpenses();
    
    const channel = supabase
      .channel('schema-db-changes-calendar')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'expenses' }, () => {
        fetchExpenses();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchExpenses = async () => {
    const data = await getExpenses();
    setExpenses(data);
    setLoading(false);
  };

  // Group expenses by date (YYYY-MM-DD)
  const expensesByDate = expenses.reduce((acc, curr) => {
    const dateStr = curr.due_date; // assuming YYYY-MM-DD format from DB
    if (!acc[dateStr]) acc[dateStr] = 0;
    acc[dateStr] += curr.amount;
    return acc;
  }, {} as Record<string, number>);

  const nextMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  const prevMonth = () => setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));

  // Calendar logic
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart);
  const endDate = endOfWeek(monthEnd);

  const dateFormat = "yyyy-MM-dd";
  const calendarDays = eachDayOfInterval({ start: startDate, end: endDate });



  return (
    <div style={{ animation: 'fadeIn 0.3s ease' }}>
      <div className="flex-row justify-between" style={{ marginBottom: '24px' }}>
        <h2>Calendário</h2>
        <div className="flex-row gap-2">
          <button className="btn btn-icon" onClick={prevMonth}>
            <ChevronLeft size={20} />
          </button>
          <span style={{ fontWeight: 600, minWidth: '120px', textAlign: 'center', textTransform: 'capitalize' }}>
            {format(currentDate, 'MMMM yyyy', { locale: ptBR })}
          </span>
          <button className="btn btn-icon" onClick={nextMonth}>
            <ChevronRight size={20} />
          </button>
        </div>
      </div>

      <div className="card" style={{ padding: '16px' }}>
        {/* Days of week header */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(7, 1fr)', 
          textAlign: 'center',
          fontWeight: 600,
          fontSize: '12px',
          opacity: 0.7,
          marginBottom: '12px'
        }}>
          {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(day => (
            <div key={day}>{day}</div>
          ))}
        </div>

        {/* Calendar Grid */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(7, 1fr)',
          gap: '8px'
        }}>
          {calendarDays.map((day) => {
            const dayKey = format(day, dateFormat);
            const isCurrentMonth = isSameMonth(day, monthStart);
            const isDayToday = isToday(day);
            const totalSpent = expensesByDate[dayKey] || 0;

            return (
              <div 
                key={day.toString()} 
                style={{
                  minHeight: '80px',
                  padding: '6px',
                  borderRadius: '16px',
                  border: '1px solid var(--card-border-color)',
                  backgroundColor: isCurrentMonth ? 'var(--button-bg-color)' : 'transparent',
                  opacity: isCurrentMonth ? 1 : 0.4,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center'
                }}
              >
                <span style={{ 
                  fontWeight: isDayToday ? 800 : 600,
                  fontSize: '14px',
                  marginBottom: '6px',
                  color: isDayToday ? '#fff' : 'inherit',
                  backgroundColor: isDayToday ? 'var(--accent-color)' : 'transparent',
                  width: '28px',
                  height: '28px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  borderRadius: '50%',
                  boxShadow: isDayToday ? '0 4px 12px rgba(59, 130, 246, 0.4)' : 'none'
                }}>
                  {format(day, 'd')}
                </span>
                
                {totalSpent > 0 && (
                  <div style={{
                    marginTop: 'auto',
                    backgroundColor: 'rgba(224, 27, 36, 0.1)',
                    color: 'var(--destructive-color)',
                    padding: '2px 4px',
                    borderRadius: '8px',
                    fontSize: '12px',
                    fontWeight: 700,
                    width: '100%',
                    textAlign: 'center',
                    whiteSpace: 'nowrap',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  }}>
                    {totalSpent < 1000 ? `R$ ${totalSpent.toFixed(0)}` : `R$ ${(totalSpent/1000).toFixed(1)}k`}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
      
      {loading && <p>Atualizando dados...</p>}
    </div>
  );
};
