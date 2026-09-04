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
import { notificationListenerService } from './services/notifications';

import { App as CapacitorApp } from '@capacitor/app';

function App() {
  const [isUnlocked, setIsUnlocked] = useState(false);

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

    // Capacitor background lock
    CapacitorApp.addListener('appStateChange', ({ isActive }: { isActive: boolean }) => {
      if (!isActive) {
        setIsUnlocked(false);
      }
    });

    return () => {
      mediaQuery.removeEventListener('change', listener);
    };
  }, []);

  const handleUnlock = () => {
    setIsUnlocked(true);
    notificationListenerService.initialize();
    notificationListenerService.simulateBankNotification((expense) => {
      console.log('Despesa capturada pela notificação:', expense);
    });
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
      </div>
    </Router>
  );
}

export default App;
