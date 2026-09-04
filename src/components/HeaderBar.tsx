import React, { useState, useRef, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Bell, ChevronLeft, Inbox, Moon, Sun } from 'lucide-react';
import { FinanteIcon } from './FinanteIcon';
import { WindowControls } from './WindowControls';
import { invoke, isTauri } from '@tauri-apps/api/core';

interface HeaderBarProps {
  title?: string;
}

export const HeaderBar: React.FC<HeaderBarProps> = ({ title = 'Finante' }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const isHome = location.pathname === '/';
  
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<Array<{ id: string; title: string; text: string; time: string }>>([]);
  const [isDarkMode, setIsDarkMode] = useState(() => document.documentElement.classList.contains('dark'));
  const dropdownRef = useRef<HTMLDivElement>(null);

  const isDesktop = typeof window !== 'undefined' && (isTauri() || '__TAURI_INTERNALS__' in window);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleTheme = (e: React.MouseEvent) => {
    e.stopPropagation();
    const nextDark = !document.documentElement.classList.contains('dark');
    if (nextDark) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
    setIsDarkMode(nextDark);
  };

  const handleDoubleClick = async (e: React.MouseEvent) => {
    if (e.target !== e.currentTarget && (e.target as HTMLElement).closest('button, a, input, [data-no-drag]')) {
      return;
    }
    if (isDesktop) {
      try {
        await invoke('app_toggle_maximize');
      } catch (err) {
        console.warn('Double click maximize error:', err);
      }
    }
  };

  const getPageTitle = () => {
    switch (location.pathname) {
      case '/':
        return 'Visão Geral';
      case '/calendar':
        return 'Calendário';
      case '/income':
        return 'Receitas';
      case '/expenses':
        return 'Despesas';
      case '/investments':
        return 'Investimentos';
      case '/settings':
        return 'Ajustes';
      default:
        return title;
    }
  };

  return (
    <header 
      className="relative flex items-center justify-between h-11 px-3.5 bg-[#ebebeb] dark:bg-[#303030] border-b border-black/10 dark:border-black/40 flex-shrink-0 z-40 select-none"
      data-tauri-drag-region
      onDoubleClick={handleDoubleClick}
    >
      {/* Left: Navigation / Brand */}
      <div className="flex items-center gap-2" data-tauri-drag-region>
        {!isHome && (
          <button 
            type="button"
            className="flex items-center justify-center w-7 h-7 rounded-full hover:bg-black/5 dark:hover:bg-white/10 active:bg-black/10 dark:active:bg-white/15 transition-colors text-zinc-600 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-white cursor-pointer" 
            onClick={() => navigate(-1)}
            title="Voltar"
            data-no-drag
          >
            <ChevronLeft size={17} strokeWidth={2.5} />
          </button>
        )}
        <div className="flex items-center gap-2" data-tauri-drag-region>
          <FinanteIcon size={18} />
          <span className="font-semibold text-xs tracking-tight text-zinc-700 dark:text-zinc-200">
            Finante
          </span>
        </div>
      </div>

      {/* Center: Dynamic Page Title (GNOME Style) */}
      <div 
        className="absolute left-1/2 -translate-x-1/2 font-bold text-xs sm:text-sm tracking-tight text-zinc-900 dark:text-zinc-100 pointer-events-none truncate max-w-[200px] sm:max-w-xs text-center"
        data-tauri-drag-region
      >
        {getPageTitle()}
      </div>
      
      {/* Right: Actions & Native Window Controls */}
      <div className="flex items-center gap-1 relative" data-tauri-drag-region ref={dropdownRef}>
        {/* Quick Theme Toggle */}
        <button
          type="button"
          onClick={toggleTheme}
          className="w-7 h-7 rounded-full flex items-center justify-center text-zinc-600 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-white hover:bg-black/5 dark:hover:bg-white/10 active:scale-95 transition-all cursor-pointer"
          title={isDarkMode ? 'Mudar para tema claro' : 'Mudar para tema escuro'}
          data-no-drag
        >
          {isDarkMode ? <Sun size={15} strokeWidth={2.2} /> : <Moon size={15} strokeWidth={2.2} />}
        </button>

        {/* Notifications Popover Toggle */}
        <button 
          type="button"
          onClick={() => setShowNotifications(!showNotifications)}
          className={`relative flex items-center justify-center w-7 h-7 rounded-full transition-colors cursor-pointer ${
            showNotifications 
              ? 'bg-black/10 dark:bg-white/15 text-zinc-900 dark:text-white' 
              : 'hover:bg-black/5 dark:hover:bg-white/10 text-zinc-600 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-white'
          }`}
          title="Notificações"
          data-no-drag
        >
          <Bell size={15} strokeWidth={2.2} />
          {notifications.length > 0 && (
            <span className="absolute top-1 right-1 w-2 h-2 bg-[#e01b24] rounded-full ring-2 ring-[#ebebeb] dark:ring-[#303030]" />
          )}
        </button>

        {/* Vertical separator before window controls */}
        {isDesktop && (
          <div className="w-px h-3.5 bg-black/10 dark:bg-white/10 mx-1 shrink-0" data-tauri-drag-region />
        )}

        {/* GNOME Window Controls */}
        <WindowControls />

        {/* Notifications Dropdown (Libadwaita Popover) */}
        {showNotifications && (
          <div 
            className="absolute top-full mt-2 right-0 w-80 adw-popover rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-100 z-50"
            data-no-drag
          >
            <div className="px-4 py-3 border-b border-black/5 dark:border-white/5 flex justify-between items-center">
              <h3 className="font-bold text-xs uppercase tracking-wider text-zinc-500 dark:text-zinc-400">Notificações</h3>
              {notifications.length > 0 && (
                <button 
                  onClick={() => setNotifications([])}
                  className="text-[11px] font-semibold text-blue-600 dark:text-blue-400 hover:underline cursor-pointer"
                >
                  Marcar como lidas
                </button>
              )}
            </div>
            
            {notifications.length === 0 ? (
              <div className="p-8 flex flex-col items-center justify-center text-center opacity-60">
                <Inbox size={30} strokeWidth={1.5} className="text-zinc-400 mb-2" />
                <p className="text-xs font-medium text-zinc-600 dark:text-zinc-300">Nenhuma notificação nova</p>
                <p className="text-[11px] text-zinc-400 mt-0.5">Você está atualizado.</p>
              </div>
            ) : (
              <div className="divide-y divide-black/5 dark:divide-white/5 max-h-64 overflow-y-auto">
                {notifications.map((notif) => (
                  <div key={notif.id} className="p-3 hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
                    <div className="text-xs font-semibold text-zinc-900 dark:text-white">{notif.title}</div>
                    <div className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">{notif.text}</div>
                    <div className="text-[10px] text-zinc-400 mt-1">{notif.time}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </header>
  );
};

