import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.55.0";
import { corsHeaders, json, sha256 } from "../_shared/http.ts";
serve(async (request) => {
  if (request.method === "OPTIONS")
    return new Response("ok", { headers: corsHeaders });
  const pageId = new URL(request.url).searchParams.get("page_id");
  const token = request.headers.get("x-visitor-token");
  if (!pageId || !token || token.length > 100)
    return json({ error: "Wishlist access required" }, 401);
  const db = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
  const hash = await sha256(token);
  const { data: access } = await db
    .from("visitor_page_access")
    .select("id")
    .eq("page_id", pageId)
    .eq("token_hash", hash)
    .gt("expires_at", new Date().toISOString())
    .single();
  if (!access)
    return json({ error: "Invalid or expired wishlist access" }, 401);
  const { data: page } = await db
    .from("birthday_pages")
    .select(
      "whatsapp_number,status,transfer_bank_name,transfer_account_number,transfer_account_name",
    )
    .eq("id", pageId)
    .eq("status", "published")
    .single();
  if (!page) return json({ error: "Page is no longer published" }, 403);
  const { data: items } = await db
    .from("birthday_wishlist_items")
    .select(
      "id,name,description,image_path,price,currency,purchase_url,available_anywhere,allow_bank_transfer,status,sort_order,bank_account_id",
    )
    .eq("page_id", pageId)
    .neq("status", "hidden")
    .order("sort_order");
  const bankIds = [
    ...new Set(
      (items ?? [])
        .filter((i) => i.allow_bank_transfer && i.bank_account_id)
        .map((i) => i.bank_account_id),
    ),
  ];
  const { data: accounts } = bankIds.length
    ? await db
        .from("bank_accounts")
        .select("id,bank_name,account_number,account_name")
        .in("id", bankIds)
    : { data: [] };
  const safeItems = await Promise.all(
    (items ?? []).map(async (item) => {
      if (!item.image_path) return item;
      const { data } = await db.storage
        .from("wishlist-media")
        .createSignedUrl(item.image_path, 1800);
      return { ...item, image_url: data?.signedUrl, image_path: undefined };
    }),
  );
  await Promise.all([
    db
      .from("visitor_page_access")
      .update({ last_used_at: new Date().toISOString() })
      .eq("id", access.id),
    db
      .from("page_events")
      .insert({ page_id: pageId, event_name: "wishlist_unlocked" }),
  ]);
  return json({
    items: safeItems,
    bank_accounts: accounts ?? [],
    transfer_account:
      page.transfer_bank_name &&
      page.transfer_account_number &&
      page.transfer_account_name
        ? {
            bank_name: page.transfer_bank_name,
            account_number: page.transfer_account_number,
            account_name: page.transfer_account_name,
          }
        : null,
    whatsapp_number: page.whatsapp_number,
  });
});
