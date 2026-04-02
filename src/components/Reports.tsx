import React, { useEffect, useState } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  Cell, PieChart, Pie, Legend 
} from 'recharts';
import { useAuth } from './AuthGuard';
import { Transaction, Category } from '../types';
import { formatCurrency, cn } from '../lib/utils';
import { FileText, Download, Filter, ChevronDown } from 'lucide-react';
import { getTransactions } from '../services/transactionService';
import { getCompanyCategories } from '../services/settingsService';

export function Reports() {
  const { user } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);

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
      console.error('Error fetching reports data:', error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [user]);

  // Data processing for Category Chart
  const categoryData = categories.map(cat => {
    const total = transactions
      .filter(t => t.category_id === cat.id)
      .reduce((acc, t) => acc + t.amount, 0);
    return { name: cat.name, value: total, type: cat.type };
  }).filter(d => d.value > 0);

  const incomeByCategory = categoryData.filter(d => d.type === 'income');
  const expenseByCategory = categoryData.filter(d => d.type === 'expense');

  const COLORS = ['#5A5A40', '#8B8B6B', '#A8A88F', '#C5C5B3', '#E2E2D7'];

  return (
    <div className="space-y-8">
      <header className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-serif font-bold text-[#1a1a1a]">Relatórios Analíticos</h2>
          <p className="text-brand/60">Visão detalhada da saúde financeira da corretora.</p>
        </div>
        <button className="flex items-center gap-2 bg-brand text-white px-6 py-3 rounded-full font-bold hover:bg-[#4a4a35] transition-all shadow-lg">
          <Download size={20} />
          Exportar Dados
        </button>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Expenses by Category */}
        <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-brand/5">
          <h3 className="text-xl font-serif font-bold text-[#1a1a1a] mb-6">Despesas por Categoria</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={expenseByCategory}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={80}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {expenseByCategory.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Income by Category */}
        <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-brand/5">
          <h3 className="text-xl font-serif font-bold text-[#1a1a1a] mb-6">Receitas por Categoria</h3>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={incomeByCategory} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#f0f0f0" />
                <XAxis type="number" hide />
                <YAxis dataKey="name" type="category" axisLine={false} tickLine={false} width={120} tick={{fill: '#5A5A40', fontSize: 12}} />
                <Tooltip formatter={(value: number) => formatCurrency(value)} />
                <Bar dataKey="value" fill="#5A5A40" radius={[0, 10, 10, 0]} barSize={30} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Analytical Table */}
      <div className="bg-white rounded-[2rem] shadow-sm border border-brand/5 overflow-hidden">
        <div className="p-6 border-b border-brand/5 flex justify-between items-center">
          <h3 className="text-lg font-serif font-bold text-[#1a1a1a]">Detalhamento de Fluxo</h3>
          <div className="flex gap-2">
             <button className="flex items-center gap-2 px-3 py-1 bg-[#f5f5f0] rounded-lg text-xs font-bold text-brand">
               <Filter size={14} /> Filtrar
             </button>
          </div>
        </div>
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-[#f5f5f0]/50">
              <th className="px-6 py-4 text-[10px] uppercase tracking-widest text-brand/60 font-bold">Categoria</th>
              <th className="px-6 py-4 text-[10px] uppercase tracking-widest text-brand/60 font-bold">Tipo</th>
              <th className="px-6 py-4 text-[10px] uppercase tracking-widest text-brand/60 font-bold">Total Acumulado</th>
              <th className="px-6 py-4 text-[10px] uppercase tracking-widest text-brand/60 font-bold">% do Total</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-brand/5">
            {categoryData.sort((a, b) => b.value - a.value).map((item, idx) => (
              <tr key={idx} className="hover:bg-[#f5f5f0]/30 transition-colors">
                <td className="px-6 py-4 text-sm font-semibold text-[#1a1a1a]">{item.name}</td>
                <td className="px-6 py-4">
                  <span className={cn(
                    "text-[10px] uppercase font-bold px-2 py-1 rounded",
                    item.type === 'income' ? "text-green-600 bg-green-50" : "text-red-600 bg-red-50"
                  )}>
                    {item.type === 'income' ? 'Receita' : 'Despesa'}
                  </span>
                </td>
                <td className="px-6 py-4 text-sm font-bold text-brand">{formatCurrency(item.value)}</td>
                <td className="px-6 py-4">
                  <div className="w-full bg-[#f5f5f0] h-2 rounded-full overflow-hidden">
                    <div 
                      className="bg-brand h-full" 
                      style={{ width: `${(item.value / (item.type === 'income' ? incomeByCategory.reduce((a,b)=>a+b.value,0) : expenseByCategory.reduce((a,b)=>a+b.value,0))) * 100}%` }} 
                    />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
