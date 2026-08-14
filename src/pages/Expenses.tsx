import { useState, useEffect } from 'react';
import { Check, Clock, Trash2, Edit2, Plus, ArrowLeft } from 'lucide-react';
import { getExpenses, addExpense, deleteExpense, updateExpense, supabase, type ExpenseRecord } from '../services/supabase';
import { useNavigate } from 'react-router-dom';

export const Expenses = () => {
  const navigate = useNavigate();
  const [expenses, setExpenses] = useState<ExpenseRecord[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Form State
  const [editingId, setEditingId] = useState<number | null>(null);
  const [amountInput, setAmountInput] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState('');
  const [category, setCategory] = useState('Moradia');

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value.replace(/\D/g, '');
    if (value === '') {
      setAmountInput('');
      return;
    }
    const numericValue = parseInt(value, 10) / 100;
    const formatted = numericValue.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    setAmountInput(formatted);
  };

  const handleSaveExpense = async () => {
    if (!description || !amountInput || !date || !category) {
      alert('Por favor, preencha todos os campos.');
      return;
    }
    const numericString = amountInput.replace(/\D/g, '');
    const amount = parseInt(numericString, 10) / 100;
    
    if (editingId) {
      await updateExpense(editingId, {
        description,
        amount,
        due_date: date,
        type: category,
      });
      setEditingId(null);
    } else {
      await addExpense({ 
        description, 
        amount, 
        due_date: date, 
        type: category, 
        status: 'pending' 
      });
    }
    
    resetForm();
    fetchExpenses();
  };
  
  const resetForm = () => {
    setDescription('');
    setAmountInput('');
    setDate('');
    setCategory('Moradia');
    setEditingId(null);
  };

  const handleEdit = (exp: ExpenseRecord) => {
    setEditingId(exp.id!);
    setDescription(exp.description);
    setDate(exp.due_date);
    setCategory(exp.type);
    const formatted = exp.amount.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
    setAmountInput(formatted);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id: number) => {
    if (window.confirm("Tem certeza que deseja excluir esta despesa?")) {
      await deleteExpense(id);
      fetchExpenses();
    }
  };

  useEffect(() => {
    fetchExpenses();
    
    // Subscribe to realtime changes
    const channel = supabase
      .channel('schema-db-changes-expenses')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'expenses' }, () => {
        fetchExpenses();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchExpenses = async () => {
    const data = await getExpenses();
    setExpenses(data);
    setLoading(false);
  };

  const formatBRL = (val: number) => val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
  const inputClass = "w-full bg-white/50 dark:bg-zinc-900/50 backdrop-blur-md border border-zinc-200 dark:border-zinc-800 text-zinc-900 dark:text-zinc-100 rounded-xl px-4 py-3 outline-none focus:border-zinc-400 dark:focus:border-zinc-600 transition-all text-sm font-medium shadow-sm";

  return (
    <div className="w-full h-full flex flex-col animate-[fadeIn_0.3s_ease] overflow-y-auto p-4 md:p-8">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4 mt-2 md:mt-0">
        <div className="flex items-center gap-3">
          <button 
            className="md:hidden flex items-center justify-center p-2 -ml-2 rounded-full hover:bg-zinc-200/50 dark:hover:bg-zinc-800/50 transition-colors text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white" 
            onClick={() => navigate(-1)}
          >
            <ArrowLeft size={24} strokeWidth={2.5} />
          </button>
          <h2 className="text-3xl font-extrabold tracking-tight text-zinc-900 dark:text-white">Minhas Despesas</h2>
        </div>
      </div>

      <div className="bg-white/80 dark:bg-zinc-900/50 backdrop-blur-md border border-zinc-200/80 dark:border-white/10 shadow-xl rounded-3xl p-6 flex flex-col justify-center transition-all duration-300 mb-8 max-w-3xl">
        <h3 className="text-lg font-bold text-zinc-900 dark:text-white mb-6">
          {editingId ? 'Editar Despesa' : 'Nova Despesa'}
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-2">Descrição</label>
            <input 
              type="text" 
              className={inputClass} 
              placeholder="Ex: Aluguel" 
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </div>
          
          <div>
            <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-2">Valor</label>
            <input 
              type="text" 
              className={inputClass} 
              placeholder="R$ 0,00" 
              value={amountInput} 
              onChange={handleAmountChange} 
            />
          </div>
          
          <div>
            <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-2">Vencimento</label>
            <input 
              type="date" 
              className={inputClass} 
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>
          
          <div className="md:col-span-2">
            <label className="block text-xs font-semibold text-zinc-500 dark:text-zinc-400 uppercase tracking-wider mb-2">Categoria</label>
            <select 
              className={inputClass}
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            >
              <option className="bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100">Moradia</option>
              <option className="bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100">Contas</option>
              <option className="bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100">Alimentação</option>
              <option className="bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100">Transporte</option>
              <option className="bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100">Lazer</option>
            </select>
          </div>
        </div>
        
        <div className="mt-6 flex gap-3">
          <button 
            className="flex-1 bg-zinc-900 text-white dark:bg-white dark:text-zinc-950 font-semibold text-sm px-4 py-3 rounded-xl shadow-sm hover:bg-zinc-800 dark:hover:bg-zinc-200 active:scale-95 transition-all flex items-center justify-center gap-2"
            onClick={handleSaveExpense}
          >
            {editingId ? <Check size={18} strokeWidth={2.5} /> : <Plus size={18} strokeWidth={2.5} />}
            {editingId ? 'Salvar Alterações' : 'Adicionar Despesa'}
          </button>
          {editingId && (
            <button 
              className="bg-zinc-200 dark:bg-zinc-800 text-zinc-900 dark:text-white font-semibold text-sm px-6 py-3 rounded-xl shadow-sm hover:opacity-80 active:scale-95 transition-all flex items-center justify-center"
              onClick={resetForm}
            >
              Cancelar
            </button>
          )}
        </div>
      </div>

      <h3 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-white mb-4">Próximos Vencimentos</h3>
      
      <div className="flex flex-col gap-3 max-w-3xl pb-20">
        {loading ? (
          <p className="text-zinc-500 dark:text-zinc-400 text-sm font-medium">Carregando despesas...</p>
        ) : expenses.length === 0 ? (
          <p className="text-zinc-500 dark:text-zinc-400 text-sm font-medium">Nenhuma despesa cadastrada.</p>
        ) : expenses.map(exp => (
          <div key={exp.id} className="bg-white/80 dark:bg-zinc-900/50 backdrop-blur-md border border-zinc-200/80 dark:border-white/10 shadow-sm rounded-2xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 transition-all hover:shadow-md group">
            
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 rounded-full flex items-center justify-center flex-shrink-0 ${exp.status === 'paid' ? 'bg-emerald-100/50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-zinc-100 dark:bg-zinc-800 text-zinc-500 dark:text-zinc-400'}`}>
                {exp.status === 'paid' ? <Check size={20} strokeWidth={2.5} /> : <Clock size={20} strokeWidth={2.5} />}
              </div>
              <div>
                <div className="font-bold text-zinc-900 dark:text-white text-base leading-tight mb-1">{exp.description}</div>
                <div className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                  {exp.type} • Vence dia {exp.due_date.split('-').reverse().join('/')}
                </div>
              </div>
            </div>
            
            <div className="flex items-center justify-between md:justify-end gap-6 ml-[64px] md:ml-0">
              <div className={`font-extrabold tabular-nums tracking-tight text-lg ${exp.status === 'paid' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                {formatBRL(exp.amount)}
              </div>
              
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => handleEdit(exp)}
                  className="p-2.5 rounded-full bg-zinc-100 dark:bg-zinc-800/50 hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-500 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-white transition-colors"
                  title="Editar"
                >
                  <Edit2 size={16} strokeWidth={2.5} />
                </button>
                <button 
                  onClick={() => handleDelete(exp.id!)}
                  className="p-2.5 rounded-full bg-zinc-100 dark:bg-zinc-800/50 hover:bg-rose-100 dark:hover:bg-rose-500/20 text-zinc-500 hover:text-rose-600 dark:text-zinc-400 dark:hover:text-rose-400 transition-colors"
                  title="Excluir"
                >
                  <Trash2 size={16} strokeWidth={2.5} />
                </button>
              </div>
            </div>
            
          </div>
        ))}
      </div>
    </div>
  );
};
