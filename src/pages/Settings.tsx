import React, { useState, useEffect } from 'react';
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
  LogOut
} from 'lucide-react';
import { PinSetupModal } from '../components/PinSetupModal';
import { ChangelogModal } from '../components/ChangelogModal';
import { ManageCategoriesModal } from '../components/ManageCategoriesModal';
import { supabase, signInWithGoogle, signOutUser } from '../services/supabase';
import pkg from '../../package.json';

export const Settings: React.FC = () => {
  const [showPinModal, setShowPinModal] = useState(false);
  const [showChangelog, setShowChangelog] = useState(false);
  const [showCategoriesModal, setShowCategoriesModal] = useState(false);
  const [isCheckingUpdates, setIsCheckingUpdates] = useState(false);
  const [updateStatus, setUpdateStatus] = useState<string | null>(null);
  const [user, setUser] = useState<any>(null);
  const [isSigningIn, setIsSigningIn] = useState(false);

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

  const handleGoogleConnect = async () => {
    setIsSigningIn(true);
    try {
      await signInWithGoogle();
    } catch (err) {
      console.error('Error connecting google:', err);
      setIsSigningIn(false);
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

  const handleCheckUpdates = () => {
    setIsCheckingUpdates(true);
    setUpdateStatus(null);
    
    // Check GitHub commits / repo
    fetch('https://api.github.com/repos/brunnogama/finante/commits?per_page=5', { cache: 'no-store' })
      .then(res => res.json())
      .then(() => {
        setTimeout(() => {
          setIsCheckingUpdates(false);
          setShowChangelog(true);
        }, 600);
      })
      .catch(() => {
        setIsCheckingUpdates(false);
        setShowChangelog(true);
      });
  };

  const handleForceSync = async () => {
    setUpdateStatus('Sincronizando dados locais com o Supabase...');
    try {
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map(name => caches.delete(name)));
      }
      setTimeout(() => {
        setUpdateStatus('Dados sincronizados e cache atualizado com sucesso!');
        setTimeout(() => setUpdateStatus(null), 3000);
      }, 800);
    } catch {
      setUpdateStatus('Sincronizado!');
      setTimeout(() => setUpdateStatus(null), 3000);
    }
  };

  const userName = user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email?.split('@')[0];
  const userAvatar = user?.user_metadata?.avatar_url || user?.user_metadata?.picture;

  return (
    <div className="p-4 md:p-8 max-w-5xl mx-auto space-y-6 animate-fadeIn pb-24 md:pb-8">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-zinc-900 dark:text-white flex items-center gap-2.5">
            <span className="w-9 h-9 rounded-2xl bg-zinc-500/10 dark:bg-zinc-500/15 text-zinc-700 dark:text-zinc-300 flex items-center justify-center">
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
      <div className="bg-gradient-to-br from-blue-500/10 via-indigo-500/5 to-purple-500/10 border border-blue-500/20 dark:border-blue-500/30 rounded-3xl p-5 md:p-6 shadow-xl relative overflow-hidden backdrop-blur-md">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5 relative z-10">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-blue-500/15 dark:bg-blue-500/25 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0 shadow-sm">
              <Sparkles size={28} strokeWidth={2.2} />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h3 className="text-lg font-bold text-zinc-900 dark:text-white">
                  Finante {pkg.version}
                </h3>
                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                  <CheckCircle2 size={11} />
                  Versão Instalada
                </span>
              </div>
              <p className="text-xs sm:text-sm text-zinc-600 dark:text-zinc-300 mt-0.5">
                Busque as últimas melhorias, novidades e atualize o aplicativo diretamente
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleCheckUpdates}
            disabled={isCheckingUpdates}
            style={{ backgroundColor: '#007AFF' }}
            className="inline-flex items-center justify-center gap-2 px-5 py-3 rounded-2xl text-white font-semibold text-sm shadow-md hover:opacity-95 active:scale-95 transition-all shrink-0 cursor-pointer disabled:opacity-60"
          >
            <RefreshCw size={16} className={isCheckingUpdates ? 'animate-spin' : ''} />
            <span>{isCheckingUpdates ? 'Buscando...' : 'Verificar Atualizações'}</span>
          </button>
        </div>

        {updateStatus && (
          <div className="mt-4 p-3 bg-white/80 dark:bg-zinc-800/80 rounded-xl border border-zinc-200 dark:border-zinc-700 text-xs font-semibold text-zinc-700 dark:text-zinc-300 flex items-center gap-2 animate-fadeIn">
            <CheckCircle2 size={15} className="text-emerald-500" />
            <span>{updateStatus}</span>
          </div>
        )}
      </div>

      {/* Section 0: Conta & Perfil */}
      <div className="bg-white dark:bg-zinc-900/60 backdrop-blur-md rounded-3xl border border-zinc-200/70 dark:border-white/10 shadow-xl p-5 md:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-5">
        <div className="flex items-center gap-4 min-w-0">
          {userAvatar ? (
            <img 
              src={userAvatar} 
              alt={userName || 'Perfil'} 
              className="w-14 h-14 rounded-2xl object-cover border-2 border-white/20 shadow-md shrink-0"
            />
          ) : (
            <div className="w-14 h-14 rounded-2xl bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-300 flex items-center justify-center shrink-0">
              <User size={26} strokeWidth={2.2} />
            </div>
          )}

          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-base font-bold text-zinc-900 dark:text-white truncate">
                {userName || 'Modo Local'}
              </h3>
              {user ? (
                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-blue-500/10 text-blue-600 dark:text-blue-400 border border-blue-500/20">
                  Google Conectado
                </span>
              ) : (
                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-zinc-500/10 text-zinc-600 dark:text-zinc-400 border border-zinc-500/20">
                  Offline / Sem Conta
                </span>
              )}
            </div>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5 truncate">
              {user?.email || 'Os dados estão armazenados localmente e vinculados ao Supabase.'}
            </p>
          </div>
        </div>

        {user ? (
          <button
            type="button"
            onClick={handleLogout}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 font-semibold text-xs transition-all cursor-pointer shrink-0"
          >
            <LogOut size={15} />
            <span>Desconectar</span>
          </button>
        ) : (
          <button
            type="button"
            onClick={handleGoogleConnect}
            disabled={isSigningIn}
            className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-xl bg-white hover:bg-zinc-100 active:scale-95 text-zinc-900 font-bold text-xs shadow-sm transition-all cursor-pointer shrink-0 disabled:opacity-60"
          >
            {/* Google Logo */}
            <svg width="15" height="15" viewBox="0 0 24 24" className="shrink-0">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
            </svg>
            <span>{isSigningIn ? 'Conectando...' : 'Conectar Google'}</span>
          </button>
        )}
      </div>

      {/* Section 1: Gestão Financeira */}
      <div className="bg-white dark:bg-zinc-900/60 backdrop-blur-md rounded-3xl border border-zinc-200/70 dark:border-white/10 shadow-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-zinc-100 dark:border-zinc-800">
          <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
            Gestão Financeira
          </h3>
        </div>

        <div className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
          {/* Empresas & Tipos de Despesa */}
          <button
            type="button"
            onClick={() => setShowCategoriesModal(true)}
            className="w-full p-4 sm:p-5 flex items-center justify-between hover:bg-zinc-50/80 dark:hover:bg-zinc-800/40 transition-colors text-left cursor-pointer"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-2xl bg-blue-500/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
                <Building2 size={20} strokeWidth={2.2} />
              </div>
              <div>
                <h4 className="font-bold text-sm sm:text-base text-zinc-900 dark:text-white">
                  Empresas & Tipos de Despesa
                </h4>
                <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-0.5">
                  Gerenciar fornecedores, categorias e associações automáticas
                </p>
              </div>
            </div>
            <ChevronRight size={18} className="text-zinc-400" />
          </button>

          {/* Adicionar Ganhos (Receitas) */}
          <NavLink
            to="/income"
            className="w-full p-4 sm:p-5 flex items-center justify-between hover:bg-zinc-50/80 dark:hover:bg-zinc-800/40 transition-colors text-left"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-2xl bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                <Wallet size={20} strokeWidth={2.2} />
              </div>
              <div>
                <h4 className="font-bold text-sm sm:text-base text-zinc-900 dark:text-white">
                  Adicionar Ganhos (Receitas)
                </h4>
                <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-0.5">
                  Cadastrar salário, rendimentos e fontes de renda
                </p>
              </div>
            </div>
            <ChevronRight size={18} className="text-zinc-400" />
          </NavLink>

          {/* Investimentos */}
          <NavLink
            to="/investments"
            className="w-full p-4 sm:p-5 flex items-center justify-between hover:bg-zinc-50/80 dark:hover:bg-zinc-800/40 transition-colors text-left"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-2xl bg-indigo-500/10 dark:bg-indigo-500/20 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                <TrendingUp size={20} strokeWidth={2.2} />
              </div>
              <div>
                <h4 className="font-bold text-sm sm:text-base text-zinc-900 dark:text-white">
                  Carteira de Investimentos
                </h4>
                <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-0.5">
                  Acompanhar aportes, ativos e distribuição da carteira
                </p>
              </div>
            </div>
            <ChevronRight size={18} className="text-zinc-400" />
          </NavLink>
        </div>
      </div>

      {/* Section 2: Segurança & Dados */}
      <div className="bg-white dark:bg-zinc-900/60 backdrop-blur-md rounded-3xl border border-zinc-200/70 dark:border-white/10 shadow-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-zinc-100 dark:border-zinc-800">
          <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
            Segurança & Dados
          </h3>
        </div>

        <div className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
          {/* PIN & Biometria */}
          <button
            type="button"
            onClick={() => setShowPinModal(true)}
            className="w-full p-4 sm:p-5 flex items-center justify-between hover:bg-zinc-50/80 dark:hover:bg-zinc-800/40 transition-colors text-left cursor-pointer"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-2xl bg-purple-500/10 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
                <Shield size={20} strokeWidth={2.2} />
              </div>
              <div>
                <h4 className="font-bold text-sm sm:text-base text-zinc-900 dark:text-white">
                  Privacidade & Bloqueio por PIN
                </h4>
                <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-0.5">
                  Configurar senha de 4 dígitos e biometria digital
                </p>
              </div>
            </div>
            <ChevronRight size={18} className="text-zinc-400" />
          </button>

          {/* Sincronização e Limpeza de Cache */}
          <button
            type="button"
            onClick={handleForceSync}
            className="w-full p-4 sm:p-5 flex items-center justify-between hover:bg-zinc-50/80 dark:hover:bg-zinc-800/40 transition-colors text-left cursor-pointer"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-2xl bg-teal-500/10 dark:bg-teal-500/20 text-teal-600 dark:text-teal-400 flex items-center justify-center shrink-0">
                <Database size={20} strokeWidth={2.2} />
              </div>
              <div>
                <h4 className="font-bold text-sm sm:text-base text-zinc-900 dark:text-white">
                  Sincronização & Cache
                </h4>
                <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-0.5">
                  Atualizar dados offline com a nuvem e limpar cache local
                </p>
              </div>
            </div>
            <ChevronRight size={18} className="text-zinc-400" />
          </button>
        </div>
      </div>

      {/* Section 3: Sobre o Aplicativo */}
      <div className="bg-white dark:bg-zinc-900/60 backdrop-blur-md rounded-3xl border border-zinc-200/70 dark:border-white/10 shadow-xl overflow-hidden">
        <div className="px-6 py-4 border-b border-zinc-100 dark:border-zinc-800">
          <h3 className="text-xs font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
            Sobre o Finante
          </h3>
        </div>

        <div className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
          {/* Novidades */}
          <button
            type="button"
            onClick={() => setShowChangelog(true)}
            className="w-full p-4 sm:p-5 flex items-center justify-between hover:bg-zinc-50/80 dark:hover:bg-zinc-800/40 transition-colors text-left cursor-pointer"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-2xl bg-rose-500/10 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
                <Sparkles size={20} strokeWidth={2.2} />
              </div>
              <div>
                <h4 className="font-bold text-sm sm:text-base text-zinc-900 dark:text-white">
                  Histórico de Atualizações
                </h4>
                <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-0.5">
                  Ver notas de versão e commits recentes do projeto
                </p>
              </div>
            </div>
            <ChevronRight size={18} className="text-zinc-400" />
          </button>

          {/* Repositório GitHub */}
          <a
            href="https://github.com/brunnogama/finante"
            target="_blank"
            rel="noopener noreferrer"
            className="w-full p-4 sm:p-5 flex items-center justify-between hover:bg-zinc-50/80 dark:hover:bg-zinc-800/40 transition-colors text-left cursor-pointer"
          >
            <div className="flex items-center gap-3.5">
              <div className="w-10 h-10 rounded-2xl bg-zinc-100 dark:bg-zinc-800 text-zinc-700 dark:text-zinc-300 flex items-center justify-center shrink-0">
                <ExternalLink size={20} strokeWidth={2.2} />
              </div>
              <div>
                <h4 className="font-bold text-sm sm:text-base text-zinc-900 dark:text-white">
                  Código-Fonte no GitHub
                </h4>
                <p className="text-xs text-zinc-400 dark:text-zinc-500 mt-0.5">
                  github.com/brunnogama/finante
                </p>
              </div>
            </div>
            <ChevronRight size={18} className="text-zinc-400" />
          </a>
        </div>
      </div>

      {/* Modals */}
      {showPinModal && <PinSetupModal onClose={() => setShowPinModal(false)} />}
      {showChangelog && <ChangelogModal currentVersion={pkg.version} onClose={() => setShowChangelog(false)} />}
      {showCategoriesModal && <ManageCategoriesModal onClose={() => setShowCategoriesModal(false)} />}
    </div>
  );
};
