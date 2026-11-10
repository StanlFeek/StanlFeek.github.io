/**
 * 相册：列出 R2 中 uploads/ 下的图片
 *   GET /api/photos?prefix=uploads/2026-11/&cursor=&limit=60
 *
 * R2 本身不存元数据，相册的分组 / 说明建议写在 Hugo 的 data/photos.yaml 里，
 * 这里只负责「有哪些图」的兜底列表。
 */

import type { Env } from "./_middleware";

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "public, max-age=60",
    },
  });

const PUBLIC_BASE = "https://img.stanl.top";

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  if (!env.R2) return json({ error: "R2 未启用：请先在 Cloudflare 控制台开通 R2 并绑定 bucket" }, 503);

  const url = new URL(request.url);
  const prefix = url.searchParams.get("prefix") ?? "uploads/";
  const cursor = url.searchParams.get("cursor") ?? undefined;
  const limit = Math.min(Math.max(Number(url.searchParams.get("limit") ?? 60), 1), 200);

  const listed = await env.R2.list({ prefix, cursor, limit });

  const items = listed.objects
    .filter((o) => /\.(jpe?g|png|gif|webp|avif|svg)$/i.test(o.key))
    .map((o) => ({
      key: o.key,
      url: `${PUBLIC_BASE}/${o.key}`,
      size: o.size,
      uploaded: o.uploaded.toISOString(),
    }));

  return json({
    prefix,
    truncated: listed.truncated,
    cursor: listed.truncated ? listed.cursor : null,
    items,
  });
};
