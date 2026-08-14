import React, { useState, useRef, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Bell, ChevronLeft, Inbox } from 'lucide-react';
import { FinanteIcon } from './FinanteIcon';

interface HeaderBarProps {
  title: string;
}

export const HeaderBar: React.FC<HeaderBarProps> = ({ title }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const isHome = location.pathname === '/';
  
  const [showNotifications, setShowNotifications] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowNotifications(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="flex items-center justify-between h-16 px-5 bg-white/70 dark:bg-zinc-900/60 backdrop-blur-xl border-b border-zinc-200/60 dark:border-zinc-800/50 flex-shrink-0 z-20" data-tauri-drag-region>
      <div className="flex items-center gap-3 font-extrabold text-lg tracking-tight select-none text-zinc-900 dark:text-white" data-tauri-drag-region>
        {!isHome && (
          <button 
            className="flex items-center justify-center p-2 -ml-2 rounded-full hover:bg-zinc-200/50 dark:hover:bg-zinc-800/50 transition-colors text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white" 
            onClick={() => navigate(-1)}
          >
            <ChevronLeft size={24} strokeWidth={2.5} />
          </button>
        )}
        {isHome && <FinanteIcon size={24} />}
        {title}
      </div>
      
      <div className="flex items-center gap-2 relative" data-tauri-drag-region ref={dropdownRef}>
        <button 
          onClick={() => setShowNotifications(!showNotifications)}
          className={`relative flex items-center justify-center p-2 rounded-full transition-colors ${showNotifications ? 'bg-zinc-200/80 dark:bg-zinc-800/80 text-zinc-900 dark:text-white' : 'hover:bg-zinc-200/50 dark:hover:bg-zinc-800/50 text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white'}`}
        >
          <Bell size={20} strokeWidth={2.5} />
          {/* Badge de notificação */}
          <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-rose-500 rounded-full border-2 border-white dark:border-zinc-900" />
        </button>

        {/* Notifications Dropdown */}
        {showNotifications && (
          <div className="absolute top-full mt-2 right-0 w-80 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-2xl border border-zinc-200 dark:border-zinc-800 rounded-2xl shadow-2xl overflow-hidden animate-[fadeIn_0.2s_ease]">
            <div className="px-4 py-3 border-b border-zinc-200/50 dark:border-zinc-800/50 flex justify-between items-center">
              <h3 className="font-semibold text-sm text-zinc-900 dark:text-white">Notificações</h3>
              <button className="text-[11px] font-semibold text-emerald-600 dark:text-emerald-400 uppercase tracking-wider hover:opacity-80">Marcar todas como lidas</button>
            </div>
            
            <div className="p-8 flex flex-col items-center justify-center text-center opacity-60">
              <Inbox size={32} strokeWidth={1.5} className="text-zinc-400 mb-3" />
              <p className="text-sm font-medium text-zinc-600 dark:text-zinc-400">Nenhuma notificação nova</p>
              <p className="text-xs text-zinc-500 mt-1">Você está atualizado.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
