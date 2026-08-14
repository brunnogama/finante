import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from 'recharts';

interface ExpensesPieChartProps {
  expenses: { type: string; amount: number }[];
}

export const ExpensesPieChart = ({ expenses }: ExpensesPieChartProps) => {
  // Aggregate expenses by type
  const dataMap = expenses.reduce((acc, curr) => {
    if (!acc[curr.type]) acc[curr.type] = 0;
    acc[curr.type] += curr.amount;
    return acc;
  }, {} as Record<string, number>);

  const data = Object.keys(dataMap).map(key => ({
    name: key,
    value: dataMap[key]
  }));

  const COLORS = ['#30D158', '#5E5CE6', '#FF9F0A', '#FF453A', '#32ADE6', '#BF5AF2']; // Apple HIG vibrant colors

  if (data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full opacity-40 text-zinc-500 dark:text-zinc-400">
        <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="mb-3">
          <circle cx="12" cy="12" r="10" />
          <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
          <path d="M2 12h20" />
        </svg>
        <p className="text-sm font-semibold tracking-wide">Nenhuma despesa registrada</p>
      </div>
    );
  }

  return (
    <div className="w-full h-full absolute inset-0 pb-6">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            cx="50%"
            cy="50%"
            innerRadius={65}
            outerRadius={85}
            paddingAngle={5}
            dataKey="value"
            stroke="none"
          >
            {data.map((_, index) => (
              <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip 
            formatter={(value: any) => `R$ ${Number(value).toFixed(2)}`}
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
          <Legend 
            verticalAlign="bottom" 
            height={36} 
            iconType="circle" 
            wrapperStyle={{ fontSize: '13px', fontWeight: 600, color: '#71717a' }}
          />
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
};
