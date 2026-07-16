// TEMPORARY one-shot maintenance endpoint — removes the two diagnostic test rows
// created while verifying the leaderboard. Guarded by a single-use secret.
// This file is deleted immediately after use.
export async function onRequestGet({ request, env }) {
  const url = new URL(request.url);
  if (url.searchParams.get("key") !== "9343bdc9b315bf33a0f09b884f0bab47") {
    return new Response("forbidden", { status: 403 });
  }
  if (!env.DB) return new Response("no db", { status: 503 });
  const r = await env.DB
    .prepare("DELETE FROM scores WHERE name IN ('CLAUDE_TEST', 'img src=x onerro')")
    .run();
  const changes = r && r.meta ? r.meta.changes : null;
  return new Response(JSON.stringify({ deleted: changes }), {
    headers: { "content-type": "application/json" },
  });
}
