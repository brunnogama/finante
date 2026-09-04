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
  'Renda Fixa': '#2ec27e',
  'Ações': '#3584e4',
  'Fundos Imobiliários': '#e5a50a',
  'Criptomoedas': '#9141ac',
  'Internacional': '#21a1a9',
  'Outros': '#77767b'
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
    <div className="p-4 md:p-6 max-w-7xl mx-auto space-y-5 animate-fadeIn pb-24 md:pb-8">
      
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl md:text-2xl font-bold tracking-tight text-zinc-900 dark:text-white flex items-center gap-2.5">
            <span className="w-8 h-8 rounded-lg bg-[#9141ac]/10 dark:bg-[#9141ac]/20 text-[#9141ac] flex items-center justify-center shrink-0">
              <TrendingUp size={18} strokeWidth={2.3} />
            </span>
            Investimentos
          </h1>
          <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-0.5">
            Acompanhamento de aportes, patrimônio e alocação de carteira
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenAddModal}
          className="adw-btn suggested-action"
        >
          <Plus size={16} strokeWidth={2.5} />
          <span>Novo Aporte</span>
        </button>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
        
        {/* Card 1: Patrimônio Investido */}
        <div className="bg-white dark:bg-white/[0.06] rounded-xl p-4 sm:p-5 border border-black/10 dark:border-white/10 shadow-xs relative overflow-hidden min-w-0">
          <div className="flex items-center justify-between mb-2 min-w-0">
            <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 truncate">
              Patrimônio Investido
            </span>
            <div className="w-7 h-7 rounded-lg bg-[#2ec27e]/10 dark:bg-[#2ec27e]/20 text-[#2ec27e] flex items-center justify-center shrink-0">
              <Wallet size={15} strokeWidth={2.5} />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-bold text-[#2ec27e] tracking-tight truncate min-w-0" title={formatCurrency(stats.totalInvested)}>
            {formatCurrency(stats.totalInvested)}
          </div>
          <div className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-1 truncate">
            {investments.length === 1 ? '1 aporte realizado' : `${investments.length} aportes realizados`}
          </div>
        </div>

        {/* Card 2: Aportes no Mês Atual */}
        <div className="bg-white dark:bg-white/[0.06] rounded-xl p-4 sm:p-5 border border-black/10 dark:border-white/10 shadow-xs relative overflow-hidden min-w-0">
          <div className="flex items-center justify-between mb-2 min-w-0">
            <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 truncate">
              Aportes este Mês
            </span>
            <div className="w-7 h-7 rounded-lg bg-[#3584e4]/10 dark:bg-[#3584e4]/20 text-[#3584e4] flex items-center justify-center shrink-0">
              <ArrowUpRight size={15} strokeWidth={2.5} />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-white tracking-tight truncate min-w-0" title={formatCurrency(stats.thisMonthTotal)}>
            {formatCurrency(stats.thisMonthTotal)}
          </div>
          <div className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-1 truncate">
            {stats.thisMonthCount === 1 ? '1 aporte este mês' : `${stats.thisMonthCount} aportes este mês`}
          </div>
        </div>

        {/* Card 3: Ativos Cadastrados */}
        <div className="bg-white dark:bg-white/[0.06] rounded-xl p-4 sm:p-5 border border-black/10 dark:border-white/10 shadow-xs relative overflow-hidden min-w-0">
          <div className="flex items-center justify-between mb-2 min-w-0">
            <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 truncate">
              Posições / Ativos
            </span>
            <div className="w-7 h-7 rounded-lg bg-[#9141ac]/10 dark:bg-[#9141ac]/20 text-[#9141ac] flex items-center justify-center shrink-0">
              <Layers size={15} strokeWidth={2.5} />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-white tracking-tight truncate min-w-0">
            {stats.uniqueAssets} <span className="text-xs font-normal text-zinc-400">ativos</span>
          </div>
          <div className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-1 truncate">
            {Object.keys(stats.categoryTotals).length} classes de ativos
          </div>
        </div>

        {/* Card 4: Maior Categoria */}
        <div className="bg-white dark:bg-white/[0.06] rounded-xl p-4 sm:p-5 border border-black/10 dark:border-white/10 shadow-xs relative overflow-hidden min-w-0">
          <div className="flex items-center justify-between mb-2 min-w-0">
            <span className="text-[11px] font-bold uppercase tracking-wider text-zinc-500 dark:text-zinc-400 truncate">
              Maior Alocação
            </span>
            <div className="w-7 h-7 rounded-lg bg-[#e5a50a]/10 dark:bg-[#e5a50a]/20 text-[#e5a50a] flex items-center justify-center shrink-0">
              <Sparkles size={15} strokeWidth={2.5} />
            </div>
          </div>
          <div className="text-xl sm:text-2xl font-bold text-zinc-900 dark:text-white tracking-tight truncate min-w-0" title={stats.topCategory}>
            {stats.topCategory}
          </div>
          <div className="text-[11px] text-zinc-400 dark:text-zinc-500 mt-1 truncate">
            {stats.topCategory !== 'Nenhuma' ? `${stats.topCategoryPercent}% da carteira` : 'Sem alocações'}
          </div>
        </div>

      </div>

      {/* Charts Row (2 Columns) */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
        
        {/* Alocação por Categoria (Donut) */}
        <div className="bg-white dark:bg-white/[0.06] rounded-xl p-5 border border-black/10 dark:border-white/10 shadow-xs flex flex-col justify-start min-h-[340px]">
          <h3 className="text-sm font-bold text-zinc-900 dark:text-white mb-4 tracking-tight flex items-center gap-2">
            <PieChartIcon size={16} className="text-[#3584e4]" />
            Alocação por Categoria
          </h3>
          
          <div className="flex-1 min-h-[260px] relative">
            {categoryPieData.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full opacity-40 text-zinc-500 dark:text-zinc-400">
                <PieChartIcon size={40} strokeWidth={1.5} className="mb-2" />
                <p className="text-xs font-semibold">Nenhum investimento cadastrado</p>
              </div>
            ) : (
              <div className="w-full h-full absolute inset-0 pb-4">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={categoryPieData}
                      cx="50%"
                      cy="50%"
                      innerRadius={60}
                      outerRadius={80}
                      paddingAngle={4}
                      dataKey="value"
                      stroke="none"
                    >
                      {categoryPieData.map((entry) => (
                        <Cell 
                          key={`cell-${entry.name}`} 
                          fill={CATEGORY_COLORS[entry.name] || '#2ec27e'} 
                        />
                      ))}
                    </Pie>
                    <RechartsTooltip 
                      formatter={(value: any) => [
                        `R$ ${Number(value).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
                        'Total'
                      ]}
                      contentStyle={{ 
                        borderRadius: '8px', 
                        border: '1px solid rgba(255, 255, 255, 0.1)', 
                        boxShadow: '0 8px 24px rgba(0, 0, 0, 0.3)', 
                        backgroundColor: '#383838',
                        padding: '8px 12px',
                        fontWeight: 600,
                        fontSize: '12px',
                        color: '#ffffff',
                      }}
                    />
                    <Legend 
                      verticalAlign="bottom" 
                      height={36} 
                      iconType="circle" 
                      wrapperStyle={{ fontSize: '12px', fontWeight: 600, color: '#77767b' }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>

        {/* Histórico Mensal de Aportes */}
        <div className="bg-white dark:bg-white/[0.06] rounded-xl p-5 border border-black/10 dark:border-white/10 shadow-xs flex flex-col justify-start min-h-[340px]">
          <h3 className="text-sm font-bold text-zinc-900 dark:text-white mb-4 tracking-tight flex items-center gap-2">
            <TrendingUp size={16} className="text-[#2ec27e]" />
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
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#808080" opacity={0.15} />
                  <XAxis 
                    dataKey="name" 
                    stroke="#808080" 
                    fontSize={11} 
                    fontWeight={600}
                    tickLine={false} 
                    axisLine={false} 
                    dy={10} 
                  />
                  <YAxis 
                    stroke="#808080" 
                    fontSize={11} 
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
                    cursor={{ fill: '#808080', opacity: 0.1, radius: 6 }}
                    contentStyle={{ 
                      borderRadius: '8px', 
                      border: '1px solid rgba(255, 255, 255, 0.1)', 
                      boxShadow: '0 8px 24px rgba(0, 0, 0, 0.3)', 
                      backgroundColor: '#383838',
                      padding: '8px 12px',
                      fontWeight: 600,
                      fontSize: '12px',
                      color: '#ffffff',
                    }}
                  />
                  <Bar dataKey="Aportes" fill="#2ec27e" radius={[4, 4, 0, 0]} maxBarSize={24} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>

      </div>

      {/* Filter & Search Bar */}
      <div className="bg-white dark:bg-white/[0.06] rounded-xl p-3 border border-black/10 dark:border-white/10 shadow-xs flex flex-col sm:flex-row gap-2.5 items-center justify-between">
        
        {/* Search Input */}
        <div className="relative w-full sm:w-80">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input
            type="text"
            placeholder="Buscar por ativo ou anotação..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-8.5 pr-4 py-1.5 bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-lg text-xs sm:text-sm text-zinc-900 dark:text-white placeholder-zinc-400 outline-none focus:ring-2 focus:ring-[#3584e4]/30 transition-all"
          />
        </div>

        {/* Category Filter Pills (ViewSwitcher style) */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0 scrollbar-none">
          <button
            type="button"
            onClick={() => setSelectedCategory('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
              selectedCategory === 'all'
                ? 'bg-[#3584e4] text-white shadow-xs'
                : 'bg-black/5 dark:bg-white/5 text-zinc-600 dark:text-zinc-400 hover:bg-black/10 dark:hover:bg-white/10'
            }`}
          >
            Todas
          </button>
          {INVESTMENT_CATEGORIES.map(cat => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all cursor-pointer flex items-center gap-1.5 ${
                selectedCategory === cat
                  ? 'bg-[#3584e4] text-white shadow-xs'
                  : 'bg-black/5 dark:bg-white/5 text-zinc-600 dark:text-zinc-400 hover:bg-black/10 dark:hover:bg-white/10'
              }`}
            >
              <span className="w-2 h-2 rounded-full" style={{ backgroundColor: CATEGORY_COLORS[cat] || '#888' }} />
              {cat}
            </button>
          ))}
        </div>

      </div>

      {/* Asset Boxed List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between px-1">
          <h2 className="text-sm font-bold text-zinc-900 dark:text-white">
            Histórico de Aportes
          </h2>
          <span className="text-xs text-zinc-400">
            {filteredInvestments.length === 1 ? '1 registro' : `${filteredInvestments.length} registros`}
          </span>
        </div>

        {filteredInvestments.length === 0 ? (
          <div className="bg-white dark:bg-white/[0.06] rounded-xl p-10 text-center border border-black/10 dark:border-white/10">
            <TrendingUp size={40} strokeWidth={1.5} className="mx-auto mb-2 text-zinc-400 opacity-50" />
            <p className="text-xs sm:text-sm font-semibold text-zinc-700 dark:text-zinc-300">Nenhum aporte encontrado</p>
            <p className="text-xs text-zinc-500 mt-0.5">
              Clique no botão "+ Novo Aporte" acima para registrar seus ativos.
            </p>
          </div>
        ) : (
          <div className="boxed-list">
            {filteredInvestments.map((item) => (
              <div 
                key={item.id}
                className="boxed-list-row group"
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div 
                    className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 border"
                    style={{ 
                      backgroundColor: `${CATEGORY_COLORS[item.category] || '#2ec27e'}15`,
                      borderColor: `${CATEGORY_COLORS[item.category] || '#2ec27e'}30`,
                      color: CATEGORY_COLORS[item.category] || '#2ec27e'
                    }}
                  >
                    <TrendingUp size={16} strokeWidth={2.3} />
                  </div>

                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold text-xs sm:text-sm text-zinc-900 dark:text-white truncate">
                        {item.asset}
                      </h4>
                      <span 
                        className="text-[10px] font-bold px-1.5 py-0.2 rounded shrink-0"
                        style={{
                          backgroundColor: `${CATEGORY_COLORS[item.category] || '#888'}15`,
                          color: CATEGORY_COLORS[item.category] || '#888'
                        }}
                      >
                        {item.category}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 mt-0.5 text-[11px] text-zinc-400 dark:text-zinc-500">
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

                <div className="flex items-center gap-3 shrink-0">
                  <span className="text-xs sm:text-sm font-bold text-[#2ec27e] tabular-nums">
                    {formatCurrency(item.amount)}
                  </span>

                  <div className="flex items-center gap-1 opacity-70 group-hover:opacity-100 transition-opacity">
                    <button
                      type="button"
                      onClick={() => handleOpenEditModal(item)}
                      className="p-1.5 rounded-md hover:bg-black/5 dark:hover:bg-white/10 text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors cursor-pointer"
                      title="Editar"
                    >
                      <Edit3 size={15} />
                    </button>
                    <button
                      type="button"
                      onClick={() => item.id && setDeleteConfirmId(item.id)}
                      className="p-1.5 rounded-md hover:bg-[#e01b24]/10 text-zinc-400 hover:text-[#e01b24] transition-colors cursor-pointer"
                      title="Excluir"
                    >
                      <Trash2 size={15} />
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
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="adw-dialog p-5 max-w-md w-full shadow-2xl animate-[scaleIn_0.15s_ease]">
            
            <div className="flex items-center justify-between pb-3 border-b border-black/10 dark:border-white/10 mb-4">
              <h3 className="text-sm font-bold text-zinc-900 dark:text-white flex items-center gap-2">
                <TrendingUp size={18} className="text-[#3584e4]" />
                {editingId ? 'Editar Aporte' : 'Novo Aporte'}
              </h3>
              <button
                type="button"
                onClick={() => setIsFormModalOpen(false)}
                className="p-1 rounded-md hover:bg-black/5 dark:hover:bg-white/10 text-zinc-400 hover:text-zinc-600 transition-colors cursor-pointer"
              >
                <X size={16} />
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
                  className="w-full px-3 py-2 bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-lg text-sm font-semibold text-zinc-900 dark:text-white placeholder-zinc-400 outline-none focus:ring-2 focus:ring-[#3584e4]/30"
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
                  className="w-full bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-lg px-3 py-2 text-sm font-semibold text-zinc-900 dark:text-zinc-100 outline-none flex items-center justify-between cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: CATEGORY_COLORS[category] || '#888' }} />
                    <span>{category}</span>
                  </div>
                  <ChevronDown size={14} className={`text-zinc-400 transition-transform duration-200 ${isCategoryDropdownOpen ? 'rotate-180' : ''}`} />
                </button>

                {isCategoryDropdownOpen && (
                  <div className="absolute left-0 right-0 mt-1 adw-popover rounded-xl p-1.5 shadow-2xl z-50 animate-[scaleIn_0.12s_ease]">
                    {INVESTMENT_CATEGORIES.map(c => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => {
                          setCategory(c);
                          setIsCategoryDropdownOpen(false);
                        }}
                        className={`w-full text-left px-3 py-2 rounded-lg text-sm font-semibold flex items-center justify-between transition-colors cursor-pointer ${
                          category === c 
                            ? 'bg-[#3584e4] text-white font-bold' 
                            : 'text-zinc-700 dark:text-zinc-300 hover:bg-black/5 dark:hover:bg-white/10'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: CATEGORY_COLORS[c] || '#888' }} />
                          <span>{c}</span>
                        </div>
                        {category === c && <Check size={16} className="text-white" />}
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
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs font-bold text-zinc-400">
                      R$
                    </span>
                    <input
                      type="text"
                      placeholder="0,00"
                      value={amountInput}
                      onChange={handleAmountInputChange}
                      className="w-full pl-8.5 pr-3 py-2 bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-lg text-sm font-bold text-zinc-900 dark:text-white placeholder-zinc-400 outline-none focus:ring-2 focus:ring-[#3584e4]/30"
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
                  className="w-full px-3 py-2 bg-black/5 dark:bg-white/5 border border-black/10 dark:border-white/10 rounded-lg text-xs sm:text-sm text-zinc-900 dark:text-white placeholder-zinc-400 outline-none focus:ring-2 focus:ring-[#3584e4]/30"
                />
              </div>

              {/* Action Buttons */}
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsFormModalOpen(false)}
                  className="adw-btn"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="adw-btn suggested-action"
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
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn">
          <div className="adw-dialog p-5 max-w-sm w-full text-center">
            <div className="w-10 h-10 rounded-lg bg-[#e01b24]/10 text-[#e01b24] flex items-center justify-center mx-auto mb-3">
              <AlertCircle size={22} />
            </div>
            <h3 className="text-sm font-bold text-zinc-900 dark:text-white mb-1">
              Excluir Aporte?
            </h3>
            <p className="text-xs text-zinc-500 dark:text-zinc-400 mb-4">
              Esta ação removerá o registro deste aporte financeiro permanentemente.
            </p>
            <div className="flex items-center justify-center gap-2">
              <button
                type="button"
                onClick={() => setDeleteConfirmId(null)}
                className="flex-1 adw-btn"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => deleteConfirmId && handleDelete(deleteConfirmId)}
                className="flex-1 adw-btn destructive-action"
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
