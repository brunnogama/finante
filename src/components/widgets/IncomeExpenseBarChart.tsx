import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface IncomeExpenseBarChartProps {
  incomes: { date: string; amount: number }[];
  expenses: { due_date: string; amount: number }[];
}

const extractMonth = (dateStr?: string): string => {
  if (!dateStr) return '';
  if (dateStr.includes('-')) {
    const parts = dateStr.split('-');
    if (parts.length >= 2) {
      return `${parts[0]}-${parts[1].padStart(2, '0')}`;
    }
  }
  const d = new Date(dateStr);
  if (!isNaN(d.getTime())) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }
  return '';
};

export const IncomeExpenseBarChart = ({ incomes, expenses }: IncomeExpenseBarChartProps) => {
  // Generate last 6 months up to the current month (mês atual para trás)
  const now = new Date();
  const monthsData = [];

  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const year = d.getFullYear();
    const monthNum = String(d.getMonth() + 1).padStart(2, '0');
    const monthKey = `${year}-${monthNum}`;

    // Portuguese short month name (e.g., "Abr", "Mai", "Jun")
    const rawMonth = d.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '');
    const monthLabel = rawMonth.charAt(0).toUpperCase() + rawMonth.slice(1);
    const displayName = year !== now.getFullYear() ? `${monthLabel}/${year.toString().slice(-2)}` : monthLabel;

    const monthIncomes = incomes.filter(inc => extractMonth(inc.date) === monthKey);
    const monthExpenses = expenses.filter(exp => extractMonth(exp.due_date) === monthKey);

    const totalIncome = monthIncomes.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
    const totalExpense = monthExpenses.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);

    monthsData.push({
      name: displayName,
      monthKey,
      isCurrentMonth: i === 0,
      Receitas: totalIncome,
      Despesas: totalExpense,
    });
  }

  const hasAnyData = monthsData.some(m => m.Receitas > 0 || m.Despesas > 0);

  if (!hasAnyData && incomes.length === 0 && expenses.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full opacity-40 text-zinc-500 dark:text-zinc-400">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mb-3">
          <path d="M3 3v18h18" />
          <path d="M18 17V9" />
          <path d="M13 17V5" />
          <path d="M8 17v-3" />
        </svg>
        <p className="text-sm font-semibold tracking-wide">Nenhum dado registrado</p>
      </div>
    );
  }

  const formatYAxis = (tickItem: number) => {
    if (tickItem === 0) return '0';
    if (tickItem >= 1000) {
      return `${(tickItem / 1000).toFixed(0)}k`;
    }
    return `${tickItem}`;
  };

  return (
    <div className="w-full h-full absolute inset-0 pb-6 px-1">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={monthsData}
          margin={{ top: 20, right: 10, left: -10, bottom: 0 }}
          barGap={6}
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
            formatter={(value: any) => [
              `R$ ${Number(value).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
              undefined
            ]}
            cursor={{ fill: '#808080', opacity: 0.1, radius: 6 }}
            contentStyle={{ 
              borderRadius: '8px', 
              border: '1px solid rgba(255, 255, 255, 0.1)', 
              boxShadow: '0 8px 24px rgba(0, 0, 0, 0.3)', 
              backgroundColor: '#383838',
              padding: '8px 12px',
              fontWeight: 600,
              fontSize: '12px',
              color: '#ffffff',
            }}
          />
          <Legend 
            iconType="circle" 
            wrapperStyle={{ paddingTop: '12px', fontSize: '12px', fontWeight: 600, color: '#77767b' }} 
          />
          <Bar dataKey="Receitas" fill="#2ec27e" radius={[4, 4, 0, 0]} maxBarSize={24} />
          <Bar dataKey="Despesas" fill="#e01b24" radius={[4, 4, 0, 0]} maxBarSize={24} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};
