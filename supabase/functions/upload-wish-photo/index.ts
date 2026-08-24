declare const Deno: { env: { get(key: string): string | undefined } };

import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.55.0";
import { corsHeaders, json, sha256 } from "../_shared/http.ts";

const allowedTypes = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/avif",
  "image/heic",
]);

serve(async (request: Request) => {
  if (request.method === "OPTIONS")
    return new Response("ok", { headers: corsHeaders });
  if (request.method !== "POST")
    return json({ error: "Method not allowed" }, 405);

  const form = await request.formData().catch(() => null);
  if (!form) return json({ error: "Invalid request" }, 400);

  const pageId = String(form.get("page_id") ?? "").trim();
  const photo = form.get("photo");
  if (!pageId) return json({ error: "Birthday page is required" }, 400);
  if (!(photo instanceof File) || photo.size === 0)
    return json({ error: "Choose a photo to upload" }, 400);
  if (!allowedTypes.has(photo.type))
    return json({ error: "Choose a JPG, PNG, or WebP photo" }, 400);
  if (photo.size > 10 * 1024 * 1024)
    return json({ error: "Photo must be smaller than 10 MB" }, 400);

  const db = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );

  const { data: page } = await db
    .from("birthday_pages")
    .select("id")
    .eq("id", pageId)
    .neq("status", "archived")
    .maybeSingle();

  if (!page)
    return json({ error: "Birthday board is not accepting uploads" }, 404);

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

  if ((count ?? 0) >= 10)
    return json(
      { error: "Too many photo uploads. Please wait a few minutes and try again." },
      429,
    );

  await db
    .from("wish_rate_limits")
    .insert({ page_id: page.id, network_hash: network });

  const cleanName = photo.name.replace(/[^a-zA-Z0-9.-]/g, "_") || "wish-photo.webp";
  const path = `wishes/${page.id}/${crypto.randomUUID()}-${cleanName}`;
  const contentType = photo.type === "image/heic" ? "image/jpeg" : photo.type;

  const { error: uploadError } = await db.storage
    .from("birthday-media")
    .upload(path, photo, { contentType, upsert: false });

  if (uploadError)
    return json({ error: "We could not upload your photo. Please try again." }, 500);

  return json({ path }, 201);
});
