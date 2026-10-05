// P2P Order Book · Verify server (Cloudflare Worker)
// Keeps the AI key on the server so it never sits in the app or the APK.
//
// Deploy: wrangler deploy  (or paste into a new Worker in the Cloudflare dashboard)
// Secrets / variables (Settings → Variables):
//   AI_PROVIDER    gemini | openai | anthropic | openrouter     (default: gemini)
//   AI_API_KEY     the provider key (secret)
//   AI_MODEL       e.g. gemini-2.5-flash, gpt-4o-mini, claude-sonnet-4-5, google/gemini-2.5-flash
//   APP_TOKEN      long random string; the same value goes in the app (Verify screen → Verify server → App token)
//   ALLOWED_ORIGIN optional; "*" if not set
//
// Request:  POST /verify  { prompt: string, images: [{ mime, data(base64) }] }  + header  Authorization: Bearer APP_TOKEN
// Response: { text: "<the model's JSON answer>" }   The app validates and compares it itself.

const cors = (env) => ({
  "access-control-allow-origin": env.ALLOWED_ORIGIN || "*",
  "access-control-allow-headers": "content-type, authorization",
  "access-control-allow-methods": "POST, OPTIONS",
});
const json = (env, obj, status = 200) =>
  new Response(JSON.stringify(obj), { status, headers: { "content-type": "application/json", ...cors(env) } });

async function callGemini(env, prompt, images) {
  const model = env.AI_MODEL || "gemini-2.5-flash";
  const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`, {
    method: "POST",
    headers: { "content-type": "application/json", "x-goog-api-key": env.AI_API_KEY },
    body: JSON.stringify({
      contents: [{ role: "user", parts: [...images.map((i) => ({ inline_data: { mime_type: i.mime, data: i.data } })), { text: prompt }] }],
      generationConfig: { responseMimeType: "application/json", temperature: 0 },
    }),
  });
  const j = await r.json();
  if (!r.ok) throw new Error(j.error?.message || "gemini " + r.status);
  return (j.candidates?.[0]?.content?.parts || []).map((p) => p.text || "").join("");
}
async function callOpenAICompat(env, prompt, images, base) {
  const r = await fetch(base + "/chat/completions", {
    method: "POST",
    headers: { "content-type": "application/json", authorization: "Bearer " + env.AI_API_KEY },
    body: JSON.stringify({
      model: env.AI_MODEL || "gpt-4o-mini",
      temperature: 0,
      response_format: { type: "json_object" },
      messages: [{ role: "user", content: [...images.map((i) => ({ type: "image_url", image_url: { url: `data:${i.mime};base64,${i.data}` } })), { type: "text", text: prompt }] }],
    }),
  });
  const j = await r.json();
  if (!r.ok) throw new Error(j.error?.message || "provider " + r.status);
  return j.choices?.[0]?.message?.content || "";
}
async function callAnthropic(env, prompt, images) {
  const r = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: { "content-type": "application/json", "x-api-key": env.AI_API_KEY, "anthropic-version": "2023-06-01" },
    body: JSON.stringify({
      model: env.AI_MODEL || "claude-sonnet-4-5",
      max_tokens: 2000,
      temperature: 0,
      messages: [{ role: "user", content: [...images.map((i) => ({ type: "image", source: { type: "base64", media_type: i.mime, data: i.data } })), { type: "text", text: prompt }] }],
    }),
  });
  const j = await r.json();
  if (!r.ok) throw new Error(j.error?.message || "anthropic " + r.status);
  return (j.content || []).map((c) => c.text || "").join("");
}

export default {
  async fetch(req, env) {
    if (req.method === "OPTIONS") return new Response(null, { headers: cors(env) });
    const url = new URL(req.url);
    if (req.method !== "POST" || url.pathname.replace(/\/+$/, "") !== "/verify") return json(env, { error: "not found" }, 404);
    if (!env.APP_TOKEN || req.headers.get("authorization") !== "Bearer " + env.APP_TOKEN) return json(env, { error: "unauthorized" }, 401);
    if (!env.AI_API_KEY) return json(env, { error: "AI_API_KEY is not set" }, 500);
    let body;
    try { body = await req.json(); } catch { return json(env, { error: "bad request" }, 400); }
    const images = (Array.isArray(body.images) ? body.images : []).slice(0, 4).filter((i) => i && i.data && /^image\//.test(i.mime || ""));
    if (!images.length || typeof body.prompt !== "string") return json(env, { error: "images and prompt are required" }, 400);
    if (images.reduce((n, i) => n + i.data.length, 0) > 14e6) return json(env, { error: "images too large" }, 413);
    try {
      const p = (env.AI_PROVIDER || "gemini").toLowerCase();
      const text =
        p === "openai" ? await callOpenAICompat(env, body.prompt, images, "https://api.openai.com/v1")
        : p === "openrouter" ? await callOpenAICompat(env, body.prompt, images, "https://openrouter.ai/api/v1")
        : p === "anthropic" ? await callAnthropic(env, body.prompt, images)
        : await callGemini(env, body.prompt, images);
      return json(env, { text }); // screenshots are not stored or logged
    } catch (e) {
      return json(env, { error: String(e.message || e).slice(0, 200) }, 502);
    }
  },
};
