import React, { useEffect, useState } from 'react';
import { Plus, Search, Filter, MoreHorizontal, CheckCircle, Clock, AlertCircle, DollarSign, Edit2, Trash2 } from 'lucide-react';
import { useAuth } from './AuthGuard';
import { AccountsReceivable, Category } from '../types';
import { formatCurrency, cn } from '../lib/utils';
import { motion, AnimatePresence } from 'motion/react';
import { getAccountsReceivable, createAccountsReceivable, updateAccountsReceivable, deleteAccountsReceivable } from '../services/receivableService';
import { getCompanyCategories } from '../services/settingsService';
import { createTransaction } from '../services/transactionService';

export function Receivable() {
  const { user } = useAuth();
  const [bills, setBills] = useState<AccountsReceivable[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(true);
  const [editingId, setEditingId] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    due_date: new Date().toISOString().split('T')[0],
    amount: '',
    payer: '',
    category_id: '',
    notes: '',
  });

  const fetchData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      const [billsData, catsData] = await Promise.all([
        getAccountsReceivable(user.company_id),
        getCompanyCategories(user.company_id)
      ]);
      setBills(billsData);
      setCategories(catsData.filter(c => c.type === 'income'));
    } catch (error) {
      console.error('Error fetching receivable data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    try {
      const payload = {
        ...formData,
        amount: parseFloat(formData.amount),
        company_id: user.company_id,
        status: 'pending' as const,
      };

      if (editingId) {
        await updateAccountsReceivable(editingId, payload);
      } else {
        await createAccountsReceivable({ ...payload, created_at: new Date().toISOString() });
      }

      setShowForm(false);
      setEditingId(null);
      setFormData({ due_date: new Date().toISOString().split('T')[0], amount: '', payer: '', category_id: '', notes: '' });
      fetchData();
    } catch (error) {
      console.error('Error adding/updating receivable:', error);
    }
  };

  const handleEdit = (bill: AccountsReceivable) => {
    setEditingId(bill.id);
    setFormData({
      due_date: bill.due_date,
      amount: bill.amount.toString(),
      payer: bill.payer,
      category_id: bill.category_id,
      notes: bill.notes || '',
    });
    setShowForm(true);
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir esta conta a receber?')) return;
    try {
      await deleteAccountsReceivable(id);
      fetchData();
    } catch (error) {
      console.error('Error deleting receivable:', error);
      alert('Erro ao excluir conta.');
    }
  };

  const markAsReceived = async (bill: AccountsReceivable) => {
    try {
      await updateAccountsReceivable(bill.id, { status: 'received' });
      await createTransaction({
        company_id: bill.company_id,
        type: 'income',
        amount: bill.amount,
        description: `Recebimento: ${bill.payer}`,
        occurrence_date: new Date().toISOString(),
        competence_date: bill.due_date,
        category_id: bill.category_id,
        financial_account_id: 'default-account',
        status: 'completed',
        created_at: new Date().toISOString(),
      });
      fetchData();
    } catch (error) {
      console.error('Error marking as received:', error);
    }
  };

  return (
    <div className="space-y-6">
      <header className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-serif font-bold text-[#1a1a1a]">Contas a Receber</h2>
          <p className="text-brand/60">Acompanhe suas entradas e inadimplência.</p>
        </div>
        <button 
          onClick={() => {
            setEditingId(null);
            setFormData({ due_date: new Date().toISOString().split('T')[0], amount: '', payer: '', category_id: '', notes: '' });
            setShowForm(true);
          }}
          className="bg-brand text-white px-6 py-3 rounded-full font-bold hover:bg-[#4a4a35] transition-all shadow-lg flex items-center gap-2"
        >
          <Plus size={20} />
          Nova Receita
        </button>
      </header>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-3xl border border-brand/5 shadow-sm">
          <p className="text-xs font-bold text-brand/40 uppercase mb-1">A Receber</p>
          <h3 className="text-2xl font-bold text-[#1a1a1a]">
            {formatCurrency(bills.filter(b => b.status === 'pending').reduce((acc, b) => acc + b.amount, 0))}
          </h3>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-brand/5 shadow-sm">
          <p className="text-xs font-bold text-red-400 uppercase mb-1">Inadimplência</p>
          <h3 className="text-2xl font-bold text-red-600">
            {formatCurrency(bills.filter(b => b.status === 'overdue').reduce((acc, b) => acc + b.amount, 0))}
          </h3>
        </div>
        <div className="bg-white p-6 rounded-3xl border border-brand/5 shadow-sm">
          <p className="text-xs font-bold text-green-400 uppercase mb-1">Recebido este mês</p>
          <h3 className="text-2xl font-bold text-green-600">
            {formatCurrency(bills.filter(b => b.status === 'received').reduce((acc, b) => acc + b.amount, 0))}
          </h3>
        </div>
      </div>

      <div className="bg-white rounded-[2rem] shadow-sm border border-brand/5 overflow-hidden">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-[#f5f5f0]/50 border-bottom border-brand/5">
              <th className="px-6 py-4 text-[10px] uppercase tracking-widest text-brand/60 font-bold">Vencimento</th>
              <th className="px-6 py-4 text-[10px] uppercase tracking-widest text-brand/60 font-bold">Origem</th>
              <th className="px-6 py-4 text-[10px] uppercase tracking-widest text-brand/60 font-bold">Categoria</th>
              <th className="px-6 py-4 text-[10px] uppercase tracking-widest text-brand/60 font-bold">Valor</th>
              <th className="px-6 py-4 text-[10px] uppercase tracking-widest text-brand/60 font-bold">Status</th>
              <th className="px-6 py-4 text-[10px] uppercase tracking-widest text-brand/60 font-bold text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-brand/5">
            {bills.map((bill) => (
              <tr key={bill.id} className="hover:bg-[#f5f5f0]/30 transition-colors">
                <td className="px-6 py-4 text-sm text-brand">
                  {new Date(bill.due_date).toLocaleDateString('pt-BR')}
                </td>
                <td className="px-6 py-4">
                  <span className="text-sm font-semibold text-[#1a1a1a]">{bill.payer}</span>
                </td>
                <td className="px-6 py-4">
                  <span className="text-xs font-medium px-2 py-1 bg-brand/5 text-brand rounded-full">
                    {categories.find(c => c.id === bill.category_id)?.name || 'Receita'}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span className="text-sm font-bold text-green-600">{formatCurrency(bill.amount)}</span>
                </td>
                <td className="px-6 py-4">
                  <div className="flex items-center gap-2">
                    {bill.status === 'received' ? (
                      <span className="flex items-center gap-1 text-[10px] uppercase font-bold text-green-600 bg-green-50 px-2 py-1 rounded">
                        <CheckCircle size={12} /> Recebido
                      </span>
                    ) : bill.status === 'overdue' ? (
                      <span className="flex items-center gap-1 text-[10px] uppercase font-bold text-red-600 bg-red-50 px-2 py-1 rounded">
                        <AlertCircle size={12} /> Vencido
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-[10px] uppercase font-bold text-orange-600 bg-orange-50 px-2 py-1 rounded">
                        <Clock size={12} /> Pendente
                      </span>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 text-right">
                  {bill.status === 'pending' && (
                    <button 
                      onClick={() => markAsReceived(bill)}
                      className="text-xs font-bold text-brand hover:underline mr-4"
                    >
                      Receber
                    </button>
                  )}
                  <div className="flex items-center gap-1">
                    <button 
                      onClick={() => handleEdit(bill)}
                      className="p-2 text-brand/40 hover:text-brand hover:bg-brand/5 rounded-full transition-all"
                      title="Editar"
                    >
                      <Edit2 size={16} />
                    </button>
                    <button 
                      onClick={() => handleDelete(bill.id)}
                      className="p-2 text-red-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-all"
                      title="Excluir"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <AnimatePresence>
        {showForm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => setShowForm(false)} className="absolute inset-0 bg-[#1a1a1a]/40 backdrop-blur-sm" />
            <motion.div initial={{ opacity: 0, scale: 0.95, y: 20 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.95, y: 20 }} className="relative bg-white w-full max-w-lg rounded-[2.5rem] shadow-2xl overflow-hidden">
              <div className="p-8">
                <h3 className="text-2xl font-serif font-bold text-[#1a1a1a] mb-6">{editingId ? 'Editar Receita' : 'Nova Receita a Receber'}</h3>
                <form onSubmit={handleSubmit} className="space-y-5">
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold text-brand/60 ml-2">Origem / Cliente</label>
                    <input required type="text" value={formData.payer} onChange={(e) => setFormData({...formData, payer: e.target.value})} className="w-full px-4 py-3 bg-[#f5f5f0] border-none rounded-2xl text-sm" placeholder="Ex: Seguradora X" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase font-bold text-brand/60 ml-2">Valor</label>
                      <input required type="number" step="0.01" value={formData.amount} onChange={(e) => setFormData({...formData, amount: e.target.value})} className="w-full px-4 py-3 bg-[#f5f5f0] border-none rounded-2xl text-sm font-bold" placeholder="0,00" />
                    </div>
                    <div className="space-y-1">
                      <label className="text-[10px] uppercase font-bold text-brand/60 ml-2">Vencimento</label>
                      <input required type="date" value={formData.due_date} onChange={(e) => setFormData({...formData, due_date: e.target.value})} className="w-full px-4 py-3 bg-[#f5f5f0] border-none rounded-2xl text-sm" />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-[10px] uppercase font-bold text-brand/60 ml-2">Categoria</label>
                    <select required value={formData.category_id} onChange={(e) => setFormData({...formData, category_id: e.target.value})} className="w-full px-4 py-3 bg-[#f5f5f0] border-none rounded-2xl text-sm">
                      <option value="">Selecione uma categoria</option>
                      {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                    </select>
                  </div>
                  <div className="pt-4 flex gap-3">
                    <button type="button" onClick={() => setShowForm(false)} className="flex-1 py-4 text-sm font-bold text-brand bg-[#f5f5f0] rounded-2xl hover:bg-brand/10 transition-all">Cancelar</button>
                    <button type="submit" className="flex-1 py-4 text-sm font-bold text-white bg-brand rounded-2xl hover:bg-[#4a4a35] transition-all shadow-lg">Salvar</button>
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
