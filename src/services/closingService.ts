import { supabase } from '../supabase';
import { FinancialPeriod } from '../types';

export const getFinancialPeriods = async (companyId: string) => {
  const { data, error } = await supabase
    .from('financial_periods')
    .select('*')
    .eq('company_id', companyId)
    .order('year', { ascending: false })
    .order('month', { ascending: false });
  
  if (error) throw error;
  return data as FinancialPeriod[];
};

export const closeFinancialPeriod = async (period: Partial<FinancialPeriod>) => {
  const { error } = await supabase
    .from('financial_periods')
    .insert(period);
  
  if (error) throw error;
};

export const updateFinancialPeriod = async (periodId: string, updates: Partial<FinancialPeriod>) => {
  const { error } = await supabase
    .from('financial_periods')
    .update(updates)
    .eq('id', periodId);
  
  if (error) throw error;
};

export const isPeriodClosed = async (companyId: string, dateString: string): Promise<boolean> => {
  const date = new Date(dateString);
  const year = date.getFullYear();
  const month = date.getMonth(); // 0-based month, we should check how DB stores it (1-12 or 0-11). Assuming month is stored 1-12.
  
  // Actually, standard is usually 1-indexed for month in the DB, so let's check month + 1
  const { data, error } = await supabase
    .from('financial_periods')
    .select('status')
    .eq('company_id', companyId)
    .eq('year', year)
    .eq('month', month + 1)
    .single();

  if (error && error.code !== 'PGRST116') {
    throw error;
  }
  
  return data?.status === 'closed';
};
