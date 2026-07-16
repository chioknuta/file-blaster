// TEMPORARY one-shot maintenance endpoint — removes leftover diagnostic test rows.
// Guarded by a single-use secret; deleted right after use.
export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  if (url.searchParams.get("key") !== "26e86b4dcac65669aefc03fe7706f2f8") return new Response("forbidden", { status: 403 });
  if (!env.DB) return new Response("no db", { status: 503 });
  const r = await env.DB
    .prepare("DELETE FROM scores WHERE name IN ('CLAUDE_TEST', 'img src=x onerro', 'ping')")
    .run();
  return new Response(JSON.stringify({ deleted: r && r.meta ? r.meta.changes : null }), { headers: { "content-type": "application/json" } });
}
