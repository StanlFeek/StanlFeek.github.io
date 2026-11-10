/**
 * /api/admin/* 守卫：管理员会话 或 Bearer ADMIN_TOKEN
 */

import type { Env } from "../_middleware";
import { json, currentUser } from "../auth/_lib";

function eq(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env, next } = context;

  const header = request.headers.get("authorization") ?? "";
  const bearer = header.replace(/^Bearer\s+/i, "").trim();
  const byToken = Boolean(env.ADMIN_TOKEN && bearer && eq(bearer, env.ADMIN_TOKEN));

  if (!byToken) {
    const user = await currentUser(request, env);
    if (!user || user.role !== "admin") {
      return json({ ok: false, error: "forbidden", message: "需要管理员身份" }, 403);
    }
  }

  return next();
};
