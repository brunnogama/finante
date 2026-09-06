import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Calendar, 
  Wallet, 
  Receipt, 
  TrendingUp 
} from 'lucide-react';
import { checkAppUpdate } from '../services/updater';
import { supabase } from '../services/supabase';

export const Navigation: React.FC = () => {
  const [hasUpdate, setHasUpdate] = useState(false);
  const [user, setUser] = useState<any>(null);

  useEffect(() => {
    checkAppUpdate().then((update) => {
      if (update) setHasUpdate(true);
    }).catch(() => {});

    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user || null);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
    });

    return () => subscription.unsubscribe();
  }, []);

  const getNavItemClass = ({ isActive }: { isActive: boolean }) => {
    return `flex flex-col md:flex-row items-center justify-center md:justify-start gap-1.5 md:gap-3 py-2 md:py-2.5 px-2.5 md:px-3 rounded-xl transition-all duration-150 w-full group relative ${
      isActive 
        ? 'text-zinc-950 dark:text-white bg-black/10 dark:bg-white/10 font-semibold shadow-xs' 
        : 'text-zinc-600 dark:text-zinc-400 hover:bg-black/5 dark:hover:bg-white/5 hover:text-zinc-900 dark:hover:text-zinc-100 font-medium'
    }`;
  };

  const getIconClass = ({ isActive }: { isActive: boolean }) => {
    return `transition-colors ${
      isActive 
        ? 'text-zinc-950 dark:text-white' 
        : 'text-zinc-500 dark:text-zinc-400 group-hover:text-zinc-900 dark:group-hover:text-zinc-100'
    }`;
  };

  const userName = user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email?.split('@')[0];
  const userAvatar = user?.user_metadata?.avatar_url || user?.user_metadata?.picture;

  return (
    <nav className="fixed bottom-0 left-0 right-0 md:relative md:w-56 flex flex-row md:flex-col bg-[#ebebeb] dark:bg-[#282828] md:bg-[#f4f4f4] md:dark:bg-[#262626] border-t md:border-t-0 md:border-r border-black/10 dark:border-white/5 p-2 md:p-3 z-30 justify-around md:justify-start gap-1 h-16 md:h-full items-center md:items-stretch select-none flex-shrink-0">
      
      {/* Section Label: Finanças */}
      <div className="hidden md:block px-3 pt-1 pb-1">
        <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
          Principal
        </span>
      </div>

      <NavLink to="/" className={getNavItemClass}>
        {({ isActive }) => (
          <>
            <div className={`w-5 h-5 flex items-center justify-center shrink-0 ${getIconClass({ isActive })}`}>
              <LayoutDashboard size={18} strokeWidth={1.8} />
            </div>
            <span className="text-xs md:text-sm hidden md:block">Visão Geral</span>
          </>
        )}
      </NavLink>

      <NavLink to="/expenses" className={getNavItemClass}>
        {({ isActive }) => (
          <>
            <div className={`w-5 h-5 flex items-center justify-center shrink-0 ${getIconClass({ isActive })}`}>
              <Receipt size={18} strokeWidth={1.8} />
            </div>
            <span className="text-xs md:text-sm hidden md:block">Despesas</span>
          </>
        )}
      </NavLink>
      
      <NavLink to="/calendar" className={getNavItemClass}>
        {({ isActive }) => (
          <>
            <div className={`w-5 h-5 flex items-center justify-center shrink-0 ${getIconClass({ isActive })}`}>
              <Calendar size={18} strokeWidth={1.8} />
            </div>
            <span className="text-xs md:text-sm hidden md:block">Calendário</span>
          </>
        )}
      </NavLink>

      {/* Section Label: Gestão */}
      <div className="hidden md:block px-3 pt-3 pb-1">
        <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
          Gestão
        </span>
      </div>
      
      <NavLink to="/income" className={getNavItemClass}>
        {({ isActive }) => (
          <>
            <div className={`w-5 h-5 flex items-center justify-center shrink-0 ${getIconClass({ isActive })}`}>
              <Wallet size={18} strokeWidth={1.8} />
            </div>
            <span className="text-xs md:text-sm hidden md:block">Receitas</span>
          </>
        )}
      </NavLink>

      <NavLink to="/investments" className={getNavItemClass}>
        {({ isActive }) => (
          <>
            <div className={`w-5 h-5 flex items-center justify-center shrink-0 ${getIconClass({ isActive })}`}>
              <TrendingUp size={18} strokeWidth={1.8} />
            </div>
            <span className="text-xs md:text-sm hidden md:block">Investimentos</span>
          </>
        )}
      </NavLink>

      {/* Footer Section: Perfil & Ajustes */}
      <div className="md:mt-auto flex flex-col w-full justify-center md:justify-start pt-2">
        <NavLink 
          to="/settings"
          className={({ isActive }) => `flex items-center justify-center md:justify-start gap-2.5 p-2 rounded-xl transition-all duration-150 w-full group relative border border-transparent ${
            isActive 
              ? 'text-zinc-950 dark:text-white bg-black/10 dark:bg-white/10 font-semibold shadow-xs' 
              : 'text-zinc-600 dark:text-zinc-400 hover:bg-black/5 dark:hover:bg-white/5 hover:text-zinc-900 dark:hover:text-zinc-100 font-medium'
          }`}
          title="Ajustes e Perfil"
        >
          {userAvatar ? (
            <img 
              src={userAvatar} 
              alt={userName || 'Perfil'} 
              className="w-7 h-7 rounded-full object-cover shrink-0 ring-1 ring-white/20"
            />
          ) : (
            <div className="w-7 h-7 rounded-full bg-black/10 dark:bg-white/10 flex items-center justify-center text-xs font-bold text-zinc-700 dark:text-zinc-200 shrink-0">
              {userName?.charAt(0)?.toUpperCase() || 'U'}
            </div>
          )}
          <div className="min-w-0 flex-1 hidden md:block">
            <div className="text-xs font-semibold text-zinc-900 dark:text-zinc-200 truncate flex items-center justify-between">
              <span className="truncate">{userName || 'Ajustes'}</span>
              {hasUpdate && (
                <span className="w-2 h-2 bg-[#3584e4] rounded-full ring-2 ring-[#ebebeb] dark:ring-[#262626] animate-pulse shrink-0" />
              )}
            </div>
            <div className="text-[10px] text-zinc-500 dark:text-zinc-400 truncate">
              {user?.email || 'Preferências'}
            </div>
          </div>
        </NavLink>
      </div>
    </nav>
  );
};

