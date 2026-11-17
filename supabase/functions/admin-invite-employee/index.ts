import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS'
};

const jsonResponse = (body: Record<string, unknown>, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' }
  });

Deno.serve(async (request: Request) => {
  if (request.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }
  if (request.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, 405);
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL');
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY');
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
  const authorization = request.headers.get('Authorization');
  if (!supabaseUrl || !anonKey || !serviceRoleKey) {
    console.error('Missing Supabase Edge Function configuration');
    return jsonResponse({ error: 'Employee invitations are not configured on the server.' }, 500);
  }
  if (!authorization) {
    return jsonResponse({ error: 'Authentication is required.' }, 401);
  }

  try {
    const body = await request.json();
    const fullName = typeof body.full_name === 'string' ? body.full_name.trim() : '';
    const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
    const phone = typeof body.phone === 'string' ? body.phone.trim() : '';
    const role = body.role;
    const status = body.status;

    if (!fullName || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return jsonResponse({ error: 'Enter a full name and valid email address.' }, 400);
    }
    if (!['admin', 'employee'].includes(role) || !['active', 'inactive'].includes(status)) {
      return jsonResponse({ error: 'Invalid employee role or status.' }, 400);
    }

    const userClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: authorization } },
      auth: { autoRefreshToken: false, persistSession: false }
    });
    const { data: { user: caller }, error: authError } = await userClient.auth.getUser();
    if (authError || !caller) {
      return jsonResponse({ error: 'Your session is invalid or expired.' }, 401);
    }

    const { data: callerProfile, error: profileError } = await userClient
      .from('profiles')
      .select('role, status')
      .eq('id', caller.id)
      .single();
    if (profileError || callerProfile?.role !== 'admin' || callerProfile?.status !== 'active') {
      return jsonResponse({ error: 'Administrator access is required to invite employees.' }, 403);
    }

    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: { autoRefreshToken: false, persistSession: false }
    });
    const { data: inviteData, error: inviteError } = await adminClient.auth.admin.inviteUserByEmail(email, {
      data: { full_name: fullName, phone }
    });
    if (inviteError) {
      return jsonResponse({ error: inviteError.message }, 400);
    }
    if (!inviteData.user) {
      return jsonResponse({ error: 'Supabase did not return the invited user.' }, 502);
    }

    const { data: employee, error: updateError } = await adminClient
      .from('profiles')
      .upsert({
        id: inviteData.user.id,
        full_name: fullName,
        email,
        phone: phone || null,
        role,
        status
      }, { onConflict: 'id' })
      .select()
      .single();
    if (updateError) {
      console.error('Failed to update invited employee profile', updateError.message);
      return jsonResponse({
        error: 'The invitation was created, but the employee profile could not be updated.'
      }, 500);
    }

    return jsonResponse({ employee });
  } catch (error) {
    console.error('Employee invitation failed', error instanceof Error ? error.message : error);
    return jsonResponse({ error: 'Unable to send the employee invitation.' }, 500);
  }
});
