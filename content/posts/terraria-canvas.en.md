---
title: "I Built My Own Browser-Based Terraria"
date: 2026-10-18
draft: false
author: "StanlFeek"
tags: ["Canvas", "Game Development", "DeepSeek", "GitHub Pages"]
categories: ["Projects"]
summary: "Starting with a 960x540 Canvas, I built a Terraria-style game with mining, building, and boss fights, then deployed it at stanl.top/terraria."
---

I've always wanted to make a Terraria you could play just by opening a page. Not a commercial project or a pixel-perfect recreation, just a way to answer a question: could a browser run a world where you can actually mine, build, and fight bosses?

It's here now: <https://stanl.top/terraria>

![The spawn point during the day](https://stanl.top/terraria-deepseek-v4.1-flash/screenshots/spawn-day.png)

## What's in It

- A procedurally generated world: forests, snowfields, deserts, jungles, oceans, Corruption / Crimson, plus caves, mine shafts, a dungeon, and the underworld
- Mining, placing blocks, crafting, chests, beds, workbenches, and several crafting stations
- Melee, ranged, magic, and summoning combat paths
- 42 enemy types, 7 bosses, and 6 NPCs
- Day and night, weather, invasion events, item drops, and character saves
- A complete Chinese interface

The game is entirely static, with no backend or external image assets. Terrain, trees, characters, enemies, and icons are all drawn with Canvas. Saves live in the browser's `localStorage`. AI wrote most of the code; most of my work was running it, playing it, and pointing out what was wrong.

## The Small Problems

The feature list looks long, but a different set of problems made the difference between something that ran and something you could play.

The first time I opened the game, the mouse pointer disappeared as soon as it entered the canvas. The CSS used `cursor: none`, and the game's own crosshair was almost invisible. The fix was simple: use the default pointer in menus and `crosshair` in the game, leaving the cursor to the browser.

There were plenty of similar issues: boss health bars covering names, quest tracking overlapping chat, inventory stat lines piling on top of one another, a tooltip showing `404% critical chance`, and an untranslated item name crashing the entire crafting panel.

To avoid relying only on visual checks, I wrote several automated checks: whether all 42 enemies could spawn and update, whether 105 weapon / tool / potion usage paths worked, whether 34 accessories calculated their effects correctly, and whether every phase of all 7 bosses could complete. They can't prove the game is fun, but they can at least catch combat breaking while I change the Chinese text.

## The Chinese Interface

This translation covered 363 item names, along with all NPC dialogue, quests, chat, death messages, and system messages.

At first I thought it would just mean replacing English with Chinese. It wasn't. The original pixel font, `Press Start 2P`, doesn't include Chinese characters, so they fell back to the system font. The Chinese text was also larger, and the HUD, originally laid out at 6px, became crowded immediately.

I ended up making three changes:

- Add a Chinese font fallback and make the text helpers recognize CJK characters.
- Recalculate wrapping, line height, and tooltip height for Chinese text.
- Render the entire Canvas at the window's actual resolution instead of stretching a 960x540 image.

The `TR` translation layer handles UI text, item names, and rules for longer sentences. World names and seeds entered by players stay unchanged. The Chinese version needed a fresh layout, not just a layer of translated words.

## Deployment

The repository is called `terraria-deepseek-v4.1-flash`, hosted on GitHub Pages. Its project URL includes the repository name, so the default address is `https://stanl.top/terraria-deepseek-v4.1-flash/`. I wanted the shorter `stanl.top/terraria`.

I added a fullscreen entry page in the blog repository's `static` directory to load the game from the same domain. The address bar can stay at `/terraria/`, and saves remain under the same origin. It's not the most elegant routing solution, but it's simple and avoids maintaining a second copy of the game.

Deployment still needed checking: open `/terraria`, inspect it in a 1920px-wide window and at phone dimensions, and confirm the entry isn't blank, the game can create a world, and keyboard input actually reaches the canvas.

## Where It Stands

You can now enter through either <https://stanl.top/terraria> or <https://stanl.top/terraria-deepseek-v4.1-flash/>.

It's still a single-player game with keyboard and mouse controls only. There's no mobile touch control or save import and export. The content is far from complete, and it's a long way from the real Terraria. But you can play a full round: build a house, explore caves, mine, craft equipment, fight bosses, and talk to the Guide.

What stayed with me most wasn't adding more bosses. It was the small things: whether the mouse disappeared, whether Chinese text covered a health bar, and whether the address was easy to remember. Start with the smallest version that runs, then keep playing it and fixing it.

## Project

- [Play: stanl.top/terraria](https://stanl.top/terraria)
- [Source: StanlFeek/terraria-deepseek-v4.1-flash](https://github.com/StanlFeek/terraria-deepseek-v4.1-flash)
