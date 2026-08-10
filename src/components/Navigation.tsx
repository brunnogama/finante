import React from 'react';
import { NavLink } from 'react-router-dom';
import { Home, Plus, CalendarDays, Settings, TrendingUp } from 'lucide-react';

export const Navigation: React.FC = () => {
  return (
    <div className="app-navigation">
      <NavLink to="/" className={({isActive}) => `btn nav-item ${isActive ? 'nav-item-active' : ''}`}>
        <Home size={22} /> <span className="nav-label">Início</span>
      </NavLink>
      <NavLink to="/calendar" className={({isActive}) => `btn nav-item ${isActive ? 'nav-item-active' : ''}`}>
        <CalendarDays size={22} /> <span className="nav-label">Calendário</span>
      </NavLink>
      
      <NavLink to="/expenses" className="btn btn-primary nav-fab">
        <Plus size={24} />
      </NavLink>



      <NavLink to="/investments" className={({isActive}) => `btn nav-item ${isActive ? 'nav-item-active' : ''}`}>
        <TrendingUp size={22} /> <span className="nav-label">Investimentos</span>
      </NavLink>

      <div className="nav-settings-wrapper">
        <NavLink to="/settings" className={({isActive}) => `btn nav-item ${isActive ? 'nav-item-active' : ''}`}>
          <Settings size={22} /> <span className="nav-label">Ajustes</span>
        </NavLink>
      </div>
    </div>
  );
};
