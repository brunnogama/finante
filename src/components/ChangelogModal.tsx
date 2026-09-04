import React, { useEffect, useState } from 'react';
import { X, Clock, Sparkles, RefreshCw, CheckCircle2, DownloadCloud, ArrowUpCircle, AlertCircle } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { checkAppUpdate, downloadAndApplyUpdate } from '../services/updater';
import type { Update } from '@tauri-apps/plugin-updater';

interface ChangelogModalProps {
  onClose: () => void;
  currentVersion: string;
}

interface ChangelogEntry {
  sha: string;
  date: string;
  title: string;
  description?: string;
}

const BUILTIN_CHANGELOG: ChangelogEntry[] = [
  {
    sha: 'ad50fed',
    date: '2026-09-04T19:15:00Z',
    title: '🎨 Migração Completa para GNOME 50 / Libadwaita (GTK4)',
    description: 'Design 100% nativo para Fedora Linux com Libadwaita HIG: HeaderBar, Boxed Lists, ActionRows, ViewSwitcher, Dialogs, palette de cores oficial (Blue #3584e4, Green #2ec27e, Red #e01b24, Amber #e5a50a, Purple #9141ac) e integração total com Supabase.'
  },
  {
    sha: '4d8e92a',
    date: '2026-09-04T18:20:00Z',
    title: '📅 Seletor de Data & Ordem Alfabética',
    description: 'Seletor de data moderno com fechamento automático ao clicar na data e menus suspensos 100% em ordem alfabética.'
  },
  {
    sha: '9ab217f',
    date: '2026-09-04T17:00:00Z',
    title: '🚀 Atualização Automática no Aplicativo (Auto-Updater)',
    description: 'Verificação e instalação de atualizações diretamente no app com 1 clique, barra de download e reinício automático.'
  },
  {
    sha: '1b8f44d',
    date: '2026-09-04T16:45:00Z',
    title: '🌐 Login com Conta Google (OAuth) & Sincronização',
    description: 'Autenticação segura via Google OAuth integrada ao Supabase, exibição de perfil nas configurações e desbloqueio rápido com PIN.'
  },
  {
    sha: '9f1a23c',
    date: '2026-09-04T16:15:00Z',
    title: '✨ Redesign Completo da Página Início & Responsividade',
    description: 'Padronização da Visão Geral com o tema Apple HIG, cards KPI adaptativos com truncamento inteligente, atalhos rápidos e gráficos fluidos.'
  },
  {
    sha: 'ca9076c',
    date: '2026-09-04T15:10:00Z',
    title: '🔒 PIN Obrigatório & Inicialização em Tela Cheia',
    description: 'Cadastro e solicitação de PIN de 4 dígitos no primeiro acesso com teclado interativo e abertura do app maximizado.'
  },
  {
    sha: '83f12ab',
    date: '2026-09-04T15:00:00Z',
    title: '📈 Nova Página de Investimentos & Carteira',
    description: 'Acompanhamento de patrimônio, gráfico de rosca por classe de ativo (Renda Fixa, Ações, FIIs, Cripto), histórico de aportes e CRUD completo.'
  },
  {
    sha: '57e9301',
    date: '2026-09-04T14:50:00Z',
    title: '📅 Calendário Financeiro Modernizado',
    description: 'Grade interativa de vencimentos diários, previsão de saldo mensal, total pago vs pendente e painel lateral dinâmico.'
  },
  {
    sha: 'e499d30',
    date: '2026-09-04T14:40:00Z',
    title: '📊 Visão Geral Focada no Mês Atual',
    description: 'Exclusão estrita de ganhos futuros no saldo atual e gráfico comparativo dos últimos 6 meses para trás.'
  },
  {
    sha: '190c74f',
    date: '2026-09-04T14:30:00Z',
    title: '🎨 Ícone Oficial finante.png no GNOME / Fedora',
    description: 'Adoção dinâmica da identidade visual no menu de aplicativos do Fedora, dock do GNOME e arquivos do sistema.'
  }
];

