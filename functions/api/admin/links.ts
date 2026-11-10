/**
 * GET    /api/admin/links?status=all|pending|approved|rejected
 * PATCH  /api/admin/links  { id, status }
 * DELETE /api/admin/links?id=123
 */

import type { Env } from "../_middleware";
import { json } from "../auth/_lib";

const STATUSES = new Set(["approved", "pending", "rejected"]);

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const url = new URL(request.url);
  const status = url.searchParams.get("status") ?? "pending";
  const limit = Math.min(Math.max(Number(url.searchParams.get("limit")) || 200, 1), 500);

  const { results } =
    status === "all"
      ? await env.DB.prepare(
          `SELECT * FROM link_requests ORDER BY id DESC LIMIT ?1`
        )
          .bind(limit)
          .all()
      : await env.DB.prepare(
          `SELECT * FROM link_requests WHERE status = ?2 ORDER BY id DESC LIMIT ?1`
        )
          .bind(limit, status)
          .all();

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

  await env.DB.prepare(`UPDATE link_requests SET status = ?1 WHERE id = ?2`)
    .bind(status, id)
    .run();
  return json({ ok: true, id, status });
};

export const onRequestDelete: PagesFunction<Env> = async ({ request, env }) => {
  const id = Number(new URL(request.url).searchParams.get("id"));
  if (!Number.isInteger(id) || id <= 0) return json({ ok: false, error: "bad-id" }, 400);
  await env.DB.prepare(`DELETE FROM link_requests WHERE id = ?1`).bind(id).run();
  return json({ ok: true, id });
};
