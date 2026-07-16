// Cloudflare Pages Function — File Blaster leaderboard API (backed by D1 binding "DB").
// GET  /api/scores        -> top 10 scores, highest first
// POST /api/scores {name,score,filed,accuracy} -> insert one validated score
//
// All validation/clamping is server-side, so scores can't be injected or wildly
// spoofed via the shape of the request. The table is created on demand.

const JSON_HEADERS = {
  "content-type": "application/json; charset=utf-8",
  "access-control-allow-origin": "*",
  "access-control-allow-methods": "GET,POST,OPTIONS",
  "access-control-allow-headers": "content-type",
  "cache-control": "no-store",
};

const CREATE = `CREATE TABLE IF NOT EXISTS scores (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  score INTEGER NOT NULL,
  filed INTEGER NOT NULL,
  accuracy INTEGER NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
)`;

function json(body, status) {
  return new Response(JSON.stringify(body), { status: status || 200, headers: JSON_HEADERS });
}

function clampInt(v, min, max) {
  const n = Math.floor(Number(v));
  if (!Number.isFinite(n)) return min;
  return Math.max(min, Math.min(max, n));
}

async function ensureTable(db) {
  await db.prepare(CREATE).run();
}

export async function onRequestGet({ env }) {
  if (!env.DB) return json({ error: "leaderboard unavailable" }, 503);
  try {
    await ensureTable(env.DB);
    const { results } = await env.DB
      .prepare("SELECT name, score, filed, accuracy FROM scores ORDER BY score DESC, created_at ASC LIMIT 10")
      .all();
    return json(results || []);
  } catch (e) {
    return json({ error: "read failed" }, 500);
  }
}

export async function onRequestPost({ request, env }) {
  if (!env.DB) return json({ error: "leaderboard unavailable" }, 503);
  let body;
  try {
    body = await request.json();
  } catch {
    return json({ error: "invalid JSON" }, 400);
  }
  const name = String(body && body.name != null ? body.name : "")
    .replace(/[<>]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 16);
  if (!name) return json({ error: "name required" }, 400);

  const score = clampInt(body.score, 0, 10_000_000);
  const filed = clampInt(body.filed, 0, 100_000);
  const accuracy = clampInt(body.accuracy, 0, 100);

  try {
    await ensureTable(env.DB);
    await env.DB
      .prepare("INSERT INTO scores (name, score, filed, accuracy) VALUES (?, ?, ?, ?)")
      .bind(name, score, filed, accuracy)
      .run();
    return json({ ok: true });
  } catch (e) {
    return json({ error: "write failed" }, 500);
  }
}

export function onRequestOptions() {
  return new Response(null, { headers: JSON_HEADERS });
}
