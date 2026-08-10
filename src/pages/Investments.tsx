import { useState } from 'react';
import { TrendingUp, PieChart as PieChartIcon } from 'lucide-react';

export const Investments = () => {
  const [amountInput, setAmountInput] = useState('');

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

  return (
    <div style={{ animation: 'fadeIn 0.3s ease' }}>
      <div className="flex-row justify-between" style={{ marginBottom: '16px' }}>
        <h2>Meus Investimentos</h2>
      </div>

      <div className="card" style={{ padding: '16px', background: 'linear-gradient(135deg, #10B981 0%, #34C759 100%)', color: 'white', border: 'none' }}>
        <p style={{ fontSize: '15px', opacity: 0.9, fontWeight: 500 }}>Patrimônio Investido</p>
        <h1 style={{ fontSize: '32px', margin: '4px 0', fontWeight: 800, letterSpacing: '-1px' }}>
          R$ 0,00
        </h1>
        <div className="flex-row gap-2" style={{ marginTop: '8px', fontSize: '13px', backgroundColor: 'rgba(255,255,255,0.2)', padding: '4px 8px', borderRadius: '8px', display: 'inline-flex' }}>
          <TrendingUp size={14} /> +0,00% este mês
        </div>
      </div>

      <div className="card" style={{ marginTop: '24px' }}>
        <h3 className="card-title">Novo Aporte</h3>
        <div className="input-group">
          <input type="text" className="input-field" placeholder=" " />
          <label className="input-label">Ativo (ex: Tesouro Selic, AAPL34)</label>
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
            <input type="date" className="input-field" placeholder=" " />
            <label className="input-label">Data</label>
          </div>
        </div>
        <div className="input-group">
          <select className="input-field">
            <option>Renda Fixa</option>
            <option>Ações</option>
            <option>Fundos Imobiliários</option>
            <option>Criptomoedas</option>
            <option>Internacional</option>
          </select>
          <label className="input-label">Categoria</label>
        </div>
        <button className="btn btn-primary" style={{ marginTop: '8px' }}>Registrar Aporte</button>
      </div>

      <h3 style={{ marginBottom: '12px', marginTop: '24px' }}>Carteira Atual</h3>
      <div className="empty-state">
        <PieChartIcon size={48} opacity={0.5} style={{ marginBottom: '16px' }} />
        <p>Você ainda não possui investimentos cadastrados.</p>
      </div>
    </div>
  );
};
