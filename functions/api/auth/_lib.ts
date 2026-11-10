/**
 * 用户系统公共库：口令哈希、会话、Cookie、发信
 *
 * 口令存储格式：pbkdf2$<迭代次数>$<salt base64>$<hash base64>
 * 迭代次数写进字符串里，以后调高默认值不会让老口令失效。
 */

import type { Env } from "../_middleware";

export type Role = "user" | "admin";

export interface UserRow {
  id: number;
  email: string;
  nickname: string;
  role: Role;
  status: "active" | "banned";
  created_at: string;
  last_login_at: string | null;
}

export const COOKIE_NAME = "sid";
const SESSION_DAYS = 30;
const DEFAULT_ITERS = 100_000;

const enc = new TextEncoder();

// ── 编码工具 ────────────────────────────────────────────────────────

export function b64(bytes: Uint8Array): string {
  let s = "";
  for (const b of bytes) s += String.fromCharCode(b);
  return btoa(s);
}

export function unb64(s: string): Uint8Array {
  const raw = atob(s);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

export function b64url(bytes: Uint8Array): string {
  return b64(bytes).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

export function randomBytes(n: number): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(n));
}

export async function sha256Hex(input: string): Promise<string> {
  const d = await crypto.subtle.digest("SHA-256", enc.encode(input));
  return [...new Uint8Array(d)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

export function json(data: unknown, status = 200, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
      ...headers,
    },
  });
}

export function clientIp(request: Request): string {
  return request.headers.get("cf-connecting-ip") ?? "0.0.0.0";
}

// ── 口令哈希 ────────────────────────────────────────────────────────

async function pbkdf2(password: string, salt: Uint8Array, iterations: number): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey("raw", enc.encode(password), "PBKDF2", false, [
    "deriveBits",
  ]);
  const bits = await crypto.subtle.deriveBits(
    { name: "PBKDF2", salt, iterations, hash: "SHA-256" },
    key,
    256
  );
  return new Uint8Array(bits);
}

export async function hashPassword(
  password: string,
  iterations = DEFAULT_ITERS
): Promise<string> {
  const salt = randomBytes(16);
  const hash = await pbkdf2(password, salt, iterations);
  return `pbkdf2$${iterations}$${b64(salt)}$${b64(hash)}`;
}

export async function verifyPassword(password: string, stored: string): Promise<boolean> {
  const parts = stored.split("$");
  if (parts.length !== 4 || parts[0] !== "pbkdf2") return false;
  const iterations = Number(parts[1]);
  if (!Number.isFinite(iterations) || iterations < 1000) return false;
  const salt = unb64(parts[2]);
  const want = unb64(parts[3]);
  const got = await pbkdf2(password, salt, iterations);
  if (got.length !== want.length) return false;
  // 定长比较，避免时间侧信道
  let diff = 0;
  for (let i = 0; i < got.length; i++) diff |= got[i] ^ want[i];
  return diff === 0;
}

// ── 会话 ────────────────────────────────────────────────────────────

export function sessionCookie(token: string, maxAgeSeconds = SESSION_DAYS * 86400): string {
  return [
    `${COOKIE_NAME}=${token}`,
    "Path=/",
    "HttpOnly",
    "Secure",
    "SameSite=Lax",
    `Max-Age=${maxAgeSeconds}`,
  ].join("; ");
}

export function clearCookie(): string {
  return `${COOKIE_NAME}=; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=0`;
}

function readCookie(request: Request, name: string): string | null {
  const raw = request.headers.get("cookie");
  if (!raw) return null;
  for (const part of raw.split(";")) {
    const i = part.indexOf("=");
    if (i < 0) continue;
    if (part.slice(0, i).trim() === name) return part.slice(i + 1).trim();
  }
  return null;
}

export async function createSession(
  env: Env,
  request: Request,
  userId: number
): Promise<string> {
  const token = b64url(randomBytes(32));
  const tokenHash = await sha256Hex(token);
  const expires = new Date(Date.now() + SESSION_DAYS * 86400_000).toISOString();
  await env.DB.prepare(
    `INSERT INTO sessions (token_hash, user_id, expires_at, ip, ua)
     VALUES (?1, ?2, ?3, ?4, ?5)`
  )
    .bind(tokenHash, userId, expires, clientIp(request), (request.headers.get("user-agent") ?? "").slice(0, 200))
    .run();
  return token;
}

export async function currentUser(request: Request, env: Env): Promise<UserRow | null> {
  const token = readCookie(request, COOKIE_NAME);
  if (!token) return null;
  const tokenHash = await sha256Hex(token);
  const row = await env.DB.prepare(
    `SELECT u.id, u.email, u.nickname, u.role, u.status, u.created_at, u.last_login_at
       FROM sessions s JOIN users u ON u.id = s.user_id
      WHERE s.token_hash = ?1 AND s.expires_at > datetime('now')
      LIMIT 1`
  )
    .bind(tokenHash)
    .first<UserRow>();
  if (!row || row.status !== "active") return null;
  return row;
}

export async function destroySession(request: Request, env: Env): Promise<void> {
  const token = readCookie(request, COOKIE_NAME);
  if (!token) return;
  await env.DB.prepare(`DELETE FROM sessions WHERE token_hash = ?1`)
    .bind(await sha256Hex(token))
    .run();
}

// ── 校验 ────────────────────────────────────────────────────────────

export const EMAIL_RE = /^[^@\s]+@[^@\s]+\.[^@\s]{2,}$/;

export function validEmail(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim().toLowerCase();
  return EMAIL_RE.test(t) && t.length <= 200 ? t : null;
}

export function validPassword(v: unknown): string | null {
  if (typeof v !== "string") return null;
  if (v.length < 8 || v.length > 200) return null;
  return v;
}

export function validNickname(v: unknown): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  if (t.length < 1 || t.length > 24) return null;
  return t;
}

// ── 发信（Resend）───────────────────────────────────────────────────
// 没配 RESEND_API_KEY 时直接返回 sent=false，调用方按「无邮件模式」处理。

export async function sendMail(
  env: Env,
  to: string,
  subject: string,
  html: string
): Promise<{ sent: boolean; error?: string }> {
  const key = env.RESEND_API_KEY;
  if (!key) return { sent: false, error: "no-mailer" };
  try {
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { authorization: `Bearer ${key}`, "content-type": "application/json" },
      body: JSON.stringify({
        from: env.MAIL_FROM ?? "StanlFeek 博客 <noreply@mail.stanl.top>",
        to: [to],
        subject,
        html,
      }),
    });
    if (!res.ok) return { sent: false, error: `resend ${res.status}` };
    return { sent: true };
  } catch (e) {
    return { sent: false, error: String(e).slice(0, 120) };
  }
}

export function sixDigitCode(): string {
  return String(Math.floor(100000 + Math.random() * 900000));
}
