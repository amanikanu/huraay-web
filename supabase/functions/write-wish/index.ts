import { serve } from "https://deno.land/std@0.224.0/http/server.ts";

const cors = {
  "Access-Control-Allow-Origin": Deno.env.get("APP_ORIGIN") ?? "",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

serve(async (request) => {
  if (request.method === "OPTIONS")
    return new Response("ok", { headers: cors });
  if (request.method !== "POST")
    return Response.json(
      { error: "Method not allowed" },
      { status: 405, headers: cors },
    );
  try {
    const input = await request.json();
    const fields = ["occasion", "relationship", "context", "tone"] as const;
    for (const field of fields)
      if (typeof input[field] !== "string" || input[field].length > 500)
        return Response.json(
          { error: `Invalid ${field}` },
          { status: 400, headers: cors },
        );
    const apiKey = Deno.env.get("OPENAI_API_KEY");
    if (!apiKey)
      return Response.json(
        { error: "AI is not configured" },
        { status: 503, headers: cors },
      );
    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: Deno.env.get("OPENAI_MODEL") ?? "gpt-5-mini",
        max_output_tokens: 180,
        input: [
          {
            role: "system",
            content:
              "Write one sincere celebration wish. Avoid clichés, hashtags, em dashes, and invented personal details. Return only the editable wish.",
          },
          {
            role: "user",
            content: `Occasion: ${input.occasion}\nRelationship: ${input.relationship}\nTone: ${input.tone}\nContext: ${input.context}`,
          },
        ],
      }),
    });
    if (!response.ok)
      return Response.json(
        { error: "AI provider request failed" },
        { status: 502, headers: cors },
      );
    const result = await response.json();
    const suggestion =
      result.output_text ??
      result.output
        ?.flatMap((o: { content?: { text?: string }[] }) => o.content ?? [])
        .map((c: { text?: string }) => c.text ?? "")
        .join("");
    return Response.json(
      { suggestion },
      { headers: { ...cors, "Content-Type": "application/json" } },
    );
  } catch {
    return Response.json(
      { error: "Invalid request" },
      { status: 400, headers: cors },
    );
  }
});
