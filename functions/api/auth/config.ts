/** GET /api/auth/config —— 前端需要的开关 */

import type { Env } from "../_middleware";
import { json } from "./_lib";

export const onRequestGet: PagesFunction<Env> = async ({ env }) => {
  return json({ ok: true, codeRequired: Boolean(env.RESEND_API_KEY) });
};
