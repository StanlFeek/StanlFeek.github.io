/**
 * POST /api/auth/send-code  { email, purpose?: "register" }
 * 发邮箱验证码。未配置 RESEND_API_KEY 时返回 mailSent:false，注册不需要验证码。
 */

import type { Env } from "../_middleware";
import { json, validEmail, sixDigitCode, sha256Hex, sendMail } from "./_lib";

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  let body: any;
  try {
    body = await request.json();
  } catch {
    return json({ ok: false, error: "bad-json" }, 400);
  }

  const email = validEmail(body?.email);
  if (!email) return json({ ok: false, error: "invalid-email" }, 400);

  // 同一邮箱 60 秒一次
  const rlKey = `sc:${email}`;
  if (await env.KV.get(rlKey)) {
    return json({ ok: false, error: "too-frequent", message: "请 60 秒后再试" }, 429);
  }

  const exists = await env.DB.prepare(`SELECT id FROM users WHERE email = ?1`)
    .bind(email)
    .first<{ id: number }>();
  if (exists) return json({ ok: false, error: "email-taken", message: "该邮箱已注册" }, 409);

  const code = sixDigitCode();
  const expires = new Date(Date.now() + 10 * 60_000).toISOString();
  await env.DB.prepare(
    `INSERT INTO email_codes (email, purpose, code_hash, expires_at, created_at)
     VALUES (?1, 'register', ?2, ?3, datetime('now'))
     ON CONFLICT(email, purpose) DO UPDATE SET
       code_hash = excluded.code_hash,
       expires_at = excluded.expires_at,
       created_at = excluded.created_at`
  )
    .bind(email, await sha256Hex(code), expires)
    .run();

  const mail = await sendMail(
    env,
    email,
    `stanl.top 注册验证码：${code}`,
    `<p>你的验证码是 <b style="font-size:20px;letter-spacing:3px">${code}</b></p>
     <p>10 分钟内有效。如果不是你本人操作，忽略这封邮件即可。</p>`
  );

  await env.KV.put(rlKey, "1", { expirationTtl: 60 });

  return json({
    ok: true,
    mailSent: mail.sent,
    // 没配发信服务时明确告知前端：跳过验证码
    codeRequired: mail.sent,
    ...(mail.sent ? {} : { note: "邮件服务未配置，可直接注册", detail: mail.error }),
  });
};
