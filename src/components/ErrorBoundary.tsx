import { Component, type ErrorInfo, type ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';
import { FinanteIcon } from './FinanteIcon';
import { WindowControls } from './WindowControls';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
}

export class ErrorBoundary extends Component<Props, State> {
  public state: State = {
    hasError: false,
    error: null,
    errorInfo: null,
  };

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error, errorInfo: null };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('Uncaught error caught by ErrorBoundary:', error, errorInfo);
    this.setState({ error, errorInfo });
  }

  private handleReload = () => {
    window.location.reload();
  };

  private handleClearAndReload = () => {
    try {
      localStorage.clear();
      sessionStorage.clear();
    } catch (e) {
      console.warn('Could not clear storage:', e);
    }
    window.location.reload();
  };

  public render() {
    if (this.state.hasError) {
      return (
        <div className="fixed inset-0 bg-[#1e1e1e] text-white flex flex-col items-center justify-center p-6 z-[99999] select-none">
          {/* Top Window Drag & Controls Bar */}
          <div 
            className="absolute top-0 left-0 right-0 h-11 px-3.5 flex items-center justify-between z-50 select-none border-b border-white/5 bg-[#1e1e1e]"
            data-tauri-drag-region
          >
            <div className="flex items-center gap-2" data-tauri-drag-region>
              <FinanteIcon size={14} className="opacity-80" />
              <span className="text-[11px] font-semibold tracking-tight text-zinc-400">Finante</span>
            </div>
            <WindowControls />
          </div>

          <div className="w-full max-w-md bg-[#2a2a2a] border border-white/10 rounded-2xl p-6 shadow-2xl text-center relative z-10 animate-scaleIn">
            <div className="w-14 h-14 rounded-2xl bg-[#e01b24]/10 border border-[#e01b24]/20 flex items-center justify-center mx-auto mb-4 text-[#e01b24]">
              <AlertTriangle size={28} />
            </div>

            <h2 className="text-xl font-bold text-white mb-2">Ops! Algo deu errado</h2>
            <p className="text-xs text-zinc-400 mb-4 leading-relaxed">
              Ocorreu uma falha inesperada durante a execução da interface.
            </p>

            {this.state.error && (
              <div className="text-left bg-black/40 border border-white/5 rounded-xl p-3 mb-5 overflow-auto max-h-36">
                <p className="text-[11px] font-mono text-red-400 break-words font-semibold">
                  {this.state.error.name}: {this.state.error.message}
                </p>
                {this.state.error.stack && (
                  <pre className="text-[10px] font-mono text-zinc-500 mt-2 whitespace-pre-wrap">
                    {this.state.error.stack.split('\n').slice(0, 4).join('\n')}
                  </pre>
                )}
              </div>
            )}

            <div className="flex flex-col sm:flex-row gap-2.5 justify-center">
              <button
                type="button"
                onClick={this.handleReload}
                className="flex-1 py-2.5 px-4 rounded-xl bg-[#3584e4] hover:bg-[#2b71c7] text-white font-semibold text-xs transition-colors flex items-center justify-center gap-2 cursor-pointer shadow-md"
              >
                <RefreshCw size={14} />
                <span>Recarregar Aplicativo</span>
              </button>
              <button
                type="button"
                onClick={this.handleClearAndReload}
                className="py-2.5 px-4 rounded-xl bg-white/[0.08] hover:bg-white/[0.14] text-zinc-300 font-semibold text-xs border border-white/10 transition-colors cursor-pointer"
              >
                Limpar Cache e Reiniciar
              </button>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
