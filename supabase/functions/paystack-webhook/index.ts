import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.55.0";
serve(async (request) => {
  if (request.method !== "POST")
    return new Response("method not allowed", { status: 405 });
  const paystackSecret = Deno.env.get("PAYSTACK_SECRET_KEY");
  if (!paystackSecret)
    return new Response("payment provider not configured", { status: 503 });
  const raw = await request.text();
  const signature = request.headers.get("x-paystack-signature") ?? "";
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(paystackSecret),
    { name: "HMAC", hash: "SHA-512" },
    false,
    ["verify"],
  );
  const bytes = Uint8Array.from(signature.match(/.{1,2}/g) ?? [], (byte) =>
    parseInt(byte, 16),
  );
  if (
    !(await crypto.subtle.verify(
      "HMAC",
      key,
      bytes,
      new TextEncoder().encode(raw),
    ))
  )
    return new Response("invalid", { status: 401 });
  let event: {
    event?: string;
    data?: {
      currency?: string;
      status?: string;
      reference?: string;
      amount?: number;
      [key: string]: unknown;
    };
  };
  try {
    event = JSON.parse(raw);
  } catch {
    return new Response("invalid payload", { status: 400 });
  }
  if (event.event !== "charge.success") return new Response("ok");
  if (event.data?.currency !== "NGN" || event.data?.status !== "success")
    return new Response("ok");
  const db = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
  const { data: payment } = await db
    .from("payments")
    .select("id,user_id,status")
    .eq("reference", event.data.reference)
    .eq("amount_kobo", event.data.amount)
    .single();
  if (!payment || payment.status === "successful") return new Response("ok");
  const { data: confirmed } = await db
    .from("payments")
    .update({
      status: "successful",
      verified_at: new Date().toISOString(),
      provider_payload: event.data,
    })
    .eq("id", payment.id)
    .eq("status", "pending")
    .select("id")
    .maybeSingle();
  if (!confirmed) return new Response("ok");
  await db
    .from("account_entitlements")
    .upsert(
      {
        user_id: payment.user_id,
        plan: "pro",
        activated_at: new Date().toISOString(),
        payment_id: payment.id,
      },
      { onConflict: "user_id" },
    );
  return new Response("ok");
});
