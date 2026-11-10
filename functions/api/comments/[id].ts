/**
 * 单条评论管理（需要管理员令牌）
 *   DELETE /api/comments/:id
 *   PATCH  /api/comments/:id   { status: "approved" | "pending" | "spam" }
 *
 * 令牌从 Pages 环境变量 ADMIN_TOKEN 读取，请求头：
 *   Authorization: Bearer <ADMIN_TOKEN>
 */

import type { Env } from "../_middleware";

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });

function authorized(request: Request, env: Env): boolean {
  if (!env.ADMIN_TOKEN) return false;
  const auth = request.headers.get("authorization") ?? "";
  return auth === `Bearer ${env.ADMIN_TOKEN}`;
}

function parseId(params: Record<string, string | string[]>): number | null {
  const raw = Array.isArray(params.id) ? params.id[0] : params.id;
  const n = Number(raw);
  return Number.isInteger(n) && n > 0 ? n : null;
}

export const onRequestDelete: PagesFunction<Env> = async ({ request, env, params }) => {
  if (!authorized(request, env)) return json({ error: "unauthorized" }, 401);
  const id = parseId(params as Record<string, string>);
  if (!id) return json({ error: "invalid id" }, 400);

  const res = await env.DB.prepare("DELETE FROM comments WHERE id = ?1").bind(id).run();
  return json({ ok: true, changed: res.meta.changes ?? 0 });
};

export const onRequestPatch: PagesFunction<Env> = async ({ request, env, params }) => {
  if (!authorized(request, env)) return json({ error: "unauthorized" }, 401);
  const id = parseId(params as Record<string, string>);
  if (!id) return json({ error: "invalid id" }, 400);

  let body: { status?: string };
  try {
    body = (await request.json()) as { status?: string };
  } catch {
    return json({ error: "invalid json" }, 400);
  }

  const allowed = new Set(["approved", "pending", "spam"]);
  if (!body.status || !allowed.has(body.status)) {
    return json({ error: "status must be approved | pending | spam" }, 400);
  }

  const res = await env.DB
    .prepare("UPDATE comments SET status = ?1 WHERE id = ?2")
    .bind(body.status, id)
    .run();

  return json({ ok: true, changed: res.meta.changes ?? 0 });
};
