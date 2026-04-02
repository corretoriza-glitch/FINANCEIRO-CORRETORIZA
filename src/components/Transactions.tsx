import React, { useEffect, useState } from 'react';
import { 
  Plus, 
  Search, 
  MoreHorizontal, 
  ArrowUpRight, 
  ArrowDownLeft,
  Pencil,
  Trash2,
  Loader2
} from 'lucide-react';
import { useAuth } from './AuthGuard';
import { Transaction, Category } from '../types';
import { formatCurrency, cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { getTransactions, createTransaction, updateTransaction, deleteTransaction } from '../services/transactionService';
import { createAccountsPayable } from '../services/payableService';
import { createAccountsReceivable } from '../services/receivableService';
import { getCompanyCategories } from '../services/settingsService';

export function Transactions() {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    type: 'expense',
    amount: '',
    description: '',
    category_id: '',
    occurrence_date: new Date().toISOString().split('T')[0],
  });

  const fetchData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [txsData, catsData] = await Promise.all([
        getTransactions(user.company_id),
        getCompanyCategories(user.company_id)
      ]);
      setTransactions(txsData);
      setCategories(catsData);
    } catch (error) {
      console.error('Error fetching transactions data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user]);

  const filteredTransactions = transactions.filter(tx =>
    tx.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleEdit = (tx: Transaction) => {
    setFormData({
      type: tx.type,
      amount: tx.amount.toString(),
      description: tx.description,
      category_id: tx.category_id,
      occurrence_date: tx.occurrence_date,
    });
    setEditingId(tx.id);
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm('Tem certeza que deseja excluir esta transação?')) return;
    try {
      await deleteTransaction(id);
      fetchData();
    } catch (error) {
      console.error('Error deleting transaction:', error);
      alert('Erro ao excluir transação.');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      if (editingId) {
        await updateTransaction(editingId, {
          ...formData,
          amount: parseFloat(formData.amount),
          type: formData.type as 'income' | 'expense',
          competence_date: formData.occurrence_date,
        });
      } else {
        await createTransaction({
          ...formData,
          amount: parseFloat(formData.amount),
          type: formData.type as 'income' | 'expense',
          company_id: user.company_id,
          status: 'completed',
          competence_date: formData.occurrence_date,
          financial_account_id: '00000000-0000-0000-0000-000000000000',
          created_at: new Date().toISOString(),
        });

        // Automatização: colar em contas a pagar ou receber
        if (formData.type === 'expense') {
          await createAccountsPayable({
            company_id: user.company_id,
            due_date: formData.occurrence_date,
            amount: parseFloat(formData.amount),
            payee: formData.description,
            category_id: formData.category_id,
            status: 'paid', // Status automático como 'pago' já que se originou de uma transação finalizada
            created_at: new Date().toISOString()
          });
        } else if (formData.type === 'income') {
          await createAccountsReceivable({
            company_id: user.company_id,
            due_date: formData.occurrence_date,
            amount: parseFloat(formData.amount),
            payer: formData.description,
            category_id: formData.category_id,
            status: 'received', // Status automático como 'recebido'
            created_at: new Date().toISOString()
          });
        }
      }

      setShowForm(false);
      setEditingId(null);
      setFormData({
        type: 'expense',
        amount: '',
        description: '',
        category_id: '',
        occurrence_date: new Date().toISOString().split('T')[0],
      });
      fetchData();
    } catch (error) {
      console.error('Error saving transaction:', error);
      alert(`Erro ao salvar lançamento: ${error?.message || error?.details || 'Verifique se todos os campos obrigatórios (incluindo a Categoria) estão preenchidos e válidos.'}`);
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-serif font-bold text-[#1a1a1a]">Transações</h2>
          <p className="text-brand/60">Gerencie todas as entradas e saídas financeiras.</p>
        </div>
        <button 
          onClick={() => setShowForm(true)}
          className="bg-brand text-white px-6 py-3 rounded-full font-bold hover:bg-[#4a4a35] transition-all shadow-lg flex items-center gap-2"
        >
          <Plus size={20} />
          Novo Lançamento
        </button>
      </header>

      {/* Filtros */}
      <div className="flex flex-wrap gap-4 items-center bg-white p-4 rounded-2xl shadow-sm border border-brand/5">
        <div className="flex-1 min-w-[200px] relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-brand/40" size={18} />
          <input 
            type="text" 
            placeholder="Buscar por descrição..." 
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 bg-[#f5f5f0] border-none rounded-xl text-sm focus:ring-2 focus:ring-brand/20"
          />
        </div>
        <span className="text-xs text-brand/50 font-medium">
          {filteredTransactions.length} registro{filteredTransactions.length !== 1 ? 's' : ''}
        </span>
      </div>

      {/* Tabela */}
      <div className="bg-white rounded-[2rem] shadow-sm border border-brand/5 overflow-hidden">
        {loading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 size={32} className="animate-spin text-brand/40" />
          </div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#f5f5f0]/50">
                <th className="px-6 py-4 text-[10px] uppercase tracking-widest text-brand/60 font-bold">Data</th>
                <th className="px-6 py-4 text-[10px] uppercase tracking-widest text-brand/60 font-bold">Descrição</th>
                <th className="px-6 py-4 text-[10px] uppercase tracking-widest text-brand/60 font-bold">Categoria</th>
                <th className="px-6 py-4 text-[10px] uppercase tracking-widest text-brand/60 font-bold">Valor</th>
                <th className="px-6 py-4 text-[10px] uppercase tracking-widest text-brand/60 font-bold">Status</th>
                <th className="px-6 py-4 text-[10px] uppercase tracking-widest text-brand/60 font-bold text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand/5">
              {filteredTransactions.map((tx) => (
                <tr key={tx.id} className="hover:bg-[#f5f5f0]/30 transition-colors">
                  <td className="px-6 py-4 text-sm text-brand">
                    {new Date(tx.occurrence_date + 'T12:00:00').toLocaleDateString('pt-BR')}
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "p-2 rounded-lg",
                        tx.type === 'income' ? "bg-green-100 text-green-600" : "bg-red-100 text-red-600"
                      )}>
                        {tx.type === 'income' ? <ArrowUpRight size={14} /> : <ArrowDownLeft size={14} />}
                      </div>
                      <span className="text-sm font-semibold text-[#1a1a1a]">{tx.description}</span>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-xs font-medium px-2 py-1 bg-brand/5 text-brand rounded-full">
                      {categories.find(c => c.id === tx.category_id)?.name || 'Geral'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={cn(
                      "text-sm font-bold",
                      tx.type === 'income' ? "text-green-600" : "text-red-600"
                    )}>
                      {tx.type === 'income' ? '+' : '-'}{formatCurrency(tx.amount)}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className="text-[10px] uppercase font-bold text-green-600 bg-green-50 px-2 py-1 rounded">
                      {tx.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2">
                      <button onClick={() => handleEdit(tx)} className="p-2 text-brand/40 hover:text-brand hover:bg-brand/5 rounded-lg transition-colors">
                        <Pencil size={18} />
                      </button>
                      <button onClick={() => handleDelete(tx.id)} className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredTransactions.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-6 py-20 text-center text-brand/40 italic text-sm">
                    {searchTerm
                      ? `Nenhuma transação encontrada para "${searchTerm}".`
                      : 'Nenhuma transação registrada.'}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal Form */}
      <AnimatePresence>
        {showForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                setShowForm(false);
                setEditingId(null);
                setFormData({
                  type: 'expense',
                  amount: '',
                  description: '',
                  category_id: '',
                  occurrence_date: new Date().toISOString().split('T')[0],
                });
              }}
              className="absolute inset-0 bg-[#1a1a1a]/40 backdrop-blur-sm"
            />
            <motion.div 
              initial={{ opacity: 0, scale: 0.95, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 20 }}
              className="relative bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden"
            >
              <div className="p-8">
                <h3 className="text-2xl font-serif font-bold text-[#1a1a1a] mb-6">
                  {editingId ? 'Editar Lançamento' : 'Novo Lançamento'}
                </h3>
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="flex p-1 bg-[#f5f5f0] rounded-2xl">
                    <button
                      type="button"
                      onClick={() => setFormData({...formData, type: 'income', category_id: ''})}
                      className={cn(
                        "flex-1 py-2 text-sm font-bold rounded-xl transition-all",
                        formData.type === 'income' ? "bg-white text-green-600 shadow-sm" : "text-brand/60"
                      )}
                    >
                      Receita
                    </button>
                    <button
                      type="button"
                      onClick={() => setFormData({...formData, type: 'expense', category_id: ''})}
                      className={cn(
                        "flex-1 py-2 text-sm font-bold rounded-xl transition-all",
                        formData.type === 'expense' ? "bg-white text-red-600 shadow-sm" : "text-brand/60"
                      )}
                    >
                      Despesa
                    </button>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold text-brand/60 ml-2">Descrição</label>
                    <input 
                      required
                      type="text" 
                      value={formData.description}
                      onChange={(e) => setFormData({...formData, description: e.target.value})}
                      className="w-full px-4 py-3 bg-[#f5f5f0] border-none rounded-2xl text-sm"
                      placeholder="Ex: Aluguel Escritório"
                    />
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase font-bold text-brand/60 ml-2">Valor</label>
                      <div className="relative">
                        <span className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-bold text-brand/40">R$</span>
                        <input 
                          required
                          type="number" 
                          step="0.01"
                          min="0.01"
                          value={formData.amount}
                          onChange={(e) => setFormData({...formData, amount: e.target.value})}
                          className="w-full pl-10 pr-4 py-3 bg-[#f5f5f0] border-none rounded-2xl text-sm font-bold"
                          placeholder="0,00"
                        />
                      </div>
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase font-bold text-brand/60 ml-2">Data</label>
                      <input 
                        required
                        type="date" 
                        value={formData.occurrence_date}
                        onChange={(e) => setFormData({...formData, occurrence_date: e.target.value})}
                        className="w-full px-4 py-3 bg-[#f5f5f0] border-none rounded-2xl text-sm"
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold text-brand/60 ml-2">Categoria</label>
                    <select 
                      required
                      value={formData.category_id}
                      onChange={(e) => setFormData({...formData, category_id: e.target.value})}
                      className="w-full px-4 py-3 bg-[#f5f5f0] border-none rounded-2xl text-sm"
                    >
                      <option value="">Selecione uma categoria</option>
                      {categories
                        .filter(c => c.type === formData.type && c.status === 'active')
                        .map(cat => (
                          <option key={cat.id} value={cat.id}>{cat.name}</option>
                        ))}
                    </select>
                  </div>

                  <div className="pt-4 flex gap-3">
                    <button 
                      type="button"
                      onClick={() => setShowForm(false)}
                      className="flex-1 py-4 text-sm font-bold text-brand bg-[#f5f5f0] rounded-2xl hover:bg-brand/10 transition-all"
                    >
                      Cancelar
                    </button>
                    <button 
                      type="submit"
                      className="flex-1 py-4 text-sm font-bold text-white bg-brand rounded-2xl hover:bg-[#4a4a35] transition-all shadow-lg"
                    >
                      Salvar
                    </button>
                  </div>
                </form>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
