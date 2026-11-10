# 迁移到 Cloudflare Pages

stanl.top 从 GitHub Pages 迁到 Cloudflare Pages + Functions + D1 + R2 + KV 的执行手册。
每一步都可用命令复核，「状态」列打勾表示已完成。

## 当前进度（2026-11-10）

| 项目 | 状态 |
| --- | --- |
| 仓库/工作区备份 + tag | ✅ |
| 本地 Hugo 0.146.0 extended 构建通过 | ✅ |
| Functions（8 个接口）TypeScript 语法检查 | ✅ |
| Cloudflare 账号授权（wrangler OAuth） | ✅ |
| D1 `stanl-blog` + 三张表 | ✅ |
| KV `stanl-top-KV` | ✅ |
| Pages 项目 `stanl-top` | ✅ |
| `ADMIN_TOKEN` secret | ✅ |
| 首次部署 + 全接口烟测 | ✅ https://stanl-top.pages.dev |
| NS 迁到 Cloudflare（gemma/sonny） | ✅ zone `stanl.top` 已 active |
| 自定义域 stanl.top + www.stanl.top | ✅ 均 active，证书已签 |
| www → apex 301 | ✅ 由 `functions/_middleware.ts` 实现 |
| `_headers` 缓存与安全头 | ✅ 已生效 |
| 推送到 main 自动部署 | ✅ `Deploy to Cloudflare Pages` 已跑通（secrets 已写入） |
| 泰拉瑞亚游戏并入 `static/` | ✅ `/terraria/` 入口与 `/terraria-deepseek-v4.1-flash/` 均可访问 |
| 用户系统（邮箱注册/登录/会话） | ✅ `users`/`sessions`/`email_codes` 三表已建，`/api/auth/*` 全部实测 |
| 后台 `/admin/`（留言·友链审核 + 用户管理） | ✅ 首个注册用户自动成为 admin |
| 留言弹幕 | ✅ 留言板顶部飘屏，发新留言即时飞入 |
| R2 `stanl-images` | ⛔ 按决定不启用（账号未绑支付方式，站点不用相册） |

**线上站点：https://stanl.top**（www 会 301 跳到它）—— 留言、友链、浏览量、搜索、`/terraria/` 全部实测可用。

资源清单（已写入 `wrangler.toml`）：

```
account id   : 386b3ee60a609e0024130e0d720daecf
zone id      : b51ac8973e5c00f0933937e60e707d82   (stanl.top)
zone NS      : gemma.ns.cloudflare.com / sonny.ns.cloudflare.com
D1 database  : stanl-blog  → 883054b0-9b04-41a9-9d8f-05ddeeb027d8  (WNAM)
KV namespace : stanl-top-KV → 0fc9d21e320f4858b50991b9a6656a79
Pages project: stanl-top
R2 bucket    : 未启用
```

### DNS 最终状态（2026-11-10 18:35）

| 名称 | 类型 | 内容 | 代理 |
| --- | --- | --- | --- |
| `stanl.top` | CNAME | `stanl-top.pages.dev` | 橙云 |
| `www.stanl.top` | CNAME | `stanl-top.pages.dev` | 橙云 |

原 DNSPod 的两条 GitHub Pages A 记录（185.199.108.153 / 185.199.109.153）与 `www → stanlfeek.github.io` 的 CNAME 已删除/改写。
迁移前该域名**没有 MX / TXT / CAA / _dmarc**，所以 NS 切换没有邮件或验证记录要保留。

证书（Universal SSL，自动续期）：

```
stanl.top      CN=stanl.top      issuer=Google Trust Services WE1   notAfter 2027-02-08
www.stanl.top  CN=www.stanl.top  issuer=Let's Encrypt YE2           notAfter 2027-02-08
```

### 两个绕不开的平台行为（实测结论，别再踩）

1. **`_redirects` 不处理跨域名规则**。写 `https://www.stanl.top/* https://stanl.top/:splat 301!` 在两个自定义域都 active 之后仍然不生效，路径规则（如 `/a /b 302`）则正常。所以 www→apex 改由根级 `functions/_middleware.ts` 做 host 判断后 `Response.redirect(..., 301)`。
2. **`_redirects` 的 splat 只能整段**。`/posts/*.html → /posts/:splat` 这类「段内通配」不匹配，别写。

