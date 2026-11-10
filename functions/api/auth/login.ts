/**
 * POST /api/auth/login  { email, password }
 */

import type { Env } from "../_middleware";
import {
  json,
  validEmail,
  verifyPassword,
  createSession,
  sessionCookie,
  clientIp,
} from "./_lib";

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  let body: any;
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, error: "bad-json" }, 400);
  }

  const email = validEmail(body?.email);
  const password = typeof body?.password === "string" ? body.password : "";
  if (!email || !password) return json({ ok: false, error: "missing" }, 400);

  // 同 IP 15 分钟内最多 10 次失败
  const rlKey = `lg:${clientIp(request)}`;
  const fails = Number((await env.KV.get(rlKey)) ?? "0");
  if (fails >= 10)
    return json(
      { ok: false, error: "locked", message: "失败次数过多，请 15 分钟后再试" },
      429
    );

  const row = await env.DB.prepare(
    `SELECT id, email, nickname, role, status, password_hash FROM users WHERE email = ?1`
  )
    .bind(email)
    .first<{
      id: number;
      email: string;
      nickname: string;
      role: string;
      status: string;
      password_hash: string;
    }>();

  const ok = row ? await verifyPassword(password, row.password_hash) : false;
  if (!row || !ok) {
    await env.KV.put(rlKey, String(fails + 1), { expirationTtl: 900 });
    return json({ ok: false, error: "bad-credentials", message: "邮箱或密码不对" }, 401);
  }
  if (row.status !== "active")
    return json({ ok: false, error: "banned", message: "账号已被停用" }, 403);

  await env.DB.prepare(`UPDATE users SET last_login_at = datetime('now') WHERE id = ?1`)
    .bind(row.id)
    .run();

  const token = await createSession(env, request, row.id);
  await env.KV.delete(rlKey);

  return json(
    { ok: true, user: { id: row.id, email: row.email, nickname: row.nickname, role: row.role } },
    200,
    { "set-cookie": sessionCookie(token) }
  );
};
