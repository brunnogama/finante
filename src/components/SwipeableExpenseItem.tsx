import React, { useState, useRef } from 'react';
import { 
  Edit2, 
  Trash2, 
  Check, 
  AlertTriangle, 
  ChevronRight 
} from 'lucide-react';
import type { ExpenseRecord } from '../services/supabase';
import { CategoryIcon } from './CategoryIcon';

interface SwipeableExpenseItemProps {
  expense: ExpenseRecord;
  dueInfo: { label: string; color: string };
  isOverduePast?: boolean;
  formatDateBR: (dateStr: string) => string;
  formatCurrency: (val: number) => string;
  onSelect: (exp: ExpenseRecord) => void;
  onEdit: (exp: ExpenseRecord) => void;
  onDelete: (exp: ExpenseRecord) => void;
}

export const SwipeableExpenseItem: React.FC<SwipeableExpenseItemProps> = ({
  expense,
  dueInfo,
  isOverduePast = false,
  formatDateBR,
  formatCurrency,
  onSelect,
  onEdit,
  onDelete,
}) => {
  const [offsetX, setOffsetX] = useState(0);
  const [isSwiping, setIsSwiping] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  const startXRef = useRef(0);
  const startYRef = useRef(0);
  const isHorizontalSwipeRef = useRef<boolean | null>(null);

  const MAX_SWIPE = 135; // Maximum reveal width for the two action buttons

  const handleTouchStart = (e: React.TouchEvent) => {
    startXRef.current = e.touches[0].clientX;
    startYRef.current = e.touches[0].clientY;
    isHorizontalSwipeRef.current = null;
    setIsSwiping(true);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!isSwiping) return;

    const currentX = e.touches[0].clientX;
    const currentY = e.touches[0].clientY;
    const diffX = currentX - startXRef.current;
    const diffY = currentY - startYRef.current;

    // Determine swipe direction if not yet locked
    if (isHorizontalSwipeRef.current === null) {
      if (Math.abs(diffX) > 8 || Math.abs(diffY) > 8) {
        isHorizontalSwipeRef.current = Math.abs(diffX) > Math.abs(diffY);
      }
    }

    if (!isHorizontalSwipeRef.current) return;

    // If swiping horizontally, calculate offset
    if (isOpen) {
      // Starting from open position (-MAX_SWIPE)
      const newOffset = -MAX_SWIPE + diffX;
      setOffsetX(Math.max(-MAX_SWIPE - 20, Math.min(0, newOffset)));
    } else {
      // Starting from closed position (0)
      if (diffX < 0) {
        setOffsetX(Math.max(-MAX_SWIPE - 20, diffX));
      } else {
        setOffsetX(0);
      }
    }
  };

  const handleTouchEnd = () => {
    setIsSwiping(false);
    if (!isHorizontalSwipeRef.current) {
      return;
    }

    if (isOpen) {
      if (offsetX > -MAX_SWIPE + 40) {
        // Swiped right -> close
        setOffsetX(0);
        setIsOpen(false);
      } else {
        // Snap open
        setOffsetX(-MAX_SWIPE);
        setIsOpen(true);
      }
    } else {
      if (offsetX < -45) {
        // Swiped left -> open
        setOffsetX(-MAX_SWIPE);
        setIsOpen(true);
      } else {
        // Rebound -> close
        setOffsetX(0);
        setIsOpen(false);
      }
    }
  };

  const closeSwipe = (e: React.MouseEvent) => {
    e.stopPropagation();
    setOffsetX(0);
    setIsOpen(false);
  };

  const amount = Number(expense.amount || 0);
  const paid = Number(expense.paid_amount || 0);
  const balance = Math.max(0, amount - paid);
  const isPaid = balance <= 0 && amount > 0;

  return (
    <div className="relative overflow-hidden rounded-2xl bg-black/[0.04] dark:bg-white/[0.04] border border-black/5 dark:border-white/5 my-1.5 select-none">
      
      {/* Background Actions Revealed on Swipe Left */}
      <div className="absolute inset-y-0 right-0 flex items-center justify-end px-2 gap-1.5 w-36 bg-zinc-200/90 dark:bg-zinc-800/90">
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            closeSwipe(e);
            onEdit(expense);
          }}
          className="flex flex-col items-center justify-center w-14 h-12 rounded-xl bg-[#3584e4] text-white shadow-sm active:scale-95 transition-transform cursor-pointer"
          title="Editar Despesa"
        >
          <Edit2 size={16} strokeWidth={2.5} />
          <span className="text-[10px] font-bold mt-0.5">Editar</span>
        </button>

        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            closeSwipe(e);
            onDelete(expense);
          }}
          className="flex flex-col items-center justify-center w-14 h-12 rounded-xl bg-[#e01b24] text-white shadow-sm active:scale-95 transition-transform cursor-pointer"
          title="Excluir Despesa"
        >
          <Trash2 size={16} strokeWidth={2.5} />
          <span className="text-[10px] font-bold mt-0.5">Excluir</span>
        </button>
      </div>

      {/* Front Card Content */}
      <div
        style={{
          transform: `translateX(${offsetX}px)`,
          transition: isSwiping ? 'none' : 'transform 0.22s cubic-bezier(0.2, 0.9, 0.4, 1.1)',
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onClick={() => {
          if (isOpen) {
            setOffsetX(0);
            setIsOpen(false);
          } else {
            onSelect(expense);
          }
        }}
        className={`relative z-10 p-3.5 bg-white dark:bg-[#282828] border-b border-black/5 dark:border-white/5 flex items-center justify-between gap-3 cursor-pointer transition-colors hover:bg-black/[0.01] dark:hover:bg-white/[0.02] active:bg-black/[0.03] dark:active:bg-white/[0.04]`}
      >
        {/* Left: Icon & Info */}
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <CategoryIcon type={expense.type} size={18} containerClassName="w-10 h-10 rounded-xl shrink-0" />
          
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5 flex-wrap">
              <span className="font-bold text-sm text-zinc-900 dark:text-white truncate">
                {expense.company || expense.description || 'Despesa'}
              </span>
              
              {isOverduePast ? (
                <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-md text-rose-700 dark:text-rose-300 bg-rose-500/15 border border-rose-500/30 flex items-center gap-1">
                  <AlertTriangle size={9} strokeWidth={2.5} />
                  Atrasada
                </span>
              ) : (
                <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded-md ${dueInfo.color}`}>
                  {dueInfo.label}
                </span>
              )}
            </div>

            <div className="flex items-center gap-2 mt-1 text-xs text-zinc-500 dark:text-zinc-400">
              <span className="font-medium">Venc: {formatDateBR(expense.due_date)}</span>
              <span>•</span>
              <span className="truncate">{expense.type}</span>
            </div>
          </div>
        </div>

        {/* Right: Value & Status */}
        <div className="text-right shrink-0">
          {isPaid ? (
            <div className="flex flex-col items-end">
              <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-500/15 dark:bg-emerald-500/20 border border-emerald-500/30 px-2 py-0.5 rounded-full">
                <Check size={11} strokeWidth={3} />
                Quitada
              </span>
              <span className="text-xs font-semibold text-zinc-500 dark:text-zinc-400 mt-0.5 tabular-nums">
                {formatCurrency(amount)}
              </span>
            </div>
          ) : (
            <div className="flex flex-col items-end">
              {/* High-contrast Red Badge for visibility on grey/dark mobile displays */}
              <span className="inline-flex items-center px-2 py-0.5 rounded-lg text-xs font-bold tabular-nums text-rose-700 dark:text-rose-300 bg-rose-500/15 dark:bg-rose-500/25 border border-rose-500/40 shadow-xs">
                {formatCurrency(balance)}
              </span>
              {paid > 0 && (
                <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold mt-0.5 tabular-nums">
                  Pago: {formatCurrency(paid)}
                </span>
              )}
            </div>
          )}
        </div>

        {/* Swipe hint chevron */}
        <div className="pl-1 text-zinc-300 dark:text-zinc-600">
          <ChevronRight size={14} />
        </div>

      </div>
    </div>
  );
};
