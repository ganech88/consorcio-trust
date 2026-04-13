// Edge Function: mp-config
// Securely manages MercadoPago configuration (access_token never exposed to frontend)

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';
    const supabase = createClient(supabaseUrl, serviceRoleKey);

    // Authenticate user from JWT
    const authHeader = req.headers.get('Authorization');
    if (!authHeader?.startsWith('Bearer ')) {
      return new Response(JSON.stringify({ error: 'Missing authorization token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);

    if (authError || !user) {
      return new Response(JSON.stringify({ error: 'Invalid token' }), {
        status: 401,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (req.method === 'GET') {
      return await handleGet(req, supabase, user.id);
    }

    if (req.method === 'POST') {
      return await handlePost(req, supabase, user.id);
    }

    return new Response(JSON.stringify({ error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Internal server error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});

async function verifyAdmin(
  supabase: ReturnType<typeof createClient>,
  userId: string,
  consortiumId: string,
): Promise<boolean> {
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', userId)
    .eq('consortium_id', consortiumId)
    .maybeSingle();

  if (error || !profile) return false;
  return profile.role === 'admin' || profile.role === 'super_admin';
}

async function handleGet(
  req: Request,
  supabase: ReturnType<typeof createClient>,
  userId: string,
): Promise<Response> {
  const url = new URL(req.url);
  const consortiumId = url.searchParams.get('consortium_id');

  if (!consortiumId) {
    return new Response(JSON.stringify({ error: 'consortium_id is required' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const isAdmin = await verifyAdmin(supabase, userId, consortiumId);
  if (!isAdmin) {
    return new Response(JSON.stringify({ error: 'Unauthorized: admin role required' }), {
      status: 403,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const { data, error } = await supabase
    .from('mp_config')
    .select('id, public_key, enabled')
    .eq('consortium_id', consortiumId)
    .maybeSingle();

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  return new Response(JSON.stringify(data), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

async function handlePost(
  req: Request,
  supabase: ReturnType<typeof createClient>,
  userId: string,
): Promise<Response> {
  const body = await req.json();
  const { consortium_id, access_token, public_key, enabled } = body;

  if (!consortium_id) {
    return new Response(JSON.stringify({ error: 'consortium_id is required' }), {
      status: 400,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const isAdmin = await verifyAdmin(supabase, userId, consortium_id);
  if (!isAdmin) {
    return new Response(JSON.stringify({ error: 'Unauthorized: admin role required' }), {
      status: 403,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  const upsertData: Record<string, unknown> = {
    consortium_id,
    updated_at: new Date().toISOString(),
  };

  if (access_token !== undefined && access_token !== null && access_token !== '') {
    upsertData.access_token = access_token;
  }
  if (public_key !== undefined) {
    upsertData.public_key = public_key;
  }
  if (enabled !== undefined) {
    upsertData.enabled = enabled;
  }

  const { data, error } = await supabase
    .from('mp_config')
    .upsert(upsertData, { onConflict: 'consortium_id' })
    .select('id, public_key, enabled')
    .single();

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  return new Response(JSON.stringify(data), {
    status: 200,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}
