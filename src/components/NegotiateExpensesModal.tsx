import React, { useState, useMemo, useEffect } from 'react';
import { 
  X, 
  Handshake, 
  Search, 
  Calculator, 
  Flame, 
  CheckCircle2, 
  AlertTriangle, 
  Check 
} from 'lucide-react';
import { 
  type ExpenseRecord, 
  DEFAULT_PAYMENT_METHODS, 
  negotiateExpenses 
} from '../services/supabase';
import { CategoryIcon } from './CategoryIcon';
import { DatePicker } from './DatePicker';
import { PortalDropdown } from './PortalDropdown';

interface NegotiateExpensesModalProps {
  onClose: () => void;
  onSuccess: () => void;
  expenses: ExpenseRecord[];
  types: string[];
}

export const NegotiateExpensesModal: React.FC<NegotiateExpensesModalProps> = ({
  onClose,
  onSuccess,
  expenses,
  types
}) => {
  // Filter only pending / unpaid expenses
  const openExpenses = useMemo(() => {
    return expenses.filter(exp => {
      const amount = Number(exp.amount || 0);
      const paid = Number(exp.paid_amount || 0);
      const remaining = amount - paid;
      return exp.status !== 'paid' && remaining > 0;
    }).sort((a, b) => (a.due_date || '').localeCompare(b.due_date || ''));
  }, [expenses]);

  // Selection states
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  // Negotiation parameters
  const [agreementTitle, setAgreementTitle] = useState('');
  const [installmentsCount, setInstallmentsCount] = useState<number>(3);
  const [installmentAmountInput, setInstallmentAmountInput] = useState<string>('');
  const [firstDueDate, setFirstDueDate] = useState<string>(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + 1);
    return d.toISOString().split('T')[0];
  });
  const [category, setCategory] = useState<string>('Serviços');
  const [paymentMethod, setPaymentMethod] = useState<string>('PIX');
  const [markOriginalsPaid, setMarkOriginalsPaid] = useState<boolean>(true);

  // Loading & Submitting
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Format currency helpers
  const formatBRL = (val: number) => {
    return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const parseCurrencyInput = (valStr: string): number => {
    if (!valStr) return 0;
    const digitsOnly = valStr.replace(/\D/g, '');
    if (!digitsOnly) return 0;
    return parseInt(digitsOnly, 10) / 100;
  };

  const formatCurrencyString = (valStr: string): string => {
    const digitsOnly = valStr.replace(/\D/g, '');
    if (!digitsOnly) return '';
    const num = parseInt(digitsOnly, 10) / 100;
    return num.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  // Selected expenses list & computations
  const selectedExpenses = useMemo(() => {
    const idSet = new Set(selectedIds);
    return openExpenses.filter(e => e.id && idSet.has(e.id));
  }, [openExpenses, selectedIds]);

  const totalOriginalDebt = useMemo(() => {
    return selectedExpenses.reduce((acc, curr) => {
      const remaining = Number(curr.amount || 0) - Number(curr.paid_amount || 0);
      return acc + Math.max(0, remaining);
    }, 0);
  }, [selectedExpenses]);

  // Auto-generate title when selection changes
  useEffect(() => {
    if (selectedExpenses.length > 0) {
      const companyNames = Array.from(new Set(selectedExpenses.map(e => e.company || e.description).filter(Boolean)));
      if (companyNames.length === 1) {
        setAgreementTitle(`Acordo ${companyNames[0]}`);
      } else if (companyNames.length <= 3) {
        setAgreementTitle(`Acordo ${companyNames.join(' e ')}`);
      } else {
        setAgreementTitle(`Acordo de Dívidas (${selectedExpenses.length} contas)`);
      }

      if (selectedExpenses[0]?.type) {
        setCategory(selectedExpenses[0].type);
      }
    } else {
      setAgreementTitle('');
    }
  }, [selectedIds]);

  // Calculations
  const currentInstallmentAmount = parseCurrencyInput(installmentAmountInput);
  const totalNegotiated = currentInstallmentAmount * installmentsCount;
  const difference = totalNegotiated - totalOriginalDebt;
  const hasInterest = difference > 0.01;
  const hasDiscount = difference < -0.01;
  const interestPercentage = totalOriginalDebt > 0 ? (difference / totalOriginalDebt) * 100 : 0;
  const lateFeePerInstallment = hasInterest ? difference / installmentsCount : 0;

  // Auto-calc installment without interest
  const handleAutoCalcInstallment = () => {
    if (totalOriginalDebt <= 0 || installmentsCount <= 0) return;
    const baseAmount = totalOriginalDebt / installmentsCount;
    setInstallmentAmountInput(baseAmount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' }));
  };

  // Calculate subsequent due dates
  const calculatedDueDates = useMemo(() => {
    if (!firstDueDate || installmentsCount <= 0) return [];
    const dates: string[] = [];
    const [yearStr, monthStr, dayStr] = firstDueDate.split('-');
    const baseYear = parseInt(yearStr, 10);
    const baseMonth = parseInt(monthStr, 10) - 1; // 0-indexed
    const baseDay = parseInt(dayStr, 10);

    for (let i = 0; i < installmentsCount; i++) {
      const targetMonthIndex = baseMonth + i;
      const targetYear = baseYear + Math.floor(targetMonthIndex / 12);
      const targetMonth = ((targetMonthIndex % 12) + 12) % 12;
      const maxDays = new Date(targetYear, targetMonth + 1, 0).getDate();
      const finalDay = Math.min(baseDay, maxDays);

      const mPad = String(targetMonth + 1).padStart(2, '0');
      const dPad = String(finalDay).padStart(2, '0');
      dates.push(`${targetYear}-${mPad}-${dPad}`);
    }
    return dates;
  }, [firstDueDate, installmentsCount]);

  // Selection toggle
  const toggleSelectAll = () => {
    if (selectedIds.length === filteredExpenses.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredExpenses.map(e => e.id!).filter(Boolean));
    }
  };

  const toggleSelectExpense = (id: number) => {
    setSelectedIds(prev => 
      prev.includes(id) ? prev.filter(item => item !== id) : [...prev, id]
    );
  };

  // Filtered expenses by search
  const filteredExpenses = useMemo(() => {
    if (!searchTerm.trim()) return openExpenses;
    const term = searchTerm.toLowerCase();
    return openExpenses.filter(e => 
      (e.company && e.company.toLowerCase().includes(term)) ||
      (e.description && e.description.toLowerCase().includes(term)) ||
      (e.type && e.type.toLowerCase().includes(term))
    );
  }, [openExpenses, searchTerm]);

  // Handle submit negotiation
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (selectedExpenses.length === 0) {
      setErrorMessage('Selecione ao menos uma despesa para renegociar.');
      return;
    }

    if (installmentsCount < 1 || installmentsCount > 60) {
      setErrorMessage('O número de parcelas deve estar entre 1 e 60.');
      return;
    }

    if (currentInstallmentAmount <= 0) {
      setErrorMessage('Informe um valor válido para a parcela.');
      return;
    }

    if (!agreementTitle.trim()) {
      setErrorMessage('Dê um nome para identificar este acordo.');
      return;
    }

    setSubmitting(true);
    try {
      await negotiateExpenses({
        selectedExpenses,
        agreementTitle: agreementTitle.trim(),
        installmentsCount,
        installmentAmount: currentInstallmentAmount,
        dueDates: calculatedDueDates,
        category: category || 'Outros',
        paymentMethod: paymentMethod || 'PIX',
        totalOriginal: totalOriginalDebt,
        totalNegotiated: totalNegotiated,
        interestTotal: hasInterest ? difference : 0,
        markOriginalsPaid: markOriginalsPaid
      });

      onSuccess();
    } catch (err: any) {
      console.error('Erro ao salvar renegociação:', err);
      setErrorMessage(err.message || 'Ocorreu um erro ao processar o acordo. Tente novamente.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/70 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="bg-white dark:bg-[#242424] text-zinc-900 dark:text-white w-full max-w-4xl rounded-2xl shadow-2xl border border-black/10 dark:border-white/10 flex flex-col max-h-[92vh] overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-zinc-200 dark:border-white/10 flex items-center justify-between shrink-0 bg-zinc-50/80 dark:bg-[#2e2e2e]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-[#3584e4]/10 dark:bg-[#3584e4]/20 text-[#3584e4] flex items-center justify-center shrink-0">
              <Handshake size={22} strokeWidth={2.2} />
            </div>
            <div>
              <h2 className="text-lg font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                Renegociação de Despesas
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded-full bg-[#3584e4]/15 text-[#3584e4] border border-[#3584e4]/30">
                  Acordo & Parcelamento
                </span>
              </h2>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
                Reúna contas em aberto, parcele com novos valores e apure automaticamente juros ou descontos.
              </p>
            </div>
          </div>
          <button 
            type="button" 
            onClick={onClose}
            className="p-1.5 text-zinc-400 hover:text-zinc-700 dark:hover:text-zinc-200 rounded-lg hover:bg-black/5 dark:hover:bg-white/10 transition-colors cursor-pointer"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto flex flex-col">
          <div className="grid grid-cols-1 lg:grid-cols-12 flex-1 min-h-0 divide-y lg:divide-y-0 lg:divide-x divide-zinc-200 dark:divide-white/10">
            
            {/* LEFT COLUMN: Open Expenses Selection */}
            <div className="lg:col-span-6 p-4 sm:p-5 flex flex-col overflow-hidden">
              <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
                    1. Escolha as contas a renegociar
                  </span>
                  <span className="text-xs px-2 py-0.5 rounded-full font-bold bg-zinc-200/70 dark:bg-white/10 text-zinc-700 dark:text-zinc-300">
                    {selectedIds.length} de {openExpenses.length}
                  </span>
                </div>
                {openExpenses.length > 0 && (
                  <button
                    type="button"
                    onClick={toggleSelectAll}
                    className="text-xs text-[#3584e4] hover:underline font-semibold cursor-pointer"
                  >
                    {selectedIds.length === filteredExpenses.length ? 'Desmarcar todas' : 'Selecionar todas'}
                  </button>
                )}
              </div>

              {/* Search Bar */}
              <div className="relative mb-3">
                <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400 dark:text-zinc-500" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Buscar conta ou fornecedor..."
                  className="w-full pl-9 pr-3 py-2 text-xs bg-zinc-100 dark:bg-[#1e1e1e] border border-zinc-200 dark:border-white/10 rounded-xl text-zinc-900 dark:text-white placeholder-zinc-400 dark:placeholder-zinc-500 focus:outline-hidden focus:ring-2 focus:ring-[#3584e4]/30"
                />
              </div>

              {/* Expenses List */}
              <div className="flex-1 overflow-y-auto space-y-2 pr-1 min-h-[220px] max-h-[360px]">
                {openExpenses.length === 0 ? (
                  <div className="h-full flex flex-col items-center justify-center p-6 text-center text-zinc-400">
                    <CheckCircle2 size={36} className="text-emerald-500/60 mb-2" />
                    <p className="text-xs font-semibold text-zinc-700 dark:text-zinc-200">Nenhuma conta em aberto</p>
                    <p className="text-[11px] text-zinc-400 mt-0.5">Todas as suas despesas estão em dia ou quitadas!</p>
                  </div>
                ) : filteredExpenses.length === 0 ? (
                  <div className="p-6 text-center text-zinc-400 text-xs">
                    Nenhuma despesa encontrada com o filtro informado.
                  </div>
                ) : (
                  filteredExpenses.map((exp) => {
                    const id = exp.id!;
                    const isSelected = selectedIds.includes(id);
                    const remaining = Math.max(0, Number(exp.amount || 0) - Number(exp.paid_amount || 0));
                    const isOverdue = exp.due_date && exp.due_date.split('T')[0] < new Date().toISOString().split('T')[0];

                    return (
                      <div
                        key={id}
                        onClick={() => toggleSelectExpense(id)}
                        className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center gap-3 select-none ${
                          isSelected
                            ? 'bg-[#3584e4]/15 dark:bg-[#3584e4]/20 border-[#3584e4]/60 ring-1 ring-[#3584e4]/40'
                            : 'bg-zinc-50 dark:bg-[#1e1e1e] border-zinc-200 dark:border-white/10 hover:border-zinc-300 dark:hover:border-white/20'
                        }`}
                      >
                        {/* Checkbox */}
                        <div className={`w-4 h-4 rounded-md border flex items-center justify-center shrink-0 transition-colors ${
                          isSelected 
                            ? 'bg-[#3584e4] border-[#3584e4] text-white' 
                            : 'border-zinc-300 dark:border-zinc-600 bg-white dark:bg-[#2e2e2e]'
                        }`}>
                          {isSelected && <Check size={11} strokeWidth={3} />}
                        </div>

                        {/* Category Icon */}
                        <CategoryIcon type={exp.type} size={15} />

                        {/* Details */}
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                              {exp.company || exp.description || 'Despesa'}
                            </span>
                            {isOverdue && (
                              <span className="text-[10px] px-1.5 py-0.2 rounded-sm font-semibold bg-rose-500/15 text-rose-600 dark:text-rose-400">
                                Atrasada
                              </span>
                            )}
                          </div>
                          <div className="flex items-center gap-2 text-[11px] text-zinc-400 mt-0.5">
                            <span>Venc: {exp.due_date ? exp.due_date.split('T')[0].split('-').reverse().join('/') : '-'}</span>
                            <span>•</span>
                            <span className="text-zinc-500 dark:text-zinc-400">{exp.type}</span>
                          </div>
                        </div>

                        {/* Amount */}
                        <div className="text-right shrink-0">
                          <span className="text-xs font-bold text-zinc-900 dark:text-zinc-100 block">
                            {formatBRL(remaining)}
                          </span>
                          {Number(exp.paid_amount || 0) > 0 && (
                            <span className="text-[10px] text-zinc-400">
                              de {formatBRL(Number(exp.amount))}
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Selection Summary Footer */}
              <div className="mt-3 pt-3 border-t border-zinc-200 dark:border-white/10 flex items-center justify-between bg-zinc-100 dark:bg-[#1e1e1e] p-3 rounded-xl border border-transparent dark:border-white/5">
                <div>
                  <span className="text-[10px] uppercase tracking-wider font-bold text-zinc-500 dark:text-zinc-400 block">
                    Dívida Original Total
                  </span>
                  <span className="text-xs text-zinc-600 dark:text-zinc-400">
                    {selectedExpenses.length} {selectedExpenses.length === 1 ? 'conta selecionada' : 'contas selecionadas'}
                  </span>
                </div>
                <div className="text-right">
                  <span className="text-base font-bold text-zinc-900 dark:text-white">
                    {formatBRL(totalOriginalDebt)}
                  </span>
                </div>
              </div>
            </div>

            {/* RIGHT COLUMN: Negotiation Parameters */}
            <div className="lg:col-span-6 p-4 sm:p-5 flex flex-col space-y-4">
              <span className="text-xs font-bold uppercase tracking-wider text-zinc-700 dark:text-zinc-300">
                2. Condições do Parcelamento
              </span>

              {/* Title & Category */}
              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                    Nome do Acordo / Empresa
                  </label>
                  <input
                    type="text"
                    required
                    value={agreementTitle}
                    onChange={(e) => setAgreementTitle(e.target.value)}
                    placeholder="Ex: Acordo Copel e Sanepar"
                    className="w-full px-3 py-2 text-xs bg-zinc-50 dark:bg-[#1e1e1e] border border-zinc-300 dark:border-white/10 rounded-xl text-zinc-900 dark:text-white focus:outline-hidden focus:ring-2 focus:ring-[#3584e4]/30"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {/* Category dropdown */}
                  <div>
                    <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                      Categoria
                    </label>
                    <PortalDropdown
                      value={category}
                      options={types.map((t) => ({
                        value: t,
                        label: t,
                        icon: <CategoryIcon type={t} size={14} />
                      }))}
                      onChange={setCategory}
                      buttonClassName="w-full px-3 py-2 text-xs bg-zinc-50 dark:bg-[#1e1e1e] border border-zinc-300 dark:border-white/10 rounded-xl text-zinc-900 dark:text-white flex items-center justify-between cursor-pointer"
                    />
                  </div>

                  {/* Payment Method Selector */}
                  <div>
                    <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                      Forma de Pagamento
                    </label>
                    <div className="grid grid-cols-2 gap-1.5">
                      {DEFAULT_PAYMENT_METHODS.map((method) => (
                        <button
                          key={method}
                          type="button"
                          onClick={() => setPaymentMethod(method)}
                          className={`py-1.5 px-2 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center justify-center gap-1 ${
                            paymentMethod === method
                              ? 'bg-[#3584e4] text-white shadow-xs'
                              : 'bg-zinc-50 dark:bg-[#1e1e1e] border border-zinc-200 dark:border-white/10 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-white/5'
                          }`}
                        >
                          {paymentMethod === method && <Check size={11} strokeWidth={3} />}
                          <span>{method}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              {/* Installments & Value Box */}
              <div className="bg-zinc-100/70 dark:bg-[#1e1e1e] p-3.5 rounded-xl border border-zinc-200 dark:border-white/10 space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  {/* Number of Installments */}
                  <div>
                    <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                      Nº de Parcelas
                    </label>
                    <PortalDropdown
                      value={String(installmentsCount)}
                      options={[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 12, 18, 24, 36, 48].map((n) => ({
                        value: String(n),
                        label: `${n}x ${n === 1 ? '(à vista)' : ''}`
                      }))}
                      onChange={(val) => setInstallmentsCount(Number(val))}
                      buttonClassName="w-full px-3 py-2 text-xs bg-white dark:bg-[#282828] border border-zinc-300 dark:border-white/10 rounded-xl text-zinc-900 dark:text-white font-bold flex items-center justify-between cursor-pointer focus:outline-hidden focus:ring-2 focus:ring-[#3584e4]/30"
                    />
                  </div>

                  {/* Installment Amount */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                        Valor da Parcela
                      </label>
                      {totalOriginalDebt > 0 && (
                        <button
                          type="button"
                          onClick={handleAutoCalcInstallment}
                          title="Preencher com o valor original dividido pelo número de parcelas"
                          className="text-[10px] text-[#3584e4] hover:underline flex items-center gap-0.5 cursor-pointer"
                        >
                          <Calculator size={10} />
                          Sem juros
                        </button>
                      )}
                    </div>
                    <input
                      type="text"
                      required
                      value={installmentAmountInput}
                      onChange={(e) => setInstallmentAmountInput(formatCurrencyString(e.target.value))}
                      placeholder="R$ 0,00"
                      className="w-full px-3 py-2 text-xs bg-white dark:bg-[#282828] border border-zinc-300 dark:border-white/10 rounded-xl text-zinc-900 dark:text-white font-bold text-right focus:outline-hidden focus:ring-2 focus:ring-[#3584e4]/30"
                    />
                  </div>
                </div>

                {/* 1st Due Date */}
                <div>
                  <label className="block text-xs font-semibold text-zinc-700 dark:text-zinc-300 mb-1">
                    Vencimento da 1ª Parcela
                  </label>
                  <DatePicker
                    value={firstDueDate}
                    onChange={(d) => setFirstDueDate(d)}
                    placeholder="Selecione o vencimento inicial"
                  />
                </div>
              </div>

              {/* Dynamic Interest & Penalty Calculation Card */}
              {selectedExpenses.length > 0 && currentInstallmentAmount > 0 && (
                <div className={`p-3.5 rounded-xl border transition-all ${
                  hasInterest
                    ? 'bg-rose-500/10 dark:bg-rose-500/15 border-rose-500/30 text-rose-950 dark:text-rose-100'
                    : hasDiscount
                    ? 'bg-emerald-500/10 dark:bg-emerald-500/15 border-emerald-500/30 text-emerald-950 dark:text-emerald-100'
                    : 'bg-zinc-100 dark:bg-[#1e1e1e] border-zinc-200 dark:border-white/10 text-zinc-800 dark:text-zinc-200'
                }`}>
                  <div className="flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      {hasInterest ? (
                        <div className="w-7 h-7 rounded-lg bg-rose-500/20 text-rose-600 dark:text-rose-400 flex items-center justify-center shrink-0">
                          <Flame size={16} />
                        </div>
                      ) : hasDiscount ? (
                        <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
                          <CheckCircle2 size={16} />
                        </div>
                      ) : (
                        <div className="w-7 h-7 rounded-lg bg-zinc-300/40 dark:bg-white/10 text-zinc-600 dark:text-zinc-300 flex items-center justify-center shrink-0">
                          <Check size={16} />
                        </div>
                      )}

                      <div>
                        <span className="text-xs font-bold block">
                          {hasInterest
                            ? `Acréscimo de ${formatBRL(difference)} (+${interestPercentage.toFixed(1)}%)`
                            : hasDiscount
                            ? `Desconto de ${formatBRL(Math.abs(difference))} (${interestPercentage.toFixed(1)}%)`
                            : 'Acordo sem acréscimo de juros'}
                        </span>
                        <span className="text-[11px] opacity-80 block">
                          {hasInterest
                            ? `Valor colocado em Juros/Multa: ${formatBRL(lateFeePerInstallment)} por parcela`
                            : hasDiscount
                            ? 'Economia obtida sobre a dívida original'
                            : 'Valor final igual à soma original das contas'}
                        </span>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span className="text-[10px] uppercase font-bold opacity-70 block">Total do Acordo</span>
                      <span className="text-sm font-bold">{formatBRL(totalNegotiated)}</span>
                    </div>
                  </div>

                  {/* Installments preview pills */}
                  {calculatedDueDates.length > 0 && (
                    <div className="mt-2.5 pt-2 border-t border-black/10 dark:border-white/10 flex items-center gap-1.5 overflow-x-auto text-[10px] pb-0.5">
                      <span className="font-semibold shrink-0">Parcelas:</span>
                      {calculatedDueDates.slice(0, 4).map((date, idx) => (
                        <span key={idx} className="px-2 py-0.5 rounded-md bg-black/5 dark:bg-white/10 shrink-0 font-medium">
                          {idx + 1}ª: {date.split('-').reverse().slice(0, 2).join('/')} ({formatBRL(currentInstallmentAmount)})
                        </span>
                      ))}
                      {calculatedDueDates.length > 4 && (
                        <span className="text-zinc-400 text-[10px] shrink-0 font-medium">
                          +{calculatedDueDates.length - 4} parcelas...
                        </span>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Settlement Checkbox */}
              <div className="pt-1">
                <label className="flex items-start gap-2 text-xs text-zinc-600 dark:text-zinc-300 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    checked={markOriginalsPaid}
                    onChange={(e) => setMarkOriginalsPaid(e.target.checked)}
                    className="mt-0.5 rounded-sm border-zinc-300 dark:border-zinc-700 text-[#3584e4] focus:ring-[#3584e4]"
                  />
                  <span>
                    Baixar e marcar as contas originais selecionadas como <strong className="text-zinc-800 dark:text-white font-semibold">Quitadas via Acordo</strong> (evita duplicidade de cobrança no sistema).
                  </span>
                </label>
              </div>

              {/* Error Message */}
              {errorMessage && (
                <div className="p-2.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400 text-xs flex items-center gap-2">
                  <AlertTriangle size={14} className="shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}
            </div>
          </div>

          {/* Modal Footer */}
          <div className="px-5 py-3.5 border-t border-zinc-200 dark:border-white/10 flex items-center justify-between shrink-0 bg-zinc-50/80 dark:bg-[#2e2e2e]">
            <div className="text-xs text-zinc-500 dark:text-zinc-400 hidden sm:block">
              {selectedExpenses.length > 0 ? (
                <span>
                  Renegociando <strong>{selectedExpenses.length}</strong> conta(s) em <strong>{installmentsCount}x</strong> de <strong>{formatBRL(currentInstallmentAmount)}</strong>
                </span>
              ) : (
                <span>Nenhuma conta selecionada</span>
              )}
            </div>

            <div className="flex items-center gap-2 ml-auto">
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                className="adw-btn px-4 py-2 text-xs cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={submitting || selectedExpenses.length === 0 || currentInstallmentAmount <= 0}
                className="adw-btn suggested-action px-5 py-2 text-xs flex items-center gap-2 font-bold cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submitting ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Processando Acordo...</span>
                  </>
                ) : (
                  <>
                    <Handshake size={15} strokeWidth={2.4} />
                    <span>Confirmar Renegociação</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
