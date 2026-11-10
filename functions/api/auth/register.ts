/**
 * POST /api/auth/register  { email, password, nickname, code? }
 * 配了邮件服务就必须带验证码；没配则直接注册（无邮件模式）。
 * 注册成功即登录（下 Cookie）。库里第一个用户自动成为管理员。
 */

import type { Env } from "../_middleware";
import {
  json,
  validEmail,
  validPassword,
  validNickname,
  sha256Hex,
  hashPassword,
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
  const password = validPassword(body?.password);
  const nickname = validNickname(body?.nickname);
  if (!email) return json({ ok: false, error: "invalid-email", message: "邮箱格式不对" }, 400);
  if (!password)
    return json({ ok: false, error: "weak-password", message: "密码至少 8 位" }, 400);
  if (!nickname)
    return json({ ok: false, error: "invalid-nickname", message: "昵称 1–24 字" }, 400);

  // 同 IP 限流：1 分钟最多 3 次注册尝试
  const rlKey = `rg:${clientIp(request)}`;
  const hits = Number((await env.KV.get(rlKey)) ?? "0");
  if (hits >= 3)
    return json({ ok: false, error: "too-many", message: "尝试过于频繁，稍后再试" }, 429);

  const exists = await env.DB.prepare(`SELECT id FROM users WHERE email = ?1`)
    .bind(email)
    .first<{ id: number }>();
  if (exists) return json({ ok: false, error: "email-taken", message: "该邮箱已注册" }, 409);

  // 有邮件服务时校验验证码
  if (env.RESEND_API_KEY) {
    const code = typeof body?.code === "string" ? body.code.trim() : "";
    if (!/^\d{6}$/.test(code))
      return json({ ok: false, error: "code-required", message: "请填写邮箱验证码" }, 400);
    const row = await env.DB.prepare(
      `SELECT code_hash, expires_at FROM email_codes WHERE email = ?1 AND purpose = 'register'`
    )
      .bind(email)
      .first<{ code_hash: string; expires_at: string }>();
    if (!row || row.expires_at < new Date().toISOString())
      return json({ ok: false, error: "code-expired", message: "验证码已过期" }, 400);
    if (row.code_hash !== (await sha256Hex(code)))
      return json({ ok: false, error: "code-wrong", message: "验证码不对" }, 400);
    await env.DB.prepare(`DELETE FROM email_codes WHERE email = ?1 AND purpose = 'register'`)
      .bind(email)
      .run();
  }

  const total = await env.DB.prepare(`SELECT COUNT(*) AS n FROM users`).first<{ n: number }>();
  const role = (total?.n ?? 0) === 0 ? "admin" : "user";

  const hash = await hashPassword(password);
  const res = await env.DB.prepare(
    `INSERT INTO users (email, nickname, password_hash, role) VALUES (?1, ?2, ?3, ?4)`
  )
    .bind(email, nickname, hash, role)
    .run();

  const userId = Number(res.meta.last_row_id);
  await env.DB.prepare(`UPDATE users SET last_login_at = datetime('now') WHERE id = ?1`)
    .bind(userId)
    .run();

  const token = await createSession(env, request, userId);
  await env.KV.put(rlKey, String(hits + 1), { expirationTtl: 60 });

  return json(
    { ok: true, user: { id: userId, email, nickname, role } },
    201,
    { "set-cookie": sessionCookie(token) }
  );
};
