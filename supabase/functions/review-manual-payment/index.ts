import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.55.0";
import { corsHeaders, json } from "../_shared/http.ts";
serve(async (request) => {
  if (request.method === "OPTIONS")
    return new Response("ok", { headers: corsHeaders });
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
  const admin = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
  );
  const { data: role } = await admin
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .eq("role", "admin")
    .single();
  if (!role) return json({ error: "Administrator access required" }, 403);
  const body = await request.json();
  if (
    !["approved", "rejected", "more_information_required"].includes(
      body.decision,
    )
  )
    return json({ error: "Invalid decision" }, 400);
  if (body.decision !== "approved" && !String(body.reason ?? "").trim())
    return json({ error: "A reason is required" }, 400);
  const { data: submission } = await admin
    .from("manual_payment_submissions")
    .select("id,payment_id,status")
    .eq("id", body.submission_id)
    .single();
  if (!submission) return json({ error: "Submission not found" }, 404);
  if (submission.status === "approved") return json({ status: "approved" });
  const before = { status: submission.status };
  await admin
    .from("manual_payment_submissions")
    .update({
      status: body.decision,
      reviewer_id: user.id,
      decision_reason: body.reason ?? null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", submission.id)
    .neq("status", "approved");
  if (body.decision === "approved") {
    const { data: payment } = await admin
      .from("payments")
      .update({ status: "successful", verified_at: new Date().toISOString() })
      .eq("id", submission.payment_id)
      .neq("status", "successful")
      .select("id,user_id")
      .single();
    if (payment)
      await admin
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
  }
  await admin
    .from("admin_audit_logs")
    .insert({
      actor_id: user.id,
      action: `manual_payment_${body.decision}`,
      target_type: "manual_payment",
      target_id: submission.id,
      reason: body.reason ?? null,
      before_state: before,
      after_state: { status: body.decision },
    });
  return json({ status: body.decision });
});
