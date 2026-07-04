import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Content-Type': 'application/json',
};

interface DeleteUserRequest {
  email: string;
}

serve(async (req: Request) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ error: 'Method not allowed' }),
      { status: 405, headers: corsHeaders }
    );
  }

  try {
    const body: DeleteUserRequest = await req.json();
    const { email } = body;

    if (!email) {
      return new Response(
        JSON.stringify({ error: 'Email is required' }),
        { status: 400, headers: corsHeaders }
      );
    }

    const serviceRoleKey = Deno.env.get('SERVICE_ROLE_KEY');
    const supabaseUrl = Deno.env.get('SUPABASE_URL');

    if (!serviceRoleKey || !supabaseUrl) {
      console.error('❌ Missing SERVICE_ROLE_KEY or SUPABASE_URL');
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        { status: 500, headers: corsHeaders }
      );
    }

    console.log(`🗑️ Attempting to delete user with email: ${email}`);

    // Use Supabase Admin API to delete user
    const response = await fetch(
      `${supabaseUrl}/auth/v1/admin/users`,
      {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${serviceRoleKey}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!response.ok) {
      throw new Error(`Failed to list users: ${response.statusText}`);
    }

    const users = await response.json();
    const userToDelete = users.users?.find((u: any) => u.email === email);

    if (!userToDelete) {
      return new Response(
        JSON.stringify({ error: 'User not found' }),
        { status: 404, headers: corsHeaders }
      );
    }

    // Delete the user
    const deleteResponse = await fetch(
      `${supabaseUrl}/auth/v1/admin/users/${userToDelete.id}`,
      {
        method: 'DELETE',
        headers: {
          'Authorization': `Bearer ${serviceRoleKey}`,
          'Content-Type': 'application/json',
        },
      }
    );

    if (!deleteResponse.ok) {
      const errorText = await deleteResponse.text();
      console.error(`❌ Delete failed: ${errorText}`);
      throw new Error(`Failed to delete user: ${deleteResponse.statusText}`);
    }

    console.log(`✅ User deleted successfully: ${email}`);
    return new Response(
      JSON.stringify({
        success: true,
        message: `User ${email} deleted successfully`,
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
