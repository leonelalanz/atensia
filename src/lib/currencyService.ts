import { supabase } from './supabase';

export type Currency = 'USD' | 'VES';

const PLAN_PRICES_USD = {
  basic: 29,
  professional: 79,
  enterprise: 199,
};

export async function getLatestExchangeRate(): Promise<number> {
  const { data, error } = await supabase
    .from('exchange_rates')
    .select('rate')
    .order('effective_date', { ascending: false })
    .limit(1)
    .single();

  if (error || !data) return 4500000; // Fallback
  return data.rate;
}

export async function convertUSDToVES(usdAmount: number): Promise<number> {
  const rate = await getLatestExchangeRate();
  return usdAmount * rate;
}

export async function convertVESToUSD(vesAmount: number): Promise<number> {
  const rate = await getLatestExchangeRate();
  return vesAmount / rate;
}

export function getPlanPrice(plan: 'basic' | 'professional' | 'enterprise'): number {
  return PLAN_PRICES_USD[plan];
}

export async function getPlanInCurrency(
  plan: 'basic' | 'professional' | 'enterprise',
  currency: Currency
): Promise<number> {
  const usdPrice = getPlanPrice(plan);
  if (currency === 'USD') return usdPrice;
  return convertUSDToVES(usdPrice);
}

export async function updateExchangeRate(rate: number, userId: string): Promise<void> {
  const { error } = await supabase
    .from('exchange_rates')
    .insert({
      rate,
      updated_by: userId,
      effective_date: new Date().toISOString(),
    });

  if (error) throw error;
}

export async function getExchangeRateHistory(limit: number = 30): Promise<any[]> {
  const { data, error } = await supabase
    .from('exchange_rates')
    .select('*, updated_by:profiles(full_name, email)')
    .order('effective_date', { ascending: false })
    .limit(limit);

  if (error) return [];
  return data || [];
}

export function formatPrice(amount: number, currency: Currency): string {
  if (currency === 'USD') {
    return `$${amount.toFixed(2)}`;
  }
  return `${Math.round(amount).toLocaleString('es-VE')} VES`;
}

export function formatPriceDisplay(usdAmount: number, vesAmount: number): string {
  return `$${usdAmount.toFixed(2)} USD / ${Math.round(vesAmount).toLocaleString('es-VE')} VES`;
}
