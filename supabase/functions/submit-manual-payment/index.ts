import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.55.0";
import { corsHeaders, json } from "../_shared/http.ts";
serve(async (request) => {
  if (request.method === "OPTIONS")
    return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST")
    return json({ error: "Method not allowed" }, 405);
  const auth = request.headers.get("Authorization");
  if (!auth) return json({ error: "Authentication required" }, 401);
  const userDb = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_ANON_KEY")!,
    { global: { headers: { Authorization: auth } } },
  );
  const {
    data: { user },
  } = await userDb.auth.getUser();
  if (!user) return json({ error: "Authentication required" }, 401);
  const body = await request.json().catch(() => null);
  if (!body) return json({ error: "Invalid request" }, 400);
  const senderName = String(body.sender_name ?? "").trim();
  const transferDate = String(body.transfer_date ?? "");
  const transactionReference = String(
    body.transaction_reference ?? body.submitted_reference ?? "",
  ).trim();
  const receiptPath = String(
    body.receipt_path ?? body.receipt_storage_path ?? "",
  ).trim();
  const note = String(body.note ?? "").trim();
  const receiptPattern = new RegExp(
    `^${user.id}/[0-9a-f-]{36}\\.(?:jpe?g|png|webp|pdf)$`,
    "i",
  );
  if (
    senderName.length < 2 ||
    senderName.length > 120 ||
    !/^\\d{4}-\\d{2}-\\d{2}$/.test(transferDate) ||
    transactionReference.length > 120 ||
    note.length > 500 ||
    !receiptPattern.test(receiptPath)
  )
    return json({ error: "Please check the payment proof details" }, 400);
  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
  const fileName = receiptPath.slice(receiptPath.indexOf("/") + 1);
  const { data: receiptFiles } = await admin.storage
    .from("payment-receipts")
    .list(user.id, { search: fileName, limit: 2 });
  if (!receiptFiles?.some((file) => file.name === fileName))
    return json({ error: "Payment receipt could not be verified" }, 400);
  const reference = `manual_${crypto.randomUUID()}`;
  const { data: payment, error } = await admin
    .from("payments")
    .insert({
      user_id: user.id,
      provider: "manual",
      amount_kobo: 200000,
      reference,
    })
    .select("id")
    .single();
  if (error || !payment)
    return json({ error: "Could not create payment" }, 500);
  const { error: submissionError } = await admin
    .from("manual_payment_submissions")
    .insert({
      payment_id: payment.id,
      sender_name: senderName,
      transfer_date: transferDate,
      transaction_reference: transactionReference,
      receipt_path: receiptPath,
      note: note || null,
    });
  if (submissionError) {
    await admin
      .from("payments")
      .update({ status: "failed" })
      .eq("id", payment.id);
    return json({ error: "Could not submit payment proof" }, 500);
  }
  return json({ payment_id: payment.id, status: "submitted" }, 201);
});
