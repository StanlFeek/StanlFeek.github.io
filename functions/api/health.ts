/**
 * 健康检查：/api/health
 * 返回各绑定是否就绪，迁移时用来确认 D1 / R2 / KV 都挂上了。
 *
 * D1 与 KV 是必需的；R2 是可选的（未开通时显示 disabled，不算失败）。
 */

import type { Env } from "./_middleware";

export const onRequestGet: PagesFunction<Env> = async ({ env }) => {
  const checks: Record<string, string> = {};

  if (!env.DB) {
    checks.d1 = "missing binding";
  } else {
    try {
      const row = await env.DB.prepare("SELECT 1 AS ok").first<{ ok: number }>();
      checks.d1 = row?.ok === 1 ? "ok" : "unexpected";
    } catch (e) {
      checks.d1 = `error: ${(e as Error).message}`;
    }
  }

  if (!env.R2) {
    checks.r2 = "disabled";
  } else {
    try {
      await env.R2.head("__healthcheck__");
      checks.r2 = "ok";
    } catch (e) {
      // 对象不存在也会抛，说明绑定可用但 key 缺失
      const msg = (e as Error).message;
      checks.r2 = /not\s*found|NoSuchKey/i.test(msg) ? "ok" : `error: ${msg}`;
    }
  }

  if (!env.KV) {
    checks.kv = "missing binding";
  } else {
    try {
      await env.KV.get("__healthcheck__");
      checks.kv = "ok";
    } catch (e) {
      checks.kv = `error: ${(e as Error).message}`;
    }
  }

  checks.admin_token = env.ADMIN_TOKEN ? "set" : "missing";

  const coreOk = checks.d1 === "ok" && checks.kv === "ok";
  const allOk = coreOk && (checks.r2 === "ok" || checks.r2 === "disabled");

  return new Response(
    JSON.stringify({ site: env.SITE_NAME ?? "unknown", ok: allOk, checks }, null, 2),
    {
      status: allOk ? 200 : 503,
      headers: {
        "content-type": "application/json; charset=utf-8",
        "cache-control": "no-store",
      },
    }
  );
};
