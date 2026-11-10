/**
 * 友链申请
 *   GET  /api/links                已通过的友链列表（页面也可直接用 Hugo data 文件）
 *   POST /api/links  { name, url, avatar?, desc? }   提交申请，默认 pending
 */

import type { Env } from "./_middleware";

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });

function str(v: unknown, max: number): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  if (!t || t.length > max) return null;
  return t;
}

function safeUrl(v: string | null): string | null {
  if (!v) return null;
  try {
    const u = new URL(v);
    if (u.protocol !== "https:" && u.protocol !== "http:") return null;
    return u.toString();
  } catch {
    return null;
  }
}

export const onRequestGet: PagesFunction<Env> = async ({ env }) => {
  const { results } = await env.DB
    .prepare(
      `SELECT id, name, url, avatar, desc, created_at
         FROM link_requests
        WHERE status = 'approved'
        ORDER BY id DESC`
    )
    .all();
  return json({ items: results ?? [] });
};

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return json({ error: "invalid json" }, 400);
  }

  if (typeof body.hp === "string" && body.hp.length > 0) {
    return json({ ok: true, id: 0 });
  }

  const name = str(body.name, 60);
  const url = safeUrl(str(body.url, 300));
  if (!name || !url) return json({ error: "name / url required" }, 400);

  const avatar = safeUrl(str(body.avatar, 300));
  const desc = str(body.desc, 200);

  const ip = request.headers.get("cf-connecting-ip") ?? "0.0.0.0";
  const rlKey = `l:${ip}`;
  if (await env.KV.get(rlKey)) {
    return json({ error: "rate limited, retry in 60s" }, 429);
  }

  const res = await env.DB
    .prepare(
      `INSERT INTO link_requests (name, url, avatar, desc)
       VALUES (?1, ?2, ?3, ?4)`
    )
    .bind(name, url, avatar, desc)
    .run();

  await env.KV.put(rlKey, "1", { expirationTtl: 60 });

  return json({ ok: true, id: res.meta.last_row_id, status: "pending" }, 201);
};