zone 级 Redirect Rule（Rulesets API）也可行，但 `stanl-migrate` token 只有 DNS:Edit + Zone:Edit，调 `/zones/{id}/rulesets` 直接 `Authentication error`，所以没走这条路。

---

## 0. 备份（已完成）

```powershell
# 仓库快照（含全部 ref）
git bundle create "D:\Backup\stanl-top-backup-20261110-1550\repo-all.bundle" --all
# 工作区文件快照
robocopy . "D:\Backup\stanl-top-backup-20261110-1550\worktree" /E /XD .git /XF *.tmp /NFL /NDL
```

- 备份目录：`D:\Backup\stanl-top-backup-20261110-1550\`
- `repo-all.bundle` — 全部 5 个 ref，`git bundle verify` 通过
- `worktree\` — 385 个文件
- `SHA256SUMS.txt` — 校验清单
- 仓库 tag：`backup/pre-cf-migration-20261110-1550`

还原命令：

```powershell
cd D:\Backup\stanl-top-backup-20261110-1550
git clone repo-all.bundle restored-site
```

---

## 1. 本地环境

| 工具 | 用途 | 检查 |
| --- | --- | --- |
| Hugo 0.146.0 extended | 与线上构建版本一致 | `hugo version` |
| Node.js 20+ | wrangler CLI | `node -v` |
| Git | 版本管理 | `git --version` |

---

## 2. Cloudflare 侧资源（已完成）

按顺序执行，每条都会打印 id，填回 `wrangler.toml`。

```bash
# 登录（浏览器授权一次，凭据写入 ~/.wrangler）
npx wrangler login
npx wrangler whoami

# Pages 项目
npx wrangler pages project create stanl-top --production-branch main

# D1 数据库
npx wrangler d1 create stanl-blog
#   → 输出 database_id = xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx

# R2 存储桶
npx wrangler r2 bucket create stanl-images

# KV 命名空间（浏览量去重 + 接口限流）
npx wrangler kv namespace create KV
#   → 输出 id = xxxxxxxxxxxxxxxxxxxx
```

把三个 id 填进 `wrangler.toml`，并去掉对应块的注释：（已填好，见上）

```toml
[[d1_databases]]
binding = "DB"
database_name = "stanl-blog"
database_id = "883054b0-9b04-41a9-9d8f-05ddeeb027d8"

[[kv_namespaces]]
binding = "KV"
id = "0fc9d21e320f4858b50991b9a6656a79"
```

建表：

```bash
npx wrangler d1 execute stanl-blog --remote --file=./schema.sql
npx wrangler d1 execute stanl-blog --remote --command="SELECT name FROM sqlite_master WHERE type='table'"
```

后台令牌（写留言审核、图片上传要用）：

```bash
# 生成一个足够长的随机串
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
# 存成 Pages secret
npx wrangler pages secret put ADMIN_TOKEN --project-name stanl-top
```

---

## 3. 部署

```bash
hugo --minify --gc
npx wrangler pages deploy public --project-name stanl-top --branch main
```

首次会给出预览域名 `https://stanl-top.pages.dev`，先在它上面验证全部功能再切主域。

### CI 自动部署（二选一）

- **方式 A：Cloudflare 连 GitHub**（推荐，无需 token）
  Dashboard → Workers & Pages → stanl-top → Settings → Build & deployments
  - Build command: `hugo --minify --gc`
  - Build output directory: `public`
  - 环境变量 `HUGO_VERSION=0.146.0`

- **方式 B：GitHub Actions 推送（已启用 ✅）**
  `.github/workflows/deploy-cloudflare.yml` 已在跑。仓库 Secrets 里已写入：
  - `CLOUDFLARE_API_TOKEN`：token 名 `stanl-pages-deploy`，权限 `Cloudflare Pages: Edit`（所有账户），无过期
  - `CLOUDFLARE_ACCOUNT_ID`：`386b3ee60a609e0024130e0d720daecf`

  实测：push 到 main 后约 1 分钟完成构建 + 部署，`50b6e6c` 起全部 success。
  本地仍可 `npm run deploy` 手动发版（两者不冲突，后跑的覆盖）。

> 两个 workflow 目前都在跑：`Deploy Hugo site to Pages`（GitHub Pages，回滚路径）与
> `Deploy to Cloudflare Pages`（生产）。等确认稳定后再删前者：`.github/workflows/deploy.yml`。

