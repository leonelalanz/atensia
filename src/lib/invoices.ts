import { supabase } from './supabase';
import { generateInvoicePDF } from './invoicePDF';

export async function generateInvoiceNumber(): Promise<string> {
  // Format: INV-2026-0001
  const year = new Date().getFullYear();

  // Get the last invoice number for this year
  const { data } = await supabase
    .from('invoices')
    .select('invoice_number')
    .like('invoice_number', `INV-${year}%`)
    .order('created_at', { ascending: false })
    .limit(1)
    .single();

  let nextNumber = 1;
  if (data?.invoice_number) {
    const lastNumber = parseInt(data.invoice_number.split('-')[2], 10);
    nextNumber = lastNumber + 1;
  }

  return `INV-${year}-${String(nextNumber).padStart(4, '0')}`;
}

export async function createInvoice(invoice: {
  paymentProofId: string;
  companyId: string;
  companyName: string;
  companyEmail?: string;
  plan: string;
  amount: number;
}): Promise<{ success: boolean; invoiceUrl?: string; error?: string }> {
  try {
    // Generate invoice number
    const invoiceNumber = await generateInvoiceNumber();

    // Generate PDF
    const pdf = generateInvoicePDF({
      invoiceNumber,
      companyName: invoice.companyName,
      companyEmail: invoice.companyEmail,
      clientName: invoice.companyName,
      plan: invoice.plan,
      amount: invoice.amount,
      currency: 'USD',
      issuedDate: new Date().toISOString().split('T')[0],
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    });

    // Upload PDF to storage
    const fileName = `invoices/${invoiceNumber}-${Date.now()}.pdf`;
    const { data: uploadData, error: uploadError } = await supabase.storage
      .from('invoices')
      .upload(fileName, pdf.output('blob'));

    if (uploadError) throw uploadError;

    // Get public URL
    const { data: urlData } = supabase.storage
      .from('invoices')
      .getPublicUrl(fileName);

    // Save invoice to database
    const { error: dbError } = await supabase.from('invoices').insert({
      payment_proof_id: invoice.paymentProofId,
      company_id: invoice.companyId,
      invoice_number: invoiceNumber,
      plan: invoice.plan,
      amount: invoice.amount,
      pdf_url: urlData.publicUrl,
      status: 'pending',
    });

    if (dbError) throw dbError;

    console.log('✅ Invoice created:', invoiceNumber);
    return { success: true, invoiceUrl: urlData.publicUrl };
  } catch (error: any) {
    console.error('❌ Error creating invoice:', error);
    return { success: false, error: error.message };
  }
}

export async function markInvoiceAsPaid(invoiceId: string): Promise<boolean> {
  try {
    const { error } = await supabase
      .from('invoices')
      .update({ status: 'paid' })
      .eq('id', invoiceId);

    if (error) throw error;
    console.log('✅ Invoice marked as paid');
    return true;
  } catch (error: any) {
    console.error('❌ Error marking invoice as paid:', error);
    return false;
  }
}

export async function getInvoicesByCompany(companyId: string): Promise<any[]> {
  try {
    const { data, error } = await supabase
      .from('invoices')
      .select('*')
      .eq('company_id', companyId)
      .order('created_at', { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (error: any) {
    console.error('❌ Error fetching invoices:', error);
    return [];
  }
}

export async function getInvoice(invoiceId: string): Promise<any> {
  try {
    const { data, error } = await supabase
      .from('invoices')
      .select('*')
      .eq('id', invoiceId)
      .single();

    if (error) throw error;
    return data;
  } catch (error: any) {
    console.error('❌ Error fetching invoice:', error);
    return null;
  }
}
