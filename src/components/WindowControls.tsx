import React, { useState, useEffect } from 'react';
import { Minus, Square, Copy, X } from 'lucide-react';
import { invoke, isTauri } from '@tauri-apps/api/core';

export const WindowControls: React.FC = () => {
  const isDesktop = typeof window !== 'undefined' && (isTauri() || '__TAURI_INTERNALS__' in window);
  const [isMaximized, setIsMaximized] = useState(false);

  useEffect(() => {
    if (!isDesktop) return;
    invoke<boolean>('app_is_maximized').then(setIsMaximized).catch(() => {});

    const handleResize = () => {
      invoke<boolean>('app_is_maximized').then(setIsMaximized).catch(() => {});
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isDesktop]);

  if (!isDesktop) return null;

  const handleMinimize = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await invoke('app_minimize');
    } catch (err) {
      console.warn('Minimize error:', err);
    }
  };

  const handleToggleMaximize = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await invoke('app_toggle_maximize');
      const max = await invoke<boolean>('app_is_maximized');
      setIsMaximized(max);
    } catch (err) {
      console.warn('Toggle maximize error:', err);
    }
  };

  const handleClose = async (e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await invoke('app_close');
    } catch (err) {
      console.warn('Close window error:', err);
    }
  };

  return (
    <div className="flex items-center gap-1.5 ml-1.5" data-no-drag>
      {/* Minimize */}
      <button
        type="button"
        onClick={handleMinimize}
        className="w-6 h-6 rounded-full flex items-center justify-center text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white bg-black/5 dark:bg-white/10 hover:bg-black/15 dark:hover:bg-white/20 active:scale-95 transition-all cursor-pointer border-none shadow-xs"
        title="Minimizar"
        aria-label="Minimizar"
      >
        <Minus size={11} strokeWidth={2.5} />
      </button>

      {/* Maximize / Restore */}
      <button
        type="button"
        onClick={handleToggleMaximize}
        className="w-6 h-6 rounded-full flex items-center justify-center text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-white bg-black/5 dark:bg-white/10 hover:bg-black/15 dark:hover:bg-white/20 active:scale-95 transition-all cursor-pointer border-none shadow-xs"
        title={isMaximized ? 'Restaurar' : 'Maximizar'}
        aria-label={isMaximized ? 'Restaurar' : 'Maximizar'}
      >
        {isMaximized ? (
          <Copy size={10} strokeWidth={2.5} />
        ) : (
          <Square size={9} strokeWidth={2.5} />
        )}
      </button>

      {/* Close */}
      <button
        type="button"
        onClick={handleClose}
        className="w-6 h-6 rounded-full flex items-center justify-center text-zinc-600 dark:text-zinc-300 hover:text-white bg-black/5 dark:bg-white/10 hover:bg-[#e01b24] active:bg-[#c01c28] active:scale-95 transition-all cursor-pointer border-none shadow-xs"
        title="Fechar"
        aria-label="Fechar"
      >
        <X size={11} strokeWidth={2.5} />
      </button>
    </div>
  );
};
