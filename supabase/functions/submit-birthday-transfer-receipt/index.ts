import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.55.0";
import { corsHeaders, json, sha256 } from "../_shared/http.ts";

serve(async (request) => {
  if (request.method === "OPTIONS")
    return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST")
    return json({ error: "Method not allowed" }, 405);

  const form = await request.formData().catch(() => null);
  const token = request.headers.get("x-visitor-token");
  const pageId = form?.get("page_id");
  if (typeof pageId !== "string" || !pageId || !token)
    return json({ error: "Transfer access required" }, 401);

  const visitorDb = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const accessHash = await sha256(token);
  const { data: access } = await visitorDb
    .from("visitor_page_access")
    .select("id,page_id,wish_id,expires_at")
    .eq("page_id", pageId)
    .eq("token_hash", accessHash)
    .gt("expires_at", new Date().toISOString())
    .single();

  if (!access)
    return json({ error: "Invalid or expired transfer access" }, 401);

  const { data: page } = await visitorDb
    .from("birthday_pages")
    .select("id,owner_id,status")
    .eq("id", pageId)
    .eq("status", "published")
    .single();

  if (!page) return json({ error: "Birthday page is no longer published" }, 403);

  if (!form) return json({ error: "Invalid request" }, 400);

  const senderName = String(form.get("sender_name") ?? "").trim();
  const transferDate = String(form.get("transfer_date") ?? "").trim();
  const transactionReference = String(
    form.get("transaction_reference") ?? "",
  ).trim();
  const amountRaw = String(form.get("amount") ?? "").trim();
  const note = String(form.get("note") ?? "").trim();
  const receipt = form.get("receipt");

  if (
    senderName.length < 2 ||
    senderName.length > 120 ||
    !/^\d{4}-\d{2}-\d{2}$/.test(transferDate)
  )
    return json({ error: "Please check the receipt details" }, 400);

  if (!receipt || !(receipt instanceof File) || receipt.size === 0)
    return json({ error: "Upload the transfer receipt" }, 400);

  if (
    !["image/jpeg", "image/png", "image/webp", "application/pdf"].includes(
      receipt.type,
    )
  )
    return json({ error: "Choose an image or PDF receipt" }, 400);

  if (receipt.size > 8 * 1024 * 1024)
    return json({ error: "Receipt must be smaller than 8 MB" }, 400);

  const amount =
    amountRaw === ""
      ? null
      : Number(amountRaw.replace(/,/g, ""));
  if (amountRaw !== "" && (!Number.isFinite(amount) || amount < 0))
    return json({ error: "Enter a valid receipt amount" }, 400);

  const extension =
    receipt.name.split(".").pop()?.toLowerCase() ||
    (receipt.type === "application/pdf" ? "pdf" : "webp");
  const receiptPath = `${page.owner_id}/${page.id}/${crypto.randomUUID()}.${extension}`;

  const { error: uploadError } = await visitorDb.storage
    .from("birthday-transfer-receipts")
    .upload(receiptPath, receipt, { contentType: receipt.type, upsert: false });

  if (uploadError)
    return json({ error: "Transfer receipt could not be saved" }, 500);

  const { data: inserted, error: insertError } = await visitorDb
    .from("birthday_transfer_receipts")
    .insert({
      page_id: page.id,
      wish_id: access.wish_id,
      sender_name: senderName,
      transfer_date: transferDate,
      transaction_reference: transactionReference || null,
      amount,
      note: note || null,
      receipt_path: receiptPath,
    })
    .select("id")
    .single();

  if (insertError || !inserted) {
    await visitorDb.storage.from("birthday-transfer-receipts").remove([receiptPath]);
    return json({ error: "Could not record the transfer receipt" }, 500);
  }

  return json({ receipt_id: inserted.id, status: "submitted" }, 201);
});
