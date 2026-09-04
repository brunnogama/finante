import React from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Calendar, Wallet, Receipt, TrendingUp, SlidersHorizontal } from 'lucide-react';

export const Navigation: React.FC = () => {
  const getNavItemClass = ({ isActive }: { isActive: boolean }) => {
    return `flex flex-col md:flex-row items-center justify-center md:justify-start gap-1 md:gap-3 py-2 md:py-2.5 px-3 md:px-3.5 rounded-2xl md:rounded-2xl transition-all duration-200 w-full group ${
      isActive 
        ? 'text-zinc-950 dark:text-white bg-zinc-200/70 dark:bg-white/10 font-bold shadow-xs' 
        : 'text-zinc-500 hover:bg-zinc-100/80 dark:hover:bg-white/5 hover:text-zinc-900 dark:hover:text-zinc-200 font-medium'
    }`;
  };

  return (
    <nav className="fixed bottom-4 left-4 right-4 md:relative md:bottom-auto md:left-auto md:right-auto md:w-64 flex flex-row md:flex-col bg-white/80 dark:bg-zinc-900/40 backdrop-blur-xl border border-zinc-200/60 dark:border-white/10 md:border-y-0 md:border-l-0 md:border-r rounded-3xl md:rounded-none p-2 md:p-6 z-50 shadow-lg md:shadow-none justify-around md:justify-start gap-1.5 md:gap-2 h-16 md:h-full items-center md:items-stretch">
      
      <NavLink to="/" className={getNavItemClass}>
        <div className="w-7 h-7 rounded-xl flex items-center justify-center text-blue-600 dark:text-blue-400 bg-blue-500/10 dark:bg-blue-500/15">
          <LayoutDashboard size={17} strokeWidth={2.2} />
        </div>
        <span className="text-[10px] md:text-[14px] hidden md:block">Início</span>
      </NavLink>
      
      <NavLink to="/calendar" className={getNavItemClass}>
        <div className="w-7 h-7 rounded-xl flex items-center justify-center text-rose-600 dark:text-rose-400 bg-rose-500/10 dark:bg-rose-500/15">
          <Calendar size={17} strokeWidth={2.2} />
        </div>
        <span className="text-[10px] md:text-[14px] hidden md:block">Calendário</span>
      </NavLink>
      
      <NavLink to="/income" className={getNavItemClass}>
        <div className="w-7 h-7 rounded-xl flex items-center justify-center text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 dark:bg-emerald-500/15">
          <Wallet size={17} strokeWidth={2.2} />
        </div>
        <span className="text-[10px] md:text-[14px] hidden md:block">Receitas</span>
      </NavLink>

      <NavLink to="/expenses" className={getNavItemClass}>
        <div className="w-7 h-7 rounded-xl flex items-center justify-center text-indigo-600 dark:text-indigo-400 bg-indigo-500/10 dark:bg-indigo-500/15">
          <Receipt size={17} strokeWidth={2.2} />
        </div>
        <span className="text-[10px] md:text-[14px] hidden md:block">Despesas</span>
      </NavLink>

      <NavLink to="/investments" className={getNavItemClass}>
        <div className="w-7 h-7 rounded-xl flex items-center justify-center text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 dark:bg-emerald-500/15">
          <TrendingUp size={17} strokeWidth={2.2} />
        </div>
        <span className="text-[10px] md:text-[14px] hidden md:block">Investimentos</span>
      </NavLink>

      <div className="md:mt-auto flex w-full justify-center md:justify-start">
        <NavLink to="/settings" className={getNavItemClass}>
          <div className="w-7 h-7 rounded-xl flex items-center justify-center text-zinc-600 dark:text-zinc-300 bg-zinc-500/10 dark:bg-zinc-500/15">
            <SlidersHorizontal size={17} strokeWidth={2.2} />
          </div>
          <span className="text-[10px] md:text-[14px] hidden md:block">Ajustes</span>
        </NavLink>
      </div>
    </nav>
  );
};
