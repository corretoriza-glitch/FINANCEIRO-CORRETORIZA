import React from 'react';
import { ResponsiveContainer, ComposedChart, CartesianGrid, XAxis, YAxis, Tooltip, Bar, Line } from 'recharts';
import { formatCurrency } from '../../lib/utils';

interface FlowData {
  name: string;
  Receitas: number;
  Despesas: number;
  Saldo: number;
}

interface CashFlowChartProps {
  data: FlowData[];
}

export function CashFlowChart({ data }: CashFlowChartProps) {
  return (
    <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-brand/5">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h3 className="text-xl font-serif font-bold text-[#1a1a1a]">Evolução de Caixa</h3>
          <p className="text-xs text-brand/60 uppercase font-bold tracking-wider">Entradas x Saídas Realizadas</p>
        </div>
      </div>
      <div className="h-[280px] w-full mt-4">
        <ResponsiveContainer width="100%" height="100%">
          <ComposedChart data={data} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f0f0f0" />
            <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#5A5A40', fontSize: 10, fontWeight: 'bold'}} dy={10} />
            <YAxis axisLine={false} tickLine={false} tick={{fill: '#5A5A40', fontSize: 10}} tickFormatter={(v) => `R$${v/1000}k`} />
            <Tooltip 
              contentStyle={{ borderRadius: '1rem', border: 'none', boxShadow: '0 10px 15px -3px rgba(0,0,0,0.1)' }}
              formatter={(value: number) => formatCurrency(value)}
            />
            <Bar dataKey="Receitas" fill="#16a34a" radius={[4, 4, 0, 0]} maxBarSize={40} />
            <Bar dataKey="Despesas" fill="#dc2626" radius={[4, 4, 0, 0]} maxBarSize={40} />
            <Line type="monotone" dataKey="Saldo" stroke="#4a4a35" strokeWidth={3} dot={{r: 4}} />
          </ComposedChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
