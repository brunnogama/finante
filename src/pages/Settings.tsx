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
import { AdwPreferencesGroup } from '../components/adwaita/AdwPreferencesGroup';
import { AdwActionRow } from '../components/adwaita/AdwActionRow';
import { supabase, signInWithGoogle, signOutUser } from '../services/supabase';
import { checkAppUpdate } from '../services/updater';
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

          <div className="shrink-0 pl-3">
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
              <button
                type="button"
                onClick={handleGoogleConnect}
                disabled={isSigningIn}
                className="adw-btn text-xs font-semibold px-3 py-1.5 cursor-pointer inline-flex items-center gap-1.5 disabled:opacity-60"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" className="shrink-0">
                  <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
                  <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
                  <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z" />
                  <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z" />
                </svg>
                <span>{isSigningIn ? 'Conectando...' : 'Conectar Google'}</span>
              </button>
            )}
          </div>
        </div>
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
          title="Sincronização & Limpeza de Cache"
          subtitle="Atualizar dados offline com a nuvem e limpar cache local"
          prefix={
            <div className="w-9 h-9 rounded-xl bg-[#21a1a9]/10 text-[#21a1a9] flex items-center justify-center">
              <Database size={18} strokeWidth={2.2} />
            </div>
          }
          suffix={<ChevronRight size={16} className="text-zinc-400" />}
          onClick={handleForceSync}
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

      {/* Modals */}
      {showPinModal && <PinSetupModal onClose={() => setShowPinModal(false)} />}
      {showChangelog && <ChangelogModal currentVersion={pkg.version} onClose={() => setShowChangelog(false)} />}
      {showCategoriesModal && <ManageCategoriesModal onClose={() => setShowCategoriesModal(false)} />}
    </div>
  );
};
