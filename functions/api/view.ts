/**
 * 浏览量
 *   GET  /api/view?path=/posts/hello-world/   读取，不自增
 *   POST /api/view  { "path": "/posts/hello-world/" }   自增并返回
 *
 * 去重：同一 IP + 路径 30 分钟内只计一次（KV 记录）。
 */

import type { Env } from "./_middleware";

const COOLDOWN_SECONDS = 1800;

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });

async function readCount(env: Env, path: string): Promise<number> {
  const row = await env.DB
    .prepare("SELECT views FROM pageviews WHERE path = ?1")
    .bind(path)
    .first<{ views: number }>();
  return row?.views ?? 0;
}

function normalizePath(raw: string): string | null {
  if (!raw.startsWith("/")) return null;
  if (raw.length > 512) return null;
  // 去掉 query / hash，统一尾斜杠，避免同一篇文章被计成多条
  const p = raw.split("#")[0].split("?")[0];
  return p.endsWith("/") ? p : `${p}/`;
}

async function dedupeKey(ip: string, path: string): Promise<string> {
  const data = new TextEncoder().encode(`${ip}:${path}`);
  const digest = await crypto.subtle.digest("SHA-256", data);
  const hex = [...new Uint8Array(digest)]
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
  return `v:${hex.slice(0, 40)}`;
}

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const raw = new URL(request.url).searchParams.get("path");
  if (!raw) return json({ error: "path required" }, 400);
  const path = normalizePath(raw);
  if (!path) return json({ error: "invalid path" }, 400);

  return json({ path, views: await readCount(env, path) });
};

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  let body: { path?: string };
  try {
    body = (await request.json()) as { path?: string };
  } catch {
    return json({ error: "invalid json" }, 400);
  }

  const path = typeof body.path === "string" ? normalizePath(body.path) : null;
  if (!path) return json({ error: "invalid path" }, 400);

  const ip = request.headers.get("cf-connecting-ip") ?? "0.0.0.0";
  const key = await dedupeKey(ip, path);

  const seen = await env.KV.get(key);
  let counted = false;

  if (!seen) {
    await env.DB
      .prepare(
        `INSERT INTO pageviews (path, views) VALUES (?1, 1)
         ON CONFLICT(path) DO UPDATE SET views = views + 1, updated_at = datetime('now')`
      )
      .bind(path)
      .run();
    await env.KV.put(key, "1", { expirationTtl: COOLDOWN_SECONDS });
    counted = true;
  }

  return json({ path, views: await readCount(env, path), counted });
};
