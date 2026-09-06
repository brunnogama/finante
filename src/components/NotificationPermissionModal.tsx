import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  Bell, 
  CreditCard, 
  CheckCircle2, 
  AlertTriangle, 
  X, 
  ShieldCheck,
  Smartphone
} from 'lucide-react';
import { notificationListenerService } from '../services/notifications';

interface NotificationPermissionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const NotificationPermissionModal: React.FC<NotificationPermissionModalProps> = ({
  isOpen,
  onClose
}) => {
  const [postPerm, setPostPerm] = useState(false);
  const [listenerPerm, setListenerPerm] = useState(false);

  const refreshPermissions = async () => {
    try {
      const [post, listener] = await Promise.all([
        notificationListenerService.isPostNotificationsGranted(),
        notificationListenerService.checkPermission()
      ]);
      setPostPerm(post);
      setListenerPerm(listener);
    } catch (e) {
      console.warn('Erro checando permissões:', e);
    }
  };

  useEffect(() => {
    if (isOpen) {
      refreshPermissions();
      const onFocus = () => refreshPermissions();
      window.addEventListener('focus', onFocus);
      return () => window.removeEventListener('focus', onFocus);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleRequestPost = async () => {
    await notificationListenerService.requestPostNotificationsPermission();
    setTimeout(() => refreshPermissions(), 800);
  };

  const handleOpenListener = async () => {
    await notificationListenerService.requestPermission();
    setTimeout(() => refreshPermissions(), 1200);
  };

  const handleOpenAppDetails = async () => {
    await notificationListenerService.openAppDetailsSettings();
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fade-in">
      <div 
        className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="px-5 py-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50 dark:bg-zinc-800/60">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 rounded-xl bg-primary-500/10 text-primary-600 dark:text-primary-400 border border-primary-500/20">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                Permissões do Finante
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Ative as notificações para usar o app com máxima eficiência
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-zinc-600 dark:hover:text-zinc-200 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto space-y-4">
          
          {/* Card 1: POST_NOTIFICATIONS (Lembrete de Vencimento) */}
          <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/30 space-y-2">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400 mt-0.5">
                  <Bell className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                    Lembretes de Vencimento
                  </h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                    Envia alerta no celular no dia em que suas despesas vencem para não esquecer de pagar.
                  </p>
                </div>
              </div>

              {postPerm ? (
                <span className="shrink-0 inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Ativo
                </span>
              ) : (
                <button
                  type="button"
                  onClick={handleRequestPost}
                  className="shrink-0 px-3 py-1.5 text-xs font-semibold text-white bg-blue-600 hover:bg-blue-500 rounded-lg shadow-sm active:scale-95 transition-all"
                >
                  Permitir
                </button>
              )}
            </div>
          </div>

          {/* Card 2: NotificationListenerService (Leitura de Notificações Bancárias) */}
          <div className="p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-800/30 space-y-3">
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-start gap-3">
                <div className="p-2 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400 mt-0.5">
                  <CreditCard className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-zinc-900 dark:text-zinc-100">
                    Leitura de Notificações Bancárias
                  </h3>
                  <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                    Lê alertas do Nubank, Itaú, Inter, Santander, etc. e sugere a despesa pronta para salvar com 1 toque.
                  </p>
                </div>
              </div>

              {listenerPerm ? (
                <span className="shrink-0 inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Ativo
                </span>
              ) : (
                <button
                  type="button"
                  onClick={handleOpenListener}
                  className="shrink-0 px-3 py-1.5 text-xs font-semibold text-white bg-purple-600 hover:bg-purple-500 rounded-lg shadow-sm active:scale-95 transition-all"
                >
                  Ativar no Android
                </button>
              )}
            </div>

            {/* Explicação de Configuração Restrita do Android */}
            {!listenerPerm && (
              <div className="p-3 rounded-lg bg-amber-500/10 border border-amber-500/20 text-xs text-amber-800 dark:text-amber-200 space-y-1.5">
                <div className="flex items-center gap-1.5 font-bold">
                  <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                  <span>Se aparecer "Configuração restrita" no Android:</span>
                </div>
                <p className="leading-relaxed opacity-90">
                  Em apps instalados por APK, o Android 13+ protege o acesso especial. Para liberar:
                </p>
                <ol className="list-decimal list-inside space-y-0.5 pl-1 opacity-90">
                  <li>Toque no botão <strong>"Abrir Configurações do App"</strong> abaixo.</li>
                  <li>No canto superior direito, toque nos <strong>3 pontinhos (⋮)</strong>.</li>
                  <li>Selecione <strong>"Permitir configurações restritas"</strong>.</li>
                  <li>Volte aqui e toque em <strong>"Ativar no Android"</strong>.</li>
                </ol>

                <div className="pt-1 flex justify-end">
                  <button
                    type="button"
                    onClick={handleOpenAppDetails}
                    className="px-2.5 py-1 text-[11px] font-bold bg-amber-600 hover:bg-amber-500 text-white rounded-md transition-colors inline-flex items-center gap-1"
                  >
                    <Smartphone className="w-3 h-3" />
                    Abrir Configurações do App
                  </button>
                </div>
              </div>
            )}
          </div>

        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/40 flex items-center justify-between">
          <span className="text-[11px] text-zinc-400">
            Você pode alterar isso a qualquer momento em Configurações.
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 text-xs font-semibold text-white bg-zinc-900 hover:bg-zinc-800 dark:bg-zinc-100 dark:hover:bg-white dark:text-zinc-900 rounded-xl transition-colors shadow-sm"
          >
            Continuar
          </button>
        </div>

      </div>
    </div>,
    document.body
  );
};
