---
title: "我给自己写了个 DeepSeek 翻译插件"
date: 2026-09-24
draft: false
author: "StanlFeek"
tags: ["Chrome", "DeepSeek", "翻译", "效率工具"]
categories: ["项目"]
summary: "用 DeepSeek API 写了一个支持划词翻译、整页翻译和快捷键操作的 Chrome 翻译插件。"
---

Google 翻译看技术文章不太行，商店里的插件要么收费，要么翻译效果一般。我干脆用 DeepSeek API 写了个 Chrome 扩展。

## 目前支持

- 划词翻译
- 整页翻译
- 恢复原文
- 弹窗快速翻译
- 右键菜单
- 快捷键 `Alt + Shift + T`

## 隐私与翻译策略

API Key 只保存在浏览器本地，不会上传到 GitHub。

整页翻译会跳过代码块、输入框、隐藏区域和插件自己的界面，并分批发送给 DeepSeek，避免一次性塞太多内容。

## 安装方法

1. 打开 `chrome://extensions/`
2. 开启“开发者模式”
3. 点击“加载已解压的扩展程序”
4. 选择 `deepseek-translator` 文件夹
5. 在设置里填写 DeepSeek API Key

## 已知限制

目前动态加载的新内容不会自动翻译，复杂的在线文档也可能需要手动划词。

不过日常看博客、新闻和技术文档已经够用了。

## 项目地址

[StanlFeek/Chrome-translator](https://github.com/StanlFeek/Chrome-translator)
