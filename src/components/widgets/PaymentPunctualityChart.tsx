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
    { name: 'Pago em Dia', value: onTimeAmount, count: onTimeCount, color: '#2ec27e' },
    { name: 'Pago em Atraso', value: lateAmount, count: lateCount, color: '#e5a50a' },
    ...(lateFeesTotal > 0 ? [{ name: 'Multa e Juros', value: lateFeesTotal, count: lateCount, color: '#e01b24' }] : []),
    ...(pendingAmount > 0 ? [{ name: 'Pendente', value: pendingAmount, count: pendingCount, color: '#77767b' }] : [])
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
        <div className="w-36 h-36 relative shrink-0">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={chartData}
                cx="50%"
                cy="50%"
                innerRadius={46}
                outerRadius={62}
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
                  borderRadius: '8px',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  boxShadow: '0 8px 24px rgba(0, 0, 0, 0.3)',
                  backgroundColor: '#383838',
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
            <span className="text-lg font-bold text-zinc-900 dark:text-white leading-tight">
              {totalPaid > 0 ? `${onTimePercentage}%` : '0%'}
            </span>
            <span className="text-[9px] uppercase font-bold tracking-wider text-[#2ec27e]">
              Em Dia
            </span>
          </div>
        </div>

        {/* Legend / Metrics Grid */}
        <div className="flex-1 w-full grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          
          {/* Pago em Dia */}
          <div className="p-3 rounded-lg bg-[#2ec27e]/10 border border-[#2ec27e]/20 flex items-center justify-between">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-6 h-6 rounded-md bg-[#2ec27e]/20 text-[#2ec27e] flex items-center justify-center shrink-0">
                <CheckCircle2 size={14} strokeWidth={2.5} />
              </div>
              <div className="min-w-0">
                <div className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 truncate">
                  Pago em Dia ({onTimeCount})
                </div>
                <div className="text-xs font-bold text-[#2ec27e] truncate">
                  {formatBRL(onTimeAmount)}
                </div>
              </div>
            </div>
          </div>

          {/* Pago em Atraso */}
          <div className="p-3 rounded-lg bg-[#e5a50a]/10 border border-[#e5a50a]/20 flex items-center justify-between">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-6 h-6 rounded-md bg-[#e5a50a]/20 text-[#e5a50a] flex items-center justify-center shrink-0">
                <AlertTriangle size={14} strokeWidth={2.5} />
              </div>
              <div className="min-w-0">
                <div className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 truncate">
                  Pago em Atraso ({lateCount})
                </div>
                <div className="text-xs font-bold text-[#e5a50a] truncate">
                  {formatBRL(lateAmount)}
                </div>
              </div>
            </div>
          </div>

          {/* Multas e Juros */}
          <div className="p-3 rounded-lg bg-[#e01b24]/10 border border-[#e01b24]/20 flex items-center justify-between sm:col-span-2">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-6 h-6 rounded-md bg-[#e01b24]/20 text-[#e01b24] flex items-center justify-center shrink-0">
                <Flame size={14} strokeWidth={2.5} />
              </div>
              <div className="min-w-0">
                <div className="text-[10px] font-bold text-zinc-500 dark:text-zinc-400 truncate">
                  Despesas com Multa e Juros por Atraso
                </div>
                <div className="text-xs font-bold text-[#e01b24] truncate">
                  {lateFeesTotal > 0 ? `+ ${formatBRL(lateFeesTotal)} pago a mais` : 'R$ 0,00 (Nenhum juro pago)'}
                </div>
              </div>
            </div>
            {lateFeesTotal > 0 && (
              <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded-full bg-[#e01b24] text-white shrink-0">
                ATRASO
              </span>
            )}
          </div>

        </div>

      </div>

    </div>
  );
};
