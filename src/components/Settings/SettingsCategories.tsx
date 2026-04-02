import React, { useState, useEffect } from 'react';
import { useAuth } from '../AuthGuard';
import { getCompanyCategories, createCategory, deleteCategory } from '../../services/settingsService';
import { Category } from '../../types';
import { useToast } from '../../contexts/ToastContext';
import { Tag, Plus, Trash2 } from 'lucide-react';
import { categorySchema } from '../../lib/validation';
import { z } from 'zod';
import { motion, AnimatePresence } from 'motion/react';
import { cn } from '../../lib/utils';

export default function SettingsCategories() {
  const { company } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [newCategory, setNewCategory] = useState({ name: '', type: 'expense' as 'income' | 'expense' });
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  const fetchCategories = async () => {
    if (company) {
      const data = await getCompanyCategories(company.id);
      setCategories(data);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, [company]);

  const handleAddCategory = async () => {
    if (!company) return;
    setIsSaving(true);
    try {
      categorySchema.parse(newCategory);
      await createCategory({ ...newCategory, company_id: company.id, status: 'active' });
      setNewCategory({ name: '', type: 'expense' });
      toast({ type: 'success', message: 'Categoria adicionada com sucesso!' });
      await fetchCategories();
    } catch (error: any) {
      if (error?.name === 'ZodError') {
        toast({ type: 'error', message: error.errors[0]?.message });
      } else {
        toast({ type: 'error', message: 'Erro ao adicionar categoria.' });
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (window.confirm(`Excluir a categoria "${name}"?`)) {
      try {
        await deleteCategory(id);
        toast({ type: 'success', message: 'Categoria excluída!' });
        await fetchCategories();
      } catch (error) {
        toast({ type: 'error', message: 'A categoria pode estar sendo usada.' });
      }
    }
  };

  return (
    <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-gray-100 max-w-2xl">
      <div className="flex items-center space-x-3 mb-8">
        <div className="w-12 h-12 rounded-2xl bg-brand/10 flex items-center justify-center text-brand">
          <Tag size={24} />
        </div>
        <div>
          <h2 className="text-xl font-medium text-gray-900">Categorias</h2>
          <p className="text-sm text-gray-500">Organize suas receitas e despesas</p>
        </div>
      </div>

      <div className="flex gap-4 mb-8">
        <div className="flex-1">
          <input
            type="text"
            value={newCategory.name}
            onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
            placeholder="Nome da categoria..."
            className="w-full px-4 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-brand outline-none"
            onKeyDown={(e) => e.key === 'Enter' && handleAddCategory()}
          />
        </div>
        <select
          value={newCategory.type}
          onChange={(e) => setNewCategory({ ...newCategory, type: e.target.value as 'income' | 'expense' })}
          className="px-4 py-3.5 bg-gray-50 border border-gray-200 rounded-2xl focus:ring-2 focus:ring-brand outline-none w-32"
        >
          <option value="expense">Despesa</option>
          <option value="income">Receita</option>
        </select>
        <button
          onClick={handleAddCategory}
          disabled={!newCategory.name.trim() || isSaving}
          className="bg-brand text-white px-6 rounded-2xl hover:bg-[#4A4A30] transition-colors disabled:opacity-50 font-medium whitespace-nowrap shadow-sm"
        >
          {isSaving ? '...' : <Plus size={20} />}
        </button>
      </div>

      <div className="space-y-4">
        {['expense', 'income'].map((type) => (
          <div key={type} className="bg-gray-50 p-6 rounded-2xl border border-gray-100">
            <h3 className="text-sm font-semibold text-gray-900 mb-4 uppercase tracking-wider">
              {type === 'expense' ? 'Despesas' : 'Receitas'}
            </h3>
            <div className="space-y-2">
              <AnimatePresence>
                {categories.filter(c => c.type === type).map((category) => (
                  <motion.div
                    key={category.id}
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                    className="flex items-center justify-between p-4 bg-white border border-gray-100 rounded-xl shadow-sm"
                  >
                    <span className="font-medium text-gray-700">{category.name}</span>
                    <button
                      onClick={() => handleDelete(category.id, category.name)}
                      className="text-gray-400 hover:text-red-500 hover:bg-red-50 p-2 rounded-lg transition-colors"
                    >
                      <Trash2 size={16} />
                    </button>
                  </motion.div>
                ))}
              </AnimatePresence>
              {categories.filter(c => c.type === type).length === 0 && (
                <p className="text-sm text-gray-400 p-4 text-center border-2 border-dashed border-gray-200 rounded-xl">
                  Nenhuma categoria cadastrada
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
