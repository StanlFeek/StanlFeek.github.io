/**
 * GET   /api/admin/users
 * PATCH /api/admin/users  { id, status? , role? }
 */

import type { Env } from "../_middleware";
import { json, currentUser } from "../auth/_lib";

export const onRequestGet: PagesFunction<Env> = async ({ env }) => {
  const { results } = await env.DB.prepare(
    `SELECT u.id, u.email, u.nickname, u.role, u.status, u.created_at, u.last_login_at,
            (SELECT COUNT(*) FROM comments c WHERE c.user_id = u.id) AS comments
       FROM users u ORDER BY u.id ASC`
  ).all();
  return json({ ok: true, items: results ?? [] });
};

export const onRequestPatch: PagesFunction<Env> = async ({ request, env }) => {
  let body: any;
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, error: "bad-json" }, 400);
  }
  const id = Number(body?.id);
  if (!Number.isInteger(id) || id <= 0) return json({ ok: false, error: "bad-id" }, 400);

  const me = await currentUser(request, env);
  const sets: string[] = [];
  const binds: unknown[] = [];

  if (body?.status === "active" || body?.status === "banned") {
    if (me?.id === id && body.status === "banned")
      return json({ ok: false, error: "self-ban", message: "不能停用自己" }, 400);
    sets.push(`status = ?${binds.length + 1}`);
    binds.push(body.status);
  }
  if (body?.role === "user" || body?.role === "admin") {
    if (me?.id === id && body.role === "user")
      return json({ ok: false, error: "self-demote", message: "不能降级自己" }, 400);
    sets.push(`role = ?${binds.length + 1}`);
    binds.push(body.role);
  }

  if (!sets.length) return json({ ok: false, error: "nothing-to-update" }, 400);
  binds.push(id);

  await env.DB.prepare(`UPDATE users SET ${sets.join(", ")} WHERE id = ?${binds.length}`)
    .bind(...binds)
    .run();

  // 停用后立刻踢掉会话
  if (body?.status === "banned") {
    await env.DB.prepare(`DELETE FROM sessions WHERE user_id = ?1`).bind(id).run();
  }

  return json({ ok: true, id });
};