> 令牌清单（都在本机，均已 gitignore）：
> - `.cf-token.txt` — `stanl-migrate`，DNS:Edit + Zone:Edit（改 DNS 用）
> - `.cf-pages-token.txt` — `stanl-pages-deploy`，Cloudflare Pages:Edit（CI 用）
> - `.admin-token.txt` — `/api/comments/*` 删改与 `/api/upload` 的 Bearer 令牌

---

## 4. 绑定域名

前置：`.asia`/`.top` 的 NS 必须在 Cloudflare。

```bash
dig +short NS stanl.top
```

**NS 已在 Cloudflare** —— 直接加自定义域：

1. Pages 项目 → Custom domains → `stanl.top`（apex 会自动建 CNAME 走 flattening）
2. 再加 `www.stanl.top`
3. 等证书状态变 **Active**（通常 1–5 分钟）
4. 删掉 GitHub Pages 残留记录：
   - A `185.199.108.153` / `.109.153` / `.110.153` / `.111.153`
   - AAAA `2606:50c0:8000::153` / `::8001::153` / `::8002::153` / `::8003::153`
   - CNAME `www` → `stanlfeek.github.io`
5. 到 GitHub 仓库 Settings → Pages，把 Custom domain 清空（否则证书校验打架）
6. 代理状态必须是**橙云**（DNS only 会让证书签不下来）

**NS 已迁到 Cloudflare，且已全部切完（2026-11-10 18:35 完成）**

```
Zone  : stanl.top  id=b51ac8973e5c00f0933937e60e707d82
NS    : gemma.ns.cloudflare.com / sonny.ns.cloudflare.com
状态  : active
```

实际执行的 DNS 变更（已用 DNS:Edit token 走 API 完成，不是手点）：

| 操作 | 类型 | 名称 | 内容 | 代理 | 结果 |
| --- | --- | --- | --- | --- | --- |
| 删 | A | `@` | `185.199.108.153` | — | ✅ |
| 删 | A | `@` | `185.199.109.153` | — | ✅ |
| 加 | CNAME | `@` | `stanl-top.pages.dev` | 橙云 | ✅ flattening |
| 改 | CNAME | `www` | `stanl-top.pages.dev` | 橙云 | ✅（原指向 `stanlfeek.github.io`） |

> apex 用 CNAME 依赖 Cloudflare 的 flattening，必须先删干净 A/AAAA 才不冲突。
> Pages → Custom domains 里两个域现在都是 `active`，证书已签发。

**拥有 `dns:write` 的 API Token 时，上面这些可以一条命令做完：**

```bash
ACC=386b3ee60a609e0024130e0d720daecf
ZID=b51ac8973e5c00f0933937e60e707d82
H="Authorization: Bearer $CF_API_TOKEN"

# 1) 列出并删掉所有 @ 的 A/AAAA
curl -s "https://api.cloudflare.com/client/v4/zones/$ZID/dns_records?type=A&name=stanl.top" -H "$H" \
  | jq -r '.result[].id' | xargs -I{} curl -s -X DELETE "https://api.cloudflare.com/client/v4/zones/$ZID/dns_records/{}" -H "$H"

# 2) 建 apex CNAME + 改 www
curl -s -X POST "https://api.cloudflare.com/client/v4/zones/$ZID/dns_records" -H "$H" \
  -H 'content-type: application/json' \
  -d '{"type":"CNAME","name":"stanl.top","content":"stanl-top.pages.dev","proxied":true}'
```


### 切换顺序（避免空窗）

```
① CF Pages 建好，先不绑域，用 pages.dev 域名验证
② 旧 DNS 的 TTL 降到 60 秒，等一个旧 TTL 周期
③ CF 绑自定义域，等证书 Active
④ 删旧 A / AAAA / CNAME
⑤ 清 GitHub 侧 Custom domain
⑥ 验证（见下）
⑦ TTL 调回 Auto
```

### 验证（以下为 2026-11-10 实测结果）

```bash
curl -sI https://stanl.top | grep -iE 'server|cf-ray'
# 实测：server: cloudflare，带 cf-ray（HKG / LAX 边缘）

openssl s_client -connect stanl.top:443 -servername stanl.top </dev/null 2>/dev/null | openssl x509 -noout -issuer -dates
# 实测：CN=stanl.top，issuer Google Trust Services WE1，notAfter 2027-02-08
#       CN=www.stanl.top，issuer Let's Encrypt YE2，notAfter 2027-02-08

curl -s https://stanl.top/api/health
# 实测：{"site":"stanl.top","ok":true,"checks":{"d1":"ok","r2":"disabled","kv":"ok","admin_token":"set"}}

curl -s -X POST https://stanl.top/api/view -H 'content-type: application/json' -d '{"path":"/__smoke__"}'
# 期望：{"path":"/__smoke__","views":1,"counted":true}

curl -sS -o /dev/null -w '%{http_code} %{redirect_url}\n' https://www.stanl.top/posts/
# 期望：301 https://stanl.top/posts/
```

