declare const Deno: { env: { get(key: string): string | undefined } };

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.55.0";
import { corsHeaders, json } from "../_shared/http.ts";

function normalizePhone(value: string) {
  const digits = value.replace(/\D/g, "");
  return digits.startsWith("0") && digits.length === 11
    ? `234${digits.slice(1)}`
    : digits;
}

serve(async (request: Request) => {
  if (request.method === "OPTIONS")
    return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST")
    return json({ error: "Method not allowed" }, 405);

  const authHeader = request.headers.get("Authorization");
  if (!authHeader) return json({ error: "Sign in required" }, 401);

  const body = await request.json().catch(() => null);
  if (!body?.page_id) return json({ error: "Birthday page is required" }, 400);

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

  const { data: page } = await admin
    .from("birthday_pages")
    .select("id,owner_id")
    .eq("id", body.page_id)
    .maybeSingle();

  if (!page || page.owner_id !== user.id)
    return json({ error: "You can only edit your own Birthday Board" }, 403);

  const name = String(body.celebrant_name ?? "").trim();
  const date = String(body.birthday_date ?? "").trim();
  const headline = String(body.headline ?? "").trim();
  const intro = String(body.introduction ?? "").trim();
  const theme = String(body.theme_key ?? "").trim();
  const phone = normalizePhone(String(body.whatsapp_number ?? ""));

  if (!name || !date || !phone)
    return json({ error: "Add a valid name, birthday date, and WhatsApp number" }, 400);

  await admin.from("account_entitlements").upsert({
    user_id: user.id,
    plan: "pro",
    updated_at: new Date().toISOString(),
  });

  const now = new Date().toISOString();
  const { data: updated, error } = await admin
    .from("birthday_pages")
    .update({
      celebrant_name: name,
      birthday_date: date,
      headline: headline || `${name}'s Birthday`,
      introduction: intro,
      whatsapp_number: phone,
      theme_key: theme,
      transfer_bank_name: body.transfer_bank_name ?? null,
      transfer_account_number: body.transfer_account_number ?? null,
      transfer_account_name: body.transfer_account_name ?? null,
      status: "published",
      published_at: now,
      updated_at: now,
    })
    .eq("id", page.id)
    .select("slug")
    .single();

  if (error || !updated)
    return json({ error: "Could not save your Birthday Board" }, 500);

  return json({ slug: updated.slug });
});
