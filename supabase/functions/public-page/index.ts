import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.55.0";
import { corsHeaders, json, sha256 } from "../_shared/http.ts";

serve(async (request) => {
  if (request.method === "OPTIONS")
    return new Response("ok", { headers: corsHeaders });
  const slug = new URL(request.url).searchParams.get("slug")?.slice(0, 100);
  if (!slug || !/^[a-z0-9-]{3,100}$/.test(slug))
    return json({ error: "Invalid page slug" }, 400);
  const db = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
  const { data: page, error } = await db
    .from("birthday_pages")
    .select(
      "id,slug,celebrant_name,birthday_date,headline,introduction,theme_key,custom_primary,custom_accent,status,show_fulfilled_items,transfer_bank_name,transfer_account_number,transfer_account_name",
    )
    .or(`slug.eq.${slug},vanity_slug.eq.${slug}`)
    .eq("status", "published")
    .single();
  if (error || !page) return json({ error: "Page not found" }, 404);
  const visitorHash = await sha256(
    `${request.headers.get("x-forwarded-for")?.split(",")[0] ?? "unknown"}:${Deno.env.get("RATE_LIMIT_SALT") ?? ""}`,
  );
  await db.from("page_events").insert({
    page_id: page.id,
    event_name: "page_view",
    visitor_hash: visitorHash,
  });
  const [{ data: photos }, { data: wishes }] = await Promise.all([
    db
      .from("page_photos")
      .select("id,storage_path,alt_text,width,height,sort_order,is_cover")
      .eq("page_id", page.id)
      .order("sort_order"),
    db
      .from("birthday_wishes")
      .select("id,visitor_name,message,selected_photo_id,created_at,pinned_at")
      .eq("page_id", page.id)
      .eq("visibility", "public")
      .eq("moderation_status", "published")
      .order("pinned_at", { ascending: false, nullsFirst: false })
      .order("created_at", { ascending: false }),
  ]);
  const safePhotos = await Promise.all(
    (photos ?? []).map(async (photo) => {
      const { data } = await db.storage
        .from("birthday-media")
        .createSignedUrl(photo.storage_path, 3600);
      return { ...photo, signed_url: data?.signedUrl };
    }),
  );
  return json({
    page,
    photos: safePhotos,
    wishes: wishes ?? [],
    wish_count: wishes?.length ?? 0,
  });
});
