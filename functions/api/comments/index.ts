/**
 * 留言 / 评论
 *   GET  /api/comments?path=/guestbook/&limit=50&offset=0
 *   POST /api/comments  { path, nickname, email?, website?, content, hp? }
 *
 * hp 是隐藏蜜罐字段，正常用户永远为空，填了就是机器人，直接返回 200 但不入库。
 */

import type { Env } from "../_middleware";
import { currentUser } from "../auth/_lib";

const MAX_CONTENT = 2000;
const MAX_NICK = 40;
const MAX_SITE = 200;

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });

function str(v: unknown, max: number): string | null {
  if (typeof v !== "string") return null;
  const t = v.trim();
  if (!t || t.length > max) return null;
  return t;
}

function optStr(v: unknown, max: number): string | null {
  if (v === undefined || v === null || v === "") return null;
  return str(v, max);
}

function safeUrl(v: string | null): string | null {
  if (!v) return null;
  try {
    const u = new URL(v);
    return u.protocol === "http:" || u.protocol === "https:" ? u.toString() : null;
  } catch {
    return null;
  }
}

function maskEmail(email: string | null): string | null {
  if (!email) return null;
  const [name, domain] = email.split("@");
  if (!domain) return "***";
  const head = name.slice(0, Math.min(2, name.length));
  return `${head}***@${domain}`;
}

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const url = new URL(request.url);
  const path = url.searchParams.get("path");
  if (!path) return json({ error: "path required" }, 400);

  const limit = Math.min(Math.max(Number(url.searchParams.get("limit") ?? 50), 1), 100);
  const offset = Math.max(Number(url.searchParams.get("offset") ?? 0), 0);

  const { results } = await env.DB
    .prepare(
      `SELECT id, nickname, website, content, created_at, reply_to, reply_content, user_id
         FROM comments
        WHERE path = ?1 AND status = 'approved'
        ORDER BY id DESC
        LIMIT ?2 OFFSET ?3`
    )
    .bind(path, limit, offset)
    .all();

  const total = await env.DB
    .prepare(`SELECT COUNT(*) AS n FROM comments WHERE path = ?1 AND status = 'approved'`)
    .bind(path)
    .first<{ n: number }>();

  return json({ path, total: total?.n ?? 0, limit, offset, items: results ?? [] });
};

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  let body: Record<string, unknown>;
  try {
    body = (await request.json()) as Record<string, unknown>;
  } catch {
    return json({ error: "invalid json" }, 400);
  }

  // 蜜罐：命中就假装成功
  if (typeof body.hp === "string" && body.hp.length > 0) {
    return json({ ok: true, id: 0 });
  }

  const path = str(body.path, 512);
  const content = str(body.content, MAX_CONTENT);
  if (!path || !content) {
    return json({ error: "path / content required" }, 400);
  }

  // 登录用户：昵称/邮箱/网址一律取账号里的，杜绝冒名
  const user = await currentUser(request, env);
  const nickname = user ? user.nickname : str(body.nickname, MAX_NICK);
  if (!nickname) {
    return json({ error: "nickname required" }, 400);
  }

  const email = user ? user.email : optStr(body.email, 200);
  if (email && !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) {
    return json({ error: "invalid email" }, 400);
  }
  const website = user ? null : safeUrl(optStr(body.website, MAX_SITE));

  // 同一 IP 10 秒内只能发一条
  // 注意：KV 的 expirationTtl 最小 60 秒，所以值里存时间戳，自己做 10 秒窗口判断
  const ip = request.headers.get("cf-connecting-ip") ?? "0.0.0.0";
  const rlKey = `c:${ip}`;
  const last = await env.KV.get(rlKey);
  if (last && Date.now() - Number(last) < 10_000) {
    return json({ error: "rate limited, retry in 10s" }, 429);
  }

  const res = await env.DB
    .prepare(
      `INSERT INTO comments (path, nickname, email, website, content, user_id)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6)`
    )
    .bind(path, nickname, email, website, content, user ? user.id : null)
    .run();

  await env.KV.put(rlKey, String(Date.now()), { expirationTtl: 60 });

  return json(
    {
      ok: true,
      id: res.meta.last_row_id,
      email: maskEmail(email),
      nickname,
      verified: Boolean(user),
    },
    201
  );
};