注意：`Invoke-WebRequest -Method Head` 请求 Pages Function 会 404（没实现 `onRequestHead`），用 GET 或 `curl -sI`。

### 图片域名（R2）

**未启用。** R2 需要在 Cloudflare 账号绑定支付方式才能开通，当前按决定不做相册，
`img.stanl.top` 不添加，`/api/upload` 与 `/api/photos` 固定返回 503。
以后要开：R2 → 创建 `stanl-images` → Settings → Custom Domains 加 `img.stanl.top`（橙云），
再把 `wrangler.toml` 里 R2 那段取消注释并填 `bucket_name`，两个接口改回真实实现。

---

## 5. 回滚

DNS 层面（5 分钟内可完成）：

1. Cloudflare DNS 删掉 `stanl.top` / `www` 指向 Pages 的记录
2. 重新加 4 条 A → `185.199.108.153`、`185.199.109.153`、`185.199.110.153`、`185.199.111.153`
3. 重新加 CNAME `www` → `stanlfeek.github.io`
4. GitHub 仓库 Settings → Pages → Custom domain 填回 `stanl.top`，勾选 Enforce HTTPS

> 更快的应急路径：Cloudflare → stanl.top → DNS，把 `stanl.top` 那条 CNAME 的橙云关掉（改灰云）
> 会立刻回源到 `stanl-top.pages.dev`，但页面仍由 Pages 提供；真正回 GH Pages 要走上面 4 步。

## 5.1 遗留待办（不影响线上）

- `.github/workflows/deploy.yml`（GitHub Pages）仍在跑，属回滚保险。稳定后可删。
- 游戏 `terraria-deepseek-v4.1-flash` 的源码仓库仍在 GitHub（`StanlFeek/terraria-deepseek-v4.1-flash`），
  博客里现在放的是它的构建副本（`static/terraria-deepseek-v4.1-flash/`）。
  以后游戏更新要重新拷一份过去，或改成 submodule / 构建时拉取。

代码层面：

```powershell
cd D:\Backup\Documents\ChatGPT\website\StanlFeek.github.io
git checkout backup/pre-cf-migration-20261110-1550
```

或者从 bundle 全新还原：

```powershell
git clone D:\Backup\stanl-top-backup-20261110-1550\repo-all.bundle restored-site
```

---

## 6. 用户系统与留言弹幕

### 6.1 建表（一次）

```powershell
# 注意：执行 D1 命令要 unset 掉 Pages 令牌，走 wrangler OAuth 登录态，否则 code 10000
Remove-Item Env:CLOUDFLARE_API_TOKEN -ErrorAction SilentlyContinue
cd D:\Backup\Documents\ChatGPT\website\StanlFeek.github.io
npx wrangler d1 execute stanl-blog --remote --file=./schema-auth.sql
```

`schema-auth.sql` 建四样东西：`users`、`sessions`、`email_codes`，
以及给 `comments` 补一列 `user_id`（重复执行会报 `duplicate column name: user_id`，可忽略）。

### 6.2 账号规则

- 注册用邮箱 + 昵称 + 密码（8–200 位），密码存 PBKDF2-SHA256 十万轮：
  `pbkdf2$100000$<saltB64>$<hashB64>`，迭代次数写在串里，以后调整不影响老口令。
- **数据库里第一个注册的用户自动 `role=admin`**，之后注册的都是普通用户。
- 会话存在 `sessions` 表，cookie 名 `sid`（`HttpOnly; Secure; SameSite=Lax`，30 天）。
  存储的是 token 的 sha256，库里拿不到可用 token。
- 登录态下发留言时，昵称与邮箱强制取自账号，`website` 忽略 —— 防冒名。
  后台会把这条留言标成「已验证」。

### 6.3 邮件验证码（可选）

当前 `RESEND_API_KEY` 没配，`/api/auth/config` 返回 `codeRequired:false`，
**注册直接放行**（不校验验证码）。要给真实验证码：

