declare const Deno: { env: { get(key: string): string | undefined } };

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.55.0";
import { corsHeaders, json, randomToken, sha256 } from "../_shared/http.ts";

serve(async (request: Request) => {
  if (request.method === "OPTIONS")
    return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST")
    return json({ error: "Method not allowed" }, 405);
  const body = await request.json().catch(() => null);
  if (!body) return json({ error: "Invalid request" }, 400);
  if (body.website) return json({ error: "Submission rejected" }, 400);
  if (!body.started_at || Date.now() - Number(body.started_at) < 1800)
    return json({ error: "Please take a moment before publishing" }, 429);
  const name = String(body.visitor_name ?? "").trim();
  const message = String(body.message ?? "").trim();
  const visibility = body.visibility;
  if (
    name.length < 2 ||
    name.length > 60 ||
    message.length < 2 ||
    message.length > 500 ||
    !["public", "private"].includes(visibility)
  )
    return json({ error: "Please check the wish details" }, 400);
  const db = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
  const { data: page } = await db
    .from("birthday_pages")
    .select("id")
    .eq("id", body.page_id)
    .eq("status", "published")
    .single();
  if (!page)
    return json({ error: "Birthday page is not accepting wishes" }, 404);
  const network = await sha256(
    `${request.headers.get("x-forwarded-for")?.split(",")[0] ?? "unknown"}:${Deno.env.get("RATE_LIMIT_SALT") ?? ""}`,
  );
  const since = new Date(Date.now() - 10 * 60 * 1000).toISOString();
  const { count } = await db
    .from("wish_rate_limits")
    .select("id", { count: "exact", head: true })
    .eq("page_id", page.id)
    .eq("network_hash", network)
    .gte("created_at", since);
  if ((count ?? 0) >= 5)
    return json(
      {
        error:
          "Too many wishes were attempted. Please wait a few minutes and try again.",
      },
      429,
    );
  const dayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
  const { count: dailyCount } = await db
    .from("wish_rate_limits")
    .select("id", { count: "exact", head: true })
    .eq("network_hash", network)
    .gte("created_at", dayAgo);
  if ((dailyCount ?? 0) >= 20)
    return json(
      { error: "Daily wish limit reached. Please try again tomorrow." },
      429,
    );
  await db
    .from("wish_rate_limits")
    .insert({ page_id: page.id, network_hash: network });
  const { data: photo } = await db
    .from("page_photos")
    .select("id")
    .eq("id", body.selected_photo_id)
    .eq("page_id", page.id)
    .single();
  if (!photo)
    return json({ error: "Selected photo does not belong to this page" }, 400);
  const { data: wish, error } = await db
    .from("birthday_wishes")
    .insert({
      page_id: page.id,
      selected_photo_id: photo.id,
      visitor_name: name,
      message,
      visibility,
      moderation_status: "published",
    })
    .select("id,moderation_status")
    .single();
  if (error || !wish)
    return json(
      { error: "We could not publish your wish. Please try again." },
      500,
    );
  const token = randomToken();
  const { error: accessError } = await db
    .from("visitor_page_access")
    .insert({
      page_id: page.id,
      wish_id: wish.id,
      token_hash: await sha256(token),
      expires_at: new Date(Date.now() + 86400000).toISOString(),
    });
  if (accessError) {
    await db.from("birthday_wishes").delete().eq("id", wish.id);
    return json(
      { error: "We could not finish publishing your wish. Your message is still in the form - please try again." },
      500,
    );
  }
  await db
    .from("page_events")
    .insert({
      page_id: page.id,
      event_name: "wish_submitted",
      visitor_hash: network,
    });
  return json(
    {
      wish_id: wish.id,
      moderation_status: wish.moderation_status,
      access_token: token,
      expires_in: 86400,
    },
    201,
  );
});
