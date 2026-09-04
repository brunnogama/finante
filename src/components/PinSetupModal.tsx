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
        }, 1200);
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div 
        className="adw-dialog max-w-sm w-full p-6 shadow-2xl animate-scaleIn relative flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer"
        >
          <X size={18} />
        </button>

        <div className="flex flex-col items-center text-center">
          
          {step === 'success' ? (
            <>
              <div className="w-14 h-14 rounded-2xl bg-[#2ec27e]/15 text-[#2ec27e] flex items-center justify-center mb-3">
                <CheckCircle size={32} />
              </div>
              <h3 className="text-lg font-bold text-zinc-900 dark:text-white">PIN Configurado!</h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1">Seu aplicativo agora está protegido.</p>
            </>
          ) : hasPin ? (
            <>
              <div className="w-14 h-14 rounded-2xl bg-[#9141ac]/15 text-[#9141ac] flex items-center justify-center mb-3">
                <Shield size={32} />
              </div>
              <h3 className="text-lg font-bold text-zinc-900 dark:text-white">Bloqueio Ativado</h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 mb-6">
                O acesso ao seu aplicativo está protegido por um PIN de 4 dígitos.
              </p>
              
              <button 
                className="adw-btn destructive-action w-full py-2.5 text-xs font-semibold inline-flex items-center justify-center gap-2 cursor-pointer" 
                onClick={handleRemovePin}
              >
                <Trash2 size={16} />
                <span>Remover PIN</span>
              </button>
            </>
          ) : (
            <>
              <div className="w-14 h-14 rounded-2xl bg-[#3584e4]/15 text-[#3584e4] flex items-center justify-center mb-3">
                <Shield size={32} />
              </div>
              <h3 className="text-lg font-bold text-zinc-900 dark:text-white">
                {step === 'initial' ? 'Criar um PIN' : 'Confirme seu PIN'}
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 mb-5">
                {step === 'initial' 
                  ? 'Digite 4 números para proteger o aplicativo no seu computador.' 
                  : 'Digite os mesmos 4 números novamente para confirmar.'}
              </p>

              <div className="w-full mb-4">
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
                  className="adw-entry text-2xl tracking-[16px] text-center font-bold py-3 w-full"
                />
              </div>

              {error && (
                <p className="text-xs font-semibold text-[#e01b24] mb-3">
                  {error}
                </p>
              )}

              <button 
                className="adw-btn suggested-action w-full py-2.5 text-xs font-semibold cursor-pointer disabled:opacity-50" 
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
