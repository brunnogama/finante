import { Capacitor, registerPlugin } from '@capacitor/core';
import { getCompanies, type CompanyRecord } from './supabase';

export interface RawBankNotification {
  id: string;
  packageName: string;
  title: string;
  text: string;
  timestamp: number;
}

export interface ParsedBankExpense {
  rawId: string;
  bankName: string;
  company: string;
  description: string;
  amount: number;
  payment_method: 'PIX' | 'Crédito' | 'Débito' | 'Boleto';
  due_date: string;
  paid_date: string;
  status: 'paid';
  type: string;
  rawText: string;
  timestamp: number;
}

interface FinanteNotificationsPlugin {
  isPermissionGranted(): Promise<{ granted: boolean }>;
  openPermissionSettings(): Promise<void>;
  getPendingNotifications(options?: { clear?: boolean }): Promise<{ notifications: RawBankNotification[] }>;
  clearPendingNotifications(): Promise<void>;
  addSimulatedNotification(options?: { packageName?: string; title?: string; text?: string }): Promise<{ success: boolean }>;
}

const FinanteNotifications = registerPlugin<FinanteNotificationsPlugin>('FinanteNotifications');

const BANK_MAP: Record<string, string> = {
  'com.nu.production': 'Nubank',
  'com.itau': 'Itaú',
  'com.itau.personnalite': 'Itaú Personnalité',
  'com.itau.cartoes': 'Itaú Cartões',
  'br.com.intermedium': 'Banco Inter',
  'com.santander.app': 'Santander',
  'com.santander.way': 'Santander Way',
  'br.com.bradesco': 'Bradesco',
  'br.com.bradesco.cartoes': 'Bradesco Cartões',
  'br.com.bb': 'Banco do Brasil',
  'br.com.gabba.Caixa': 'Caixa',
  'com.c6bank.app': 'C6 Bank',
  'com.mercadopago.wallet': 'Mercado Pago',
  'com.picpay': 'PicPay',
  'com.neondigitalbank': 'Neon',
  'br.com.original.bank': 'Banco Original',
  'com.next.mobile': 'Next'
};

const COMMON_CATEGORY_KEYWORDS: Record<string, string[]> = {
  'Alimentação': ['ifood', 'rappi', 'restaurante', 'mercado', 'supermercado', 'padaria', 'lanchonete', 'burger', 'pizza', 'acougue', 'hortifruti', 'atacadao', 'carrefour', 'pao de acucar'],
  'Transporte': ['uber', '99app', '99 tecnologia', 'táxi', 'taxi', 'estacionamento', 'sem parar', 'veloe', 'pedagio'],
  'Combustível': ['posto', 'ipiranga', 'shell', 'petrobras', 'br distribuidora', 'combustivel', 'gasolina', 'etanol'],
  'Saúde': ['farmacia', 'drogaria', 'drogasil', 'raia', 'pague menos', 'panvel', 'hospital', 'laboratorio', 'clinica', 'consulta', 'otica'],
  'Lazer': ['cinema', 'netflix', 'spotify', 'prime video', 'hbomax', 'max', 'steam', 'playstation', 'ingresso', 'show', 'teatro'],
  'Moradia': ['enel', 'cpfl', 'sabesp', 'sanepar', 'condominio', 'aluguel', 'energia', 'agua', 'luz', 'gas'],
  'Educação': ['escola', 'faculdade', 'curso', 'udemy', 'livraria', 'livros']
};

