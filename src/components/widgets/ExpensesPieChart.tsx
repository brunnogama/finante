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

  const COLORS = ['#3584e4', '#2ec27e', '#e5a50a', '#e01b24', '#9141ac', '#21a1a9', '#f66151', '#865e3c']; // GNOME 50 / Libadwaita palette

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
            innerRadius={60}
            outerRadius={80}
            paddingAngle={4}
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
              borderRadius: '8px', 
              border: '1px solid rgba(255, 255, 255, 0.1)', 
              boxShadow: '0 8px 24px rgba(0, 0, 0, 0.3)', 
              backgroundColor: '#383838',
              padding: '8px 12px',
              fontWeight: 600,
              fontSize: '12px',
              color: '#ffffff'
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
