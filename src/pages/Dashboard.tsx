import { useState, useEffect } from 'react';
import { ArrowUpRight, ArrowDownRight } from 'lucide-react';
import { getExpenses, getIncomes, supabase, type ExpenseRecord, type IncomeRecord } from '../services/supabase';
import { Responsive as ResponsiveGridLayout, WidthProvider } from 'react-grid-layout/legacy';
import { ExpensesPieChart } from '../components/widgets/ExpensesPieChart';
import { IncomeExpenseBarChart } from '../components/widgets/IncomeExpenseBarChart';

const ResponsiveGrid = WidthProvider(ResponsiveGridLayout);

const defaultLayout = [
  { i: 'saldo', x: 0, y: 0, w: 6, h: 2, minW: 3 },
  { i: 'receitas', x: 6, y: 0, w: 3, h: 2, minW: 3 },
  { i: 'despesas', x: 9, y: 0, w: 3, h: 2, minW: 3 },
  { i: 'bar-chart', x: 0, y: 2, w: 6, h: 5, minW: 4 },
  { i: 'pie-chart', x: 6, y: 2, w: 6, h: 5, minW: 4 },
];

export const Dashboard = () => {
  const [totals, setTotals] = useState({ income: 0, expense: 0, balance: 0 });
  const [expenses, setExpenses] = useState<ExpenseRecord[]>([]);
  const [incomes, setIncomes] = useState<IncomeRecord[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [layouts, setLayouts] = useState<any>({ lg: defaultLayout });

  useEffect(() => {
    // Carrega layout salvo no localStorage
    const savedLayouts = localStorage.getItem('finante-dashboard-layout');
    if (savedLayouts) {
      setLayouts(JSON.parse(savedLayouts));
    }

    fetchDashboardData();
    
    const channel = supabase.channel('schema-db-changes-dashboard')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'expenses' }, () => fetchDashboardData())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'incomes' }, () => fetchDashboardData())
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchDashboardData = async () => {
    const exp = await getExpenses();
    const inc = await getIncomes();
    
    setExpenses(exp);
    setIncomes(inc);

    const totalIncome = inc.reduce((acc, curr) => acc + curr.amount, 0);
    const totalExpense = exp.reduce((acc, curr) => acc + curr.amount, 0);
    const balance = totalIncome - totalExpense;
    
    setTotals({ income: totalIncome, expense: totalExpense, balance });
    setLoading(false);
  };

  const onLayoutChange = (_layout: any, allLayouts: any) => {
    setLayouts(allLayouts);
    localStorage.setItem('finante-dashboard-layout', JSON.stringify(allLayouts));
  };

  const formatBRL = (val: number) => val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });

  return (
    <div style={{ animation: 'fadeIn 0.3s ease' }}>
      <h2 style={{ marginBottom: '16px' }}>Visão Geral</h2>
      
      <ResponsiveGrid
        className="layout"
        layouts={layouts}
        breakpoints={{ lg: 1200, md: 996, sm: 768, xs: 480, xxs: 0 }}
        cols={{ lg: 12, md: 12, sm: 6, xs: 4, xxs: 2 }}
        compactType="vertical"
        rowHeight={60}
        onLayoutChange={onLayoutChange}
        draggableHandle=".draggable-handle"
        margin={[16, 16]}
      >
        {/* Widget: Saldo Atual */}
        <div key="saldo" className="card" style={{ marginBottom: 0, padding: '16px', background: 'linear-gradient(135deg, #007AFF 0%, #5AC8FA 100%)', color: 'white', border: 'none' }}>
          <div className="draggable-handle" style={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <p style={{ fontSize: '15px', opacity: 0.9, fontWeight: 500 }}>Saldo Atual</p>
            <h1 style={{ fontSize: '32px', margin: '4px 0', fontWeight: 800, letterSpacing: '-1px' }}>
              {loading ? '...' : formatBRL(totals.balance)}
            </h1>
          </div>
        </div>

        {/* Widget: Receitas Totais */}
        <div key="receitas" className="card" style={{ marginBottom: 0, padding: '16px' }}>
          <div className="draggable-handle" style={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <div className="flex-row gap-2 text-success">
              <ArrowUpRight size={18} /> <span style={{ fontSize: '13px', fontWeight: 600 }}>Receitas</span>
            </div>
            <h3 style={{ marginTop: '8px' }}>{loading ? '...' : formatBRL(totals.income)}</h3>
          </div>
        </div>

        {/* Widget: Despesas Totais */}
        <div key="despesas" className="card" style={{ marginBottom: 0, padding: '16px' }}>
          <div className="draggable-handle" style={{ height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'center' }}>
            <div className="flex-row gap-2 text-danger">
              <ArrowDownRight size={18} /> <span style={{ fontSize: '13px', fontWeight: 600 }}>Despesas</span>
            </div>
            <h3 style={{ marginTop: '8px' }}>{loading ? '...' : formatBRL(totals.expense)}</h3>
          </div>
        </div>

        {/* Widget: Gráfico de Barras */}
        <div key="bar-chart" className="card" style={{ marginBottom: 0, padding: '16px' }}>
          <h3 className="card-title draggable-handle">Comparativo Mensal</h3>
          <IncomeExpenseBarChart incomes={incomes} expenses={expenses} />
        </div>

        {/* Widget: Gráfico de Pizza */}
        <div key="pie-chart" className="card" style={{ marginBottom: 0, padding: '16px' }}>
          <h3 className="card-title draggable-handle">Despesas por Categoria</h3>
          <ExpensesPieChart expenses={expenses} />
        </div>



      </ResponsiveGrid>
    </div>
  );
};
