import React, { useState, useRef, useEffect } from 'react';
import { 
  format, 
  addMonths, 
  subMonths, 
  startOfMonth, 
  endOfMonth, 
  startOfWeek, 
  endOfWeek, 
  eachDayOfInterval, 
  isSameMonth, 
  isSameDay, 
  isToday,
  parseISO
} from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight } from 'lucide-react';

interface DatePickerProps {
  value: string; // Format: 'YYYY-MM-DD'
  onChange: (value: string) => void;
  placeholder?: string;
  required?: boolean;
  className?: string;
  label?: string;
}

export const DatePicker: React.FC<DatePickerProps> = ({
  value,
  onChange,
  placeholder = 'DD/MM/AAAA',
  required = false,
  className = '',
  label
}) => {
  const [isOpen, setIsOpen] = useState(false);
  
  // Parse initial selected date safely
  const parseSafeDate = (dateStr: string): Date => {
    if (!dateStr) return new Date();
    try {
      const parsed = parseISO(dateStr.split('T')[0]);
      return isNaN(parsed.getTime()) ? new Date() : parsed;
    } catch {
      return new Date();
    }
  };

  const selectedDate = value ? parseSafeDate(value) : null;
  const [currentMonth, setCurrentMonth] = useState<Date>(selectedDate || new Date());
  const containerRef = useRef<HTMLDivElement>(null);

  // Sync view month with selected date when opened or changed
  useEffect(() => {
    if (value) {
      setCurrentMonth(parseSafeDate(value));
    }
  }, [value]);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const nextMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentMonth(addMonths(currentMonth, 1));
  };

  const prevMonth = (e: React.MouseEvent) => {
    e.stopPropagation();
    setCurrentMonth(subMonths(currentMonth, 1));
  };

  const handleSelectDay = (day: Date, e: React.MouseEvent) => {
    e.stopPropagation();
    const formatted = format(day, 'yyyy-MM-dd');
    onChange(formatted);
    // Automatically close upon selecting a date
    setIsOpen(false);
  };

  const handleSelectToday = (e: React.MouseEvent) => {
    e.stopPropagation();
    const today = new Date();
    const formatted = format(today, 'yyyy-MM-dd');
    onChange(formatted);
    setCurrentMonth(today);
    setIsOpen(false);
  };

  // Generate calendar days
  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(monthStart);
  const startDate = startOfWeek(monthStart, { weekStartsOn: 0 }); // Sunday
  const endDate = endOfWeek(monthEnd, { weekStartsOn: 0 });
  const days = eachDayOfInterval({ start: startDate, end: endDate });

  const weekDays = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

  // Formatted display date (DD/MM/AAAA)
  const displayValue = selectedDate ? format(selectedDate, 'dd/MM/yyyy') : '';

  return (
    <div className={`relative ${className}`} ref={containerRef}>
      {label && (
        <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1.5">
          {label} {required && <span className="text-rose-500">*</span>}
        </label>
      )}

      {/* Main clickable input box */}
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full bg-zinc-100/80 dark:bg-zinc-800/60 border ${
          isOpen 
            ? 'border-emerald-500 ring-2 ring-emerald-500/20' 
            : 'border-zinc-200 dark:border-zinc-700 hover:border-zinc-300 dark:hover:border-zinc-600'
        } rounded-xl px-3.5 py-2.5 text-sm font-semibold flex items-center justify-between text-left transition-all cursor-pointer select-none`}
      >
        <span className={displayValue ? 'text-zinc-900 dark:text-zinc-100' : 'text-zinc-400 dark:text-zinc-500'}>
          {displayValue || placeholder}
        </span>
        <div className={`p-1 rounded-lg ${isOpen ? 'text-emerald-600 dark:text-emerald-400 bg-emerald-500/10' : 'text-zinc-400'}`}>
          <CalendarIcon size={16} strokeWidth={2.2} />
        </div>
      </button>

      {/* Floating Apple-Style Calendar Popover */}
      {isOpen && (
        <div className="absolute left-0 mt-2 z-50 bg-white/95 dark:bg-zinc-900/95 backdrop-blur-2xl border border-zinc-200/80 dark:border-white/10 rounded-2xl shadow-2xl p-3.5 w-72 animate-in fade-in zoom-in-95 duration-100">
          
          {/* Header: Month / Year & Prev / Next */}
          <div className="flex items-center justify-between mb-3 px-1">
            <h4 className="text-sm font-bold text-zinc-900 dark:text-white capitalize">
              {format(currentMonth, 'MMMM yyyy', { locale: ptBR })}
            </h4>
            
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={prevMonth}
                className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                title="Mês Anterior"
              >
                <ChevronLeft size={16} strokeWidth={2.5} />
              </button>
              <button
                type="button"
                onClick={nextMonth}
                className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                title="Próximo Mês"
              >
                <ChevronRight size={16} strokeWidth={2.5} />
              </button>
            </div>
          </div>

          {/* Weekday names */}
          <div className="grid grid-cols-7 gap-1 mb-1.5 text-center">
            {weekDays.map((wd, i) => (
              <div key={i} className="text-[10px] font-bold text-zinc-400 dark:text-zinc-500 uppercase tracking-wider py-1">
                {wd}
              </div>
            ))}
          </div>

          {/* Days Grid */}
          <div className="grid grid-cols-7 gap-1 text-center">
            {days.map((day, idx) => {
              const isSelected = selectedDate && isSameDay(day, selectedDate);
              const isCurrent = isSameMonth(day, currentMonth);
              const isCurrentDay = isToday(day);

              return (
                <button
                  key={idx}
                  type="button"
                  onClick={(e) => handleSelectDay(day, e)}
                  className={`h-8 w-8 mx-auto rounded-xl flex items-center justify-center text-xs font-semibold transition-all cursor-pointer relative ${
                    isSelected
                      ? 'bg-emerald-600 text-white font-bold shadow-md shadow-emerald-600/30 scale-105 z-10'
                      : !isCurrent
                      ? 'text-zinc-300 dark:text-zinc-600 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                      : isCurrentDay
                      ? 'text-emerald-600 dark:text-emerald-400 font-bold bg-emerald-500/10 dark:bg-emerald-500/20 hover:bg-emerald-500/30'
                      : 'text-zinc-800 dark:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                  }`}
                >
                  <span>{format(day, 'd')}</span>
                  {isSelected && (
                    <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 bg-white rounded-full" />
                  )}
                </button>
              );
            })}
          </div>

          {/* Footer: Quick "Hoje" (Today) Action */}
          <div className="mt-3 pt-2.5 border-t border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between">
            <span className="text-[11px] text-zinc-400 font-medium">
              {displayValue ? `Selecionado: ${displayValue}` : 'Nenhuma data'}
            </span>
            <button
              type="button"
              onClick={handleSelectToday}
              className="text-[11px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline px-2 py-0.5 rounded-md hover:bg-emerald-500/10 cursor-pointer"
            >
              Hoje
            </button>
          </div>

        </div>
      )}
    </div>
  );
};
