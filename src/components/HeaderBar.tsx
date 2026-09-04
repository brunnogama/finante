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
  const [notifications, setNotifications] = useState<Array<{ id: string; title: string; text: string; time: string }>>([]);
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
    <div className="flex items-center justify-between h-12 px-4 bg-[#ebebeb] dark:bg-[#303030] border-b border-black/10 dark:border-black/40 flex-shrink-0 z-20 select-none" data-tauri-drag-region>
      <div className="flex items-center gap-2.5 font-bold text-sm tracking-tight text-zinc-800 dark:text-zinc-100" data-tauri-drag-region>
        {!isHome && (
          <button 
            className="flex items-center justify-center w-7 h-7 rounded-md hover:bg-black/5 dark:hover:bg-white/10 active:bg-black/10 dark:active:bg-white/15 transition-colors text-zinc-600 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-white cursor-pointer" 
            onClick={() => navigate(-1)}
            title="Voltar"
          >
            <ChevronLeft size={18} strokeWidth={2.5} />
          </button>
        )}
        {isHome && <FinanteIcon size={20} />}
        <span className="font-semibold text-sm">{title}</span>
      </div>
      
      <div className="flex items-center gap-1.5 relative" data-tauri-drag-region ref={dropdownRef}>
        <button 
          onClick={() => setShowNotifications(!showNotifications)}
          className={`relative flex items-center justify-center w-8 h-8 rounded-md transition-colors cursor-pointer ${
            showNotifications 
              ? 'bg-black/10 dark:bg-white/15 text-zinc-900 dark:text-white' 
              : 'hover:bg-black/5 dark:hover:bg-white/10 text-zinc-600 hover:text-zinc-900 dark:text-zinc-300 dark:hover:text-white'
          }`}
          title="Notificações"
        >
          <Bell size={17} strokeWidth={2} />
          {/* Badge de notificação */}
          {notifications.length > 0 && (
            <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#e01b24] rounded-full ring-2 ring-[#ebebeb] dark:ring-[#303030]" />
          )}
        </button>

        {/* Notifications Dropdown (Libadwaita Popover) */}
        {showNotifications && (
          <div className="absolute top-full mt-2 right-0 w-80 bg-white dark:bg-[#383838] border border-black/10 dark:border-white/10 rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-100 z-50">
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
    </div>
  );
};
