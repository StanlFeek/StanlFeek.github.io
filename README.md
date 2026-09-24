# StanlFeek 的博客

基于 [Hugo PaperMod](https://github.com/adityatelange/hugo-PaperMod) 的个人博客。

## 本地预览

双击 `启动博客.bat`，或运行：

```powershell
.\.tools\hugo\hugo.exe server --buildDrafts --disableFastRender
```

访问：<http://localhost:1313/>

## 新建文章

```powershell
.\.tools\hugo\hugo.exe new content/posts/my-post.md
```

也可以直接复制 `archetypes/default.md` 的结构，在 `content/posts/` 中创建 Markdown 文件。

## 修改站点

- 站点名称、作者、菜单和社交链接：`config.yml`
- 首页介绍：`config.yml` 中的 `homeInfoParams`
- 关于页：`content/about.md`
- 自定义样式：`assets/css/extended/custom.css`
- 文章：`content/posts/`

## 构建

```powershell
.\.tools\hugo\hugo.exe --gc --minify
```

生成结果位于 `public/`。

## GitHub Pages

`.github/workflows/deploy.yml` 已配置为在 `main` 或 `master` 分支推送后自动构建并部署到 GitHub Pages。

仓库 Settings → Pages → Build and deployment → Source 选择 `GitHub Actions`。
