import React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip } from 'recharts';
import { CheckCircle2, AlertTriangle, Flame, Clock } from 'lucide-react';
import type { ExpenseRecord } from '../../services/supabase';

interface PaymentPunctualityChartProps {
  expenses: ExpenseRecord[];
}

export const PaymentPunctualityChart: React.FC<PaymentPunctualityChartProps> = ({ expenses }) => {
  // Compute metrics
  let onTimeAmount = 0;
  let onTimeCount = 0;
  let lateAmount = 0;
  let lateCount = 0;
  let lateFeesTotal = 0;
  let pendingAmount = 0;
  let pendingCount = 0;

  expenses.forEach((exp) => {
    const amount = Number(exp.amount || 0);
    const paid = Number(exp.paid_amount || 0);
    const due = exp.due_date ? exp.due_date.split('T')[0] : '';
    const paidDate = exp.paid_date ? exp.paid_date.split('T')[0] : '';

    if (paid > 0) {
      const isLate = paidDate ? paidDate > due : false;
      const isLateFee = (exp.excess_type === 'late_fee') || (!exp.excess_type && isLate && paid > amount);
      const extraFee = isLateFee && paid > amount ? (paid - amount) : 0;
      
      if (extraFee > 0) {
        lateFeesTotal += extraFee;
      }

      if (isLate) {
        lateAmount += paid;
        lateCount++;
      } else {
        onTimeAmount += paid;
        onTimeCount++;
      }
    }

    const pending = Math.max(0, amount - paid);
    if (pending > 0) {
      pendingAmount += pending;
      pendingCount++;
    }
  });

  const totalPaid = onTimeAmount + lateAmount;
  const onTimePercentage = totalPaid > 0 ? Math.round((onTimeAmount / totalPaid) * 100) : 0;

  const chartData = [
    { name: 'Pago em Dia', value: onTimeAmount, count: onTimeCount, color: '#059669' },
    { name: 'Pago em Atraso', value: lateAmount, count: lateCount, color: '#D97706' },
    ...(lateFeesTotal > 0 ? [{ name: 'Multa e Juros', value: lateFeesTotal, count: lateCount, color: '#E11D48' }] : []),
    ...(pendingAmount > 0 ? [{ name: 'Pendente', value: pendingAmount, count: pendingCount, color: '#71717A' }] : [])
  ].filter(d => d.value > 0);

  const formatBRL = (val: number) => {
    return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  if (expenses.length === 0 || (totalPaid === 0 && pendingAmount === 0)) {
    return (
      <div className="flex flex-col items-center justify-center h-full min-h-[220px] text-center opacity-40 text-zinc-500 dark:text-zinc-400">
        <Clock size={36} strokeWidth={1.5} className="mb-2 text-zinc-400" />
        <p className="text-xs sm:text-sm font-semibold">Sem dados de pagamento no período</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full justify-between gap-4">
      
      {/* Top Graphic + Metric Ring */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
        
        {/* Donut Chart */}
        <div className="w-40 h-40 relative shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={50}
                outerRadius={68}
                paddingAngle={4}
                dataKey="value"
                stroke="none"
              >
                {chartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
              <Tooltip
                formatter={(value: any) => formatBRL(Number(value))}
                contentStyle={{
                  borderRadius: '16px',
                  border: '1px solid rgba(161, 161, 170, 0.2)',
                  boxShadow: '0 8px 30px rgba(0, 0, 0, 0.15)',
                  backgroundColor: 'rgba(24, 24, 27, 0.85)',
                  backdropFilter: 'blur(16px)',
                  padding: '8px 12px',
                  fontWeight: 600,
                  fontSize: '12px',
                  color: '#fff'
                }}
              />
            </PieChart>
          </ResponsiveContainer>
          
          {/* Centered % */}
          <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center">
            <span className="text-lg sm:text-xl font-extrabold text-zinc-900 dark:text-white leading-tight">
              {totalPaid > 0 ? `${onTimePercentage}%` : '0%'}
            </span>
            <span className="text-[10px] uppercase font-bold tracking-wider text-emerald-600 dark:text-emerald-400">
              Em Dia
            </span>
          </div>
        </div>

        {/* Legend / Metrics Grid */}
        <div className="flex-1 w-full grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          
          {/* Pago em Dia */}
          <div className="p-3 rounded-2xl bg-emerald-500/10 dark:bg-emerald-500/15 border border-emerald-500/20 flex items-center justify-between">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-7 h-7 rounded-xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                <CheckCircle2 size={15} strokeWidth={2.5} />
              </div>
              <div className="min-w-0">
                <div className="text-[11px] font-bold text-zinc-500 dark:text-zinc-400 truncate">
                  Pago em Dia ({onTimeCount})
                </div>
                <div className="text-xs sm:text-sm font-bold text-emerald-700 dark:text-emerald-400 truncate">
                  {formatBRL(onTimeAmount)}
                </div>
              </div>
            </div>
          </div>

          {/* Pago em Atraso */}
          <div className="p-3 rounded-2xl bg-amber-500/10 dark:bg-amber-500/15 border border-amber-500/20 flex items-center justify-between">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-7 h-7 rounded-xl bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
                <AlertTriangle size={15} strokeWidth={2.5} />
              </div>
              <div className="min-w-0">
                <div className="text-[11px] font-bold text-zinc-500 dark:text-zinc-400 truncate">
                  Pago em Atraso ({lateCount})
                </div>
                <div className="text-xs sm:text-sm font-bold text-amber-600 dark:text-amber-400 truncate">
                  {formatBRL(lateAmount)}
                </div>
              </div>
            </div>
          </div>

          {/* Multas e Juros */}
          <div className="p-3 rounded-2xl bg-rose-500/10 dark:bg-rose-500/15 border border-rose-500/20 flex items-center justify-between sm:col-span-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-7 h-7 rounded-xl bg-rose-500/20 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
                <Flame size={15} strokeWidth={2.5} />
              </div>
              <div className="min-w-0">
                <div className="text-[11px] font-bold text-zinc-500 dark:text-zinc-400 truncate">
                  Despesas com Multa e Juros por Atraso
                </div>
                <div className="text-xs sm:text-sm font-bold text-rose-600 dark:text-rose-400 truncate">
                  {lateFeesTotal > 0 ? `+ ${formatBRL(lateFeesTotal)} pago a mais` : 'R$ 0,00 (Nenhum juro pago)'}
                </div>
              </div>
            </div>
            {lateFeesTotal > 0 && (
              <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-rose-500 text-white shrink-0">
                ATRASO
              </span>
            )}
          </div>

        </div>

      </div>

    </div>
  );
};
