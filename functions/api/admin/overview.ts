/** GET /api/admin/overview —— 后台首页的计数 */

import type { Env } from "../_middleware";
import { json } from "../auth/_lib";

export const onRequestGet: PagesFunction<Env> = async ({ env }) => {
  const [comments, pendingComments, links, pendingLinks, users, views] = await Promise.all([
    env.DB.prepare(`SELECT COUNT(*) AS n FROM comments`).first<{ n: number }>(),
    env.DB.prepare(`SELECT COUNT(*) AS n FROM comments WHERE status = 'pending'`).first<{ n: number }>(),
    env.DB.prepare(`SELECT COUNT(*) AS n FROM link_requests`).first<{ n: number }>(),
    env.DB.prepare(`SELECT COUNT(*) AS n FROM link_requests WHERE status = 'pending'`).first<{ n: number }>(),
    env.DB.prepare(`SELECT COUNT(*) AS n FROM users`).first<{ n: number }>(),
    env.DB.prepare(`SELECT COALESCE(SUM(views), 0) AS n FROM pageviews`).first<{ n: number }>(),
  ]);

  return json({
    ok: true,
    comments: comments?.n ?? 0,
    pendingComments: pendingComments?.n ?? 0,
    links: links?.n ?? 0,
    pendingLinks: pendingLinks?.n ?? 0,
    users: users?.n ?? 0,
    totalViews: views?.n ?? 0,
  });
};
