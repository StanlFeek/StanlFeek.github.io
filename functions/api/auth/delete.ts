/**
 * POST /api/auth/delete  { password }
 * 注销（永久删除）自己的账号。
 *
 * 规则：
 * - 必须带当前密码
 * - 最后一个管理员不能注销，避免把站点锁死
 * - 留言保留，但解绑 user_id（昵称文本还在，不再带「已验证」标记）
 * - 会话全部清空并删掉 cookie
 */

import type { Env } from "../_middleware";
import {
  json,
  currentUser,
  verifyPassword,
  clearCookie,
  clientIp,
} from "./_lib";

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const me = await currentUser(request, env);
  if (!me) return json({ ok: false, error: "unauthorized", message: "请先登录" }, 401);

  let body: any;
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, error: "bad-json" }, 400);
  }
  if (typeof body?.password !== "string" || !body.password) {
    return json({ ok: false, error: "need-password", message: "请输入当前密码" }, 400);
  }

  const rlKey = `del:${me.id}`;
  const tries = Number((await env.KV.get(rlKey)) ?? "0");
  if (tries >= 5) {
    return json({ ok: false, error: "too-many", message: "尝试次数过多，15 分钟后再试" }, 429);
  }

  const row = await env.DB.prepare(`SELECT password_hash, role FROM users WHERE id = ?1`)
    .bind(me.id)
    .first<{ password_hash: string; role: string }>();
  if (!row) return json({ ok: false, error: "unauthorized" }, 401);

  const passOk = await verifyPassword(body.password, row.password_hash);
  if (!passOk) {
    await env.KV.put(rlKey, String(tries + 1), { expirationTtl: 900 });
    return json({ ok: false, error: "bad-password", message: "当前密码不对" }, 400);
  }

  if (row.role === "admin") {
    const admins = await env.DB.prepare(
      `SELECT COUNT(*) AS n FROM users WHERE role = 'admin' AND status = 'active'`
    ).first<{ n: number }>();
    if ((admins?.n ?? 0) <= 1) {
      return json(
        { ok: false, error: "last-admin", message: "这是最后一个管理员账号，不能注销" },
        400
      );
    }
  }

  // 留言保留、解绑账号；友链申请同样保留
  await env.DB.prepare(`UPDATE comments SET user_id = NULL WHERE user_id = ?1`).bind(me.id).run();
  await env.DB.prepare(`DELETE FROM sessions WHERE user_id = ?1`).bind(me.id).run();
  await env.DB.prepare(`DELETE FROM users WHERE id = ?1`).bind(me.id).run();
  await env.KV.delete(rlKey);

  return json(
    { ok: true, message: "账号已注销" },
    200,
    { "set-cookie": clearCookie() }
  );
};

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const me = await currentUser(request, env);
  return json({ ok: true, me: me ? { id: me.id, role: me.role } : null, ip: clientIp(request) ? "set" : "none" });
};
