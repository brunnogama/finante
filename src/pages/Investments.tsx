import React, { useState, useEffect, useMemo, useRef } from 'react';
import { 
  TrendingUp, 
  Plus, 
  Search, 
  PieChart as PieChartIcon, 
  Wallet, 
  ArrowUpRight, 
  Edit3, 
  Trash2, 
  X, 
  Check, 
  ChevronDown, 
  Layers, 
  Sparkles,
  AlertCircle
} from 'lucide-react';
import { 
  ResponsiveContainer, 
  PieChart, 
  Pie, 
  Cell, 
  Tooltip as RechartsTooltip, 
  Legend, 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid 
} from 'recharts';
import { format, isSameMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { 
  getInvestments, 
  addInvestment, 
  updateInvestment, 
  deleteInvestment, 
  supabase, 
  type InvestmentRecord 
} from '../services/supabase';
import { DatePicker } from '../components/DatePicker';

const INVESTMENT_CATEGORIES = [
  'Ações',
  'Criptomoedas',
  'Fundos Imobiliários',
  'Internacional',
  'Outros',
  'Renda Fixa'
];

const CATEGORY_COLORS: Record<string, string> = {
  'Renda Fixa': '#30D158',
  'Ações': '#0A84FF',
  'Fundos Imobiliários': '#FF9F0A',
  'Criptomoedas': '#BF5AF2',
  'Internacional': '#5E5CE6',
  'Outros': '#64D2FF'
};

const extractMonth = (dateStr?: string): string => {
  if (!dateStr) return '';
  if (dateStr.includes('-')) {
    const parts = dateStr.split('-');
    if (parts.length >= 2) {
      return `${parts[0]}-${parts[1].padStart(2, '0')}`;
    }
  }
  const d = new Date(dateStr);
  if (!isNaN(d.getTime())) {
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  }
  return '';
};

export const Investments: React.FC = () => {
  const [investments, setInvestments] = useState<InvestmentRecord[]>([]);
  const [loading, setLoading] = useState(true);

  // Search & Filter
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // Modal States
  const [isFormModalOpen, setIsFormModalOpen] = useState(false);
  const [deleteConfirmId, setDeleteConfirmId] = useState<number | null>(null);

  // Form Fields
  const [editingId, setEditingId] = useState<number | null>(null);
  const [asset, setAsset] = useState('');
  const [category, setCategory] = useState('Renda Fixa');
  const [amountInput, setAmountInput] = useState('');
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [notes, setNotes] = useState('');
  const [isCategoryDropdownOpen, setIsCategoryDropdownOpen] = useState(false);
  const categoryDropdownRef = useRef<HTMLDivElement>(null);

  // Close category dropdown on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (categoryDropdownRef.current && !categoryDropdownRef.current.contains(event.target as Node)) {
        setIsCategoryDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Realtime subscription
  useEffect(() => {
    fetchInvestmentsData();

    const channel = supabase
      .channel('schema-db-changes-investments')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'investments' }, () => {
        fetchInvestmentsData();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchInvestmentsData = async () => {
    setLoading(true);
    const data = await getInvestments();
    setInvestments(data);
    setLoading(false);
  };

  // Currency helpers
  const formatCurrency = (val: number) => {
    return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  };

  const parseCurrencyInput = (val: string): number => {
    const cleaned = val.replace(/\D/g, '');
    if (!cleaned) return 0;
    return parseInt(cleaned, 10) / 100;
  };

  const handleAmountInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const rawValue = e.target.value.replace(/\D/g, '');
    if (!rawValue) {
      setAmountInput('');
      return;
    }
    const num = parseInt(rawValue, 10) / 100;
    setAmountInput(num.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
  };

  // Filtered investments
  const filteredInvestments = useMemo(() => {
    return investments.filter(item => {
      const matchSearch = searchTerm === '' || 
        item.asset.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (item.notes && item.notes.toLowerCase().includes(searchTerm.toLowerCase()));
      const matchCat = selectedCategory === 'all' || item.category === selectedCategory;
      return matchSearch && matchCat;
    });
  }, [investments, searchTerm, selectedCategory]);

  // Statistics
  const stats = useMemo(() => {
    const totalInvested = investments.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
    
    const now = new Date();
    const currentMonthInvestments = investments.filter(item => {
      if (!item.date) return false;
      const d = new Date(item.date + 'T00:00:00');
      return !isNaN(d.getTime()) && isSameMonth(d, now);
    });
    const thisMonthTotal = currentMonthInvestments.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);

    const uniqueAssets = new Set(investments.map(i => i.asset.toLowerCase().trim())).size;

    // Categories breakdown
    const categoryTotals: Record<string, number> = {};
    investments.forEach(item => {
      const cat = item.category || 'Outros';
      categoryTotals[cat] = (categoryTotals[cat] || 0) + (Number(item.amount) || 0);
    });

    let topCategory = 'Nenhuma';
    let topCategoryAmount = 0;
    Object.entries(categoryTotals).forEach(([cat, amt]) => {
      if (amt > topCategoryAmount) {
        topCategoryAmount = amt;
        topCategory = cat;
      }
    });

    const topCategoryPercent = totalInvested > 0 ? ((topCategoryAmount / totalInvested) * 100).toFixed(0) : '0';

    return {
      totalInvested,
      thisMonthTotal,
      thisMonthCount: currentMonthInvestments.length,
      uniqueAssets,
      topCategory,
      topCategoryPercent,
      categoryTotals
    };
  }, [investments]);

  // Donut chart data
  const categoryPieData = useMemo(() => {
    return Object.entries(stats.categoryTotals).map(([name, value]) => ({
      name,
      value
    })).filter(item => item.value > 0);
  }, [stats.categoryTotals]);

  // Bar chart monthly history (last 6 months up to current month)
  const monthlyHistoryData = useMemo(() => {
    const now = new Date();
    const months = [];

    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const year = d.getFullYear();
      const monthNum = String(d.getMonth() + 1).padStart(2, '0');
      const monthKey = `${year}-${monthNum}`;

      const rawMonth = d.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '');
      const monthLabel = rawMonth.charAt(0).toUpperCase() + rawMonth.slice(1);
      const displayName = year !== now.getFullYear() ? `${monthLabel}/${year.toString().slice(-2)}` : monthLabel;

      const monthItems = investments.filter(item => extractMonth(item.date) === monthKey);
      const total = monthItems.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);

      months.push({
        name: displayName,
        monthKey,
        Aportes: total,
      });
    }

    return months;
  }, [investments]);

  // Modal Handlers
  const handleOpenAddModal = () => {
    setEditingId(null);
    setAsset('');
    setCategory('Renda Fixa');
    setAmountInput('');
    setDate(new Date().toISOString().split('T')[0]);
    setNotes('');
    setIsFormModalOpen(true);
  };

  const handleOpenEditModal = (item: InvestmentRecord) => {
    setEditingId(item.id || null);
    setAsset(item.asset);
    setCategory(item.category);
    setAmountInput(Number(item.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 }));
    setDate(item.date);
    setNotes(item.notes || '');
    setIsFormModalOpen(true);
  };

  const handleSaveInvestment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!asset.trim()) {
      alert('Informe o nome do ativo.');
      return;
    }
    const amount = parseCurrencyInput(amountInput);
    if (amount <= 0) {
      alert('Informe um valor válido para o aporte.');
      return;
    }
    if (!date) {
      alert('Informe a data do aporte.');
      return;
    }

    if (editingId) {
      await updateInvestment(editingId, {
        asset: asset.trim(),
        category,
        amount,
        date,
        notes: notes.trim() || undefined
      });
    } else {
      await addInvestment({
        asset: asset.trim(),
        category,
        amount,
        date,
        notes: notes.trim() || undefined
      });
    }

    setIsFormModalOpen(false);
    fetchInvestmentsData();
  };

  const handleDelete = async (id: number) => {
    await deleteInvestment(id);
    setDeleteConfirmId(null);
    fetchInvestmentsData();
  };

  return (
    <div className="p-4 md:p-8 max-w-7xl mx-auto space-y-6 animate-fadeIn pb-24 md:pb-8">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-zinc-900 dark:text-white flex items-center gap-2.5">
            <span className="w-9 h-9 rounded-2xl bg-indigo-500/10 dark:bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <TrendingUp size={20} strokeWidth={2.3} />
            </span>
            Investimentos
          </h1>
          <p className="text-sm text-zinc-500 dark:text-zinc-400 mt-1">
            Acompanhamento de aportes, patrimônio e alocação de carteira
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenAddModal}
          className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm shadow-md shadow-emerald-600/20 active:scale-95 transition-all cursor-pointer"
        >
          <Plus size={18} strokeWidth={2.5} />
          <span>Novo Aporte</span>
        </button>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3.5 sm:gap-4">
        
        {/* Card 1: Patrimônio Investido */}
        <div className="bg-white dark:bg-zinc-900/60 backdrop-blur-md rounded-2xl p-4 sm:p-5 border border-zinc-200/70 dark:border-white/10 shadow-xs relative overflow-hidden min-w-0">
          <div className="flex items-center justify-between mb-2 min-w-0">
            <span className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 truncate">
              Patrimônio Investido
            </span>
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 dark:bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <Wallet size={17} strokeWidth={2.5} />
            </div>
          </div>
          <div className="text-xl sm:text-2xl xl:text-3xl font-bold text-emerald-600 dark:text-emerald-400 tracking-tight truncate min-w-0" title={formatCurrency(stats.totalInvested)}>
            {formatCurrency(stats.totalInvested)}
          </div>
          <div className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-1 truncate">
            {investments.length === 1 ? '1 aporte realizado' : `${investments.length} aportes realizados`}
          </div>
        </div>

        {/* Card 2: Aportes no Mês Atual */}
        <div className="bg-white dark:bg-zinc-900/60 backdrop-blur-md rounded-2xl p-4 sm:p-5 border border-zinc-200/70 dark:border-white/10 shadow-xs relative overflow-hidden min-w-0">
          <div className="flex items-center justify-between mb-2 min-w-0">
            <span className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 truncate">
              Aportes este Mês
            </span>
            <div className="w-8 h-8 rounded-xl bg-blue-500/10 dark:bg-blue-500/20 text-blue-600 dark:text-blue-400 flex items-center justify-center shrink-0">
              <ArrowUpRight size={17} strokeWidth={2.5} />
            </div>
          </div>
          <div className="text-xl sm:text-2xl xl:text-3xl font-bold text-zinc-900 dark:text-white tracking-tight truncate min-w-0" title={formatCurrency(stats.thisMonthTotal)}>
            {formatCurrency(stats.thisMonthTotal)}
          </div>
          <div className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-1 truncate">
            {stats.thisMonthCount === 1 ? '1 aporte este mês' : `${stats.thisMonthCount} aportes este mês`}
          </div>
        </div>

        {/* Card 3: Ativos Cadastrados */}
        <div className="bg-white dark:bg-zinc-900/60 backdrop-blur-md rounded-2xl p-4 sm:p-5 border border-zinc-200/70 dark:border-white/10 shadow-xs relative overflow-hidden min-w-0">
          <div className="flex items-center justify-between mb-2 min-w-0">
            <span className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 truncate">
              Posições / Ativos
            </span>
            <div className="w-8 h-8 rounded-xl bg-purple-500/10 dark:bg-purple-500/20 text-purple-600 dark:text-purple-400 flex items-center justify-center shrink-0">
              <Layers size={17} strokeWidth={2.5} />
            </div>
          </div>
          <div className="text-xl sm:text-2xl xl:text-3xl font-bold text-zinc-900 dark:text-white tracking-tight truncate min-w-0">
            {stats.uniqueAssets} <span className="text-sm font-normal text-zinc-400">ativos</span>
          </div>
          <div className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-1 truncate">
            {Object.keys(stats.categoryTotals).length} classes de ativos
          </div>
        </div>

        {/* Card 4: Maior Categoria */}
        <div className="bg-white dark:bg-zinc-900/60 backdrop-blur-md rounded-2xl p-4 sm:p-5 border border-zinc-200/70 dark:border-white/10 shadow-xs relative overflow-hidden min-w-0">
          <div className="flex items-center justify-between mb-2 min-w-0">
            <span className="text-[11px] sm:text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 truncate">
              Maior Alocação
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-500/10 dark:bg-amber-500/20 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
              <Sparkles size={17} strokeWidth={2.5} />
            </div>
          </div>
          <div className="text-xl sm:text-2xl xl:text-3xl font-bold text-zinc-900 dark:text-white tracking-tight truncate min-w-0" title={stats.topCategory}>
            {stats.topCategory}
          </div>
          <div className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-1 truncate">
            {stats.topCategory !== 'Nenhuma' ? `${stats.topCategoryPercent}% da carteira` : 'Sem alocações'}
          </div>
        </div>

      </div>

      {/* Charts Row (2 Columns) */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-5 sm:gap-6">
        
        {/* Alocação por Categoria (Donut) */}
        <div className="bg-white dark:bg-zinc-900/60 backdrop-blur-md rounded-3xl p-5 md:p-6 border border-zinc-200/70 dark:border-white/10 shadow-xl flex flex-col justify-start min-h-[340px]">
          <h3 className="text-base font-bold text-zinc-900 dark:text-white mb-4 tracking-tight flex items-center gap-2">
            <PieChartIcon size={18} className="text-indigo-500" />
            Alocação por Categoria
          </h3>
          
          <div className="flex-1 min-h-[260px] relative">
            {categoryPieData.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full opacity-40 text-zinc-500 dark:text-zinc-400">
                <PieChartIcon size={40} strokeWidth={1.5} className="mb-2" />
                <p className="text-sm font-semibold">Nenhum investimento cadastrado</p>
              </div>
            ) : (
              <div className="w-full h-full absolute inset-0 pb-4">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryPieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={65}
                      outerRadius={90}
                      paddingAngle={4}
                      dataKey="value"
                      stroke="none"
                    >
                      {categoryPieData.map((entry) => (
                        <Cell 
                          key={`cell-${entry.name}`} 
                          fill={CATEGORY_COLORS[entry.name] || '#30D158'} 
                        />
                      ))}
                    </Pie>
                    <RechartsTooltip 
                      formatter={(value: any) => [
                        `R$ ${Number(value).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
                        'Total'
                      ]}
                      contentStyle={{ 
                        borderRadius: '16px', 
                        border: '1px solid rgba(161, 161, 170, 0.2)', 
                        boxShadow: '0 8px 30px rgba(0, 0, 0, 0.12)', 
                        backgroundColor: 'rgba(24, 24, 27, 0.9)',
                        backdropFilter: 'blur(16px)',
                        WebkitBackdropFilter: 'blur(16px)',
                        padding: '12px 16px',
                        fontWeight: 600,
                        color: '#ffffff',
                      }}
                    />
                    <Legend 
                      verticalAlign="bottom" 
                      height={36} 
                      iconType="circle" 
                      wrapperStyle={{ fontSize: '12px', fontWeight: 600, color: '#71717a' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>

        {/* Histórico Mensal de Aportes */}
        <div className="bg-white dark:bg-zinc-900/60 backdrop-blur-md rounded-3xl p-5 md:p-6 border border-zinc-200/70 dark:border-white/10 shadow-xl flex flex-col justify-start min-h-[340px]">
          <h3 className="text-base font-bold text-zinc-900 dark:text-white mb-4 tracking-tight flex items-center gap-2">
            <TrendingUp size={18} className="text-emerald-500" />
            Evolução de Aportes (Últimos 6 meses)
          </h3>

          <div className="flex-1 min-h-[260px] relative">
            <div className="w-full h-full absolute inset-0 pb-4 px-1">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={monthlyHistoryData}
                  margin={{ top: 15, right: 10, left: -15, bottom: 0 }}
                  barGap={6}
                >
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#a1a1aa" opacity={0.15} />
                  <XAxis 
                    dataKey="name" 
                    stroke="#a1a1aa" 
                    fontSize={12} 
                    fontWeight={600}
                    tickLine={false} 
                    axisLine={false} 
                    dy={10} 
                  />
                  <YAxis 
                    stroke="#a1a1aa" 
                    fontSize={12} 
                    fontWeight={600}
                    tickLine={false} 
                    axisLine={false} 
                    tickFormatter={(val) => val >= 1000 ? `${(val/1000).toFixed(0)}k` : `${val}`} 
                  />
                  <RechartsTooltip 
                    formatter={(value: any) => [
                      `R$ ${Number(value).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
                      'Aporte'
                    ]}
                    cursor={{ fill: '#a1a1aa', opacity: 0.08, radius: 8 }}
                    contentStyle={{ 
                      borderRadius: '16px', 
                      border: '1px solid rgba(161, 161, 170, 0.2)', 
                      boxShadow: '0 8px 30px rgba(0, 0, 0, 0.12)', 
                      backgroundColor: 'rgba(24, 24, 27, 0.9)',
                      backdropFilter: 'blur(16px)',
                      WebkitBackdropFilter: 'blur(16px)',
                      padding: '12px 16px',
                      fontWeight: 600,
                      color: '#ffffff',
                    }}
                  />
                  <Bar dataKey="Aportes" fill="#30D158" radius={[6, 6, 0, 0]} maxBarSize={32} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white dark:bg-zinc-900/60 backdrop-blur-md rounded-2xl p-4 border border-zinc-200/70 dark:border-white/10 shadow-xs flex flex-col sm:flex-row gap-3 items-center justify-between">
        
        {/* Search Input */}
        <div className="relative w-full sm:w-80">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            placeholder="Buscar por ativo ou anotação..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-zinc-100 dark:bg-zinc-800/80 border border-zinc-200/60 dark:border-zinc-700/60 rounded-xl text-xs sm:text-sm text-zinc-900 dark:text-white placeholder-zinc-400 outline-none focus:ring-2 focus:ring-blue-500 transition-all"
          />
        </div>

        {/* Category Filter Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0 scrollbar-none">
          <button
            type="button"
            onClick={() => setSelectedCategory('all')}
            className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
              selectedCategory === 'all'
                ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 shadow-xs'
                : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700'
            }`}
          >
            Todas
          </button>
          {INVESTMENT_CATEGORIES.map(cat => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
                selectedCategory === cat
                  ? 'bg-zinc-900 text-white dark:bg-white dark:text-zinc-900 shadow-xs'
                  : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-600 dark:text-zinc-400 hover:bg-zinc-200 dark:hover:bg-zinc-700'
              }`}
            >
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: CATEGORY_COLORS[cat] || '#888' }} />
              {cat}
            </button>
          ))}
        </div>

      </div>

      {/* Asset List / Table */}
      <div className="bg-white dark:bg-zinc-900/60 backdrop-blur-md rounded-3xl border border-zinc-200/70 dark:border-white/10 shadow-xl overflow-hidden">
        
        <div className="px-6 py-4 border-b border-zinc-100 dark:border-zinc-800 flex items-center justify-between">
          <h2 className="text-base font-bold text-zinc-900 dark:text-white">
            Histórico de Aportes
          </h2>
          <span className="text-xs text-zinc-400">
            {filteredInvestments.length === 1 ? '1 registro' : `${filteredInvestments.length} registros`}
          </span>
        </div>

        {filteredInvestments.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-16 px-4 text-center text-zinc-400 dark:text-zinc-500">
            <TrendingUp size={48} strokeWidth={1.5} className="mb-3 opacity-40" />
            <p className="text-sm font-semibold">Nenhum aporte encontrado</p>
            <p className="text-xs mt-1 opacity-75">
              Clique no botão "+ Novo Aporte" acima para registrar seus ativos.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-zinc-100 dark:divide-zinc-800/60">
            {filteredInvestments.map((item) => (
              <div 
                key={item.id}
                className="p-4 sm:p-5 flex items-center justify-between hover:bg-zinc-50/80 dark:hover:bg-zinc-800/40 transition-colors gap-4"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div 
                    className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 border"
                    style={{ 
                      backgroundColor: `${CATEGORY_COLORS[item.category] || '#30D158'}15`,
                      borderColor: `${CATEGORY_COLORS[item.category] || '#30D158'}30`,
                      color: CATEGORY_COLORS[item.category] || '#30D158'
                    }}
                  >
                    <TrendingUp size={18} strokeWidth={2.3} />
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="font-bold text-sm sm:text-base text-zinc-900 dark:text-white truncate">
                        {item.asset}
                      </h4>
                      <span 
                        className="text-[10px] font-bold px-2 py-0.5 rounded-md shrink-0"
                        style={{
                          backgroundColor: `${CATEGORY_COLORS[item.category] || '#888'}15`,
                          color: CATEGORY_COLORS[item.category] || '#888'
                        }}
                      >
                        {item.category}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 mt-0.5 text-xs text-zinc-400 dark:text-zinc-500">
                      <span>
                        {format(new Date(item.date + 'T00:00:00'), "dd 'de' MMMM 'de' yyyy", { locale: ptBR })}
                      </span>
                      {item.notes && (
                        <>
                          <span>•</span>
                          <span className="truncate max-w-[200px] italic">{item.notes}</span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3 sm:gap-5 shrink-0">
                  <span className="text-base sm:text-lg font-bold text-emerald-600 dark:text-emerald-400 tabular-nums">
                    {formatCurrency(item.amount)}
                  </span>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() => handleOpenEditModal(item)}
                      className="p-1.5 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-500 hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors cursor-pointer"
                      title="Editar"
                    >
                      <Edit3 size={16} />
                    </button>
                    <button
                      type="button"
                      onClick={() => item.id && setDeleteConfirmId(item.id)}
                      className="p-1.5 rounded-xl hover:bg-rose-50 dark:hover:bg-rose-950/40 text-zinc-400 hover:text-rose-600 dark:hover:text-rose-400 transition-colors cursor-pointer"
                      title="Excluir"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal: Form Aporte */}
      {isFormModalOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 max-w-md w-full shadow-2xl animate-[scaleIn_0.15s_ease]">
            
            <div className="flex items-center justify-between mb-5">
              <h3 className="text-lg font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                <TrendingUp size={20} className="text-indigo-500" />
                {editingId ? 'Editar Aporte' : 'Novo Aporte'}
              </h3>
              <button
                type="button"
                onClick={() => setIsFormModalOpen(false)}
                className="p-1.5 rounded-xl hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-600 transition-colors cursor-pointer"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveInvestment} className="space-y-4">
              {/* Ativo */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1.5">
                  Ativo / Descrição
                </label>
                <input
                  type="text"
                  placeholder="ex: Tesouro Selic 2029, AAPL34, BTC, MXRF11"
                  value={asset}
                  onChange={(e) => setAsset(e.target.value)}
                  className="w-full px-4 py-2.5 bg-zinc-100 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm font-semibold text-zinc-900 dark:text-white placeholder-zinc-400 outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>

              {/* Categoria Dropdown */}
              <div className="relative" ref={categoryDropdownRef}>
                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1.5">
                  Classe de Ativo
                </label>
                <button
                  type="button"
                  onClick={() => setIsCategoryDropdownOpen(!isCategoryDropdownOpen)}
                  className="w-full bg-zinc-100 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 rounded-xl px-4 py-2.5 text-sm font-semibold text-zinc-900 dark:text-zinc-100 outline-none flex items-center justify-between cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: CATEGORY_COLORS[category] || '#888' }} />
                    <span>{category}</span>
                  </div>
                  <ChevronDown size={16} className={`text-zinc-400 transition-transform duration-200 ${isCategoryDropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {isCategoryDropdownOpen && (
                  <div className="absolute left-0 right-0 mt-1 bg-white dark:bg-[#18181b] border border-zinc-200 dark:border-zinc-700 rounded-2xl p-1.5 shadow-2xl z-50 animate-[scaleIn_0.12s_ease]">
                    {INVESTMENT_CATEGORIES.map(c => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => {
                          setCategory(c);
                          setIsCategoryDropdownOpen(false);
                        }}
                        className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-between transition-colors ${
                          category === c 
                            ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white font-bold' 
                            : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full" style={{ backgroundColor: CATEGORY_COLORS[c] || '#888' }} />
                          <span>{c}</span>
                        </div>
                        {category === c && <Check size={14} className="text-blue-500" />}
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Valor & Data */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1.5">
                    Valor (R$)
                  </label>
                  <div className="relative">
                    <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-zinc-400">
                      R$
                    </span>
                    <input
                      type="text"
                      placeholder="0,00"
                      value={amountInput}
                      onChange={handleAmountInputChange}
                      className="w-full pl-9 pr-4 py-2.5 bg-zinc-100 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 rounded-xl text-sm font-bold text-zinc-900 dark:text-white placeholder-zinc-400 outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1.5">
                    Data do Aporte
                  </label>
                  <DatePicker
                    value={date}
                    onChange={(d) => setDate(d)}
                    required
                  />
                </div>
              </div>

              {/* Anotações */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 mb-1.5">
                  Anotações / Corretora (Opcional)
                </label>
                <input
                  type="text"
                  placeholder="ex: XP Investimentos, NuInvest, Binance"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full px-4 py-2.5 bg-zinc-100 dark:bg-zinc-800/80 border border-zinc-200 dark:border-zinc-700 rounded-xl text-xs sm:text-sm text-zinc-900 dark:text-white placeholder-zinc-400 outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2.5 pt-3">
                <button
                  type="button"
                  onClick={() => setIsFormModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 font-semibold text-xs sm:text-sm hover:bg-zinc-100 dark:hover:bg-zinc-800 transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs sm:text-sm shadow-md shadow-emerald-600/20 active:scale-[0.98] transition-all cursor-pointer"
                >
                  {editingId ? 'Salvar Alterações' : 'Cadastrar Aporte'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Confirmação de Exclusão */}
      {deleteConfirmId !== null && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 max-w-sm w-full shadow-2xl text-center">
            <div className="w-12 h-12 rounded-full bg-rose-100 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto mb-4">
              <AlertCircle size={24} />
            </div>
            <h3 className="text-base font-bold text-zinc-900 dark:text-white mb-1">
              Excluir Aporte?
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-5">
              Esta ação removerá o registro deste aporte financeiro permanentemente.
            </p>
            <div className="flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmId(null)}
                className="px-4 py-2 rounded-xl border border-zinc-200 dark:border-zinc-700 text-zinc-700 dark:text-zinc-300 text-xs font-semibold hover:bg-zinc-100 dark:hover:bg-zinc-800"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => deleteConfirmId && handleDelete(deleteConfirmId)}
                className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-semibold shadow-xs"
              >
                Sim, Excluir
              </button>
            </div>
          </div>
        </div>
      )}

      {loading && (
        <div className="text-center text-xs text-zinc-400 dark:text-zinc-500 py-2">
          Atualizando dados em tempo real...
        </div>
      )}

    </div>
  );
};