export const parseBankNotification = (
  raw: RawBankNotification,
  registeredCompanies: CompanyRecord[] = []
): ParsedBankExpense | null => {
  const fullText = `${raw.title || ''} ${raw.text || ''}`.trim();
  if (!fullText) return null;

  // 1. Extrair valor em R$ (ex: R$ 45,90 / R$45.90 / 45,90)
  const amountRegex = /(?:R\$\s*|reais\s*)?(\d{1,3}(?:\.\d{3})*|\d+)(?:[,\.](\d{2}))(?:\s*reais)?/i;
  const matchWithCurrency = fullText.match(/(?:R\$\s*)(\d{1,3}(?:\.\d{3})*|\d+)[,\.](\d{2})/i) ||
                           fullText.match(/(\d{1,3}(?:\.\d{3})*|\d+)[,\.](\d{2})\s*reais/i) ||
                           fullText.match(amountRegex);

  if (!matchWithCurrency) {
    return null;
  }

  const intPart = matchWithCurrency[1].replace(/\./g, '');
  const decPart = matchWithCurrency[2] || '00';
  const amount = parseFloat(`${intPart}.${decPart}`);
  if (isNaN(amount) || amount <= 0) {
    return null;
  }

  // 2. Identificar Banco
  const bankName = BANK_MAP[raw.packageName] || raw.title || 'Banco';

  // 3. Identificar Forma de Pagamento
  const lowerText = fullText.toLowerCase();
  let payment_method: 'PIX' | 'Crédito' | 'Débito' | 'Boleto' = 'Débito';
  if (lowerText.includes('pix') || lowerText.includes('transferência') || lowerText.includes('transferencia')) {
    payment_method = 'PIX';
  } else if (lowerText.includes('crédito') || lowerText.includes('credito') || lowerText.includes('fatura')) {
    payment_method = 'Crédito';
  } else if (lowerText.includes('débito') || lowerText.includes('debito') || lowerText.includes('conta corrente')) {
    payment_method = 'Débito';
  } else if (lowerText.includes('boleto')) {
    payment_method = 'Boleto';
  }

  // 4. Identificar Estabelecimento / Empresa
  let establishment = '';
  let category = 'Outros';

  // Tentativa A: Match exato com empresas já cadastradas pelo usuário
  for (const comp of registeredCompanies) {
    if (comp.name && comp.name.length > 2) {
      const regex = new RegExp(`\\b${comp.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
      if (regex.test(fullText)) {
        establishment = comp.name;
        if (comp.default_type) {
          category = comp.default_type;
        }
        break;
      }
    }
  }

  // Tentativa B: Expressões regulares comuns em notificações bancárias brasileiras
  if (!establishment) {
    // "em NOME_ESTABELECIMENTO", "no NOME_ESTABELECIMENTO", "para NOME_DESTINO", "na NOME_LOJA"
    const prepMatches = [
      /(?:em|no|na|para|a)\s+([A-Za-z0-9À-ÿ\s\.\-_&']{2,35}?)(?:\s+(?:no|na|via|com|em|\.|\,|aprovad|com sucesso|\$|$))/i,
      /(?:compra\s+(?:aprovada\s+)?(?:de\s+R\$[0-9,\.]+\s+)?(?:em|no|na)\s+)([A-Za-z0-9À-ÿ\s\.\-_&']{2,35})/i,
      /(?:transferência\s+(?:enviada|realizada)\s+para\s+)([A-Za-z0-9À-ÿ\s\.\-_&']{2,35})/i
    ];

    for (const rx of prepMatches) {
      const m = fullText.match(rx);
      if (m && m[1]) {
        let clean = m[1].trim();
        // Remove ruídos comuns
        clean = clean.replace(/^(um|uma|o|a|os|as)\s+/i, '');
        clean = clean.replace(/\s+(cart[aã]o|cr[eé]dito|d[eé]bito|pix|reais|valor|final).*$/i, '');
        if (clean.length >= 2 && !clean.toLowerCase().includes('compra')) {
          establishment = clean;
          break;
        }
      }
    }
  }

  if (!establishment) {
    establishment = bankName;
  }

  // 5. Categorização por palavras-chave se ainda estiver como 'Outros'
  if (category === 'Outros') {
    const textToMatch = `${establishment} ${fullText}`.toLowerCase();
    for (const [catName, keywords] of Object.entries(COMMON_CATEGORY_KEYWORDS)) {
      if (keywords.some(kw => textToMatch.includes(kw))) {
        category = catName;
        break;
      }
    }
  }

  const dateObj = raw.timestamp ? new Date(raw.timestamp) : new Date();
  const dateStr = dateObj.toISOString().split('T')[0];

  return {
    rawId: raw.id,
    bankName,
    company: establishment,
    description: establishment,
    amount,
    payment_method,
    due_date: dateStr,
    paid_date: dateStr,
    status: 'paid',
    type: category,
    rawText: fullText,
    timestamp: raw.timestamp || Date.now()
  };
};

export const notificationListenerService = {
  isSupported: (): boolean => {
    return Capacitor.getPlatform() === 'android';
  },

  checkPermission: async (): Promise<boolean> => {
    if (!notificationListenerService.isSupported()) return false;
    try {
      const res = await FinanteNotifications.isPermissionGranted();
      return !!res?.granted;
    } catch (err) {
      console.warn('Erro ao verificar permissão de notificação:', err);
      return false;
    }
  },

  requestPermission: async (): Promise<void> => {
    if (!notificationListenerService.isSupported()) return;
    try {
      await FinanteNotifications.openPermissionSettings();
    } catch (err) {
      console.error('Erro ao abrir configurações de notificação:', err);
    }
  },

  fetchPendingNotifications: async (clear: boolean = true): Promise<ParsedBankExpense[]> => {
    if (!notificationListenerService.isSupported()) return [];
    try {
      const res = await FinanteNotifications.getPendingNotifications({ clear });
      const rawList = res?.notifications || [];
      if (!rawList.length) return [];

      const companies = await getCompanies();
      const parsedList: ParsedBankExpense[] = [];

      for (const raw of rawList) {
        const parsed = parseBankNotification(raw, companies);
        if (parsed) {
          parsedList.push(parsed);
        }
      }

      return parsedList;
    } catch (err) {
      console.error('Erro ao ler notificações pendentes:', err);
      return [];
    }
  },

  clearPendingNotifications: async (): Promise<void> => {
    if (!notificationListenerService.isSupported()) return;
    try {
      await FinanteNotifications.clearPendingNotifications();
    } catch (err) {
      console.error('Erro ao limpar notificações pendentes:', err);
    }
  },

  addSimulatedNotification: async (sim?: { packageName?: string; title?: string; text?: string }): Promise<void> => {
    if (!notificationListenerService.isSupported()) {
      // No modo web/desktop, salva em localStorage para testes manuais
      const simItem: RawBankNotification = {
        id: 'sim_web_' + Date.now(),
        packageName: sim?.packageName || 'com.nu.production',
        title: sim?.title || 'Nubank',
        text: sim?.text || 'Compra aprovada de R$ 38,50 em Padaria Estrela no débito.',
        timestamp: Date.now()
      };
      const cur = JSON.parse(localStorage.getItem('finante_sim_notifications') || '[]');
      localStorage.setItem('finante_sim_notifications', JSON.stringify([...cur, simItem]));
      return;
    }

    try {
      await FinanteNotifications.addSimulatedNotification({
        packageName: sim?.packageName || 'com.nu.production',
        title: sim?.title || 'Nubank',
        text: sim?.text || 'Compra aprovada de R$ 38,50 em Padaria Estrela no débito.'
      });
    } catch (err) {
      console.error('Erro ao simular notificação:', err);
    }
  },

  fetchWebSimulatedNotifications: async (): Promise<ParsedBankExpense[]> => {
    const cur: RawBankNotification[] = JSON.parse(localStorage.getItem('finante_sim_notifications') || '[]');
    if (!cur.length) return [];
    localStorage.removeItem('finante_sim_notifications');
    const companies = await getCompanies();
    const list: ParsedBankExpense[] = [];
    for (const raw of cur) {
      const parsed = parseBankNotification(raw, companies);
      if (parsed) list.push(parsed);
    }
    return list;
  }
};
