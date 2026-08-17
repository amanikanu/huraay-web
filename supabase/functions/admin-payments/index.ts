import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.55.0";
import { corsHeaders, json } from "../_shared/http.ts";

serve(async (request) => {
  if (request.method === "OPTIONS")
    return new Response("ok", { headers: corsHeaders });
  if (request.method !== "GET")
    return json({ error: "Method not allowed" }, 405);
  const auth = request.headers.get("Authorization");
  if (!auth) return json({ error: "Authentication required" }, 401);
  const userDb = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: auth } } },
  );
  const { data: { user } } = await userDb.auth.getUser();
  if (!user) return json({ error: "Authentication required" }, 401);
  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
  const { data: role } = await admin
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .eq("role", "admin")
    .maybeSingle();
  if (!role) return json({ error: "Administrator access required" }, 403);
  const { data: submissions, error } = await admin
    .from("manual_payment_submissions")
    .select("id,payment_id,sender_name,transfer_date,transaction_reference,receipt_path,note,status,decision_reason,created_at,updated_at")
    .order("created_at", { ascending: true })
    .limit(200);
  if (error) return json({ error: "Payment queue could not be loaded" }, 500);
  const paymentIds = (submissions ?? []).map((row) => row.payment_id);
  const { data: payments } = paymentIds.length
    ? await admin
        .from("payments")
        .select("id,user_id,amount_kobo,currency,reference,status,created_at")
        .in("id", paymentIds)
    : { data: [] };
  const userIds = [...new Set((payments ?? []).map((row) => row.user_id))];
  const { data: profiles } = userIds.length
    ? await admin
        .from("profiles")
        .select("id,full_name,display_name")
        .in("id", userIds)
    : { data: [] };
  const rows = await Promise.all((submissions ?? []).map(async (submission) => {
    const payment = (payments ?? []).find((row) => row.id === submission.payment_id);
    const profile = (profiles ?? []).find((row) => row.id === payment?.user_id);
    const { data: receipt } = await admin.storage
      .from("payment-receipts")
      .createSignedUrl(submission.receipt_path, 900);
    return {
      ...submission,
      receipt_url: receipt?.signedUrl ?? null,
      payment,
      profile: profile ?? null,
    };
  }));
  return json({ submissions: rows });
});
