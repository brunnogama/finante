import React, { useEffect, useState } from 'react';
import { biometricsService } from '../services/biometrics';
import { Fingerprint, Lock } from 'lucide-react';

interface LockScreenProps {
  onUnlocked: () => void;
}

export const LockScreen: React.FC<LockScreenProps> = ({ onUnlocked }) => {
  const [error, setError] = useState(false);
  const [isSupported, setIsSupported] = useState(true);
  
  const [hasPin, setHasPin] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [pinError, setPinError] = useState(false);

  useEffect(() => {
    checkSupportAndAuthenticate();
  }, []);

  const checkSupportAndAuthenticate = async () => {
    const available = await biometricsService.isAvailable();
    if (!available) {
      const savedPin = localStorage.getItem('finante_pin');
      if (savedPin) {
        setHasPin(true);
        setIsSupported(false);
        return;
      }
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

  const handlePinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value.replace(/[^0-9]/g, '');
    setPinInput(val);
    setPinError(false);

    if (val.length === 4) {
      const savedPin = localStorage.getItem('finante_pin');
      if (val === savedPin) {
        onUnlocked();
      } else {
        setPinError(true);
        setTimeout(() => setPinInput(''), 300);
      }
    }
  };

  if (!isSupported && !hasPin) {
    return null;
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
        {hasPin && !isSupported ? <Lock size={40} /> : <Fingerprint size={40} />}
      </div>
      <h2 style={{ marginBottom: 8 }}>Finante Bloqueado</h2>
      <p style={{ opacity: 0.7, marginBottom: 32 }}>
        {hasPin && !isSupported ? 'Digite seu PIN de 4 dígitos para acessar.' : 'Autentique-se para visualizar seus dados financeiros.'}
      </p>
      
      {hasPin && !isSupported ? (
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', position: 'relative' }}>
          <input
            type="password"
            inputMode="numeric"
            maxLength={4}
            autoFocus
            value={pinInput}
            onChange={handlePinChange}
            style={{
              position: 'absolute',
              opacity: 0,
              width: '100%',
              height: '100%',
              zIndex: 10,
              cursor: 'text'
            }}
          />
          <div style={{ display: 'flex', gap: '16px', marginBottom: '24px' }}>
            {[0, 1, 2, 3].map((i) => (
              <div 
                key={i} 
                style={{
                  width: '20px', 
                  height: '20px', 
                  borderRadius: '10px',
                  border: `2px solid ${pinError ? 'var(--danger-color)' : 'var(--accent-color)'}`,
                  backgroundColor: pinInput.length > i 
                    ? (pinError ? 'var(--danger-color)' : 'var(--accent-color)') 
                    : 'transparent',
                  transition: 'all 0.2s ease'
                }}
              />
            ))}
          </div>
          
          {pinError && (
            <p className="text-danger" style={{ marginBottom: 16 }}>PIN incorreto. Tente novamente.</p>
          )}
        </div>
      ) : (
        <>
          {error && (
            <p className="text-danger" style={{ marginBottom: 16 }}>Falha na autenticação. Tente novamente.</p>
          )}
          
          <button className="btn btn-primary" onClick={handleAuth}>
            Desbloquear
          </button>
        </>
      )}
    </div>
  );
};
