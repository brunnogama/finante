import React, { useEffect, useState } from 'react';
import { X, Clock, Sparkles, RefreshCw, CheckCircle2 } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

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
  },
  {
    sha: '70834a5',
    date: '2026-09-04T14:15:00Z',
    title: '⚡ Verificação de Atualizações & Sincronização',
    description: 'Botão de verificação de atualizações em Configurações com limpeza de caches e sincronização instantânea.'
  }
];

export const ChangelogModal: React.FC<ChangelogModalProps> = ({ onClose, currentVersion }) => {
  const [entries, setEntries] = useState<ChangelogEntry[]>(BUILTIN_CHANGELOG);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);
  const [updateSuccess, setUpdateSuccess] = useState(false);

  useEffect(() => {
    fetchLatestCommits();
  }, []);

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
        // Gracefully use the built-in changelog
        setEntries(BUILTIN_CHANGELOG);
        setLoading(false);
      });
  };

  const handleApplyUpdate = async () => {
    setUpdating(true);
    try {
      // Clear Service Worker & browser caches
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map(name => caches.delete(name)));
      }
      
      setUpdateSuccess(true);
      setTimeout(() => {
        // Force full reload bypassing cache
        window.location.reload();
      }, 1000);
    } catch (err) {
      console.warn('Cache clear error, reloading anyway:', err);
      window.location.reload();
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-md z-50 flex items-center justify-center p-4 animate-fadeIn">
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl max-w-lg w-full shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-[scaleIn_0.15s_ease]">
        
        {/* Header */}
        <div className="p-6 border-b border-zinc-100 dark:border-zinc-800/80 relative">
          <button 
            onClick={onClose}
            className="absolute top-5 right-5 p-2 rounded-xl text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
          >
            <X size={18} />
          </button>

          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-2xl bg-blue-500/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
              <Sparkles size={24} strokeWidth={2.2} />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-zinc-900 dark:text-white">
                  Novidades & Atualizações
                </h3>
                <span className="text-[11px] font-extrabold px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
                  v{currentVersion}
                </span>
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                Últimas melhorias e notas de versão instaladas no Finante
              </p>
            </div>
          </div>
        </div>

        {/* Update Banner */}
        <div className="px-6 py-3.5 bg-zinc-50 dark:bg-zinc-800/40 border-b border-zinc-100 dark:border-zinc-800/80 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2 min-w-0">
            <CheckCircle2 size={16} className="text-emerald-500 shrink-0" />
            <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 truncate">
              {updateSuccess ? 'Aplicativo atualizado! Recarregando...' : `Versão v${currentVersion} instalada e pronta`}
            </span>
          </div>

          <button
            type="button"
            onClick={handleApplyUpdate}
            disabled={updating}
            style={{ backgroundColor: '#34C759' }}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-white font-semibold text-xs shadow-xs hover:opacity-95 active:scale-95 transition-all shrink-0 cursor-pointer disabled:opacity-50"
          >
            <RefreshCw size={13} className={updating ? 'animate-spin' : ''} />
            <span>{updating ? 'Atualizando...' : 'Recarregar App'}</span>
          </button>
        </div>

        {/* Content - Changelog List */}
        <div className="p-6 overflow-y-auto flex-1 space-y-3">
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 text-center text-zinc-400 dark:text-zinc-500">
              <RefreshCw size={28} className="animate-spin mb-3 text-blue-500" />
              <p className="text-sm font-semibold">Consultando notas de atualização...</p>
            </div>
          ) : (
            entries.map((c) => (
              <div 
                key={c.sha} 
                className="p-3.5 rounded-2xl bg-zinc-50/80 dark:bg-zinc-800/40 border border-zinc-200/60 dark:border-zinc-700/40 hover:border-zinc-300 dark:hover:border-zinc-600 transition-colors"
              >
                <div className="flex items-center justify-between gap-2 mb-1">
                  <div className="flex items-center gap-1.5 text-xs text-zinc-400 dark:text-zinc-500 font-medium">
                    <Clock size={13} />
                    <span>{format(new Date(c.date), "dd 'de' MMM 'às' HH:mm", { locale: ptBR })}</span>
                  </div>
                  <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-zinc-200/70 dark:bg-zinc-700/60 text-zinc-600 dark:text-zinc-300 font-bold">
                    {c.sha.substring(0, 7)}
                  </span>
                </div>

                <p className="text-xs sm:text-sm font-bold text-zinc-800 dark:text-zinc-100 leading-snug">
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
        <div className="p-4 bg-zinc-50/50 dark:bg-zinc-800/20 border-t border-zinc-100 dark:border-zinc-800/60 flex items-center justify-between">
          <span className="text-xs text-zinc-400">
            Repositório: brunnogama/finante
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 text-xs font-semibold hover:bg-zinc-100 dark:hover:bg-zinc-800 cursor-pointer"
          >
            Fechar
          </button>
        </div>

      </div>
    </div>
  );
};
