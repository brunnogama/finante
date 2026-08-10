import { useState, useEffect } from 'react';
import { Check, Clock } from 'lucide-react';
import { getExpenses, addExpense, supabase, type ExpenseRecord } from '../services/supabase';

export const Expenses = () => {
  const [expenses, setExpenses] = useState<ExpenseRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [amountInput, setAmountInput] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState('');
  const [category, setCategory] = useState('Moradia');

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, '');
    if (value === '') {
      setAmountInput('');
      return;
    }
    const numericValue = parseInt(value, 10) / 100;
    const formatted = numericValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    setAmountInput(formatted);
  };

  const handleSaveExpense = async () => {
    if (!description || !amountInput || !date || !category) {
      alert('Por favor, preencha todos os campos.');
      return;
    }
    const numericString = amountInput.replace(/\D/g, '');
    const amount = parseInt(numericString, 10) / 100;
    
    await addExpense({ 
      description, 
      amount, 
      due_date: date, 
      type: category, 
      status: 'pending' 
    });
    
    setDescription('');
    setAmountInput('');
    setDate('');
    fetchExpenses();
  };

  useEffect(() => {
    fetchExpenses();
    
    // Subscribe to realtime changes
    const channel = supabase
      .channel('schema-db-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'expenses' }, () => {
        fetchExpenses();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchExpenses = async () => {
    const data = await getExpenses();
    setExpenses(data);
    setLoading(false);
  };

  return (
    <div style={{ animation: 'fadeIn 0.3s ease' }}>
      <div className="flex-row justify-between" style={{ marginBottom: '16px' }}>
        <h2>Minhas Despesas</h2>
      </div>

      <div className="card">
        <h3 className="card-title">Nova Despesa</h3>
        <div className="input-group">
          <input 
            type="text" 
            className="input-field" 
            placeholder=" " 
            value={description}
            onChange={(e) => setDescription(e.target.value)}
          />
          <label className="input-label">Descrição</label>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
          <div className="input-group">
            <input 
              type="text" 
              className="input-field" 
              placeholder=" " 
              value={amountInput} 
              onChange={handleAmountChange} 
            />
            <label className="input-label">Valor</label>
          </div>
          <div className="input-group">
            <input 
              type="date" 
              className="input-field" 
              placeholder=" " 
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
            <label className="input-label">Vencimento</label>
          </div>
        </div>
        <div className="input-group">
          <select 
            className="input-field"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option>Moradia</option>
            <option>Contas</option>
            <option>Alimentação</option>
            <option>Transporte</option>
            <option>Lazer</option>
          </select>
          <label className="input-label">Categoria</label>
        </div>
        <button className="btn btn-primary" style={{ marginTop: '8px' }} onClick={handleSaveExpense}>
          Adicionar Despesa
        </button>
      </div>

      <h3 style={{ marginBottom: '12px', marginTop: '24px' }}>Próximos Vencimentos</h3>
      {loading ? <p>Carregando...</p> : expenses.map(exp => (
        <div key={exp.id} className="card" style={{ padding: '12px 16px' }}>
          <div className="flex-row justify-between">
            <div className="flex-row gap-4">
              <div style={{ 
                width: '40px', height: '40px', borderRadius: '50%', 
                backgroundColor: exp.status === 'paid' ? 'rgba(38, 162, 105, 0.1)' : 'var(--button-bg-color)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: exp.status === 'paid' ? 'var(--success-color)' : 'var(--window-fg-color)'
              }}>
                {exp.status === 'paid' ? <Check size={20} /> : <Clock size={20} opacity={0.6} />}
              </div>
              <div>
                <div style={{ fontWeight: 600 }}>{exp.description}</div>
                <div style={{ fontSize: '13px', opacity: 0.7 }}>
                  {exp.type} • Vence dia {exp.due_date.split('-').reverse().join('/')}
                </div>
              </div>
            </div>
            <div className={exp.status === 'paid' ? 'text-success' : 'text-danger'} style={{ fontWeight: 600, fontSize: '15px' }}>
              {exp.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
