/** GET /api/auth/me —— 当前登录用户（未登录返回 { user: null }） */

import type { Env } from "../_middleware";
import { json, currentUser } from "./_lib";

export const onRequestGet: PagesFunction<Env> = async ({ request, env }) => {
  const user = await currentUser(request, env);
  return json({
    ok: true,
    user: user
      ? { id: user.id, email: user.email, nickname: user.nickname, role: user.role }
      : null,
  });
};
