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
    CapacitorApp.addListener('appStateChange', ({ isActive }: { isActive: boolean }) => {
      if (!isActive) {
        // Bloqueia o app novamente se ele for para background
        setIsUnlocked(false);
      }
    });
  }, []);

  const handleUnlock = () => {
    setIsUnlocked(true);
    
    // Inicia o serviço de leitura de notificações após o desbloqueio
    notificationListenerService.initialize();
    
    // Simula receber uma notificação de compra em 5 segundos (só para demonstração visual no Console/Web)
    notificationListenerService.simulateBankNotification((expense) => {
      console.log('Despesa capturada pela notificação:', expense);
      // Aqui a despesa seria salva no Supabase automaticamente
    });
  };

  if (!isUnlocked) {
    return <LockScreen onUnlocked={handleUnlock} />;
  }

  return (
    <Router>
      <div className="app-container">
        <HeaderBar title="Finante" />
        
        <div className="content-container">
          <Navigation />
          
          <div className="main-view">
            <Routes>
              <Route path="/" element={<Dashboard />} />
              <Route path="/calendar" element={<CalendarView />} />
              <Route path="/income" element={<Income />} />
              <Route path="/expenses" element={<Expenses />} />
              <Route path="/investments" element={<Investments />} />
              <Route path="/settings" element={<Settings />} />
              <Route path="*" element={<Navigate to="/" />} />
            </Routes>
          </div>
        </div>
      </div>
    </Router>
  );
}

export default App;
