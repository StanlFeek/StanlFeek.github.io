/**
 * 全站中间件：www → apex 301
 *
 * Pages 的 `_redirects` 只处理「同 host 的路径规则」，
 * 写 `https://www.stanl.top/*` 这种跨域规则在当前版本不生效（实测）。
 * 所以用 Functions 中间件在请求入口做 host 归一。
 *
 * 注意：根级 `functions/_middleware.ts` 会对所有请求执行（包括静态资源），
 * 因此这里只做一次 hostname 比较，代价极低。
 */

export const onRequest: PagesFunction = async (context) => {
  const url = new URL(context.request.url);

  if (url.hostname === "www.stanl.top") {
    const target = `https://stanl.top${url.pathname}${url.search}`;
    return Response.redirect(target, 301);
  }

  return context.next();
};
