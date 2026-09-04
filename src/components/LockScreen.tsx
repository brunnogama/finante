import React, { useEffect, useState } from 'react';
import { Lock, Fingerprint, Delete, CheckCircle2, Shield, LogOut, RefreshCw } from 'lucide-react';
import { biometricsService } from '../services/biometrics';
import { supabase, signInWithGoogle, signOutUser } from '../services/supabase';

interface LockScreenProps {
  onUnlocked: () => void;
}

export const LockScreen: React.FC<LockScreenProps> = ({ onUnlocked }) => {
  const [step, setStep] = useState<'welcome' | 'create' | 'confirm' | 'unlock' | 'success'>('unlock');
  const [pinInput, setPinInput] = useState('');
  const [createdPin, setCreatedPin] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isBiometricSupported, setIsBiometricSupported] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [isSigningIn, setIsSigningIn] = useState(false);

  useEffect(() => {
    // Check active session & local PIN
    const initAuth = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      const savedPin = localStorage.getItem('finante_pin');
      const offlineMode = localStorage.getItem('finante_offline_mode');

      if (session?.user) {
        setUser(session.user);
        if (!savedPin) {
          setStep('create');
        } else {
          setStep('unlock');
          checkBiometrics();
        }
      } else if (savedPin || offlineMode) {
        if (!savedPin) {
          setStep('create');
        } else {
          setStep('unlock');
          checkBiometrics();
        }
      } else {
        setStep('welcome');
      }
    };

    initAuth();

    // Listen to Supabase Auth state changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setUser(session.user);
        const savedPin = localStorage.getItem('finante_pin');
        if (!savedPin) {
          setStep('create');
        } else {
          setStep('unlock');
        }
      }
    });

    return () => {
      subscription.unsubscribe();
    };
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

  const handleGoogleSignIn = async () => {
    setIsSigningIn(true);
    setErrorMsg(null);
    try {
      await signInWithGoogle();
    } catch (err: any) {
      console.error('Google Sign In Error:', err);
      setErrorMsg(err.message || 'Não foi possível conectar ao Google.');
      setIsSigningIn(false);
    }
  };

  const handleSkipAuth = () => {
    localStorage.setItem('finante_offline_mode', 'true');
    const savedPin = localStorage.getItem('finante_pin');
    if (!savedPin) {
      setStep('create');
    } else {
      setStep('unlock');
    }
  };

  const handleSignOut = async () => {
    try {
      await signOutUser();
      setUser(null);
      localStorage.removeItem('finante_pin');
      localStorage.removeItem('finante_offline_mode');
      setStep('welcome');
      setPinInput('');
      setCreatedPin('');
    } catch (err) {
      console.error('Sign Out Error:', err);
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
      if (step === 'welcome') return;
      if (e.key >= '0' && e.key <= '9') {
        handleDigit(e.key);
      } else if (e.key === 'Backspace' || e.key === 'Delete') {
        handleDelete();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [pinInput, step, createdPin]);

  const userName = user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email?.split('@')[0];
  const userAvatar = user?.user_metadata?.avatar_url || user?.user_metadata?.picture;

  return (
    <div className="fixed inset-0 bg-[#000000] text-white flex flex-col items-center justify-center p-6 z-[9999] select-none animate-fadeIn">
      {/* Background glowing ambient light */}
      <div className="absolute w-[500px] h-[500px] bg-blue-600/10 rounded-full blur-[120px] pointer-events-none -top-20 -left-20"></div>
      <div className="absolute w-[500px] h-[500px] bg-emerald-600/10 rounded-full blur-[120px] pointer-events-none -bottom-20 -right-20"></div>

      {/* =========================================================================
          STEP 1: WELCOME & GOOGLE LOGIN
      ========================================================================= */}
      {step === 'welcome' && (
        <div className="w-full max-w-sm flex flex-col items-center text-center relative z-10 animate-scaleIn">
          {/* Finante Logo */}
          <div className="w-20 h-20 rounded-3xl bg-zinc-900/90 border border-white/15 shadow-2xl flex items-center justify-center mb-6 text-blue-400 relative group">
            <img src="/finante.png" alt="Finante" className="w-12 h-12 object-contain" onError={(e) => {
              // fallback if image not found
              (e.target as HTMLElement).style.display = 'none';
            }} />
          </div>

          <h1 className="text-3xl font-black tracking-tight text-white mb-2">
            Finante
          </h1>
          <p className="text-sm text-zinc-400 mb-8 max-w-xs leading-relaxed">
            Seu gerenciador financeiro inteligente. Conecte sua conta para sincronizar tudo na nuvem com segurança.
          </p>

          {/* Google Sign In Button */}
          <button
            type="button"
            onClick={handleGoogleSignIn}
            disabled={isSigningIn}
            className="w-full flex items-center justify-center gap-3 py-3.5 px-5 rounded-2xl bg-white hover:bg-zinc-100 active:scale-[0.98] text-zinc-900 font-bold text-sm shadow-xl transition-all cursor-pointer disabled:opacity-60 mb-4"
          >
            {isSigningIn ? (
              <>
                <RefreshCw size={18} className="animate-spin text-zinc-600" />
                <span>Conectando ao Google...</span>
              </>
            ) : (
              <>
                {/* Official Google 'G' Logo */}
                <svg width="20" height="20" viewBox="0 0 24 24" className="shrink-0">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
                <span>Continuar com o Google</span>
              </>
            )}
          </button>

          {/* Local Mode / Offline Option */}
          <button
            type="button"
            onClick={handleSkipAuth}
            className="text-xs font-semibold text-zinc-500 hover:text-zinc-300 py-2 transition-colors cursor-pointer"
          >
            Usar apenas modo local com PIN
          </button>

          {errorMsg && (
            <p className="text-xs font-semibold text-rose-400 mt-4 animate-fadeIn">
              {errorMsg}
            </p>
          )}
        </div>
      )}

      {/* =========================================================================
          STEP 2-5: PIN CREATION, CONFIRMATION & UNLOCK
      ========================================================================= */}
      {step !== 'welcome' && (
        <div className="w-full max-w-sm flex flex-col items-center text-center relative z-10">
          
          {/* Avatar / Icon Header */}
          <div className="relative mb-5">
            {userAvatar ? (
              <div className="relative">
                <img 
                  src={userAvatar} 
                  alt={userName || 'Perfil'} 
                  className="w-20 h-20 rounded-3xl object-cover border-2 border-white/20 shadow-2xl ring-4 ring-blue-500/20"
                />
                <div className="absolute -bottom-1 -right-1 w-7 h-7 rounded-xl bg-zinc-900 border border-white/20 flex items-center justify-center text-emerald-400 shadow-md">
                  <Lock size={13} />
                </div>
              </div>
            ) : (
              <div className="w-20 h-20 rounded-3xl bg-zinc-900/80 border border-white/10 shadow-2xl flex items-center justify-center text-blue-400">
                {step === 'success' ? (
                  <CheckCircle2 size={40} className="text-emerald-400 animate-scaleIn" />
                ) : step === 'create' || step === 'confirm' ? (
                  <Shield size={38} className="text-blue-400" />
                ) : (
                  <Lock size={38} className="text-blue-400" />
                )}
              </div>
            )}
          </div>

          {/* Titles */}
          <h1 className="text-2xl font-black tracking-tight text-white mb-1.5">
            {step === 'create' && (userName ? `Olá, ${userName}!` : 'Cadastre seu PIN')}
            {step === 'confirm' && 'Confirme seu PIN'}
            {step === 'unlock' && (userName ? `Bem-vindo de volta, ${userName}` : 'Finante Bloqueado')}
            {step === 'success' && 'Acesso Liberado!'}
          </h1>

          <p className="text-xs sm:text-sm text-zinc-400 mb-7 max-w-xs leading-relaxed">
            {step === 'create' && 'Crie uma senha de 4 dígitos para desbloqueio rápido no dispositivo.'}
            {step === 'confirm' && 'Digite novamente os mesmos 4 dígitos para confirmar.'}
            {step === 'unlock' && 'Digite seu PIN de 4 dígitos para acessar o Finante.'}
            {step === 'success' && 'PIN confirmado com sucesso. Carregando dados...'}
          </p>

          {/* PIN Dots Indicator */}
          <div className="flex items-center gap-4 mb-7">
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
            <p className="text-xs font-semibold text-rose-400 -mt-3 mb-5 animate-[shake_0.2s_ease]">
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

          {/* Switch Account / Logout */}
          {user && (
            <button
              type="button"
              onClick={handleSignOut}
              className="mt-6 inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer"
            >
              <LogOut size={13} />
              <span>Trocar de conta Google</span>
            </button>
          )}

        </div>
      )}

    </div>
  );
};
