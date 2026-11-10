/**
 * 只作用于 /api/* 的中间件。
 * 放在 functions/api/ 下，静态资源请求不会经过它，零额外开销。
 */

export interface Env {
  DB: D1Database;
  R2: R2Bucket;
  KV: KVNamespace;
  ADMIN_TOKEN?: string;
  SITE_NAME?: string;
  /** Resend API Key；不配则注册走「无邮件模式」（不需要验证码） */
  RESEND_API_KEY?: string;
  MAIL_FROM?: string;
}

const ALLOWED_ORIGINS = new Set([
  "https://stanl.top",
  "https://www.stanl.top",
]);

function corsHeaders(origin: string | null): Record<string, string> {
  const allow = origin && ALLOWED_ORIGINS.has(origin) ? origin : "https://stanl.top";
  return {
    "access-control-allow-origin": allow,
    "access-control-allow-credentials": "true",
    "access-control-allow-methods": "GET, POST, PATCH, DELETE, OPTIONS",
    "access-control-allow-headers": "content-type, authorization",
    "access-control-max-age": "86400",
    vary: "origin",
  };
}

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, next } = context;
  const origin = request.headers.get("origin");

  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: corsHeaders(origin) });
  }

  const response = await next();

  // 复制响应，注入 CORS 头（Response 头是只读的）
  const out = new Response(response.body, response);
  for (const [k, v] of Object.entries(corsHeaders(origin))) out.headers.set(k, v);
  out.headers.set("x-content-type-options", "nosniff");
  return out;
};
