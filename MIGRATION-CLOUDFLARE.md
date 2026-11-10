# 迁移到 Cloudflare Pages

stanl.top 从 GitHub Pages 迁到 Cloudflare Pages + Functions + D1 + R2 + KV 的执行手册。
每一步都可用命令复核，「状态」列打勾表示已完成。

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

## 2. Cloudflare 侧资源

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

把三个 id 填进 `wrangler.toml`，并去掉对应块的注释：

```toml
[[d1_databases]]
binding = "DB"
database_name = "stanl-blog"
database_id = "填这里"

[[r2_buckets]]
binding = "R2"
bucket_name = "stanl-images"

[[kv_namespaces]]
binding = "KV"
id = "填这里"
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

- **方式 B：GitHub Actions 推送**
  已在 `.github/workflows/deploy-cloudflare.yml` 写好。需要在仓库 Settings → Secrets 添加：
  - `CLOUDFLARE_API_TOKEN`（My Profile → API Tokens → 模板「Edit Cloudflare Workers」，额外给 Pages:Edit 与 D1:Edit）
  - `CLOUDFLARE_ACCOUNT_ID`（Dashboard 右下角 / `wrangler whoami` 里）

> 过渡期两个 workflow 会同时跑（GH Pages 一份、CF 一份），切完主域后再删 `.github/workflows/deploy.yml`。

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

**NS 不在 Cloudflare** —— 先 `Add a site` 把 stanl.top 加进 CF 并改 NS。迁之前逐条核对：

```bash
dig +short MX stanl.top
dig +short TXT stanl.top        # SPF / 验证记录
dig +short CAA stanl.top
```

MX、TXT、CAA 必须有对应记录搬过去 —— 漏一条就是邮件收不到或证书签不出。

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

### 验证

```bash
curl -sI https://stanl.top | grep -iE 'server|cf-ray'
# 期望：server: cloudflare，有 cf-ray

openssl s_client -connect stanl.top:443 -servername stanl.top </dev/null 2>/dev/null | openssl x509 -noout -issuer -dates
# 期望：issuer 含 Google Trust Services / Let's Encrypt，未过期

curl -s https://stanl.top/api/health
# 期望：{"ok":true,"checks":{"d1":true,"r2":true,"kv":true}}

curl -s -X POST https://stanl.top/api/view -H 'content-type: application/json' -d '{"path":"/__smoke__"}'
# 期望：{"path":"/__smoke__","views":1,"counted":true}
```

### 图片域名（R2）

R2 → stanl-images → Settings → Custom Domains → 添加 `img.stanl.top`。
同样要橙云，否则 R2 的自定义域不可用。

---

## 5. 回滚

DNS 层面（5 分钟内可完成）：

1. Cloudflare DNS 删掉 `stanl.top` / `www` 指向 Pages 的记录
2. 重新加 4 条 A → `185.199.108.153`、`185.199.109.153`、`185.199.110.153`、`185.199.111.153`
3. 重新加 CNAME `www` → `stanlfeek.github.io`
4. GitHub 仓库 Settings → Pages → Custom domain 填回 `stanl.top`，勾选 Enforce HTTPS

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

## 6. 已知限制

- Functions 单请求 CPU：Free 10ms / Paid 30s（本项目最重的接口是留言查询，远低于）
- 无常驻进程：需要实时（WebSocket 广播）就得用 Durable Objects
- D1 是单写者 SQLite：写并发高时会排队，个人博客量级无感
- 请求体上限 100MB（Paid），上传接口自己限了 10MB
- 若在 CF 环境构建，主题 submodule 需要配 `SSH_KEY` 或改用 `hugo mod` —— 本项目主题是直接 fork 进仓库的，无此问题
