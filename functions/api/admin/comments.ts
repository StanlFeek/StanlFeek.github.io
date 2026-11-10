/**
 * GET    /api/admin/comments?status=all|pending|approved|spam&limit=100
 * PATCH  /api/admin/comments  { id, status }
 * DELETE /api/admin/comments?id=123
 */

import type { Env } from "../_middleware";
import { json } from "../auth/_lib";

const STATUSES = new Set(["approved", "pending", "spam"]);

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const url = new URL(request.url);
  const status = url.searchParams.get("status") ?? "all";
  const limit = Math.min(Math.max(Number(url.searchParams.get("limit")) || 100, 1), 500);

  const base = `SELECT c.id, c.path, c.nickname, c.email, c.website, c.content,
                       c.status, c.created_at, c.user_id, u.email AS user_email
                  FROM comments c LEFT JOIN users u ON u.id = c.user_id`;
  const stmt =
    status === "all"
      ? env.DB.prepare(`${base} ORDER BY c.id DESC LIMIT ?1`).bind(limit)
      : env.DB.prepare(`${base} WHERE c.status = ?2 ORDER BY c.id DESC LIMIT ?1`).bind(
          limit,
          status
        );

  const { results } = await stmt.all();
  return json({ ok: true, status, items: results ?? [] });
};

export const onRequestPatch: PagesFunction<Env> = async ({ request, env }) => {
  let body: any;
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, error: "bad-json" }, 400);
  }
  const id = Number(body?.id);
  const status = String(body?.status ?? "");
  if (!Number.isInteger(id) || id <= 0) return json({ ok: false, error: "bad-id" }, 400);
  if (!STATUSES.has(status)) return json({ ok: false, error: "bad-status" }, 400);

  await env.DB.prepare(`UPDATE comments SET status = ?1 WHERE id = ?2`).bind(status, id).run();
  return json({ ok: true, id, status });
};

export const onRequestDelete: PagesFunction<Env> = async ({ request, env }) => {
  const id = Number(new URL(request.url).searchParams.get("id"));
  if (!Number.isInteger(id) || id <= 0) return json({ ok: false, error: "bad-id" }, 400);
  await env.DB.prepare(`DELETE FROM comments WHERE id = ?1`).bind(id).run();
  return json({ ok: true, id });
};