```powershell
# 1) 在 resend.com 建 API Key，验证发信域名（如 mail.stanl.top）
# 2) 存进 Pages 项目
npx wrangler pages secret put RESEND_API_KEY --project-name stanl-top
npx wrangler pages secret put MAIL_FROM --project-name stanl-top   # 形如 Blog <noreply@mail.stanl.top>
```

配完之后 `codeRequired` 自动变 `true`，注册页会多出「验证码」一行 + 60 秒倒计时按钮。
（发信域名如果不验证，Resend 只允许发给自己的账号邮箱。）

### 6.4 后台入口与两种鉴权

- 页面：`https://stanl.top/admin/`（导航里没有入口，只能直接输地址；`sitemap: disable`）
- 权限判断在 `functions/api/admin/_middleware.ts`，两条路都行：
  1. 浏览器 cookie 里的 `sid` 对应 `users.role='admin'`
  2. 请求头 `Authorization: Bearer <ADMIN_TOKEN>`（脚本 / curl 用）
- 能做到：留言审核（通过/垃圾/删除）、友链审核（通过/拒绝）、用户管理（封禁/解封、升/降管理员）。
  不允许把自己停用或降级。

```powershell
# 用令牌直接调接口
$tok = (Get-Content .admin-token.txt -Raw).Trim()
curl.exe -sS "https://stanl.top/api/admin/overview" -H "Authorization: Bearer $tok"
curl.exe -sS "https://stanl.top/api/admin/comments?status=pending" -H "Authorization: Bearer $tok"
```

### 6.5 留言弹幕

`content/guestbook.md` 里那个 `<div data-danmaku data-path="/guestbook/"></div>`
会被 `assets/js/danmaku.js` 接管：拉同一套 `/api/comments`，把每条留言按昵称 hash 分色、
分轨道从右向左飘过；提交新留言时通过 `stanl:comment` 自定义事件即时补一条。
`prefers-reduced-motion` 打开时退化成静态列表（不飘，只列）。

### 6.6 接口速查

| 方法 | 路径 | 说明 |
| --- | --- | --- |
| GET | `/api/auth/config` | `{codeRequired}`，决定注册页要不要验证码 |
| POST | `/api/auth/send-code` | `{email}` → 发 6 位验证码（无密钥时 `mailSent:false`） |
| POST | `/api/auth/register` | `{email,nickname,password,code?}` → 201 + Set-Cookie |
| POST | `/api/auth/login` | `{email,password}` → 200 + Set-Cookie |
| POST | `/api/auth/password` | `{current,next}` → 改自己的密码；成功后作废该账号全部旧会话，并发一个新 cookie |
| POST | `/api/auth/logout` | 删会话 + 清 cookie |
| GET | `/api/auth/me` | `{ok,user\|null}` |
| GET/PATCH/DELETE | `/api/admin/comments` | 审核列表 / 改状态 / 删 |
| GET/PATCH | `/api/admin/links` | 友链审核 |
| GET/PATCH | `/api/admin/users` | 用户列表 / 封禁·角色 / `{id,password}` 重置密码 |
| GET | `/api/admin/overview` | 留言·待审·友链·用户·总浏览 |

改密码的几条规则（`functions/api/auth/password.ts`）：

- 必须登录态；`current` 校验失败累计 5 次后锁 15 分钟（KV `pw:<userId>`）
- 新密码 ≥ 8 位，且不能和旧密码相同
- 成功后 `DELETE FROM sessions WHERE user_id = ?`，再为当前浏览器重建一条——所以**其他设备会被踢下线**
- 后台「用户管理」里的「重置密码」走 `PATCH /api/admin/users {id,password}`；管理员重置自己时保留当前会话，重置别人时清空对方全部会话


删除单条留言仍走 `DELETE /api/comments/<id>`（带令牌），`?id=` 形式返回 405。

---

## 7. 已知限制

- Functions 单请求 CPU：Free 10ms / Paid 30s（本项目最重的接口是留言查询，远低于）
- 无常驻进程：需要实时（WebSocket 广播）就得用 Durable Objects
- D1 是单写者 SQLite：写并发高时会排队，个人博客量级无感
- 请求体上限 100MB（Paid），上传接口自己限了 10MB
- 若在 CF 环境构建，主题 submodule 需要配 `SSH_KEY` 或改用 `hugo mod` —— 本项目主题是直接 fork 进仓库的，无此问题
