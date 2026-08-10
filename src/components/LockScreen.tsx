import React, { useEffect, useState } from 'react';
import { biometricsService } from '../services/biometrics';
import { Fingerprint } from 'lucide-react';

interface LockScreenProps {
  onUnlocked: () => void;
}

export const LockScreen: React.FC<LockScreenProps> = ({ onUnlocked }) => {
  const [error, setError] = useState(false);
  const [isSupported, setIsSupported] = useState(true);

  useEffect(() => {
    checkSupportAndAuthenticate();
  }, []);

  const checkSupportAndAuthenticate = async () => {
    const available = await biometricsService.isAvailable();
    if (!available) {
      // Se não houver suporte nativo (ou estivermos na web), desbloqueia automaticamente.
      setIsSupported(false);
      onUnlocked();
      return;
    }
    
    handleAuth();
  };

  const handleAuth = async () => {
    setError(false);
    const success = await biometricsService.authenticate();
    if (success) {
      onUnlocked();
    } else {
      setError(true);
    }
  };

  if (!isSupported) {
    return null; // O App.tsx lidará com a renderização principal
  }

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
      backgroundColor: 'var(--window-bg-color)', color: 'var(--window-fg-color)',
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      zIndex: 9999
    }}>
      <div style={{
        width: 80, height: 80, borderRadius: 40, 
        backgroundColor: 'var(--accent-color)', color: 'white',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        marginBottom: 24, boxShadow: '0 8px 16px rgba(65, 105, 225, 0.3)'
      }}>
        <Fingerprint size={40} />
      </div>
      <h2 style={{ marginBottom: 8 }}>Finante Bloqueado</h2>
      <p style={{ opacity: 0.7, marginBottom: 32 }}>Autentique-se para visualizar seus dados financeiros.</p>
      
      {error && (
        <p className="text-danger" style={{ marginBottom: 16 }}>Falha na autenticação. Tente novamente.</p>
      )}
      
      <button className="btn btn-primary" onClick={handleAuth}>
        Desbloquear
      </button>
    </div>
  );
};
