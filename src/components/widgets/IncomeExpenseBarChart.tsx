import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

interface IncomeExpenseBarChartProps {
  incomes: { date: string; amount: number }[];
  expenses: { due_date: string; amount: number }[];
}

export const IncomeExpenseBarChart = ({ incomes, expenses }: IncomeExpenseBarChartProps) => {
  // Aggregate by month (simplification for MVP: just sum everything for the "Atual" category)
  // In a real app, group by 'yyyy-MM'
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
      <div className="empty-state">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="20" x2="18" y2="10"></line>
          <line x1="12" y1="20" x2="12" y2="4"></line>
          <line x1="6" y1="20" x2="6" y2="14"></line>
        </svg>
        <p>Nenhum dado cadastrado</p>
      </div>
    );
  }

  return (
    <div style={{ width: '100%', height: 'calc(100% - 30px)' }}>
      <ResponsiveContainer width="100%" height="100%">
        <BarChart
          data={data}
          margin={{
            top: 20,
            right: 30,
            left: 20,
            bottom: 5,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
          <XAxis dataKey="name" stroke="var(--window-fg-color)" opacity={0.5} />
          <YAxis stroke="var(--window-fg-color)" opacity={0.5} />
          <Tooltip 
            formatter={(value: any) => `R$ ${Number(value).toFixed(2)}`}
            contentStyle={{ borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', backgroundColor: 'var(--card-bg-color)', color: 'var(--window-fg-color)' }}
          />
          <Legend />
          <Bar dataKey="Receitas" fill="#34C759" radius={[4, 4, 0, 0]} />
          <Bar dataKey="Despesas" fill="#FF3B30" radius={[4, 4, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};
