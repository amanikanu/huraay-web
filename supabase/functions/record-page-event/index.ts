import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.55.0";
import { corsHeaders, json, sha256 } from "../_shared/http.ts";

const allowed = new Set(["gift_clicked", "bank_copied", "whatsapp_intent", "share"]);

serve(async (request) => {
  if (request.method === "OPTIONS")
    return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST")
    return json({ error: "Method not allowed" }, 405);
  const body = await request.json().catch(() => null);
  const pageId = String(body?.page_id ?? "");
  const eventName = String(body?.event_name ?? "");
  const itemId = body?.wishlist_item_id
    ? String(body.wishlist_item_id)
    : null;
  if (!/^[0-9a-f-]{36}$/i.test(pageId) || !allowed.has(eventName))
    return json({ error: "Invalid event" }, 400);
  const db = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
  const { data: page } = await db
    .from("birthday_pages")
    .select("id")
    .eq("id", pageId)
    .eq("status", "published")
    .maybeSingle();
  if (!page) return json({ error: "Page not found" }, 404);
  if (eventName !== "share") {
    const token = request.headers.get("x-visitor-token");
    if (!token || token.length > 100)
      return json({ error: "Wishlist access required" }, 401);
    const { data: access } = await db
      .from("visitor_page_access")
      .select("id")
      .eq("page_id", pageId)
      .eq("token_hash", await sha256(token))
      .gt("expires_at", new Date().toISOString())
      .maybeSingle();
    if (!access) return json({ error: "Wishlist access required" }, 401);
  }
  if (itemId) {
    const { data: item } = await db
      .from("birthday_wishlist_items")
      .select("id")
      .eq("id", itemId)
      .eq("page_id", pageId)
      .maybeSingle();
    if (!item) return json({ error: "Wishlist item not found" }, 404);
  }
  const visitorHash = await sha256(
    `${request.headers.get("x-forwarded-for")?.split(",")[0] ?? "unknown"}:${Deno.env.get("RATE_LIMIT_SALT") ?? ""}`,
  );
  await db.from("page_events").insert({
    page_id: pageId,
    event_name: eventName,
    visitor_hash: visitorHash,
    wishlist_item_id: itemId,
  });
  return json({ recorded: true }, 201);
});
