declare const Deno: { env: { get(key: string): string | undefined } };

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.55.0";
import { corsHeaders, json } from "../_shared/http.ts";

serve(async (request: Request) => {
  if (request.method === "OPTIONS")
    return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST")
    return json({ error: "Method not allowed" }, 405);

  const authHeader = request.headers.get("Authorization");
  if (!authHeader) return json({ error: "Sign in required" }, 401);

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const userClient = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });
  const {
    data: { user },
    error: userError,
  } = await userClient.auth.getUser();

  if (userError || !user) return json({ error: "Sign in required" }, 401);

  const admin = createClient(supabaseUrl, serviceRoleKey);
  const { error } = await admin.from("account_entitlements").upsert({
    user_id: user.id,
    plan: "pro",
    updated_at: new Date().toISOString(),
  });

  if (error) return json({ error: "Could not apply launch entitlement" }, 500);

  return json({ plan: "pro" });
});
