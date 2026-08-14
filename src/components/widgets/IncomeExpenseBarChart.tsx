import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface IncomeExpenseBarChartProps {
  incomes: { date: string; amount: number }[];
  expenses: { due_date: string; amount: number }[];
}

export const IncomeExpenseBarChart = ({ incomes, expenses }: IncomeExpenseBarChartProps) => {
  const totalIncome = incomes.reduce((acc, curr) => acc + curr.amount, 0);
  const totalExpense = expenses.reduce((acc, curr) => acc + curr.amount, 0);

  const data = [
    {
      name: 'Mês Atual',
      Receitas: totalIncome,
      Despesas: totalExpense,
    }
  ];

  if (totalIncome === 0 && totalExpense === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full opacity-40 text-zinc-500 dark:text-zinc-400">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mb-3">
          <path d="M3 3v18h18" />
          <path d="M18 17V9" />
          <path d="M13 17V5" />
          <path d="M8 17v-3" />
        </svg>
        <p className="text-sm font-semibold tracking-wide">Nenhum dado cadastrado</p>
      </div>
    );
  }

  const formatYAxis = (tickItem: number) => {
    if (tickItem === 0) return '0';
    return `${(tickItem / 1000).toFixed(0)}k`;
  };

  return (
    <div className="w-full h-full absolute inset-0 pb-6 px-1">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{ top: 20, right: 10, left: -15, bottom: 0 }}
          barGap={8}
        >
          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#a1a1aa" opacity={0.15} />
          <XAxis 
            dataKey="name" 
            stroke="#a1a1aa" 
            fontSize={12} 
            fontWeight={600}
            tickLine={false} 
            axisLine={false} 
            dy={10} 
          />
          <YAxis 
            stroke="#a1a1aa" 
            fontSize={12} 
            fontWeight={600}
            tickLine={false} 
            axisLine={false} 
            tickFormatter={formatYAxis} 
          />
          <Tooltip 
            formatter={(value: any) => `R$ ${Number(value).toFixed(2)}`}
            cursor={{ fill: '#a1a1aa', opacity: 0.1 }}
            contentStyle={{ 
              borderRadius: '16px', 
              border: '1px solid rgba(161, 161, 170, 0.2)', 
              boxShadow: '0 8px 30px rgba(0, 0, 0, 0.12)', 
              backgroundColor: 'rgba(255, 255, 255, 0.05)',
              backdropFilter: 'blur(16px)',
              WebkitBackdropFilter: 'blur(16px)',
              padding: '12px 16px',
              fontWeight: 600,
            }}
          />
          <Legend iconType="circle" wrapperStyle={{ paddingTop: '16px', fontSize: '13px', fontWeight: 600, color: '#71717a' }} />
          <Bar dataKey="Receitas" fill="#30D158" radius={[8, 8, 0, 0]} maxBarSize={32} />
          <Bar dataKey="Despesas" fill="#FF453A" radius={[8, 8, 0, 0]} maxBarSize={32} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};
