import { Capacitor } from '@capacitor/core';

/**
 * Este serviço estrutura a leitura de notificações bancárias.
 * Na plataforma nativa Android, isso exigiria um plugin customizado
 * (ex: NotificationListenerService em Java/Kotlin) para rodar em background.
 */
export const notificationListenerService = {
  
  initialize: async () => {
    if (!Capacitor.isNativePlatform()) {
      console.log('Simulador de Notificações: Inicializado no modo Web/Desktop.');
      return;
    }
    
    // Aqui seria a chamada para solicitar permissão de leitura de notificações no Android:
    // const status = await AndroidNotificationListener.requestPermission();
    console.log('Solicitando permissões de leitura de notificações no Android...');
  },

  // Simula o recebimento de uma notificação bancária
  simulateBankNotification: (callback: (expense: any) => void) => {
    setTimeout(() => {
      console.log('Nova notificação capturada!');
      
      const mockedNotification = {
        title: 'Nubank',
        text: 'Compra aprovada no crédito - R$ 45,90 em IFood',
      };
      
      // Parse básico do texto da notificação para extrair valor e descrição
      const amountMatch = mockedNotification.text.match(/R\$\s?(\d+,\d+)/);
      const amount = amountMatch ? parseFloat(amountMatch[1].replace(',', '.')) : 0;
      
      const newExpense = {
        description: 'Compra via Notificação (IFood)',
        amount: amount,
        due_date: new Date().toISOString().split('T')[0],
        status: 'paid',
        type: 'Alimentação'
      };
      
      callback(newExpense);
    }, 5000); // Dispara 5 segundos após iniciado (para fins de demonstração)
  }
};
