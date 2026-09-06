import { useEffect, useState } from 'react';
import { HashRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { HeaderBar } from './components/HeaderBar';
import { Navigation } from './components/Navigation';
import { Dashboard } from './pages/Dashboard';
import { Income } from './pages/Income';
import { Expenses } from './pages/Expenses';
import { CalendarView } from './pages/CalendarView';
import { Investments } from './pages/Investments';
import { Settings } from './pages/Settings';
import { LockScreen } from './components/LockScreen';
import { notificationListenerService, type ParsedBankExpense } from './services/notifications';
import { BankNotificationModal } from './components/BankNotificationModal';
import { NotificationPermissionModal } from './components/NotificationPermissionModal';

import { App as CapacitorApp } from '@capacitor/app';
import { Capacitor } from '@capacitor/core';

function App() {
  const [isUnlocked, setIsUnlocked] = useState(false);
  const [pendingBankExpenses, setPendingBankExpenses] = useState<ParsedBankExpense[]>([]);
  const [showPermissionModal, setShowPermissionModal] = useState(false);

  const checkBankNotifications = async () => {
    try {
      let items: ParsedBankExpense[] = [];
      if (notificationListenerService.isSupported()) {
        const granted = await notificationListenerService.checkPermission();
        if (granted) {
          items = await notificationListenerService.fetchPendingNotifications(true);
        }
      } else {
        items = await notificationListenerService.fetchWebSimulatedNotifications();
      }

      if (items && items.length > 0) {
        setPendingBankExpenses(prev => {
          const existingIds = new Set(prev.map(p => p.rawId));
          const newItems = items.filter(it => !existingIds.has(it.rawId));
          return [...prev, ...newItems];
        });
      }
    } catch (err) {
      console.warn('Falha ao checar notificações bancárias:', err);
    }
  };

  useEffect(() => {
    // Apple HIG Theme Management (Dark Mode)
    const applyTheme = () => {
      const savedTheme = localStorage.getItem('theme');
      if (savedTheme === 'dark' || (!savedTheme && window.matchMedia('(prefers-color-scheme: dark)').matches)) {
        document.documentElement.classList.add('dark');
      } else {
        document.documentElement.classList.remove('dark');
      }
    };
    applyTheme();

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const listener = () => applyTheme();
    mediaQuery.addEventListener('change', listener);

    // Capacitor background lock & resume notification check (mobile only)
    let appStateHandle: any = null;
    if (Capacitor.isNativePlatform()) {
      CapacitorApp.addListener('appStateChange', ({ isActive }: { isActive: boolean }) => {
        if (!isActive) {
          setIsUnlocked(false);
        } else {
          checkBankNotifications();
          notificationListenerService.checkAndNotifyDueExpenses();
        }
      }).then(handle => {
        appStateHandle = handle;
      });
    }

    const handleCustomCheck = () => {
      checkBankNotifications();
    };
    const handleOpenPermissions = () => {
      setShowPermissionModal(true);
    };

    window.addEventListener('finante_check_notifications', handleCustomCheck);
    window.addEventListener('finante_open_permission_modal', handleOpenPermissions);

    return () => {
      mediaQuery.removeEventListener('change', listener);
      window.removeEventListener('finante_check_notifications', handleCustomCheck);
      window.removeEventListener('finante_open_permission_modal', handleOpenPermissions);
      if (appStateHandle) {
        appStateHandle.remove?.();
      }
    };
  }, []);

  const handleUnlock = () => {
    setIsUnlocked(true);
    setTimeout(async () => {
      // 1. Checa notificações bancárias recebidas
      await checkBankNotifications();

      // 2. Checa contas vencendo hoje e dispara lembrete
      await notificationListenerService.checkAndNotifyDueExpenses();

      // 3. Pede permissões ao abrir o app se ainda não concedidas no mobile
      if (notificationListenerService.isSupported()) {
        const [postGranted, listenerGranted] = await Promise.all([
          notificationListenerService.isPostNotificationsGranted(),
          notificationListenerService.checkPermission()
        ]);
        if (!postGranted || !listenerGranted) {
          setShowPermissionModal(true);
        }
      }
    }, 450);
  };

  if (!isUnlocked) {
    return <LockScreen onUnlocked={handleUnlock} />;
  }

  return (
    <Router>
      <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#fafafa] dark:bg-[#242424] text-zinc-900 dark:text-zinc-100 font-sans antialiased selection:bg-blue-500/30">
        <HeaderBar title="Finante" />
        
        <div className="flex flex-1 overflow-hidden flex-col md:flex-row relative">
          <Navigation />
          
          <main className="flex-1 overflow-y-auto pb-24 md:pb-0 w-full relative z-0">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/calendar" element={<CalendarView />} />
              <Route path="/income" element={<Income />} />
              <Route path="/expenses" element={<Expenses />} />
              <Route path="/investments" element={<Investments />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="*" element={<Navigate to="/" />} />
            </Routes>
          </main>
        </div>

        {/* Modal de Notificações Bancárias Capturadas */}
        {pendingBankExpenses.length > 0 && (
          <BankNotificationModal
            items={pendingBankExpenses}
            onClose={() => setPendingBankExpenses([])}
            onAdded={() => {
              window.dispatchEvent(new CustomEvent('finante_refresh_expenses'));
            }}
          />
        )}

        {/* Modal de Solicitação de Permissões ao Abrir */}
        <NotificationPermissionModal
          isOpen={showPermissionModal}
          onClose={() => setShowPermissionModal(false)}
        />
      </div>
    </Router>
  );
}

export default App;
