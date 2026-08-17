import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.55.0";
import { corsHeaders, json } from "../_shared/http.ts";
serve(async (request) => {
  if (request.method === "OPTIONS")
    return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST")
    return json({ error: "Method not allowed" }, 405);
  const paystackSecret = Deno.env.get("PAYSTACK_SECRET_KEY");
  const appOrigin = Deno.env.get("APP_ORIGIN");
  if (!paystackSecret || !appOrigin)
    return json({ error: "Paystack is not configured yet" }, 503);
  const auth = request.headers.get("Authorization");
  if (!auth) return json({ error: "Authentication required" }, 401);
  const db = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: auth } } },
  );
  const {
    data: { user },
  } = await db.auth.getUser();
  if (!user?.email) return json({ error: "Authentication required" }, 401);
  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
  const reference = `huraay_${crypto.randomUUID()}`;
  const { data: payment } = await admin
    .from("payments")
    .insert({
      user_id: user.id,
      provider: "paystack",
      amount_kobo: 200000,
      reference,
    })
    .select("id")
    .single();
  const provider = await fetch(
    "https://api.paystack.co/transaction/initialize",
    {
      method: "POST",
      headers: {
        Authorization: `Bearer ${paystackSecret}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: user.email,
        amount: 200000,
        reference,
        callback_url: `${appOrigin}/app/upgrade/success`,
        metadata: { payment_id: payment?.id, user_id: user.id },
      }),
    },
  );
  const result = await provider.json();
  if (!provider.ok) {
    if (payment?.id)
      await admin
        .from("payments")
        .update({ status: "failed" })
        .eq("id", payment.id);
    return json({ error: "Could not initialize payment" }, 502);
  }
  return json({ authorization_url: result.data.authorization_url, reference });
});