export const ChangelogModal: React.FC<ChangelogModalProps> = ({ onClose, currentVersion }) => {
  const [entries, setEntries] = useState<ChangelogEntry[]>(BUILTIN_CHANGELOG);
  const [loading, setLoading] = useState(true);
  const [availableUpdate, setAvailableUpdate] = useState<Update | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateProgress, setUpdateProgress] = useState(0);
  const [updateStatusText, setUpdateStatusText] = useState('');
  const [updateError, setUpdateError] = useState<string | null>(null);

  useEffect(() => {
    fetchLatestCommits();
    checkForNativeUpdate();
  }, []);

  const checkForNativeUpdate = async () => {
    try {
      const update = await checkAppUpdate();
      if (update) {
        setAvailableUpdate(update);
      }
    } catch (err: any) {
      console.warn('Native update check failed or not in desktop environment:', err);
    }
  };

  const fetchLatestCommits = () => {
    setLoading(true);
    fetch('https://api.github.com/repos/brunnogama/finante/commits?per_page=10', { cache: 'no-store' })
      .then(res => {
        if (!res.ok) throw new Error('Private or offline');
        return res.json();
      })
      .then(data => {
        if (Array.isArray(data) && data.length > 0) {
          const parsed: ChangelogEntry[] = data.map((c: any) => ({
            sha: (c.sha || '').substring(0, 7),
            date: c.commit?.author?.date || new Date().toISOString(),
            title: (c.commit?.message || '').split('\n')[0],
            description: (c.commit?.message || '').split('\n').slice(1).join(' ').trim() || undefined
          }));
          setEntries(parsed);
        } else {
          setEntries(BUILTIN_CHANGELOG);
        }
        setLoading(false);
      })
      .catch(() => {
        setEntries(BUILTIN_CHANGELOG);
        setLoading(false);
      });
  };

  const handleInstallNativeUpdate = async () => {
    if (!availableUpdate) return;
    setIsUpdating(true);
    setUpdateError(null);
    setUpdateStatusText('Iniciando download da atualização...');
    setUpdateProgress(5);

    try {
      await downloadAndApplyUpdate(availableUpdate, (p) => {
        setUpdateProgress(p.percentage);
        setUpdateStatusText(`Baixando atualização... ${p.percentage}%`);
      });
      setUpdateProgress(100);
      setUpdateStatusText('Atualização instalada com sucesso! Reiniciando...');
    } catch (err: any) {
      console.error('Update installation failed:', err);
      setUpdateError(err?.message || 'Falha ao instalar atualização.');
      setIsUpdating(false);
    }
  };

  const handleReloadApp = async () => {
    setIsUpdating(true);
    setUpdateStatusText('Limpando cache e recarregando...');
    try {
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map(name => caches.delete(name)));
      }
      setTimeout(() => {
        window.location.reload();
      }, 500);
    } catch {
      window.location.reload();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-fadeIn">
      <div className="adw-dialog max-w-lg w-full shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-scaleIn">
        
        {/* Header */}
        <div className="p-5 border-b border-black/5 dark:border-white/5 relative">
          <button 
            onClick={onClose}
            className="absolute top-4 right-4 p-1.5 rounded-lg text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>

          <div className="flex items-center gap-3.5">
            <div className="w-11 h-11 rounded-xl bg-[#3584e4]/10 text-[#3584e4] flex items-center justify-center shrink-0">
              <Sparkles size={22} strokeWidth={2.2} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base font-bold text-zinc-900 dark:text-white">
                  Novidades & Atualizações
                </h3>
                <span className="text-[10px] font-extrabold px-2 py-0.5 rounded-full bg-[#3584e4]/15 text-[#3584e4]">
                  v{currentVersion}
                </span>
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                Notas de versão, melhorias e atualização direta do Finante
              </p>
            </div>
          </div>
        </div>

        {/* Update Banner */}
        {availableUpdate ? (
          <div className="p-4 bg-[#3584e4]/10 border-b border-[#3584e4]/20 flex flex-col gap-3">
            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <ArrowUpCircle size={20} className="text-[#3584e4] shrink-0 animate-bounce" />
                <div>
                  <h4 className="text-xs sm:text-sm font-bold text-zinc-900 dark:text-white">
                    Nova versão disponível: v{availableUpdate.version}
                  </h4>
                  <p className="text-[11px] text-zinc-500 dark:text-zinc-400">
                    Instale a versão mais recente diretamente com 1 clique
                  </p>
                </div>
              </div>

              {!isUpdating && (
                <button
                  type="button"
                  onClick={handleInstallNativeUpdate}
                  className="adw-btn suggested-action text-xs font-semibold px-3.5 py-1.5 inline-flex items-center gap-1.5 cursor-pointer shrink-0"
                >
                  <DownloadCloud size={14} />
                  <span>Atualizar Agora</span>
                </button>
              )}
            </div>

            {/* Progress Bar when updating */}
            {isUpdating && (
              <div className="space-y-1.5 pt-1">
                <div className="flex justify-between text-[11px] font-semibold text-zinc-600 dark:text-zinc-300">
                  <span>{updateStatusText}</span>
                  <span>{updateProgress}%</span>
                </div>
                <div className="w-full h-1.5 bg-black/10 dark:bg-white/10 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-[#3584e4] rounded-full transition-all duration-300 ease-out"
                    style={{ width: `${Math.max(5, updateProgress)}%` }}
                  />
                </div>
              </div>
            )}

            {updateError && (
              <div className="flex items-center gap-2 text-[#e01b24] text-xs font-semibold">
                <AlertCircle size={14} />
                <span>{updateError}</span>
              </div>
            )}
          </div>
        ) : (
          <div className="px-5 py-3 bg-black/[0.02] dark:bg-white/[0.03] border-b border-black/5 dark:border-white/5 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <CheckCircle2 size={16} className="text-[#2ec27e] shrink-0" />
              <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 truncate">
                {isUpdating ? updateStatusText : `Você está na versão mais recente (v${currentVersion})`}
              </span>
            </div>

            <button
              type="button"
              onClick={handleReloadApp}
              disabled={isUpdating}
              className="adw-btn text-xs font-semibold px-3 py-1.5 inline-flex items-center gap-1.5 cursor-pointer disabled:opacity-50 shrink-0"
            >
              <RefreshCw size={13} className={isUpdating ? 'animate-spin' : ''} />
              <span>{isUpdating ? 'Recarregando...' : 'Recarregar App'}</span>
            </button>
          </div>
        )}

        {/* Content - Changelog List */}
        <div className="p-5 overflow-y-auto flex-1 space-y-2.5">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 text-center text-zinc-400 dark:text-zinc-500">
              <RefreshCw size={24} className="animate-spin mb-3 text-[#3584e4]" />
              <p className="text-xs font-semibold">Consultando notas de atualização...</p>
            </div>
          ) : (
            entries.map((c) => (
              <div 
                key={c.sha} 
                className="p-3 rounded-xl bg-black/[0.02] dark:bg-white/[0.03] border border-black/5 dark:border-white/5 hover:border-black/10 dark:hover:border-white/10 transition-colors"
              >
                <div className="flex items-center justify-between gap-2 mb-1">
                  <div className="flex items-center gap-1.5 text-[11px] text-zinc-400 dark:text-zinc-500 font-medium">
                    <Clock size={12} />
                    <span>{format(new Date(c.date), "dd 'de' MMM 'às' HH:mm", { locale: ptBR })}</span>
                  </div>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-black/5 dark:bg-white/10 text-zinc-600 dark:text-zinc-300 font-bold">
                    {c.sha.substring(0, 7)}
                  </span>
                </div>

                <p className="text-xs sm:text-sm font-semibold text-zinc-800 dark:text-zinc-100 leading-snug">
                  {c.title}
                </p>
                {c.description && (
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-1 leading-relaxed">
                    {c.description}
                  </p>
                )}
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-3.5 bg-black/[0.02] dark:bg-white/[0.02] border-t border-black/5 dark:border-white/5 flex items-center justify-between">
          <span className="text-[11px] text-zinc-400">
            Repositório: brunnogama/finante
          </span>
          <button
            type="button"
            onClick={onClose}
            className="adw-btn text-xs font-semibold px-4 py-1.5 cursor-pointer"
          >
            Fechar
          </button>
        </div>

      </div>
    </div>
  );
};

