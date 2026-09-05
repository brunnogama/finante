import React, { useState, useRef, useEffect, useCallback } from 'react';
import { createPortal } from 'react-dom';
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
  const popoverRef = useRef<HTMLDivElement>(null);

  const [coords, setCoords] = useState<{
    top?: number;
    bottom?: number;
    left: number;
  }>({ left: 0 });

  // Sync view month with selected date when opened or changed
  useEffect(() => {
    if (value) {
      setCurrentMonth(parseSafeDate(value));
    }
  }, [value]);

  const updatePosition = useCallback(() => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const spaceBelow = window.innerHeight - rect.bottom;
    const spaceAbove = rect.top;
    const openUpward = spaceBelow < 330 && spaceAbove > spaceBelow;

    setCoords({
      top: openUpward ? undefined : rect.bottom + 6,
      bottom: openUpward ? window.innerHeight - rect.top + 6 : undefined,
      left: Math.max(8, Math.min(rect.left, window.innerWidth - 300))
    });
  }, []);

  const handleToggle = () => {
    if (!isOpen) {
      updatePosition();
      setIsOpen(true);
    } else {
      setIsOpen(false);
    }
  };

  // Click outside and escape to close
  useEffect(() => {
    if (!isOpen) return;

    const handleScrollOrResize = (e: Event) => {
      if (popoverRef.current && popoverRef.current.contains(e.target as Node)) {
        return;
      }
      updatePosition();
    };

    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current && !containerRef.current.contains(event.target as Node) &&
        popoverRef.current && !popoverRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    window.addEventListener('resize', handleScrollOrResize);
    window.addEventListener('scroll', handleScrollOrResize, true);
    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      window.removeEventListener('resize', handleScrollOrResize);
      window.removeEventListener('scroll', handleScrollOrResize, true);
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen, updatePosition]);

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
        onClick={handleToggle}
        className={`w-full bg-black/5 dark:bg-white/5 border ${
          isOpen 
            ? 'border-[#3584e4] ring-2 ring-[#3584e4]/20' 
            : 'border-black/10 dark:border-white/10 hover:border-black/20 dark:hover:border-white/20'
        } rounded-lg px-3.5 py-2.5 text-sm font-semibold flex items-center justify-between text-left transition-all cursor-pointer select-none`}
      >
        <span className={displayValue ? 'text-zinc-900 dark:text-zinc-100' : 'text-zinc-400 dark:text-zinc-500'}>
          {displayValue || placeholder}
        </span>
        <div className={`p-1 rounded-md ${isOpen ? 'text-[#3584e4] bg-[#3584e4]/10' : 'text-zinc-400'}`}>
          <CalendarIcon size={16} strokeWidth={2.2} />
        </div>
      </button>

      {/* Floating Libadwaita Calendar Popover */}
      {isOpen && typeof document !== 'undefined' && createPortal(
        <div 
          ref={popoverRef}
          className="fixed bg-white dark:bg-[#383838] border border-black/10 dark:border-white/10 rounded-2xl shadow-2xl p-3.5 w-72 animate-in fade-in zoom-in-95 duration-100"
          style={{
            top: coords.top,
            bottom: coords.bottom,
            left: coords.left,
            zIndex: 999999
          }}
          onClick={(e) => e.stopPropagation()}
        >
          
          {/* Header: Month / Year & Prev / Next */}
          <div className="flex items-center justify-between mb-3 px-1">
            <h4 className="text-sm font-bold text-zinc-900 dark:text-white capitalize">
              {format(currentMonth, 'MMMM yyyy', { locale: ptBR })}
            </h4>
            
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={prevMonth}
                className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer"
                title="Mês Anterior"
              >
                <ChevronLeft size={16} strokeWidth={2.5} />
              </button>
              <button
                type="button"
                onClick={nextMonth}
                className="p-1.5 rounded-lg text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer"
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
                  className={`h-8 w-8 mx-auto rounded-lg flex items-center justify-center text-xs font-semibold transition-all cursor-pointer relative ${
                    isSelected
                      ? 'bg-[#3584e4] text-white font-bold shadow-md shadow-[#3584e4]/30 scale-105 z-10'
                      : !isCurrent
                      ? 'text-zinc-300 dark:text-zinc-600 hover:bg-black/5 dark:hover:bg-white/5'
                      : isCurrentDay
                      ? 'text-[#3584e4] dark:text-[#62a0ea] font-bold bg-[#3584e4]/10 dark:bg-[#3584e4]/20 hover:bg-[#3584e4]/30'
                      : 'text-zinc-800 dark:text-zinc-200 hover:bg-black/5 dark:hover:bg-white/5'
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
          <div className="mt-3 pt-2.5 border-t border-black/5 dark:border-white/5 flex items-center justify-between">
            <span className="text-[11px] text-zinc-400 font-medium">
              {displayValue ? `Selecionado: ${displayValue}` : 'Nenhuma data'}
            </span>
            <button
              type="button"
              onClick={handleSelectToday}
              className="text-[11px] font-bold text-[#3584e4] dark:text-[#62a0ea] hover:underline px-2 py-0.5 rounded-md hover:bg-[#3584e4]/10 cursor-pointer"
            >
              Hoje
            </button>
          </div>

        </div>,
        document.body
      )}
    </div>
  );
};
