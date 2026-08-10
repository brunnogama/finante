
import { NavLink } from 'react-router-dom';
import { Wallet, User, Bell, Shield, ChevronRight } from 'lucide-react';

export const Settings = () => {
  const handleComingSoon = () => {
    alert('Esta área está em desenvolvimento e será liberada em breve!');
  };

  return (
    <div style={{ animation: 'fadeIn 0.3s ease' }}>
      <h2 style={{ marginBottom: '24px' }}>Configurações</h2>

      <div className="card" style={{ padding: '0', overflow: 'hidden' }}>
        <h3 style={{ padding: '16px', margin: 0, opacity: 0.7, fontSize: '14px', textTransform: 'uppercase' }}>
          Gestão Financeira
        </h3>
        
        <NavLink 
          to="/income" 
          style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            padding: '16px', 
            borderTop: '1px solid var(--card-border-color)',
            color: 'inherit',
            textDecoration: 'none'
          }}
        >
          <div className="flex-row gap-2">
            <div style={{ backgroundColor: 'rgba(52, 199, 89, 0.1)', color: '#34C759', padding: '8px', borderRadius: '8px' }}>
              <Wallet size={20} />
            </div>
            <span style={{ fontWeight: 500 }}>Adicionar Ganhos (Receitas)</span>
          </div>
          <ChevronRight size={20} opacity={0.5} />
        </NavLink>
      </div>

      <div className="card" style={{ padding: '0', overflow: 'hidden', marginTop: '24px' }}>
        <h3 style={{ padding: '16px', margin: 0, opacity: 0.7, fontSize: '14px', textTransform: 'uppercase' }}>
          Conta & App
        </h3>
        
        <div 
          onClick={handleComingSoon}
          style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', borderTop: '1px solid var(--card-border-color)', cursor: 'pointer' }}
        >
          <div className="flex-row gap-2">
            <div style={{ backgroundColor: 'rgba(59, 130, 246, 0.1)', color: '#3B82F6', padding: '8px', borderRadius: '8px' }}>
              <User size={20} />
            </div>
            <span style={{ fontWeight: 500 }}>Meu Perfil</span>
          </div>
          <ChevronRight size={20} opacity={0.5} />
        </div>

        <div 
          onClick={handleComingSoon}
          style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', borderTop: '1px solid var(--card-border-color)', cursor: 'pointer' }}
        >
          <div className="flex-row gap-2">
            <div style={{ backgroundColor: 'rgba(255, 149, 0, 0.1)', color: '#FF9500', padding: '8px', borderRadius: '8px' }}>
              <Bell size={20} />
            </div>
            <span style={{ fontWeight: 500 }}>Notificações</span>
          </div>
          <ChevronRight size={20} opacity={0.5} />
        </div>

        <div 
          onClick={handleComingSoon}
          style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px', borderTop: '1px solid var(--card-border-color)', cursor: 'pointer' }}
        >
          <div className="flex-row gap-2">
            <div style={{ backgroundColor: 'rgba(88, 86, 214, 0.1)', color: '#5856D6', padding: '8px', borderRadius: '8px' }}>
              <Shield size={20} />
            </div>
            <span style={{ fontWeight: 500 }}>Privacidade e Biometria</span>
          </div>
          <ChevronRight size={20} opacity={0.5} />
        </div>
      </div>
      
    </div>
  );
};
