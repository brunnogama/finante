import React, { useEffect, useState } from 'react';
import { Lock, Fingerprint, Delete, CheckCircle2, Shield, LogOut, RefreshCw, Mail, KeyRound, ArrowLeft, UserPlus, LogIn } from 'lucide-react';
import { WindowControls } from './WindowControls';
import { FinanteIcon } from './FinanteIcon';
import { biometricsService } from '../services/biometrics';
import { supabase, signInWithGoogle, signInWithEmail, signUpWithEmail, signOutUser } from '../services/supabase';

interface LockScreenProps {
  onUnlocked: () => void;
}

export const LockScreen: React.FC<LockScreenProps> = ({ onUnlocked }) => {
  const [step, setStep] = useState<'welcome' | 'create' | 'confirm' | 'unlock' | 'success'>('unlock');
  const [authMode, setAuthMode] = useState<'options' | 'email_login' | 'email_signup'>('options');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isEmailLoading, setIsEmailLoading] = useState(false);
  const [emailSuccessMsg, setEmailSuccessMsg] = useState<string | null>(null);
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
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setErrorMsg('Preencha seu e-mail e senha.');
      return;
    }
    if (password.length < 6) {
      setErrorMsg('A senha deve ter no mínimo 6 caracteres.');
      return;
    }

    setIsEmailLoading(true);
    setErrorMsg(null);
    setEmailSuccessMsg(null);

    try {
      if (authMode === 'email_signup') {
        const data = await signUpWithEmail(email, password);
        if (data?.user && !data.session) {
          setEmailSuccessMsg('Conta criada! Verifique seu e-mail ou faça login com sua senha.');
          setAuthMode('email_login');
        } else if (data?.user) {
          setUser(data.user);
        }
      } else {
        const data = await signInWithEmail(email, password);
        if (data?.user) {
          setUser(data.user);
        }
      }
    } catch (err: any) {
      console.error('Email Auth Error:', err);
      setErrorMsg(err.message || 'Falha na autenticação. Verifique suas credenciais.');
    } finally {
      setIsEmailLoading(false);
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
      setAuthMode('options');
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
    <div className="fixed inset-0 bg-[#1e1e1e] text-white flex flex-col items-center justify-center p-6 z-[9999] select-none animate-fadeIn">
      {/* Top Window Drag & Controls Bar */}
      <div 
        className="absolute top-0 left-0 right-0 h-11 px-3.5 flex items-center justify-between z-50 select-none"
        data-tauri-drag-region
      >
        <div className="flex items-center gap-2" data-tauri-drag-region>
          <FinanteIcon size={14} className="opacity-80" />
          <span className="text-[11px] font-semibold tracking-tight text-zinc-400">Finante</span>
        </div>
        <WindowControls />
      </div>

      {/* Background glowing ambient light */}
      <div className="absolute w-[500px] h-[500px] bg-[#3584e4]/10 rounded-full blur-[120px] pointer-events-none -top-20 -left-20"></div>
      <div className="absolute w-[500px] h-[500px] bg-[#2ec27e]/10 rounded-full blur-[120px] pointer-events-none -bottom-20 -right-20"></div>

      {/* =========================================================================
          STEP 1: WELCOME & LOGIN OPTIONS
      ========================================================================= */}
      {step === 'welcome' && (
        <div className="w-full max-w-sm flex flex-col items-center text-center relative z-10 animate-scaleIn">
          {/* Finante Logo */}
          <div className="w-20 h-20 rounded-3xl bg-[#2a2a2a] border border-white/10 shadow-2xl flex items-center justify-center mb-6 text-white relative group">
            <FinanteIcon size={40} className="text-white" />
          </div>

          <h1 className="text-3xl font-black tracking-tight text-white mb-2">
            Finante
          </h1>
          <p className="text-sm text-zinc-400 mb-8 max-w-xs leading-relaxed">
            Seu gerenciador financeiro inteligente. Conecte sua conta para manter seus dados seguros e sincronizados.
          </p>

          {authMode === 'options' ? (
            <div className="w-full space-y-3">
              {/* Google Sign In Button */}
              <button
                type="button"
                onClick={handleGoogleSignIn}
                disabled={isSigningIn}
                className="w-full flex items-center justify-center gap-3 py-3.5 px-5 rounded-2xl bg-white hover:bg-zinc-100 active:scale-[0.98] text-zinc-900 font-bold text-sm shadow-xl transition-all cursor-pointer disabled:opacity-60"
              >
                {isSigningIn ? (
                  <>
                    <RefreshCw size={18} className="animate-spin text-zinc-600" />
                    <span>Conectando ao Google...</span>
                  </>
                ) : (
                  <>
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

              {/* Email Login Button */}
              <button
                type="button"
                onClick={() => { setAuthMode('email_login'); setErrorMsg(null); setEmailSuccessMsg(null); }}
                className="w-full flex items-center justify-center gap-2.5 py-3 px-5 rounded-2xl bg-white/[0.08] hover:bg-white/[0.14] text-white font-semibold text-xs border border-white/10 transition-all cursor-pointer"
              >
                <Mail size={16} />
                <span>Entrar com E-mail e Senha</span>
              </button>

              {/* Local Mode / Offline Option */}
              <div className="pt-3">
                <button
                  type="button"
                  onClick={handleSkipAuth}
                  className="text-xs font-semibold text-zinc-500 hover:text-zinc-300 py-1 transition-colors cursor-pointer"
                >
                  Usar apenas modo local (Convidado)
                </button>
              </div>
            </div>
          ) : (
            /* Email & Password Form */
            <form onSubmit={handleEmailAuth} className="w-full space-y-3.5 animate-fadeIn text-left">
              <div className="flex items-center justify-between mb-2">
                <button
                  type="button"
                  onClick={() => { setAuthMode('options'); setErrorMsg(null); setEmailSuccessMsg(null); }}
                  className="text-xs font-semibold text-zinc-400 hover:text-white inline-flex items-center gap-1 transition-colors cursor-pointer"
                >
                  <ArrowLeft size={14} />
                  <span>Voltar</span>
                </button>
                <span className="text-xs font-bold text-zinc-400">
                  {authMode === 'email_login' ? 'Acessar Conta' : 'Criar Conta'}
                </span>
              </div>

              <div>
                <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">
                  E-mail
                </label>
                <div className="relative">
                  <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="seu@email.com"
                    required
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/[0.07] border border-white/10 text-white placeholder:text-zinc-600 text-xs focus:outline-none focus:border-[#3584e4] transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider block mb-1">
                  Senha
                </label>
                <div className="relative">
                  <KeyRound size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-500" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Sua senha secreta (min. 6 dígitos)"
                    required
                    className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-white/[0.07] border border-white/10 text-white placeholder:text-zinc-600 text-xs focus:outline-none focus:border-[#3584e4] transition-colors"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isEmailLoading}
                className="w-full py-3 px-4 rounded-xl bg-[#3584e4] hover:bg-[#2b71c7] text-white font-bold text-xs shadow-lg transition-all cursor-pointer flex items-center justify-center gap-2 disabled:opacity-60 mt-2"
              >
                {isEmailLoading ? (
                  <RefreshCw size={15} className="animate-spin" />
                ) : authMode === 'email_login' ? (
                  <>
                    <LogIn size={15} />
                    <span>Entrar no Finante</span>
                  </>
                ) : (
                  <>
                    <UserPlus size={15} />
                    <span>Cadastrar Conta</span>
                  </>
                )}
              </button>

              <div className="text-center pt-2">
                {authMode === 'email_login' ? (
                  <button
                    type="button"
                    onClick={() => { setAuthMode('email_signup'); setErrorMsg(null); setEmailSuccessMsg(null); }}
                    className="text-xs text-zinc-400 hover:text-white transition-colors cursor-pointer"
                  >
                    Não tem uma conta? <strong className="text-[#3584e4]">Criar conta</strong>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => { setAuthMode('email_login'); setErrorMsg(null); setEmailSuccessMsg(null); }}
                    className="text-xs text-zinc-400 hover:text-white transition-colors cursor-pointer"
                  >
                    Já tem uma conta? <strong className="text-[#3584e4]">Fazer login</strong>
                  </button>
                )}
              </div>
            </form>
          )}

          {emailSuccessMsg && (
            <p className="text-xs font-semibold text-[#2ec27e] mt-4 animate-fadeIn">
              {emailSuccessMsg}
            </p>
          )}

          {errorMsg && (
            <p className="text-xs font-semibold text-[#e01b24] mt-4 animate-fadeIn">
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
                  className="w-20 h-20 rounded-full object-cover border-2 border-white/20 shadow-2xl ring-4 ring-[#3584e4]/20"
                />
              </div>
            ) : (
              <div className="w-20 h-20 rounded-full bg-[#2a2a2a] border border-white/10 shadow-2xl flex items-center justify-center text-[#3584e4]">
                {step === 'success' ? (
                  <CheckCircle2 size={40} className="text-[#2ec27e] animate-scaleIn" />
                ) : step === 'create' || step === 'confirm' ? (
                  <Shield size={38} className="text-[#3584e4]" />
                ) : (
                  <Lock size={38} className="text-[#3584e4]" />
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
                      ? 'bg-[#e01b24] scale-110 shadow-md shadow-[#e01b24]/30'
                      : isFilled
                        ? 'bg-[#3584e4] scale-110 shadow-md shadow-[#3584e4]/30'
                        : 'bg-white/10 border border-white/15'
                  }`}
                />
              );
            })}
          </div>

          {/* Error Feedback */}
          {errorMsg && (
            <p className="text-xs font-semibold text-[#e01b24] -mt-3 mb-5 animate-[shake_0.2s_ease]">
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
                className="w-full aspect-square rounded-2xl bg-white/[0.05] hover:bg-white/[0.1] active:bg-white/[0.15] active:scale-95 border border-white/5 text-xl font-bold text-white flex items-center justify-center transition-all cursor-pointer shadow-sm"
              >
                {num}
              </button>
            ))}

            {/* Biometrics button (if supported) or spacer */}
            {isBiometricSupported ? (
              <button
                type="button"
                onClick={handleBiometricAuth}
                className="w-full aspect-square rounded-2xl bg-white/[0.03] hover:bg-white/[0.08] text-[#3584e4] flex items-center justify-center transition-all cursor-pointer"
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
              className="w-full aspect-square rounded-2xl bg-white/[0.05] hover:bg-white/[0.1] active:bg-white/[0.15] active:scale-95 border border-white/5 text-xl font-bold text-white flex items-center justify-center transition-all cursor-pointer shadow-sm"
            >
              0
            </button>

            {/* Backspace */}
            <button
              type="button"
              onClick={handleDelete}
              className="w-full aspect-square rounded-2xl bg-white/[0.03] hover:bg-white/[0.08] text-zinc-400 hover:text-white flex items-center justify-center transition-all cursor-pointer"
              title="Apagar"
            >
              <Delete size={22} />
            </button>
          </div>

          {/* Switch Account / Login Options */}
          <div className="mt-6 flex flex-col items-center gap-2">
            <button
              type="button"
              onClick={handleSignOut}
              className="inline-flex items-center gap-1.5 text-xs text-zinc-500 hover:text-zinc-300 transition-colors cursor-pointer py-1 px-3 rounded-lg hover:bg-white/5"
            >
              <LogOut size={13} />
              <span>{user ? 'Trocar de Conta' : 'Fazer Login / Criar Conta'}</span>
            </button>
          </div>

        </div>
      )}

    </div>
  );
};
