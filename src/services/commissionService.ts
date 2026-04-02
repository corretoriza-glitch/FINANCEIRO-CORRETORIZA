import { supabase } from '../supabase';
import { Operation, Payout } from '../types';

export const getOperations = async (companyId: string) => {
  const { data, error } = await supabase
    .from('operations')
    .select('*')
    .eq('company_id', companyId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data as Operation[];
};

export const createOperation = async (operation: Partial<Operation>, payouts: Partial<Payout>[]) => {
  // Validate payouts sum
  const grossValue = operation.gross_value || 0;
  const totalPayouts = payouts.reduce((acc, p) => acc + (p.amount || 0), 0);

  if (totalPayouts > grossValue) {
    throw new Error('A soma dos repasses não pode exceder o valor bruto da operação.');
  }

  // Auto-calculate retained amount
  operation.corretoriza_amount = grossValue - totalPayouts;

  const { data: opData, error: opError } = await supabase
    .from('operations')
    .insert(operation)
    .select()
    .single();

  if (opError) throw opError;

  if (payouts.length > 0) {
    const payoutsWithOpId = payouts.map(p => ({ ...p, operation_id: opData.id }));

    const { error: pError } = await supabase
      .from('payouts')
      .insert(payoutsWithOpId);

    if (pError) throw pError;
  }

  return opData;
};

export const updateOperation = async (operationId: string, operation: Partial<Operation>, payouts: Partial<Payout>[]) => {
  // Validate payouts sum
  const grossValue = operation.gross_value || 0;
  const totalPayouts = payouts.reduce((acc, p) => acc + (p.amount || 0), 0);

  if (totalPayouts > grossValue) {
    throw new Error('A soma dos repasses não pode exceder o valor bruto da operação.');
  }

  // Auto-calculate retained amount
  operation.corretoriza_amount = grossValue - totalPayouts;

  const { data: opData, error: opError } = await supabase
    .from('operations')
    .update(operation)
    .eq('id', operationId)
    .select()
    .single();

  if (opError) throw opError;

  // First, delete old payouts
  const { error: delError } = await supabase
    .from('payouts')
    .delete()
    .eq('operation_id', operationId);

  if (delError) throw delError;

  if (payouts.length > 0) {
    const payoutsWithOpId = payouts.map(p => ({ ...p, operation_id: operationId }));
    const { error: insError } = await supabase
      .from('payouts')
      .insert(payoutsWithOpId);

    if (insError) throw insError;
  }

  return opData;
};

export const getPayoutsByOperation = async (operationId: string) => {
  const { data, error } = await supabase
    .from('payouts')
    .select('*')
    .eq('operation_id', operationId);

  if (error) throw error;
  return data as Payout[];
};

export const updatePayoutStatus = async (payoutId: string, status: Payout['status']) => {
  const { error } = await supabase
    .from('payouts')
    .update({ status })
    .eq('id', payoutId);

  if (error) throw error;
};

export const getCompanyPayouts = async (companyId: string) => {
  const { data, error } = await supabase
    .from('payouts')
    .select('*')
    .eq('company_id', companyId)
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data as Payout[];
};

export const deleteOperation = async (operationId: string) => {
  // Delete payouts first (in case there's no CASCADE on the DB)
  const { error: pError } = await supabase
    .from('payouts')
    .delete()
    .eq('operation_id', operationId);

  if (pError) throw pError;

  const { error: opError } = await supabase
    .from('operations')
    .delete()
    .eq('id', operationId);

  if (opError) throw opError;
};
