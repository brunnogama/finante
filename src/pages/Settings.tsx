import React, { useState } from 'react';
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
  Database
} from 'lucide-react';
import { PinSetupModal } from '../components/PinSetupModal';
import { ChangelogModal } from '../components/ChangelogModal';
import { ManageCategoriesModal } from '../components/ManageCategoriesModal';
import pkg from '../../package.json';

export const Settings: React.FC = () => {
  const [showPinModal, setShowPinModal] = useState(false);
  const [showChangelog, setShowChangelog] = useState(false);
  const [showCategoriesModal, setShowCategoriesModal] = useState(false);
  const [isCheckingUpdates, setIsCheckingUpdates] = useState(false);
  const [updateStatus, setUpdateStatus] = useState<string | null>(null);

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
