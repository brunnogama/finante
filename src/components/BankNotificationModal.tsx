import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { 
  Bell, 
  Check, 
  X, 
  Building2, 
  Tag, 
  CreditCard, 
  Calendar, 
  ChevronRight, 
  Trash2 
} from 'lucide-react';
import type { ParsedBankExpense } from '../services/notifications';
import { addExpense, getExpenseTypes } from '../services/supabase';

interface BankNotificationModalProps {
  items: ParsedBankExpense[];
  onClose: () => void;
  onAdded: () => void;
}

export const BankNotificationModal: React.FC<BankNotificationModalProps> = ({
  items: initialItems,
  onClose,
  onAdded
}) => {
  const [items, setItems] = useState<ParsedBankExpense[]>(initialItems);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [availableTypes, setAvailableTypes] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  // Form state for currently viewed item
  const currentItem = items[currentIndex] || null;
  const [company, setCompany] = useState('');
  const [amount, setAmount] = useState<number>(0);
  const [category, setCategory] = useState('Outros');
  const [paymentMethod, setPaymentMethod] = useState<'PIX' | 'Crédito' | 'Débito' | 'Boleto'>('Débito');
  const [dueDate, setDueDate] = useState('');

  useEffect(() => {
    getExpenseTypes().then(types => {
      if (types && types.length > 0) {
        setAvailableTypes(types);
      }
    });
  }, []);

  useEffect(() => {
    if (currentItem) {
      setCompany(currentItem.company);
      setAmount(currentItem.amount);
      setCategory(currentItem.type || 'Outros');
      setPaymentMethod(currentItem.payment_method || 'Débito');
      setDueDate(currentItem.due_date);
    }
  }, [currentIndex, currentItem]);

  if (!currentItem || items.length === 0) {
    return null;
  }

  const handleDiscard = () => {
    const nextItems = items.filter((_, idx) => idx !== currentIndex);
    setItems(nextItems);
    if (currentIndex >= nextItems.length) {
      setCurrentIndex(Math.max(0, nextItems.length - 1));
    }
    if (nextItems.length === 0) {
      onClose();
    }
  };

  const handleSaveCurrent = async () => {
    if (saving) return;
    setSaving(true);
    try {
      await addExpense({
        company: company.trim() || currentItem.bankName,
        description: company.trim() || currentItem.bankName,
        amount: Number(amount) || currentItem.amount,
        paid_amount: Number(amount) || currentItem.amount,
        due_date: dueDate || currentItem.due_date,
        paid_date: dueDate || currentItem.paid_date,
        payment_method: paymentMethod,
        type: category,
        status: 'paid',
        notes: `Importado via notificação do ${currentItem.bankName}`
      });

      onAdded();

      const nextItems = items.filter((_, idx) => idx !== currentIndex);
      setItems(nextItems);
      if (currentIndex >= nextItems.length) {
        setCurrentIndex(Math.max(0, nextItems.length - 1));
      }
      if (nextItems.length === 0) {
        onClose();
      }
    } catch (err) {
      console.error('Erro ao adicionar despesa via notificação:', err);
    } finally {
      setSaving(false);
    }
  };

  const getBankBadgeStyle = (bank: string) => {
    const b = bank.toLowerCase();
    if (b.includes('nu')) return 'bg-purple-600 text-white border-purple-500';
    if (b.includes('itau') || b.includes('itaú')) return 'bg-orange-600 text-white border-orange-500';
    if (b.includes('inter')) return 'bg-amber-500 text-white border-amber-400';
    if (b.includes('bradesco')) return 'bg-red-700 text-white border-red-600';
    if (b.includes('santander')) return 'bg-red-600 text-white border-red-500';
    if (b.includes('c6')) return 'bg-zinc-800 text-white border-zinc-700';
    if (b.includes('brasil')) return 'bg-yellow-500 text-blue-900 border-yellow-400';
    if (b.includes('mercado')) return 'bg-sky-500 text-white border-sky-400';
    return 'bg-primary-600 text-white border-primary-500';
  };

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 w-full max-w-lg rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        
        {/* Header */}
        <div className="px-5 py-4 border-b border-zinc-200 dark:border-zinc-800 flex items-center justify-between bg-zinc-50 dark:bg-zinc-800/50">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-500 border border-amber-500/20">
              <Bell className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-bold text-zinc-900 dark:text-zinc-100 flex items-center gap-2">
                Notificação Bancária
                {items.length > 1 && (
                  <span className="text-xs font-semibold px-2 py-0.5 rounded-full bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300">
                    {currentIndex + 1} de {items.length}
                  </span>
                )}
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Transação detectada em segundo plano
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
          {/* Card Resumo Bancário */}
          <div className="p-4 rounded-xl bg-gradient-to-br from-zinc-50 to-zinc-100 dark:from-zinc-800/40 dark:to-zinc-800/80 border border-zinc-200 dark:border-zinc-700/60 shadow-sm flex items-center justify-between">
            <div>
              <span className={`inline-block px-2.5 py-0.5 text-xs font-semibold rounded-full border mb-1.5 ${getBankBadgeStyle(currentItem.bankName)}`}>
                {currentItem.bankName}
              </span>
              <div className="text-2xl font-black text-emerald-600 dark:text-emerald-400">
                R$ {amount.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>
            <div className="text-right">
              <span className="inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded bg-zinc-200/70 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-300">
                <CreditCard className="w-3 h-3" />
                {paymentMethod}
              </span>
              <div className="text-[11px] text-zinc-400 mt-1">
                Status: Pago
              </div>
            </div>
          </div>

          {/* Form Fields */}
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1 flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5 text-zinc-400" />
                Estabelecimento / Empresa
              </label>
              <input
                type="text"
                value={company}
                onChange={(e) => setCompany(e.target.value)}
                placeholder="Nome da empresa ou pessoa"
                className="w-full px-3 py-2 text-sm rounded-lg bg-zinc-100 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1 flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5 text-zinc-400" />
                  Categoria
                </label>
                <select
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg bg-zinc-100 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  {availableTypes.map((t) => (
                    <option key={t} value={t}>
                      {t}
                    </option>
                  ))}
                  {!availableTypes.includes(category) && (
                    <option value={category}>{category}</option>
                  )}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1 flex items-center gap-1.5">
                  <CreditCard className="w-3.5 h-3.5 text-zinc-400" />
                  Pagamento
                </label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value as any)}
                  className="w-full px-3 py-2 text-sm rounded-lg bg-zinc-100 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
                >
                  <option value="PIX">PIX</option>
                  <option value="Débito">Débito</option>
                  <option value="Crédito">Crédito</option>
                  <option value="Boleto">Boleto</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1 flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-zinc-400" />
                  Data da Compra
                </label>
                <input
                  type="date"
                  value={dueDate}
                  onChange={(e) => setDueDate(e.target.value)}
                  className="w-full px-3 py-2 text-sm rounded-lg bg-zinc-100 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-600 dark:text-zinc-400 mb-1 flex items-center gap-1.5">
                  Valor (R$)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={amount}
                  onChange={(e) => setAmount(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 text-sm rounded-lg bg-zinc-100 dark:bg-zinc-800 border border-zinc-300 dark:border-zinc-700 text-zinc-900 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-primary-500"
                />
              </div>
            </div>
          </div>

          {/* Texto original da Notificação */}
          <div className="p-2.5 rounded-lg bg-zinc-100 dark:bg-zinc-800/60 border border-zinc-200 dark:border-zinc-800 text-xs text-zinc-500 dark:text-zinc-400">
            <span className="font-semibold text-zinc-700 dark:text-zinc-300 block mb-0.5">Texto original capturado:</span>
            <span className="italic">"{currentItem.rawText}"</span>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-zinc-200 dark:border-zinc-800 bg-zinc-50 dark:bg-zinc-800/40 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={handleDiscard}
            className="px-4 py-2 text-xs font-medium text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-xl transition-colors flex items-center gap-1.5"
          >
            <Trash2 className="w-3.5 h-3.5" />
            Descartar
          </button>

          <div className="flex items-center gap-2">
            {items.length > 1 && (
              <button
                type="button"
                onClick={() => setCurrentIndex((currentIndex + 1) % items.length)}
                className="px-3 py-2 text-xs font-medium text-zinc-600 dark:text-zinc-300 hover:bg-zinc-200 dark:hover:bg-zinc-700 rounded-xl transition-colors flex items-center gap-1"
              >
                Próxima
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            )}

            <button
              type="button"
              disabled={saving}
              onClick={handleSaveCurrent}
              className="px-5 py-2.5 text-xs font-semibold text-white bg-primary-600 hover:bg-primary-500 active:scale-95 disabled:opacity-50 rounded-xl shadow-md shadow-primary-500/20 transition-all flex items-center gap-1.5"
            >
              <Check className="w-4 h-4" />
              {saving ? 'Salvando...' : 'Adicionar Despesa'}
            </button>
          </div>
        </div>

      </div>
    </div>,
    document.body
  );
};
