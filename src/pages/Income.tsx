import { useState, useEffect } from 'react';

import { getIncomes, addIncome, supabase, type IncomeRecord } from '../services/supabase';

export const Income = () => {
  const [incomes, setIncomes] = useState<IncomeRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [amountInput, setAmountInput] = useState('');
  const [source, setSource] = useState('');
  const [date, setDate] = useState('');
  const [isRecurring, setIsRecurring] = useState(false);

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

  const handleSaveIncome = async () => {
    if (!source || !amountInput || !date) {
      alert('Por favor, preencha todos os campos.');
      return;
    }
    const numericString = amountInput.replace(/\D/g, '');
    const amount = parseInt(numericString, 10) / 100;
    
    if (isRecurring) {
      const recordsToInsert = [];
      const baseDate = new Date(date + 'T00:00:00');
      for (let i = 0; i < 12; i++) {
        const nextDate = new Date(baseDate.getFullYear(), baseDate.getMonth() + i, baseDate.getDate());
        recordsToInsert.push({
          source: `${source} (Mês ${i + 1}/12)`,
          amount,
          date: nextDate.toISOString().split('T')[0]
        });
      }
      
      // Envia todas as parcelas de uma vez
      for (const record of recordsToInsert) {
        await addIncome(record);
      }
    } else {
      await addIncome({ source, amount, date });
    }
    
    setSource('');
    setAmountInput('');
    setDate('');
    setIsRecurring(false);
    fetchIncomes();
  };

  useEffect(() => {
    fetchIncomes();
    
    const channel = supabase
      .channel('schema-db-changes-income')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'incomes' }, () => {
        fetchIncomes();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchIncomes = async () => {
    const data = await getIncomes();
    setIncomes(data);
    setLoading(false);
  };

  return (
    <div style={{ animation: 'fadeIn 0.3s ease' }}>
      <div className="flex-row justify-between" style={{ marginBottom: '16px' }}>
        <h2>Minhas Receitas</h2>
      </div>

      <div className="card">
        <h3 className="card-title">Nova Receita Mensal</h3>
        <div className="input-group">
          <input 
            type="text" 
            className="input-field" 
            placeholder=" " 
            value={source}
            onChange={(e) => setSource(e.target.value)}
          />
          <label className="input-label">Fonte (ex: Salário)</label>
        </div>
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
          <label className="input-label">Dia do Recebimento</label>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 16px', backgroundColor: 'rgba(255,255,255,0.03)', borderRadius: '16px', marginBottom: '16px' }}>
          <div>
            <div style={{ fontSize: '15px', fontWeight: 500 }}>Ganhos Mensais</div>
            <div style={{ fontSize: '13px', opacity: 0.6 }}>Repetir todo dia do mês (1 ano)</div>
          </div>
          <div 
            onClick={() => setIsRecurring(!isRecurring)}
            style={{
              width: '50px', height: '28px', backgroundColor: isRecurring ? 'var(--success-color)' : 'rgba(255,255,255,0.1)',
              borderRadius: '20px', position: 'relative', cursor: 'pointer', transition: '0.3s'
            }}
          >
            <div style={{
              width: '24px', height: '24px', backgroundColor: '#fff', borderRadius: '50%',
              position: 'absolute', top: '2px', left: isRecurring ? '24px' : '2px', transition: '0.3s',
              boxShadow: '0 2px 5px rgba(0,0,0,0.2)'
            }} />
          </div>
        </div>

        <button className="btn btn-primary" style={{ marginTop: '8px' }} onClick={handleSaveIncome}>
          Salvar Receita
        </button>
      </div>

      <h3 style={{ marginBottom: '12px', marginTop: '24px' }}>Receitas Cadastradas</h3>
      {loading ? <p>Carregando...</p> : incomes.map(inc => (
        <div key={inc.id} className="card" style={{ padding: '12px 16px' }}>
          <div className="flex-row justify-between">
            <div>
              <div style={{ fontWeight: 600 }}>{inc.source}</div>
              <div style={{ fontSize: '13px', opacity: 0.7 }}>
                {inc.date.split('-').reverse().join('/')}
              </div>
            </div>
            <div className="text-success" style={{ fontWeight: 600, fontSize: '16px' }}>
              {inc.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
