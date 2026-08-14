import React from 'react';
import { NavLink } from 'react-router-dom';
import { Home, Plus, CalendarDays, Settings, TrendingUp } from 'lucide-react';

export const Navigation: React.FC = () => {
  const getNavItemClass = ({ isActive }: { isActive: boolean }) => {
    return `flex flex-col md:flex-row items-center justify-center md:justify-start gap-1 md:gap-3 py-2 md:py-3 px-4 md:px-5 rounded-2xl md:rounded-xl transition-all duration-200 w-full ${
      isActive 
        ? 'text-zinc-900 dark:text-zinc-50 bg-zinc-200/50 dark:bg-zinc-800/60 font-semibold' 
        : 'text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800/40 hover:text-zinc-800 dark:hover:text-zinc-300 font-medium'
    }`;
  };

  return (
    <nav className="fixed bottom-4 left-4 right-4 md:relative md:bottom-auto md:left-auto md:right-auto md:w-64 flex flex-row md:flex-col bg-white/80 dark:bg-zinc-900/40 backdrop-blur-xl border border-zinc-200/60 dark:border-white/10 md:border-y-0 md:border-l-0 md:border-r rounded-3xl md:rounded-none p-2 md:p-6 z-50 shadow-lg md:shadow-none justify-around md:justify-start gap-2 md:gap-3 h-16 md:h-full items-center md:items-stretch">
      
      <NavLink to="/" className={getNavItemClass}>
        <Home size={22} strokeWidth={2.5} /> 
        <span className="text-[10px] md:text-[15px] hidden md:block">Início</span>
      </NavLink>
      
      <NavLink to="/calendar" className={getNavItemClass}>
        <CalendarDays size={22} strokeWidth={2.5} /> 
        <span className="text-[10px] md:text-[15px] hidden md:block">Calendário</span>
      </NavLink>
      


      <NavLink to="/investments" className={getNavItemClass}>
        <TrendingUp size={22} strokeWidth={2.5} /> 
        <span className="text-[10px] md:text-[15px] hidden md:block">Investimentos</span>
      </NavLink>

      <div className="md:mt-auto flex w-full justify-center md:justify-start">
        <NavLink to="/settings" className={getNavItemClass}>
          <Settings size={22} strokeWidth={2.5} /> 
          <span className="text-[10px] md:text-[15px] hidden md:block">Ajustes</span>
        </NavLink>
      </div>
    </nav>
  );
};
