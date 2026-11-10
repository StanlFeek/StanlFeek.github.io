/**
 * GET   /api/admin/users
 * PATCH /api/admin/users  { id, status? , role?, password? }
 *
 * password 是管理员给用户重置密码，重置后该用户的所有会话作废。
 */

import type { Env } from "../_middleware";
import { json, currentUser, hashPassword, validPassword } from "../auth/_lib";

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

  if (typeof body?.password === "string" && body.password) {
    const next = validPassword(body.password);
    if (!next) {
      return json({ ok: false, error: "bad-password", message: "新密码至少 8 位" }, 400);
    }
    await env.DB.prepare(`UPDATE users SET password_hash = ?1 WHERE id = ?2`)
      .bind(await hashPassword(next), id)
      .run();
    if (me?.id === id) {
      // 重置自己的密码：保留当前会话，否则管理员会把自己踢下线
      await env.DB.prepare(
        `DELETE FROM sessions WHERE user_id = ?1 AND token_hash != (
           SELECT token_hash FROM sessions WHERE user_id = ?1
            ORDER BY created_at DESC LIMIT 1)`
      )
        .bind(id)
        .run();
    } else {
      await env.DB.prepare(`DELETE FROM sessions WHERE user_id = ?1`).bind(id).run();
    }
    return json({ ok: true, id, passwordReset: true });
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

// DELETE /api/admin/users?id=<id> —— 管理员删除某个用户（不能删自己，不能删最后一个管理员）
export const onRequestDelete: PagesFunction<Env> = async ({ request, env }) => {
  const url = new URL(request.url);
  const id = Number(url.searchParams.get("id"));
  if (!Number.isInteger(id) || id <= 0) return json({ ok: false, error: "bad-id" }, 400);

  const me = await currentUser(request, env);
  if (me?.id === id) {
    return json(
      { ok: false, error: "self-delete", message: "请到「账号」页注销自己的账号" },
      400
    );
  }

  const target = await env.DB.prepare(`SELECT id, role, status FROM users WHERE id = ?1`)
    .bind(id)
    .first<{ id: number; role: string; status: string }>();
  if (!target) return json({ ok: false, error: "not-found" }, 404);

  if (target.role === "admin") {
    const admins = await env.DB.prepare(
      `SELECT COUNT(*) AS n FROM users WHERE role = 'admin' AND status = 'active'`
    ).first<{ n: number }>();
    if ((admins?.n ?? 0) <= 1) {
      return json(
        { ok: false, error: "last-admin", message: "这是最后一个管理员，不能删除" },
        400
      );
    }
  }

  await env.DB.prepare(`UPDATE comments SET user_id = NULL WHERE user_id = ?1`).bind(id).run();
  await env.DB.prepare(`DELETE FROM sessions WHERE user_id = ?1`).bind(id).run();
  await env.DB.prepare(`DELETE FROM users WHERE id = ?1`).bind(id).run();

  return json({ ok: true, id, deleted: true });
};
