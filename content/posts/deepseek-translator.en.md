---
title: "I Wrote My Own DeepSeek Translation Extension"
date: 2026-09-24
draft: false
author: "StanlFeek"
tags: ["Chrome", "DeepSeek", "Translation", "Productivity"]
categories: ["Projects"]
summary: "A Chrome extension built with the DeepSeek API, with selected-text translation, full-page translation, and keyboard shortcuts."
---

Google Translate doesn't work that well for the technical articles I read. Extensions in the store either charge a fee or deliver mediocre translations, so I built a Chrome extension with the DeepSeek API.

## What It Supports

- Translate selected text
- Translate an entire page
- Restore the original text
- Quick translation in the extension popup
- A right-click menu
- The `Alt + Shift + T` keyboard shortcut

## Privacy and Translation

The API key stays in local browser storage and is never uploaded to GitHub.

Full-page translation skips code blocks, input fields, hidden areas, and the extension's own interface. Text is sent to DeepSeek in batches to avoid sending too much at once.

## Installation

1. Open `chrome://extensions/`.
2. Enable "Developer mode".
3. Click "Load unpacked".
4. Select the `deepseek-translator` folder.
5. Enter your DeepSeek API key in the settings.

## Known Limitations

At this stage, dynamically loaded content isn't translated automatically. Complex online documents may also require translating selected text manually.

For everyday blogs, news, and technical documentation, though, it already does enough for me.

## Project

[StanlFeek/Chrome-translator](https://github.com/StanlFeek/Chrome-translator)
