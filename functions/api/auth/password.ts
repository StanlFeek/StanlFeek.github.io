/**
 * POST /api/auth/password  { current, next }
 * 已登录用户修改自己的密码。成功后作废此前所有会话并下发新 cookie。
 */

import type { Env } from "../_middleware";
import {
  json,
  currentUser,
  verifyPassword,
  hashPassword,
  validPassword,
  createSession,
  sessionCookie,
  sha256Hex,
  clientIp,
} from "./_lib";

const MAX_TRIES = 5;
const WINDOW_SECONDS = 900;

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  const me = await currentUser(request, env);
  if (!me) return json({ ok: false, error: "unauthorized", message: "请先登录" }, 401);

  let body: any;
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, error: "bad-json" }, 400);
  }

  const next = validPassword(body?.next);
  if (!next) {
    return json({ ok: false, error: "bad-password", message: "新密码至少 8 位" }, 400);
  }
  if (typeof body?.current !== "string" || !body.current) {
    return json({ ok: false, error: "need-current", message: "请填写当前密码" }, 400);
  }
  if (body.current === next) {
    return json({ ok: false, error: "same-password", message: "新密码不能和当前密码一样" }, 400);
  }

  // 同一账号 15 分钟内最多试 5 次，挡住拿会话逐个猜密码的
  const rlKey = `pw:${me.id}`;
  const tries = Number((await env.KV.get(rlKey)) ?? "0");
  if (tries >= MAX_TRIES) {
    return json({ ok: false, error: "too-many", message: "尝试次数过多，15 分钟后再试" }, 429);
  }

  const row = await env.DB.prepare(`SELECT password_hash FROM users WHERE id = ?1`)
    .bind(me.id)
    .first<{ password_hash: string }>();
  if (!row) return json({ ok: false, error: "unauthorized" }, 401);

  const ok = await verifyPassword(body.current, row.password_hash);
  if (!ok) {
    await env.KV.put(rlKey, String(tries + 1), { expirationTtl: WINDOW_SECONDS });
    return json({ ok: false, error: "bad-current", message: "当前密码不对" }, 400);
  }

  await env.DB.prepare(`UPDATE users SET password_hash = ?1 WHERE id = ?2`)
    .bind(await hashPassword(next), me.id)
    .run();

  // 改完密码把所有旧会话踢掉，再给当前浏览器发一个新的
  await env.DB.prepare(`DELETE FROM sessions WHERE user_id = ?1`).bind(me.id).run();
  const token = await createSession(env, request, me.id);
  await env.KV.delete(rlKey);

  return json(
    { ok: true, message: "密码已更新，其他设备需要重新登录" },
    200,
    { "set-cookie": sessionCookie(token) }
  );
};

// 保留一个入口方便排查：GET 返回当前会话能不能改密码
export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const me = await currentUser(request, env);
  return json({
    ok: true,
    canChange: Boolean(me),
    ip: (await sha256Hex(clientIp(request))).slice(0, 8),
  });
};
