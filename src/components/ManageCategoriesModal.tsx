import React, { useState, useEffect, useRef } from 'react';
import { 
  X, 
  Building2, 
  Tag, 
  Plus, 
  Edit2, 
  Trash2, 
  Check, 
  Search, 
  AlertCircle,
  Sparkles,
  ChevronDown
} from 'lucide-react';
import { 
  getExpenseTypes, 
  addExpenseType, 
  updateExpenseType, 
  deleteExpenseType, 
  getCompanies, 
  addCompany, 
  updateCompany, 
  deleteCompany, 
  type CompanyRecord 
} from '../services/supabase';
import { CategoryIcon } from './CategoryIcon';

interface ManageCategoriesModalProps {
  onClose: () => void;
  onUpdated?: () => void;
  initialTab?: 'companies' | 'types';
}

export const ManageCategoriesModal: React.FC<ManageCategoriesModalProps> = ({ 
  onClose, 
  onUpdated, 
  initialTab = 'companies' 
}) => {
  const [activeTab, setActiveTab] = useState<'companies' | 'types'>(initialTab);

  // Data states
  const [types, setTypes] = useState<string[]>([]);
  const [companies, setCompanies] = useState<CompanyRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  // Form states - Company
  const [companyName, setCompanyName] = useState('');
  const [companyType, setCompanyType] = useState('Moradia');
  const [editingCompanyId, setEditingCompanyId] = useState<number | null>(null);
  const [isCompanyTypeDropdownOpen, setIsCompanyTypeDropdownOpen] = useState(false);
  const companyTypeDropdownRef = useRef<HTMLDivElement>(null);

  // Form states - Type
  const [typeName, setTypeName] = useState('');
  const [editingTypeName, setEditingTypeName] = useState<string | null>(null);
  const [editTypeInput, setEditTypeInput] = useState('');

  // Delete confirmations
  const [deleteCompanyId, setDeleteCompanyId] = useState<number | null>(null);
  const [deleteTypeName, setDeleteTypeName] = useState<string | null>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (companyTypeDropdownRef.current && !companyTypeDropdownRef.current.contains(event.target as Node)) {
        setIsCompanyTypeDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    const [t, c] = await Promise.all([getExpenseTypes(), getCompanies()]);
    setTypes(t);
    setCompanies(c);
    if (t.length > 0 && !t.includes(companyType)) {
      setCompanyType(t[0]);
    }
    setLoading(false);
  };

  // ----------------------------------------------------
  // COMPANY ACTIONS
  // ----------------------------------------------------
  const handleSaveCompany = async (e: React.FormEvent) => {
    e.preventDefault();
    const cleanName = companyName.trim();
    if (!cleanName) return;

    if (editingCompanyId) {
      await updateCompany(editingCompanyId, {
        name: cleanName,
        default_type: companyType
      });
      setEditingCompanyId(null);
    } else {
      await addCompany({
        name: cleanName,
        default_type: companyType
      });
    }

    setCompanyName('');
    await loadData();
    if (onUpdated) onUpdated();
  };

  const handleStartEditCompany = (comp: CompanyRecord) => {
    setEditingCompanyId(comp.id!);
    setCompanyName(comp.name);
    setCompanyType(comp.default_type || (types[0] || 'Outros'));
  };

  const handleCancelEditCompany = () => {
    setEditingCompanyId(null);
    setCompanyName('');
  };

  const handleConfirmDeleteCompany = async (id: number) => {
    await deleteCompany(id);
    setDeleteCompanyId(null);
    await loadData();
    if (onUpdated) onUpdated();
  };

  // ----------------------------------------------------
  // EXPENSE TYPE ACTIONS
  // ----------------------------------------------------
  const handleAddType = async (e: React.FormEvent) => {
    e.preventDefault();
    const clean = typeName.trim();
    if (!clean) return;

    await addExpenseType(clean);
    setTypeName('');
    await loadData();
    if (onUpdated) onUpdated();
  };

  const handleStartEditType = (type: string) => {
    setEditingTypeName(type);
    setEditTypeInput(type);
  };

  const handleSaveEditType = async () => {
    if (!editingTypeName || !editTypeInput.trim()) return;
    await updateExpenseType(editingTypeName, editTypeInput.trim());
    setEditingTypeName(null);
    setEditTypeInput('');
    await loadData();
    if (onUpdated) onUpdated();
  };

  const handleConfirmDeleteType = async (type: string) => {
    if (types.length <= 1) {
      alert('Você precisa ter pelo menos um tipo de despesa cadastrado.');
      return;
    }
    await deleteExpenseType(type);
    setDeleteTypeName(null);
    await loadData();
    if (onUpdated) onUpdated();
  };

  // Filtered lists
  const filteredCompanies = companies
    .filter(c => 
      c.name.toLowerCase().includes(search.toLowerCase()) || 
      c.default_type.toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => a.name.localeCompare(b.name, 'pt-BR'));

  const filteredTypes = types
    .filter(t => 
      t.toLowerCase().includes(search.toLowerCase())
    )
    .sort((a, b) => a.localeCompare(b, 'pt-BR'));

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-[fadeIn_0.15s_ease]">
      <div 
        className="bg-white dark:bg-[#18181b] border border-zinc-200 dark:border-white/10 rounded-3xl max-w-xl w-full p-6 shadow-2xl animate-[scaleIn_0.15s_ease] overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-zinc-100 dark:border-white/5">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-blue-500/10 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Sparkles size={20} />
            </div>
            <div>
              <h3 className="text-lg font-black text-zinc-900 dark:text-white leading-tight">
                Cadastros & Categorias
              </h3>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Gerencie empresas e seus tipos de despesa associados
              </p>
            </div>
          </div>

          <button 
            onClick={onClose}
            className="p-2 rounded-full hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-400 hover:text-zinc-800 dark:hover:text-zinc-200 transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Tab Switcher */}
        <div className="flex p-1 bg-zinc-100/80 dark:bg-zinc-800/60 rounded-2xl my-4 border border-zinc-200/60 dark:border-zinc-700/60">
          <button
            type="button"
            onClick={() => { setActiveTab('companies'); setSearch(''); }}
            className={`flex-1 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all ${
              activeTab === 'companies'
                ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm'
                : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white'
            }`}
          >
            <Building2 size={15} />
            <span>Empresas ({companies.length})</span>
          </button>

          <button
            type="button"
            onClick={() => { setActiveTab('types'); setSearch(''); }}
            className={`flex-1 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all ${
              activeTab === 'types'
                ? 'bg-white dark:bg-zinc-700 text-zinc-900 dark:text-white shadow-sm'
                : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white'
            }`}
          >
            <Tag size={15} />
            <span>Tipos de Despesa ({types.length})</span>
          </button>
        </div>

        {/* Search Bar inside Modal */}
        <div className="relative mb-4">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-400" />
          <input 
            type="text"
            placeholder={activeTab === 'companies' ? 'Buscar empresa ou categoria...' : 'Buscar tipo de despesa...'}
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-zinc-50 dark:bg-zinc-800/50 border border-zinc-200 dark:border-zinc-700/80 rounded-xl pl-9 pr-3 py-2 text-xs font-medium text-zinc-900 dark:text-zinc-100 outline-none focus:border-zinc-400"
          />
        </div>

        {/* TAB 1: EMPRESAS */}
        {activeTab === 'companies' && (
          <div className="flex-1 overflow-hidden flex flex-col">
            
            {/* Add / Edit Form */}
            <form onSubmit={handleSaveCompany} className="p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200/60 dark:border-white/5 mb-4 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-zinc-900 dark:text-white">
                  {editingCompanyId ? 'Editar Empresa' : 'Cadastrar Nova Empresa'}
                </span>
                {editingCompanyId && (
                  <button 
                    type="button" 
                    onClick={handleCancelEditCompany}
                    className="text-[11px] font-bold text-zinc-500 hover:underline"
                  >
                    Cancelar edição
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                <div className="relative">
                  <input 
                    type="text"
                    required
                    placeholder="Nome da empresa (ex: Netflix)"
                    value={companyName}
                    onChange={(e) => setCompanyName(e.target.value)}
                    className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-xs font-semibold text-zinc-900 dark:text-zinc-100 outline-none focus:border-zinc-400"
                  />
                </div>

                <div className="relative" ref={companyTypeDropdownRef}>
                  <button
                    type="button"
                    onClick={() => setIsCompanyTypeDropdownOpen(!isCompanyTypeDropdownOpen)}
                    className="w-full bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-xs font-semibold text-zinc-900 dark:text-zinc-100 outline-none focus:border-zinc-400 flex items-center justify-between cursor-pointer"
                  >
                    <span>{companyType}</span>
                    <ChevronDown size={14} className={`text-zinc-400 transition-transform ${isCompanyTypeDropdownOpen ? 'rotate-180' : ''}`} />
                  </button>

                  {isCompanyTypeDropdownOpen && (
                    <div className="absolute left-0 right-0 mt-1 bg-white dark:bg-[#18181b] border border-zinc-200 dark:border-zinc-700 rounded-2xl p-1.5 shadow-2xl z-50 max-h-48 overflow-y-auto">
                      {[...types].sort((a, b) => a.localeCompare(b, 'pt-BR')).map(t => (
                        <button
                          key={t}
                          type="button"
                          onClick={() => {
                            setCompanyType(t);
                            setIsCompanyTypeDropdownOpen(false);
                          }}
                          className={`w-full text-left px-3 py-2 rounded-xl text-xs font-semibold flex items-center justify-between transition-colors ${
                            companyType === t 
                              ? 'bg-zinc-100 dark:bg-zinc-800 text-zinc-900 dark:text-white font-bold' 
                              : 'text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800'
                          }`}
                        >
                          <span>{t}</span>
                          {companyType === t && <Check size={14} className="text-blue-500" />}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-600/20 active:scale-[0.98] transition-all flex items-center justify-center gap-1.5 cursor-pointer"
              >
                {editingCompanyId ? <Check size={14} /> : <Plus size={14} />}
                <span>{editingCompanyId ? 'Salvar Alterações' : 'Adicionar Empresa'}</span>
              </button>
            </form>

            {/* List */}
            <div className="flex-1 overflow-y-auto pr-1 space-y-2">
              {loading ? (
                <p className="text-center py-6 text-xs text-zinc-400">Carregando...</p>
              ) : filteredCompanies.length === 0 ? (
                <p className="text-center py-6 text-xs text-zinc-400 font-medium">Nenhuma empresa encontrada.</p>
              ) : (
                filteredCompanies.map(comp => (
                  <div 
                    key={comp.id}
                    className="p-3 rounded-2xl bg-zinc-50 dark:bg-zinc-800/30 border border-zinc-200/60 dark:border-white/5 flex items-center justify-between gap-3 hover:bg-zinc-100/80 dark:hover:bg-zinc-800/60 transition-colors"
                  >
                    <div className="flex items-center gap-2.5">
                      <CategoryIcon type={comp.default_type} size={15} />
                      <div>
                        <div className="font-bold text-xs text-zinc-900 dark:text-white">{comp.name}</div>
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-500/10 px-2 py-0.5 rounded-full mt-0.5">
                          <Tag size={10} />
                          {comp.default_type}
                        </span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => handleStartEditCompany(comp)}
                        className="p-1.5 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors"
                        title="Editar"
                      >
                        <Edit2 size={14} />
                      </button>
                      <button
                        type="button"
                        onClick={() => setDeleteCompanyId(comp.id!)}
                        className="p-1.5 rounded-lg hover:bg-rose-100 dark:hover:bg-rose-500/20 text-zinc-500 hover:text-rose-600 dark:hover:text-rose-400 transition-colors"
                        title="Excluir"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>

          </div>
        )}

        {/* TAB 2: TIPOS DE DESPESA */}
        {activeTab === 'types' && (
          <div className="flex-1 overflow-hidden flex flex-col">
            
            {/* Add Type Form */}
            <form onSubmit={handleAddType} className="p-3.5 rounded-2xl bg-zinc-50 dark:bg-zinc-800/40 border border-zinc-200/60 dark:border-white/5 mb-4 space-y-3">
              <span className="text-xs font-bold text-zinc-900 dark:text-white block">
                Novo Tipo de Despesa
              </span>

              <div className="flex gap-2">
                <input 
                  type="text" 
                  required
                  placeholder="Nome do tipo (ex: Animais, Impostos...)"
                  value={typeName}
                  onChange={(e) => setTypeName(e.target.value)}
                  className="flex-1 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 rounded-xl px-3 py-2 text-xs font-semibold text-zinc-900 dark:text-zinc-100 outline-none focus:border-zinc-400"
                />
                <button
                  type="submit"
                  className="py-2 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs shadow-md shadow-emerald-600/20 active:scale-[0.98] transition-all flex items-center gap-1 cursor-pointer"
                >
                  <Plus size={14} />
                  <span>Adicionar</span>
                </button>
              </div>
            </form>

            {/* List */}
            <div className="flex-1 overflow-y-auto pr-1 space-y-2">
              {loading ? (
                <p className="text-center py-6 text-xs text-zinc-400">Carregando...</p>
              ) : filteredTypes.length === 0 ? (
                <p className="text-center py-6 text-xs text-zinc-400 font-medium">Nenhum tipo encontrado.</p>
              ) : (
                filteredTypes.map(type => {
                  const isEditing = editingTypeName === type;
                  const associatedCount = companies.filter(c => c.default_type === type).length;

                  return (
                    <div 
                      key={type}
                      className="p-3 rounded-2xl bg-zinc-50 dark:bg-zinc-800/30 border border-zinc-200/60 dark:border-white/5 flex items-center justify-between gap-3 hover:bg-zinc-100/80 dark:hover:bg-zinc-800/60 transition-colors"
                    >
                      <div className="flex items-center gap-2.5 flex-1">
                        <CategoryIcon type={type} size={15} />

                        {isEditing ? (
                          <div className="flex items-center gap-2 flex-1">
                            <input 
                              type="text"
                              autoFocus
                              value={editTypeInput}
                              onChange={(e) => setEditTypeInput(e.target.value)}
                              className="bg-white dark:bg-zinc-900 border border-zinc-300 dark:border-zinc-600 rounded-lg px-2.5 py-1 text-xs font-bold text-zinc-900 dark:text-white flex-1"
                            />
                            <button
                              type="button"
                              onClick={handleSaveEditType}
                              className="p-1.5 rounded-lg bg-emerald-600 text-white hover:bg-emerald-700"
                              title="Salvar"
                            >
                              <Check size={14} />
                            </button>
                            <button
                              type="button"
                              onClick={() => setEditingTypeName(null)}
                              className="p-1.5 rounded-lg bg-zinc-200 dark:bg-zinc-700 text-zinc-700 dark:text-zinc-200"
                              title="Cancelar"
                            >
                              <X size={14} />
                            </button>
                          </div>
                        ) : (
                          <div>
                            <div className="font-bold text-xs text-zinc-900 dark:text-white">{type}</div>
                            <span className="text-[10px] text-zinc-400 dark:text-zinc-500">
                              {associatedCount} {associatedCount === 1 ? 'empresa associada' : 'empresas associadas'}
                            </span>
                          </div>
                        )}
                      </div>

                      {!isEditing && (
                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={() => handleStartEditType(type)}
                            className="p-1.5 rounded-lg hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-500 hover:text-zinc-900 dark:hover:text-white transition-colors"
                            title="Renomear"
                          >
                            <Edit2 size={14} />
                          </button>
                          <button
                            type="button"
                            onClick={() => setDeleteTypeName(type)}
                            className="p-1.5 rounded-lg hover:bg-rose-100 dark:hover:bg-rose-500/20 text-zinc-500 hover:text-rose-600 dark:hover:text-rose-400 transition-colors"
                            title="Excluir"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

          </div>
        )}

        {/* Footer */}
        <div className="pt-4 border-t border-zinc-100 dark:border-white/5 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-zinc-100 hover:bg-zinc-200 dark:bg-zinc-800 dark:hover:bg-zinc-700 text-zinc-800 dark:text-zinc-200 font-bold text-xs transition-all"
          >
            Concluir
          </button>
        </div>

      </div>

      {/* Delete Confirmation Modal for Company */}
      {deleteCompanyId && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-[fadeIn_0.1s_ease]">
          <div className="bg-white dark:bg-[#18181b] border border-zinc-200 dark:border-white/10 rounded-3xl max-w-xs w-full p-5 text-center shadow-2xl">
            <div className="w-10 h-10 rounded-full bg-rose-100 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto mb-2.5">
              <AlertCircle size={22} />
            </div>
            <h5 className="font-bold text-sm text-zinc-900 dark:text-white">Excluir Empresa?</h5>
            <p className="text-[11px] text-zinc-500 mt-1 mb-4">
              Essa empresa será removida da lista rápida.
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setDeleteCompanyId(null)}
                className="flex-1 py-1.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-xs font-bold text-zinc-700 dark:text-zinc-300"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => handleConfirmDeleteCompany(deleteCompanyId)}
                className="flex-1 py-1.5 rounded-xl bg-rose-600 text-xs font-bold text-white shadow-sm"
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal for Type */}
      {deleteTypeName && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-[fadeIn_0.1s_ease]">
          <div className="bg-white dark:bg-[#18181b] border border-zinc-200 dark:border-white/10 rounded-3xl max-w-xs w-full p-5 text-center shadow-2xl">
            <div className="w-10 h-10 rounded-full bg-rose-100 dark:bg-rose-500/20 text-rose-600 dark:text-rose-400 flex items-center justify-center mx-auto mb-2.5">
              <AlertCircle size={22} />
            </div>
            <h5 className="font-bold text-sm text-zinc-900 dark:text-white">Excluir Tipo "{deleteTypeName}"?</h5>
            <p className="text-[11px] text-zinc-500 mt-1 mb-4">
              Despesas e empresas vinculadas a este tipo serão transferidas para a categoria padrão.
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setDeleteTypeName(null)}
                className="flex-1 py-1.5 rounded-xl bg-zinc-100 dark:bg-zinc-800 text-xs font-bold text-zinc-700 dark:text-zinc-300"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => handleConfirmDeleteType(deleteTypeName)}
                className="flex-1 py-1.5 rounded-xl bg-rose-600 text-xs font-bold text-white shadow-sm"
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
