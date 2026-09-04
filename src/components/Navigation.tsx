import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { LayoutDashboard, Calendar, Wallet, Receipt, TrendingUp, SlidersHorizontal } from 'lucide-react';
import { checkAppUpdate } from '../services/updater';

export const Navigation: React.FC = () => {
  const [hasUpdate, setHasUpdate] = useState(false);

  useEffect(() => {
    checkAppUpdate().then((update) => {
      if (update) setHasUpdate(true);
    }).catch(() => {});
  }, []);

  const getNavItemClass = ({ isActive }: { isActive: boolean }) => {
    return `flex flex-col md:flex-row items-center justify-center md:justify-start gap-1 md:gap-3 py-2 md:py-2 px-2.5 md:px-3 rounded-lg transition-all duration-150 w-full group relative ${
      isActive 
        ? 'text-zinc-950 dark:text-white bg-black/10 dark:bg-white/10 font-bold' 
        : 'text-zinc-600 hover:bg-black/5 dark:hover:bg-white/5 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-200 font-medium'
    }`;
  };

  return (
    <nav className="fixed bottom-0 left-0 right-0 md:relative md:w-56 flex flex-row md:flex-col bg-[#ebebeb] dark:bg-[#303030] md:bg-[#f2f2f2] md:dark:bg-[#2a2a2a] border-t md:border-t-0 md:border-r border-black/10 dark:border-black/30 p-2 md:p-3 z-50 justify-around md:justify-start gap-1 h-14 md:h-full items-center md:items-stretch select-none">
      
      <NavLink to="/" className={getNavItemClass}>
        <div className="w-6 h-6 rounded-md flex items-center justify-center text-[#3584e4]">
          <LayoutDashboard size={18} strokeWidth={2.2} />
        </div>
        <span className="text-[10px] md:text-[13px] hidden md:block">Início</span>
      </NavLink>
      
      <NavLink to="/calendar" className={getNavItemClass}>
        <div className="w-6 h-6 rounded-md flex items-center justify-center text-[#e01b24]">
          <Calendar size={18} strokeWidth={2.2} />
        </div>
        <span className="text-[10px] md:text-[13px] hidden md:block">Calendário</span>
      </NavLink>
      
      <NavLink to="/income" className={getNavItemClass}>
        <div className="w-6 h-6 rounded-md flex items-center justify-center text-[#2ec27e]">
          <Wallet size={18} strokeWidth={2.2} />
        </div>
        <span className="text-[10px] md:text-[13px] hidden md:block">Receitas</span>
      </NavLink>

      <NavLink to="/expenses" className={getNavItemClass}>
        <div className="w-6 h-6 rounded-md flex items-center justify-center text-[#e5a50a]">
          <Receipt size={18} strokeWidth={2.2} />
        </div>
        <span className="text-[10px] md:text-[13px] hidden md:block">Despesas</span>
      </NavLink>

      <NavLink to="/investments" className={getNavItemClass}>
        <div className="w-6 h-6 rounded-md flex items-center justify-center text-[#9141ac]">
          <TrendingUp size={18} strokeWidth={2.2} />
        </div>
        <span className="text-[10px] md:text-[13px] hidden md:block">Investimentos</span>
      </NavLink>

      <div className="md:mt-auto flex w-full justify-center md:justify-start pt-1">
        <NavLink to="/settings" className={getNavItemClass}>
          <div className="w-6 h-6 rounded-md flex items-center justify-center text-zinc-600 dark:text-zinc-300 relative">
            <SlidersHorizontal size={18} strokeWidth={2.2} />
            {hasUpdate && (
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 bg-[#3584e4] rounded-full ring-2 ring-[#f2f2f2] dark:ring-[#2a2a2a] animate-pulse" />
            )}
          </div>
          <div className="flex items-center justify-between flex-1 hidden md:flex">
            <span className="text-[13px]">Ajustes</span>
            {hasUpdate && (
              <span className="text-[9px] font-extrabold px-1.5 py-0.5 rounded-full bg-[#3584e4] text-white">
                NOVO
              </span>
            )}
          </div>
        </NavLink>
      </div>
    </nav>
  );
};
