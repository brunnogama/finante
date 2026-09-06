import React, { useState, useEffect, useRef } from 'react';
import { NavLink } from 'react-router-dom';
import { 
  Settings as SettingsIcon, 
  Wallet, 
  Shield, 
  ChevronRight, 
  Sparkles, 
  Building2, 
  RefreshCw, 
  TrendingUp, 
  ExternalLink, 
  CheckCircle2,
  Database,
  User,
  LogOut,
  Mail,
  KeyRound,
  LogIn,
  UserPlus,
  Download,
  Upload,
  X,
  Trash2,
  AlertTriangle,
  Bell
} from 'lucide-react';
import { notificationListenerService } from '../services/notifications';
import { PinSetupModal } from '../components/PinSetupModal';
import { ChangelogModal } from '../components/ChangelogModal';
import { ManageCategoriesModal } from '../components/ManageCategoriesModal';
import { AdwPreferencesGroup } from '../components/adwaita/AdwPreferencesGroup';
import { AdwActionRow } from '../components/adwaita/AdwActionRow';
import { 
  supabase, 
  signInWithGoogle, 
  signInWithEmail, 
  signUpWithEmail, 
  signOutUser,
  syncLocalDataToCloud,
  exportAllDataToJson,
  importDataFromJson,
  resetAllAppData
} from '../services/supabase';
import { checkAppUpdate } from '../services/updater';
import pkg from '../../package.json';

