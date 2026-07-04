import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

// This function does not require authentication
// It's safe because it validates API key from environment

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Type': 'application/json',
};

interface EmailRequest {
  to: string;
  subject: string;
  html: string;
  replyTo?: string;
}

serve(async (req: Request) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: corsHeaders
    });
  }

  try {
    const body: EmailRequest = await req.json();
    const { to, subject, html, replyTo } = body;

    // Validate required fields
    if (!to || !subject || !html) {
      console.error('❌ Missing required fields:', { to: !!to, subject: !!subject, html: !!html });
      return new Response(
        JSON.stringify({ error: 'Missing required fields: to, subject, html' }),
        { status: 400, headers: corsHeaders }
      );
    }

    const apiKey = Deno.env.get('RESEND_API_KEY');
    if (!apiKey) {
      console.error('❌ RESEND_API_KEY not found in environment');
      return new Response(
        JSON.stringify({ error: 'RESEND_API_KEY not configured' }),
        { status: 500, headers: corsHeaders }
      );
    }

    // For testing on Resend free plan: redirect all emails to owner's email
    const testingEmail = 'leolanzmariel@gmail.com';
    const actualTo = testingEmail; // TODO: change to 'to' after verifying domain in Resend

    console.log(`📧 Sending email to ${actualTo} (original recipient: ${to}) with subject: ${subject}`);

    // Call Resend API directly via fetch
    const resendResponse = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'onboarding@resend.dev',
        to: actualTo,
        subject: subject,
        html: html,
        reply_to: 'leolanzmariel@gmail.com',
      }),
    });

    const responseData = await resendResponse.json();

    if (!resendResponse.ok) {
      console.error('❌ Resend API error:', responseData);
      return new Response(
        JSON.stringify({
          error: responseData.message || 'Failed to send email',
          details: responseData
        }),
        { status: resendResponse.status, headers: corsHeaders }
      );
    }

    console.log('✅ Email sent successfully:', responseData.id);
    return new Response(
      JSON.stringify({
        success: true,
        messageId: responseData.id
      }),
      { status: 200, headers: corsHeaders }
    );
  } catch (error: any) {
    console.error('❌ Function error:', error.message);
    return new Response(
      JSON.stringify({ error: error.message || 'Internal server error' }),
      { status: 500, headers: corsHeaders }
    );
  }
});
