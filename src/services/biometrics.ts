import { NativeBiometric } from '@capgo/capacitor-native-biometric';
import { Capacitor } from '@capacitor/core';

export const biometricsService = {
  isAvailable: async (): Promise<boolean> => {
    if (!Capacitor.isNativePlatform()) {
      return false; // Biometria nativa não disponível no navegador web ou desktop Tauri (sem lib específica)
    }
    
    try {
      const result = await NativeBiometric.isAvailable();
      return result.isAvailable;
    } catch (e) {
      console.warn('Biometria não suportada no dispositivo', e);
      return false;
    }
  },

  authenticate: async (reason: string = 'Autentique-se para acessar o Finante'): Promise<boolean> => {
    if (!Capacitor.isNativePlatform()) {
      // Simulação para testes no desktop web
      console.log('Simulando biometria no Desktop/Web');
      return true; 
    }

    try {
      await NativeBiometric.verifyIdentity({
        reason: reason,
        title: 'Desbloquear Finante',
        subtitle: 'Use sua digital ou rosto',
        description: 'Toque no sensor biométrico ou olhe para a câmera',
        negativeButtonText: 'Usar PIN',
        maxAttempts: 5
      });
      return true; // Sucesso
    } catch (e) {
      console.warn('Falha ou cancelamento na biometria:', e);
      return false;
    }
  }
};