export const Settings: React.FC = () => {
  const [showPinModal, setShowPinModal] = useState(false);
  const [showChangelog, setShowChangelog] = useState(false);
  const [showCategoriesModal, setShowCategoriesModal] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showResetConfirmModal, setShowResetConfirmModal] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [resetFeedback, setResetFeedback] = useState<{ success: boolean; message: string } | null>(null);
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [isSignUpMode, setIsSignUpMode] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);
  const [authSuccess, setAuthSuccess] = useState<string | null>(null);
  const [isAuthLoading, setIsAuthLoading] = useState(false);
  const [isCheckingUpdates, setIsCheckingUpdates] = useState(false);
  const [updateStatus, setUpdateStatus] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [notificationSupported, setNotificationSupported] = useState(false);
  const [notificationPermission, setNotificationPermission] = useState(false);
  const [isSimulatingNotification, setIsSimulatingNotification] = useState(false);

  const checkNotificationStatus = async () => {
    const supported = notificationListenerService.isSupported();
    setNotificationSupported(supported);
    if (supported) {
      const granted = await notificationListenerService.checkPermission();
      setNotificationPermission(granted);
    }
  };

  useEffect(() => {
    checkNotificationStatus();
    window.addEventListener('focus', checkNotificationStatus);
    return () => window.removeEventListener('focus', checkNotificationStatus);
  }, []);

  useEffect(() => {
    const fetchUser = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      setUser(session?.user || null);
    };
    fetchUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Close any open modal on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (showAuthModal) {
          setShowAuthModal(false);
        } else if (showResetConfirmModal) {
          setShowResetConfirmModal(false);
        } else if (showPinModal) {
          setShowPinModal(false);
        } else if (showChangelog) {
          setShowChangelog(false);
        } else if (showCategoriesModal) {
          setShowCategoriesModal(false);
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [showAuthModal, showResetConfirmModal, showPinModal, showChangelog, showCategoriesModal]);

  const handleConfirmReset = async () => {
    setIsResetting(true);
    setResetFeedback(null);
    try {
      const res = await resetAllAppData();
      setResetFeedback(res);
      if (res.success) {
        setTimeout(() => {
          setShowResetConfirmModal(false);
          window.location.reload();
        }, 1200);
      }
    } catch (err: any) {
      setResetFeedback({
        success: false,
        message: `Erro ao resetar: ${err.message || err}`
      });
    } finally {
      setIsResetting(false);
    }
  };

  const handleGoogleConnect = async () => {
    setIsSigningIn(true);
    try {
      await signInWithGoogle();
    } catch (err) {
      console.error('Error connecting google:', err);
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authEmail.trim() || !authPassword) {
      setAuthError('Preencha seu e-mail e senha.');
      return;
    }
    if (authPassword.length < 6) {
      setAuthError('A senha deve ter no mínimo 6 caracteres.');
      return;
    }

    setIsAuthLoading(true);
    setAuthError(null);
    setAuthSuccess(null);

    try {
      if (isSignUpMode) {
        const data = await signUpWithEmail(authEmail, authPassword);
        if (data?.user && !data.session) {
          setAuthSuccess('Conta criada! Verifique seu e-mail para confirmar ou faça login.');
          setIsSignUpMode(false);
        } else if (data?.user) {
          setUser(data.user);
          setShowAuthModal(false);
        }
      } else {
        const data = await signInWithEmail(authEmail, authPassword);
        if (data?.user) {
          setUser(data.user);
          setShowAuthModal(false);
          // Upload any local records immediately to Supabase
          syncLocalDataToCloud()
            .then(res => {
              setSyncStatus(`Sincronização concluída! (${res.expensesSynced} despesas enviadas para nuvem)`);
              setTimeout(() => setSyncStatus(null), 5000);
            })
            .catch(err => console.warn('Sync post-login err:', err));
        }
      }
    } catch (err: any) {
      console.error('Email Auth Error:', err);
      setAuthError(err.message || 'Falha na autenticação.');
    } finally {
      setIsAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOutUser();
      setUser(null);
      localStorage.removeItem('finante_pin');
      localStorage.removeItem('finante_offline_mode');
      window.location.reload();
    } catch (err) {
      console.error('Error logging out:', err);
    }
  };

  const handleCheckUpdates = async () => {
    setIsCheckingUpdates(true);
    setUpdateStatus(null);
    
    try {
      const update = await checkAppUpdate();
      setIsCheckingUpdates(false);
      if (update) {
        setUpdateStatus(`Nova versão v${update.version} disponível para instalação!`);
      } else {
        setUpdateStatus(`Finante v${pkg.version} está na versão mais recente.`);
      }
      setShowChangelog(true);
    } catch {
      setIsCheckingUpdates(false);
      setShowChangelog(true);
    }
  };

  const [syncStatus, setSyncStatus] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleExportBackup = async () => {
    try {
      const jsonStr = await exportAllDataToJson();
      const blob = new Blob([jsonStr], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      const dateStr = new Date().toISOString().split('T')[0];
      a.href = url;
      a.download = `finante-backup-${dateStr}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      setSyncStatus('Backup exportado com sucesso!');
      setTimeout(() => setSyncStatus(null), 4000);
    } catch (err: any) {
      setSyncStatus(`Erro ao exportar backup: ${err.message || err}`);
      setTimeout(() => setSyncStatus(null), 5000);
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const text = event.target?.result as string;
        if (!text) return;
        const result = await importDataFromJson(text);
        setSyncStatus(result.message);
        setTimeout(() => setSyncStatus(null), 6000);
      };
      reader.readAsText(file);
    } catch (err: any) {
      setSyncStatus(`Erro ao importar backup: ${err.message || err}`);
      setTimeout(() => setSyncStatus(null), 5000);
    } finally {
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  const handleForceSync = async () => {
    setIsSyncing(true);
    setSyncStatus('Sincronizando com a nuvem Supabase...');
    try {
      if (user) {
        const result = await syncLocalDataToCloud();
        setSyncStatus(`Sincronização concluída! (${result.expensesSynced} enviadas, total de ${result.expensesTotal} despesas na nuvem)`);
        window.dispatchEvent(new CustomEvent('finante_data_updated'));
      } else {
        setSyncStatus('Você está no modo local. Conecte sua conta para transferir seus dados para o celular.');
        setShowAuthModal(true);
      }
      setTimeout(() => setSyncStatus(null), 6000);
    } catch (err: any) {
      setSyncStatus(`Aviso: ${err.message || 'Falha na sincronização'}`);
      setTimeout(() => setSyncStatus(null), 6000);
    } finally {
      setIsSyncing(false);
    }
  };

  const handleRequestNotificationPermission = async () => {
    window.dispatchEvent(new CustomEvent('finante_open_permission_modal'));
  };

  const handleSimulateNotification = async () => {
    setIsSimulatingNotification(true);
    try {
      await notificationListenerService.addSimulatedNotification({
        packageName: 'com.nu.production',
        title: 'Nubank',
        text: 'Compra aprovada no Nubank de R$ 68,90 em Supermercado Pão de Açúcar no débito.'
      });
      window.dispatchEvent(new CustomEvent('finante_check_notifications'));
    } catch (e) {
      console.warn('Simulate error:', e);
    } finally {
      setTimeout(() => setIsSimulatingNotification(false), 800);
    }
  };

  const userName = user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email?.split('@')[0];
  const userAvatar = user?.user_metadata?.avatar_url || user?.user_metadata?.picture;

  return (
    <div className="p-4 md:p-8 max-w-4xl mx-auto space-y-6 animate-fadeIn pb-24 md:pb-8">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-zinc-900 dark:text-white flex items-center gap-2.5">
            <span className="w-9 h-9 rounded-xl bg-black/5 dark:bg-white/10 text-zinc-700 dark:text-zinc-300 flex items-center justify-center">
              <SettingsIcon size={20} strokeWidth={2.3} />
            </span>
            Configurações
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            Gerencie preferências, categorias, segurança e atualizações do app
          </p>
        </div>
      </div>

      {/* Featured Update & Version Card */}
      <div className="adw-card p-5 md:p-6 relative overflow-hidden bg-gradient-to-r from-[#3584e4]/10 to-transparent">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5 relative z-10">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-xl bg-[#3584e4]/15 text-[#3584e4] flex items-center justify-center shrink-0">
              <Sparkles size={24} strokeWidth={2.2} />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h3 className="text-base font-bold text-zinc-900 dark:text-white">
                  Finante {pkg.version}
                </h3>
                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-[#2ec27e]/15 text-[#2ec27e] border border-[#2ec27e]/20 flex items-center gap-1">
                  <CheckCircle2 size={11} />
                  Versão Instalada
                </span>
              </div>
              <p className="text-xs text-zinc-600 dark:text-zinc-400 mt-0.5">
                Busque as últimas melhorias, novidades e atualize o aplicativo diretamente
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleCheckUpdates}
            disabled={isCheckingUpdates}
            className="adw-btn suggested-action text-xs font-semibold px-4 py-2.5 inline-flex items-center gap-2 cursor-pointer shrink-0 disabled:opacity-60"
          >
            <RefreshCw size={15} className={isCheckingUpdates ? 'animate-spin' : ''} />
            <span>{isCheckingUpdates ? 'Buscando...' : 'Verificar Atualizações'}</span>
          </button>
        </div>

        {updateStatus && (
          <div className="mt-4 p-3 bg-black/5 dark:bg-white/5 rounded-xl border border-black/10 dark:border-white/10 text-xs font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-2 animate-fadeIn">
            <CheckCircle2 size={15} className="text-[#2ec27e]" />
            <span>{updateStatus}</span>
          </div>
        )}
      </div>

      {/* Section 0: Conta & Perfil */}
      <AdwPreferencesGroup title="Conta & Sincronização">
        <div className="boxed-list-row">
          <div className="flex items-center gap-3.5 min-w-0">
            {userAvatar ? (
              <img 
                src={userAvatar} 
                alt={userName || 'Perfil'} 
                className="w-11 h-11 rounded-xl object-cover border border-black/10 dark:border-white/10 shrink-0"
              />
            ) : (
              <div className="w-11 h-11 rounded-xl bg-black/5 dark:bg-white/10 text-zinc-600 dark:text-zinc-300 flex items-center justify-center shrink-0">
                <User size={22} strokeWidth={2.2} />
              </div>
            )}

            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-semibold text-zinc-900 dark:text-white truncate">
                  {userName || 'Modo Local'}
                </span>
                {user ? (
                  <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-[#3584e4]/15 text-[#3584e4]">
                    Google Conectado
                  </span>
                ) : (
                  <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-black/5 dark:bg-white/10 text-zinc-500">
                    Offline / Sem Conta
                  </span>
                )}
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 truncate">
                {user?.email || 'Os dados estão armazenados localmente e vinculados ao Supabase.'}
              </p>
            </div>
          </div>

          <div className="shrink-0 pl-3 flex items-center gap-2">
            {user ? (
              <button
                type="button"
                onClick={handleLogout}
                className="adw-btn text-xs font-semibold px-3 py-1.5 text-[#e01b24] hover:bg-[#e01b24]/10 cursor-pointer inline-flex items-center gap-1.5"
              >
                <LogOut size={14} />
                <span>Desconectar</span>
              </button>
            ) : (
              <>
                <button
                  type="button"
                  onClick={() => { setShowAuthModal(true); setAuthError(null); setAuthSuccess(null); }}
                  className="adw-btn suggested-action text-xs font-semibold px-3 py-1.5 cursor-pointer inline-flex items-center gap-1.5"
                >
                  <Mail size={14} />
                  <span>Entrar / Cadastrar</span>
                </button>
                <button
                  type="button"
                  onClick={handleGoogleConnect}
                  disabled={isSigningIn}
                  className="adw-btn text-xs font-semibold px-3 py-1.5 cursor-pointer inline-flex items-center gap-1.5 disabled:opacity-60"
                  title="Conectar com Google"
                >
                  <svg width="14" height="14" viewBox="0 0 24 24" className="shrink-0">
                    <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                    <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                    <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                    <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                  </svg>
                  <span>{isSigningIn ? 'Conectando...' : 'Google'}</span>
                </button>
              </>
            )}
          </div>
        </div>

        {!user && (
          <div className="p-3.5 mx-4 mb-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-amber-600 dark:text-amber-400 flex items-start gap-2.5 animate-fadeIn">
            <AlertTriangle size={18} className="shrink-0 mt-0.5 text-amber-500" />
            <div className="space-y-1">
              <p className="font-semibold text-zinc-900 dark:text-zinc-100">
                Atenção: Modo Local ativo neste dispositivo
              </p>
              <p className="leading-relaxed text-zinc-600 dark:text-zinc-400">
                Seus dados estão salvos apenas na memória deste aparelho. Para transferir suas despesas para o Android ou outro computador, clique em <strong>Entrar / Cadastrar</strong> acima. Ao entrar, todos os seus dados deste aparelho serão enviados automaticamente para sua nuvem.
              </p>
            </div>
          </div>
        )}
      </AdwPreferencesGroup>

      {/* Section 1: Gestão Financeira */}
      <AdwPreferencesGroup title="Gestão Financeira">
        <AdwActionRow
          title="Empresas & Tipos de Despesa"
          subtitle="Gerenciar fornecedores, categorias e associações automáticas"
          prefix={
            <div className="w-9 h-9 rounded-xl bg-[#3584e4]/10 text-[#3584e4] flex items-center justify-center">
              <Building2 size={18} strokeWidth={2.2} />
            </div>
          }
          suffix={<ChevronRight size={16} className="text-zinc-400" />}
          onClick={() => setShowCategoriesModal(true)}
        />

        <NavLink to="/income" className="block">
          <AdwActionRow
            title="Adicionar Ganhos (Receitas)"
            subtitle="Cadastrar salário, rendimentos e fontes de renda"
            prefix={
              <div className="w-9 h-9 rounded-xl bg-[#2ec27e]/10 text-[#2ec27e] flex items-center justify-center">
                <Wallet size={18} strokeWidth={2.2} />
              </div>
            }
            suffix={<ChevronRight size={16} className="text-zinc-400" />}
          />
        </NavLink>

        <NavLink to="/investments" className="block">
          <AdwActionRow
            title="Carteira de Investimentos"
            subtitle="Acompanhar aportes, ativos e distribuição da carteira"
            prefix={
              <div className="w-9 h-9 rounded-xl bg-[#9141ac]/10 text-[#9141ac] flex items-center justify-center">
                <TrendingUp size={18} strokeWidth={2.2} />
              </div>
            }
            suffix={<ChevronRight size={16} className="text-zinc-400" />}
          />
        </NavLink>
      </AdwPreferencesGroup>

      {/* Section 2: Segurança & Dados */}
      <AdwPreferencesGroup title="Segurança & Dados">
        {/* Hidden File Input for Restore */}
        <input 
          type="file" 
          ref={fileInputRef} 
          onChange={handleFileChange} 
          accept=".json,application/json" 
          className="hidden" 
        />

        <AdwActionRow
          title="Privacidade & Bloqueio por PIN"
          subtitle="Configurar senha de 4 dígitos e biometria digital"
          prefix={
            <div className="w-9 h-9 rounded-xl bg-[#9141ac]/10 text-[#9141ac] flex items-center justify-center">
              <Shield size={18} strokeWidth={2.2} />
            </div>
          }
          suffix={<ChevronRight size={16} className="text-zinc-400" />}
          onClick={() => setShowPinModal(true)}
        />

        <AdwActionRow
          title="Sincronizar Dados com a Nuvem"
          subtitle={user ? 'Enviar dados cadastrados offline para sua conta no Supabase' : 'Conecte sua conta para sincronizar entre aparelhos'}
          prefix={
            <div className="w-9 h-9 rounded-xl bg-[#21a1a9]/10 text-[#21a1a9] flex items-center justify-center">
              <Database size={18} strokeWidth={2.2} />
            </div>
          }
          suffix={
            <button 
              type="button" 
              onClick={(e) => { e.stopPropagation(); handleForceSync(); }} 
              disabled={isSyncing}
              className="adw-btn text-xs font-semibold px-3 py-1.5 cursor-pointer inline-flex items-center gap-1.5 shrink-0 disabled:opacity-60"
            >
              <RefreshCw size={13} className={isSyncing ? 'animate-spin' : ''} />
              <span>{isSyncing ? 'Sincronizando...' : 'Sincronizar Agora'}</span>
            </button>
          }
          onClick={handleForceSync}
        />

        <AdwActionRow
          title="Exportar Backup Completo (.json)"
          subtitle="Baixar arquivo com todas as despesas, receitas, categorias e investimentos"
          prefix={
            <div className="w-9 h-9 rounded-xl bg-[#3584e4]/10 text-[#3584e4] flex items-center justify-center">
              <Download size={18} strokeWidth={2.2} />
            </div>
          }
          suffix={<ChevronRight size={16} className="text-zinc-400" />}
          onClick={handleExportBackup}
        />

        <AdwActionRow
          title="Restaurar Backup (.json)"
          subtitle="Carregar arquivo de backup salvo anteriormente para recuperar seus dados"
          prefix={
            <div className="w-9 h-9 rounded-xl bg-[#2ec27e]/10 text-[#2ec27e] flex items-center justify-center">
              <Upload size={18} strokeWidth={2.2} />
            </div>
          }
          suffix={<ChevronRight size={16} className="text-zinc-400" />}
          onClick={() => fileInputRef.current?.click()}
        />

        {syncStatus && (
          <div className="p-3 bg-black/5 dark:bg-white/5 rounded-xl border border-black/10 dark:border-white/10 text-xs font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-2 animate-fadeIn">
            <CheckCircle2 size={15} className="text-[#3584e4] shrink-0" />
            <span>{syncStatus}</span>
          </div>
        )}
      </AdwPreferencesGroup>

      {/* Section: Automação & Notificações Bancárias */}
      <AdwPreferencesGroup title="Automação & Notificações Bancárias">
        <AdwActionRow
          title="Leitura de Notificações Bancárias"
          subtitle={
            notificationSupported
              ? (notificationPermission
                  ? 'Captura ativa para Nubank, Itaú, Santander, Inter, Bradesco, C6, Mercado Pago e outros'
                  : 'Permissão necessária no Android para capturar compras e transferências em segundo plano')
              : 'Disponível nativamente no app Android para importar despesas automaticamente'
          }
          prefix={
            <div className="w-9 h-9 rounded-xl bg-amber-500/10 text-amber-500 flex items-center justify-center">
              <Bell size={18} strokeWidth={2.2} />
            </div>
          }
          suffix={
            notificationSupported ? (
              notificationPermission ? (
                <div className="flex items-center gap-2 shrink-0">
                  <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                    <CheckCircle2 size={12} />
                    Ativo
                  </span>
                  <button
                    type="button"
                    onClick={(e) => { e.stopPropagation(); handleRequestNotificationPermission(); }}
                    className="adw-btn text-xs font-semibold px-2.5 py-1 cursor-pointer"
                  >
                    Ajustar
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={(e) => { e.stopPropagation(); handleRequestNotificationPermission(); }}
                  className="adw-btn text-xs font-semibold px-3 py-1.5 cursor-pointer bg-primary-600 text-white hover:bg-primary-500 border-none shrink-0"
                >
                  Ativar no Android
                </button>
              )
            ) : (
              <span className="text-xs font-medium px-2.5 py-1 rounded-full bg-zinc-200 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400">
                Nativo Android
              </span>
            )
          }
          onClick={notificationSupported ? handleRequestNotificationPermission : undefined}
        />

        <AdwActionRow
          title="Testar Leitura de Notificação Bancária"
          subtitle="Simula uma notificação do Nubank (R$ 68,90 no Pão de Açúcar) para testar a captura e confirmação rápida"
          prefix={
            <div className="w-9 h-9 rounded-xl bg-purple-500/10 text-purple-500 flex items-center justify-center">
              <Sparkles size={18} strokeWidth={2.2} />
            </div>
          }
          suffix={
            <button
              type="button"
              disabled={isSimulatingNotification}
              onClick={(e) => { e.stopPropagation(); handleSimulateNotification(); }}
              className="adw-btn text-xs font-semibold px-3 py-1.5 cursor-pointer inline-flex items-center gap-1.5 shrink-0 disabled:opacity-60"
            >
              <span>{isSimulatingNotification ? 'Simulando...' : 'Simular Notificação'}</span>
            </button>
          }
          onClick={handleSimulateNotification}
        />
      </AdwPreferencesGroup>

      {/* Section 3: Sobre o Aplicativo */}
      <AdwPreferencesGroup title="Sobre o Finante">
        <AdwActionRow
          title="Histórico de Atualizações"
          subtitle="Ver notas de versão e commits recentes do projeto"
          prefix={
            <div className="w-9 h-9 rounded-xl bg-[#e5a50a]/10 text-[#e5a50a] flex items-center justify-center">
              <Sparkles size={18} strokeWidth={2.2} />
            </div>
          }
          suffix={<ChevronRight size={16} className="text-zinc-400" />}
          onClick={() => setShowChangelog(true)}
        />

        <a 
          href="https://github.com/brunnogama/finante"
          target="_blank"
          rel="noopener noreferrer"
          className="block"
        >
          <AdwActionRow
            title="Código-Fonte no GitHub"
            subtitle="github.com/brunnogama/finante"
            prefix={
              <div className="w-9 h-9 rounded-xl bg-black/5 dark:bg-white/10 text-zinc-700 dark:text-zinc-300 flex items-center justify-center">
                <ExternalLink size={18} strokeWidth={2.2} />
              </div>
            }
            suffix={<ChevronRight size={16} className="text-zinc-400" />}
          />
        </a>
      </AdwPreferencesGroup>

      {/* Section 4: Zona de Perigo */}
      <AdwPreferencesGroup title="Zona de Perigo">
        <AdwActionRow
          title="Resetar Todos os Dados do Aplicativo"
          subtitle="Apaga todas as despesas, receitas, categorias e restaura o Finante para o estado inicial"
          prefix={
            <div className="w-9 h-9 rounded-xl bg-rose-500/10 text-rose-600 dark:text-rose-400 flex items-center justify-center">
              <Trash2 size={18} strokeWidth={2.2} />
            </div>
          }
          suffix={
            <button
              type="button"
              onClick={() => { setResetFeedback(null); setShowResetConfirmModal(true); }}
              className="adw-btn text-xs font-semibold px-3 py-1.5 cursor-pointer inline-flex items-center gap-1.5 text-rose-600 dark:text-rose-400 hover:bg-rose-500/10 border border-rose-500/20"
            >
              <Trash2 size={13} />
              <span>Resetar Dados</span>
            </button>
          }
          onClick={() => { setResetFeedback(null); setShowResetConfirmModal(true); }}
        />
      </AdwPreferencesGroup>

      {/* Modals */}
      {showPinModal && <PinSetupModal onClose={() => setShowPinModal(false)} />}
      {showChangelog && <ChangelogModal currentVersion={pkg.version} onClose={() => setShowChangelog(false)} />}
      {showCategoriesModal && <ManageCategoriesModal onClose={() => setShowCategoriesModal(false)} />}

      {/* Auth Modal (Email & Password) */}
      {showAuthModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn">
          <div 
            className="adw-dialog max-w-sm w-full p-6 shadow-2xl animate-scaleIn text-left"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-[#3584e4]/15 text-[#3584e4] flex items-center justify-center">
                  <User size={18} strokeWidth={2.3} />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-zinc-900 dark:text-white">
                    {isSignUpMode ? 'Criar Conta' : 'Acessar Conta'}
                  </h3>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                    {isSignUpMode ? 'Cadastre seu e-mail e senha' : 'Entre para sincronizar seus dados'}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowAuthModal(false)}
                className="p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer"
              >
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleEmailAuth} className="space-y-3.5">
              <div>
                <label className="text-[11px] font-bold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider block mb-1">
                  E-mail
                </label>
                <div className="relative">
                  <Mail size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
                  <input
                    type="email"
                    value={authEmail}
                    onChange={(e) => setAuthEmail(e.target.value)}
                    placeholder="seu@email.com"
                    required
                    className="w-full pl-9 pr-4 py-2 rounded-xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-zinc-900 dark:text-white placeholder:text-zinc-400 text-xs focus:outline-none focus:border-[#3584e4] transition-colors"
                  />
                </div>
              </div>

              <div>
                <label className="text-[11px] font-bold text-zinc-600 dark:text-zinc-400 uppercase tracking-wider block mb-1">
                  Senha
                </label>
                <div className="relative">
                  <KeyRound size={15} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
                  <input
                    type="password"
                    value={authPassword}
                    onChange={(e) => setAuthPassword(e.target.value)}
                    placeholder="Mínimo de 6 caracteres"
                    required
                    className="w-full pl-9 pr-4 py-2 rounded-xl bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 text-zinc-900 dark:text-white placeholder:text-zinc-400 text-xs focus:outline-none focus:border-[#3584e4] transition-colors"
                  />
                </div>
              </div>

              {authError && (
                <p className="text-xs font-semibold text-[#e01b24] animate-fadeIn">
                  {authError}
                </p>
              )}

              {authSuccess && (
                <p className="text-xs font-semibold text-[#2ec27e] animate-fadeIn">
                  {authSuccess}
                </p>
              )}

              <div className="pt-2 flex flex-col gap-2">
                <button
                  type="submit"
                  disabled={isAuthLoading}
                  className="adw-btn suggested-action w-full py-2.5 text-xs font-bold flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                >
                  {isAuthLoading ? (
                    <RefreshCw size={14} className="animate-spin" />
                  ) : isSignUpMode ? (
                    <>
                      <UserPlus size={14} />
                      <span>Cadastrar</span>
                    </>
                  ) : (
                    <>
                      <LogIn size={14} />
                      <span>Entrar</span>
                    </>
                  )}
                </button>

                <div className="text-center pt-1">
                  {isSignUpMode ? (
                    <button
                      type="button"
                      onClick={() => { setIsSignUpMode(false); setAuthError(null); setAuthSuccess(null); }}
                      className="text-xs text-zinc-500 hover:text-zinc-800 dark:hover:text-white transition-colors cursor-pointer"
                    >
                      Já possui conta? <strong className="text-[#3584e4]">Fazer login</strong>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => { setIsSignUpMode(true); setAuthError(null); setAuthSuccess(null); }}
                      className="text-xs text-zinc-500 hover:text-zinc-800 dark:hover:text-white transition-colors cursor-pointer"
                    >
                      Não tem conta? <strong className="text-[#3584e4]">Criar conta</strong>
                    </button>
                  )}
                </div>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal de Confirmação de Reset Geral */}
      {showResetConfirmModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
          <div 
            className="adw-dialog max-w-sm w-full p-6 shadow-2xl animate-scaleIn text-left border border-rose-500/30"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-rose-500/15 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
                <AlertTriangle size={22} strokeWidth={2.5} />
              </div>
              <div>
                <h3 className="text-base font-bold text-zinc-900 dark:text-white">
                  Resetar Todos os Dados
                </h3>
                <p className="text-xs text-zinc-500 dark:text-zinc-400">
                  Esta ação é irreversível
                </p>
              </div>
            </div>

            <div className="space-y-3 mb-5 text-xs text-zinc-600 dark:text-zinc-300">
              <p>
                Tem certeza de que deseja apagar todos os registros do aplicativo?
              </p>
              <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-700 dark:text-rose-300 space-y-1">
                <p className="font-bold">O que será apagado:</p>
                <ul className="list-disc list-inside space-y-0.5 text-[11px]">
                  <li>Todas as despesas e receitas cadastradas</li>
                  <li>Categorias e empresas personalizadas</li>
                  <li>Dados locais e na nuvem (Supabase)</li>
                  <li>Configurações de cache e sincronização</li>
                </ul>
              </div>
            </div>

            {resetFeedback && (
              <div className={`p-3 rounded-xl text-xs font-semibold mb-4 flex items-center gap-2 ${
                resetFeedback.success
                  ? 'bg-emerald-500/15 text-emerald-700 dark:text-emerald-300 border border-emerald-500/30'
                  : 'bg-rose-500/15 text-rose-700 dark:text-rose-300 border border-rose-500/30'
              }`}>
                {resetFeedback.success ? (
                  <CheckCircle2 size={16} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
                ) : (
                  <AlertTriangle size={16} className="text-rose-600 dark:text-rose-400 shrink-0" />
                )}
                <span>{resetFeedback.message}</span>
              </div>
            )}

            <div className="flex gap-2.5">
              <button
                type="button"
                onClick={() => setShowResetConfirmModal(false)}
                disabled={isResetting}
                className="flex-1 py-2.5 px-4 rounded-xl border border-zinc-200 dark:border-white/10 text-xs font-bold text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-white/5 transition-colors cursor-pointer disabled:opacity-50"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmReset}
                disabled={isResetting}
                className="flex-1 py-2.5 px-4 rounded-xl bg-rose-600 hover:bg-rose-700 active:bg-rose-800 text-white text-xs font-bold shadow-md hover:shadow-lg transition-all cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
              >
                {isResetting ? (
                  <>
                    <RefreshCw size={13} className="animate-spin" />
                    <span>Apagando...</span>
                  </>
                ) : (
                  <>
                    <Trash2 size={13} />
                    <span>Confirmar Reset</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
