/** POST /api/auth/logout */

import type { Env } from "../_middleware";
import { json, destroySession, clearCookie } from "./_lib";

export const onRequestPost: PagesFunction<Env> = async ({ request, env }) => {
  await destroySession(request, env);
  return json({ ok: true }, 200, { "set-cookie": clearCookie() });
};
