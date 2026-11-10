/**
 * 图片上传到 R2（需要管理员令牌）
 *   POST /api/upload   multipart/form-data, 字段名 file
 *
 * 返回 { url, key }，url 指向 img.stanl.top 自定义域。
 * 限制：单文件 10 MB，仅图片 MIME。
 */

import type { Env } from "./_middleware";

const MAX_BYTES = 10 * 1024 * 1024;
const PUBLIC_BASE = "https://img.stanl.top";

const ALLOWED: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/gif": "gif",
  "image/webp": "webp",
  "image/avif": "avif",
  "image/svg+xml": "svg",
};

const json = (data: unknown, status = 200) =>
  new Response(JSON.stringify(data), {
    status,
    headers: {
      "content-type": "application/json; charset=utf-8",
      "cache-control": "no-store",
    },
  });

function authorized(request: Request, env: Env): boolean {
  if (!env.ADMIN_TOKEN) return false;
  const auth = request.headers.get("authorization") ?? "";
  return auth === `Bearer ${env.ADMIN_TOKEN}`;
}

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  if (!authorized(request, env)) return json({ error: "unauthorized" }, 401);
  if (!env.R2) return json({ error: "R2 未启用：请先在 Cloudflare 控制台开通 R2 并绑定 bucket" }, 503);

  let form: FormData;
  try {
    form = await request.formData();
  } catch {
    return json({ error: "expected multipart/form-data" }, 400);
  }

  const file = form.get("file");
  if (!(file instanceof File)) return json({ error: "field 'file' required" }, 400);
  if (file.size > MAX_BYTES) return json({ error: "file too large (max 10MB)" }, 413);

  const ext = ALLOWED[file.type];
  if (!ext) return json({ error: `unsupported type: ${file.type}` }, 415);

  const day = new Date().toISOString().slice(0, 10);
  const key = `uploads/${day}/${crypto.randomUUID()}.${ext}`;

  await env.R2.put(key, file.stream(), {
    httpMetadata: {
      contentType: file.type,
      cacheControl: "public, max-age=31536000, immutable",
    },
  });

  return json({ ok: true, key, url: `${PUBLIC_BASE}/${key}` }, 201);
};
