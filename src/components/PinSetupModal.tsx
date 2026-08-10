import React, { useState, useEffect } from 'react';
import { Shield, X, CheckCircle, Trash2 } from 'lucide-react';

interface PinSetupModalProps {
  onClose: () => void;
}

export const PinSetupModal: React.FC<PinSetupModalProps> = ({ onClose }) => {
  const [hasPin, setHasPin] = useState(false);
  const [step, setStep] = useState<'initial' | 'confirm' | 'success'>('initial');
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    const savedPin = localStorage.getItem('finante_pin');
    if (savedPin) {
      setHasPin(true);
    }
  }, []);

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!/[0-9]/.test(e.key) && e.key !== 'Backspace' && e.key !== 'Delete') {
      e.preventDefault();
    }
  };

  const handleSavePin = () => {
    if (pin.length !== 4) {
      setError('O PIN deve ter 4 dígitos.');
      return;
    }
    
    if (step === 'initial') {
      setStep('confirm');
      setError('');
    } else if (step === 'confirm') {
      if (pin === confirmPin) {
        localStorage.setItem('finante_pin', pin);
        setStep('success');
        setTimeout(() => {
          onClose();
        }, 1500);
      } else {
        setError('Os PINs não conferem. Tente novamente.');
        setConfirmPin('');
        setStep('initial');
      }
    }
  };

  const handleRemovePin = () => {
    localStorage.removeItem('finante_pin');
    setHasPin(false);
    onClose();
  };

  return (
    <div style={{
      position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh',
      backgroundColor: 'rgba(0, 0, 0, 0.6)', backdropFilter: 'blur(10px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center',
      zIndex: 9999
    }}>
      <div className="card" style={{ width: '90%', maxWidth: '400px', padding: '24px', position: 'relative' }}>
        <button 
          onClick={onClose}
          style={{ position: 'absolute', top: '16px', right: '16px', background: 'none', border: 'none', color: 'var(--text-color)', cursor: 'pointer', opacity: 0.7 }}
        >
          <X size={24} />
        </button>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>
          
          {step === 'success' ? (
            <>
              <div style={{ backgroundColor: 'rgba(52, 199, 89, 0.1)', color: '#34C759', padding: '16px', borderRadius: '50%', marginBottom: '16px' }}>
                <CheckCircle size={40} />
              </div>
              <h3>PIN Configurado!</h3>
              <p style={{ opacity: 0.7 }}>Seu aplicativo agora está protegido.</p>
            </>
          ) : hasPin ? (
            <>
              <div style={{ backgroundColor: 'rgba(88, 86, 214, 0.1)', color: '#5856D6', padding: '16px', borderRadius: '50%', marginBottom: '16px' }}>
                <Shield size={40} />
              </div>
              <h3>Bloqueio Ativado</h3>
              <p style={{ opacity: 0.7, marginBottom: '24px' }}>O acesso ao seu aplicativo está protegido por um PIN de 4 dígitos.</p>
              
              <button 
                className="btn text-danger" 
                style={{ width: '100%', backgroundColor: 'rgba(255, 59, 48, 0.1)' }}
                onClick={handleRemovePin}
              >
                <Trash2 size={20} style={{ marginRight: '8px' }} />
                Remover PIN
              </button>
            </>
          ) : (
            <>
              <div style={{ backgroundColor: 'rgba(88, 86, 214, 0.1)', color: '#5856D6', padding: '16px', borderRadius: '50%', marginBottom: '16px' }}>
                <Shield size={40} />
              </div>
              <h3>{step === 'initial' ? 'Criar um PIN' : 'Confirme seu PIN'}</h3>
              <p style={{ opacity: 0.7, marginBottom: '24px' }}>
                {step === 'initial' 
                  ? 'Digite 4 números para proteger o aplicativo no seu computador.' 
                  : 'Digite os mesmos 4 números novamente para confirmar.'}
              </p>

              <div style={{ display: 'flex', justifyContent: 'center', gap: '16px', marginBottom: '24px' }}>
                <input
                  type="password"
                  inputMode="numeric"
                  maxLength={4}
                  autoFocus
                  value={step === 'initial' ? pin : confirmPin}
                  onChange={(e) => {
                    const val = e.target.value.replace(/[^0-9]/g, '');
                    if (step === 'initial') setPin(val);
                    else setConfirmPin(val);
                  }}
                  onKeyDown={handleKeyPress}
                  style={{
                    fontSize: '32px',
                    letterSpacing: '16px',
                    textAlign: 'center',
                    width: '100%',
                    padding: '16px',
                    borderRadius: '12px',
                    border: '1px solid var(--card-border-color)',
                    backgroundColor: 'var(--bg-color)',
                    color: 'var(--text-color)'
                  }}
                />
              </div>

              {error && <p className="text-danger" style={{ marginBottom: '16px', fontSize: '14px' }}>{error}</p>}

              <button 
                className="btn btn-primary" 
                style={{ width: '100%' }}
                onClick={handleSavePin}
                disabled={(step === 'initial' ? pin.length !== 4 : confirmPin.length !== 4)}
              >
                {step === 'initial' ? 'Continuar' : 'Confirmar e Salvar'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
