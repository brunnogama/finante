import React, { useEffect, useState } from 'react';
import { Lock, Fingerprint, Delete, CheckCircle2, Shield } from 'lucide-react';
import { biometricsService } from '../services/biometrics';

interface LockScreenProps {
  onUnlocked: () => void;
}

export const LockScreen: React.FC<LockScreenProps> = ({ onUnlocked }) => {
  const [step, setStep] = useState<'create' | 'confirm' | 'unlock' | 'success'>('unlock');
  const [pinInput, setPinInput] = useState('');
  const [createdPin, setCreatedPin] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isBiometricSupported, setIsBiometricSupported] = useState(false);

  useEffect(() => {
    const savedPin = localStorage.getItem('finante_pin');
    if (!savedPin) {
      setStep('create');
    } else {
      setStep('unlock');
      checkBiometrics();
    }
  }, []);

  const checkBiometrics = async () => {
    try {
      const available = await biometricsService.isAvailable();
      setIsBiometricSupported(available);
      if (available) {
        handleBiometricAuth();
      }
    } catch {
      setIsBiometricSupported(false);
    }
  };

  const handleBiometricAuth = async () => {
    setErrorMsg(null);
    try {
      const success = await biometricsService.authenticate();
      if (success) {
        onUnlocked();
      }
    } catch {
      // Keep PIN unlock available
    }
  };

  const handleDigit = (digit: string) => {
    if (pinInput.length >= 4) return;
    const nextPin = pinInput + digit;
    setPinInput(nextPin);
    setErrorMsg(null);

    if (nextPin.length === 4) {
      processCompletedPin(nextPin);
    }
  };

  const handleDelete = () => {
    setPinInput(prev => prev.slice(0, -1));
    setErrorMsg(null);
  };

  const processCompletedPin = (pin: string) => {
    if (step === 'create') {
      setCreatedPin(pin);
      setTimeout(() => {
        setPinInput('');
        setStep('confirm');
      }, 200);
    } else if (step === 'confirm') {
      if (pin === createdPin) {
        localStorage.setItem('finante_pin', pin);
        setStep('success');
        setTimeout(() => {
          onUnlocked();
        }, 800);
      } else {
        setErrorMsg('Os PINs não conferem. Tente novamente.');
        setTimeout(() => {
          setPinInput('');
          setCreatedPin('');
          setStep('create');
        }, 600);
      }
    } else if (step === 'unlock') {
      const savedPin = localStorage.getItem('finante_pin');
      if (pin === savedPin) {
        setStep('success');
        setTimeout(() => {
          onUnlocked();
        }, 300);
      } else {
        setErrorMsg('PIN incorreto. Tente novamente.');
        setTimeout(() => {
          setPinInput('');
        }, 400);
      }
    }
  };

  // Listen to physical keyboard events
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key >= '0' && e.key <= '9') {
        handleDigit(e.key);
      } else if (e.key === 'Backspace' || e.key === 'Delete') {
        handleDelete();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [pinInput, step, createdPin]);

  return (
    <div className="fixed inset-0 bg-[#09090b] text-white flex flex-col items-center justify-center p-6 z-[9999] select-none animate-fadeIn">
      {/* Background glowing ambient light */}
      <div className="absolute w-96 h-96 bg-blue-600/10 rounded-full blur-3xl pointer-events-none -top-20 -left-20"></div>
      <div className="absolute w-96 h-96 bg-emerald-600/10 rounded-full blur-3xl pointer-events-none -bottom-20 -right-20"></div>

      <div className="w-full max-w-sm flex flex-col items-center text-center relative z-10">
        
        {/* Icon */}
        <div className="w-20 h-20 rounded-3xl bg-zinc-900/80 border border-white/10 shadow-2xl flex items-center justify-center mb-6 text-blue-400">
          {step === 'success' ? (
            <CheckCircle2 size={40} className="text-emerald-400 animate-scaleIn" />
          ) : step === 'create' || step === 'confirm' ? (
            <Shield size={38} className="text-blue-400" />
          ) : (
            <Lock size={38} className="text-blue-400" />
          )}
        </div>

        {/* Titles */}
        <h1 className="text-2xl font-extrabold tracking-tight text-white mb-1.5">
          {step === 'create' && 'Cadastre seu PIN de Acesso'}
          {step === 'confirm' && 'Confirme seu PIN'}
          {step === 'unlock' && 'Finante Bloqueado'}
          {step === 'success' && 'Acesso Liberado!'}
        </h1>

        <p className="text-xs sm:text-sm text-zinc-400 mb-8 max-w-xs">
          {step === 'create' && 'Crie uma senha de 4 dígitos para proteger suas finanças.'}
          {step === 'confirm' && 'Digite novamente os mesmos 4 dígitos para confirmar.'}
          {step === 'unlock' && 'Digite seu PIN de 4 dígitos para visualizar seus dados.'}
          {step === 'success' && 'PIN configurado com sucesso. Bem-vindo!'}
        </p>

        {/* PIN Dots Indicator */}
        <div className="flex items-center gap-4 mb-8">
          {[0, 1, 2, 3].map((i) => {
            const isFilled = pinInput.length > i;
            const hasError = !!errorMsg;

            return (
              <div
                key={i}
                className={`w-4 h-4 rounded-full transition-all duration-200 ${
                  hasError
                    ? 'bg-rose-500 scale-110 shadow-md shadow-rose-500/30'
                    : isFilled
                      ? 'bg-blue-500 scale-110 shadow-md shadow-blue-500/30'
                      : 'bg-zinc-800 border border-zinc-700'
                }`}
              />
            );
          })}
        </div>

        {/* Error Feedback */}
        {errorMsg && (
          <p className="text-xs font-semibold text-rose-400 -mt-4 mb-6 animate-[shake_0.2s_ease]">
            {errorMsg}
          </p>
        )}

        {/* Numeric Keypad */}
        <div className="grid grid-cols-3 gap-3 w-full max-w-[280px]">
          {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((num) => (
            <button
              key={num}
              type="button"
              onClick={() => handleDigit(num)}
              className="w-full aspect-square rounded-2xl bg-zinc-900/60 hover:bg-zinc-800 active:bg-zinc-700 active:scale-95 border border-white/5 text-xl font-bold text-white flex items-center justify-center transition-all cursor-pointer shadow-sm"
            >
              {num}
            </button>
          ))}

          {/* Biometrics button (if supported) or spacer */}
          {isBiometricSupported ? (
            <button
              type="button"
              onClick={handleBiometricAuth}
              className="w-full aspect-square rounded-2xl bg-zinc-900/40 hover:bg-zinc-800 text-blue-400 flex items-center justify-center transition-all cursor-pointer"
              title="Autenticação Biométrica"
            >
              <Fingerprint size={24} />
            </button>
          ) : (
            <div />
          )}

          {/* 0 */}
          <button
            type="button"
            onClick={() => handleDigit('0')}
            className="w-full aspect-square rounded-2xl bg-zinc-900/60 hover:bg-zinc-800 active:bg-zinc-700 active:scale-95 border border-white/5 text-xl font-bold text-white flex items-center justify-center transition-all cursor-pointer shadow-sm"
          >
            0
          </button>

          {/* Backspace */}
          <button
            type="button"
            onClick={handleDelete}
            className="w-full aspect-square rounded-2xl bg-zinc-900/40 hover:bg-zinc-800 text-zinc-400 hover:text-white flex items-center justify-center transition-all cursor-pointer"
            title="Apagar"
          >
            <Delete size={22} />
          </button>
        </div>

      </div>
    </div>
  );
};
