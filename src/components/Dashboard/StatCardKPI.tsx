import React from 'react';
import { motion } from 'motion/react';
import { cn, formatCurrency } from '../../lib/utils';
import { LucideIcon } from 'lucide-react';

export interface StatCardProps {
  title: string;
  value: number;
  icon: LucideIcon;
  trend?: string;
  trendUp?: boolean;
  color: string;
  subtitle?: string;
  alert?: boolean;
}

export function StatCard({ title, value, icon: Icon, trend, trendUp, color, subtitle, alert }: StatCardProps) {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        "bg-white p-6 rounded-3xl shadow-sm border transition-all hover:shadow-md relative overflow-hidden",
        alert ? "border-red-200" : "border-brand/5"
      )}
    >
      <div className="flex justify-between items-start mb-4 relative z-10">
        <div className={cn("p-3 rounded-2xl flex items-center justify-center", color)}>
          <Icon size={24} className={alert ? "text-red-600" : "text-white"} />
        </div>
        {trend && (
          <span className={cn(
            "text-[10px] font-bold px-2 py-1 rounded-full uppercase tracking-wider",
            trendUp ? "bg-green-100 text-green-700" : "bg-red-100 text-red-700"
          )}>
            {trend}
          </span>
        )}
      </div>
      <p className="text-brand/60 text-xs font-bold mb-1 uppercase tracking-widest relative z-10">{title}</p>
      <h3 className={cn("text-2xl font-bold relative z-10", alert ? "text-red-600" : "text-[#1a1a1a]")}>
        {formatCurrency(value)}
      </h3>
      {subtitle && <p className="text-[10px] text-brand/40 mt-2 font-semibold uppercase relative z-10">{subtitle}</p>}
      
      {/* Decorative Blur Background for alert cards */}
      {alert && <div className="absolute -bottom-10 -right-10 w-32 h-32 bg-red-50 rounded-full blur-2xl z-0" />}
    </motion.div>
  );
}
